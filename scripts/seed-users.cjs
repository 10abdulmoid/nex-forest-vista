const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const EMAIL_DOMAIN = "tgfdc.in";

const districts = {
  "dm.rangareddy": { district: "Rangareddy", name: null },
  "dm.medak": { district: "Medak", name: null },
  "dm.mulugu": { district: "Mulugu", name: null },
  "dm.khagaznagar": { district: "Khagaznagar", name: null },
  "dm.paloncha": { district: "Paloncha", name: null },
  "dm.kothagudem": { district: "Kothagudem", name: null },
  "dm.sathupally": { district: "Sathupally", name: null },
};

function toRole(role) {
  const r = String(role || "").toLowerCase();
  return r === "gm" || r.includes("gm") ? "gm" : "dm";
}

async function findUserByEmail(supabase, email) {
  let page = 1;
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = (data.users || []).find((u) => u.email === email);
    if (found) return found;
    if (!data.users || data.users.length < 200) return null;
    page += 1;
  }
}

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE must be set in .env");
  }

  const plainPath = path.join(__dirname, "..", "auth", "creds.plain.json");
  const accounts = JSON.parse(fs.readFileSync(plainPath, "utf8"));
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  for (const account of accounts) {
    const username = String(account.username).trim().toLowerCase();
    const email = `${username}@${EMAIL_DOMAIN}`;
    const role = toRole(account.role);
    const mapped = districts[username];
    const district = mapped?.district ?? account.district ?? null;
    const name = account.name ?? mapped?.name ?? null;

        let user = await findUserByEmail(supabase, email);
        if (!user) {
          user = await findUserByEmail(supabase, `${username}@tgfdc.internal`);
        }
    if (!user) {
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password: account.password,
        email_confirm: true,
        user_metadata: { username, role, district, name },
      });
      if (error) throw error;
      user = data.user;
      console.log("created", username);
    } else {
      const { error } = await supabase.auth.admin.updateUserById(user.id, {
        email,
        password: account.password,
        email_confirm: true,
        user_metadata: { username, role, district, name },
      });
      if (error) throw error;
      console.log("updated", username);
    }

    const { error: profileError } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        username,
        role,
        district,
        name,
      },
      { onConflict: "id" },
    );
    if (profileError) throw profileError;
  }

  console.log("seed complete");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
