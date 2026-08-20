export type Role = "dm" | "gm";

export type Session = {
  role: Role;
  username: string;
  name?: string;
  district?: string;
  location?: string;
};

export type Entry = {
  id: string;
  rotation: number;
  area: number;
  maintenanceYear: string;
  range: string;
  dmName: string;
  district: string;
};

/** Accounts from auth/creds.json — Telangana TGFDC divisions. */
export const districts = [
  { username: "dm.rangareddy", district: "Rangareddy", location: "Rangareddy Division" },
  { username: "dm.medak", district: "Medak", location: "Medak Division" },
  { username: "dm.mulugu", district: "Mulugu", location: "Mulugu Division" },
  { username: "dm.khagaznagar", district: "Khagaznagar", location: "Khagaznagar Division" },
  { username: "dm.paloncha", district: "Paloncha", location: "Paloncha Division" },
  { username: "dm.kothagudem", district: "Kothagudem", location: "Kothagudem Division" },
  { username: "dm.sathupally", district: "Sathupally", location: "Sathupally Division" },
];

export const gmAccount = {
  username: "gm.forest",
  name: "Syed Maqsood Mohiuddin",
  designation: "GM, Vigilance · TGFDC",
};

const rangesByDistrict: Record<string, string[]> = {
  Rangareddy: ["Shamshabad", "Chevella", "Ibrahimpatnam", "Maheshwaram"],
  Medak: ["Medak", "Narsapur", "Toopran", "Siddipet"],
  Mulugu: ["Mulugu", "Eturnagaram", "Tadvai", "Venkatapur"],
  Khagaznagar: ["Kagaznagar", "Sirpur", "Asifabad", "Rebbena"],
  Paloncha: ["Paloncha", "Kothagudem", "Yellandu", "Aswapuram"],
  Kothagudem: ["Kothagudem", "Yellandu", "Tekulapalli", "Chandrugonda"],
  Sathupally: ["Sathupally", "Penuballi", "Kallur", "Vemsoor"],
};

export const rangesFor = (district: string) => {
  const match = districts.find((d) => d.district.toLowerCase() === district.toLowerCase());
  return rangesByDistrict[match?.district ?? district] ?? [];
};

export function isGmRole(role: string | undefined) {
  if (!role) return false;
  const r = role.trim().toLowerCase();
  return r === "gm" || r.includes("gm");
}

export const AUTH_EMAIL_DOMAIN = "tgfdc.in";

export function authEmailsFromUsername(username: string) {
  const u = username.trim().toLowerCase();
  if (u.includes("@")) return [u];
  return [`${u}@${AUTH_EMAIL_DOMAIN}`, `${u}@tgfdc.internal`];
}

export function authEmailFromUsername(username: string) {
  return authEmailsFromUsername(username)[0]!;
}

export function sessionFromProfile(profile: {
  username: string;
  role: string;
  name?: string | null;
  district?: string | null;
}): Session {
  const gm = isGmRole(profile.role) || profile.role === "gm";
  const dm = districts.find((d) => d.username.toLowerCase() === profile.username.trim().toLowerCase());
  return {
    role: gm ? "gm" : "dm",
    username: profile.username,
    name: profile.name ?? (gm ? gmAccount.name : undefined),
    district: dm?.district ?? profile.district ?? undefined,
    location: dm?.location,
  };
}

const KEY = "nex-forest-session";

export function saveSession(s: Session) {
  localStorage.setItem(KEY, JSON.stringify(s));
}

export function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(KEY);
  localStorage.removeItem("nex-forest-token");
}
