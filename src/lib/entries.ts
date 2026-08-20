import { supabase } from "./supabase";
import { districts, type Entry } from "./nex-data";

export type EntryRow = {
  id: string;
  user_id: string | null;
  district: string | null;
  rotation: number | null;
  area: number | null;
  maintenance_year: string | null;
  range_name: string | null;
};

export function mapEntry(
  row: EntryRow,
  extras: { dmName?: string; district?: string } = {},
): Entry {
  return {
    id: row.id,
    rotation: Number(row.rotation) || 0,
    area: Number(row.area) || 0,
    maintenanceYear: row.maintenance_year || "2025-26",
    range: row.range_name || "—",
    dmName: extras.dmName || "—",
    district: extras.district || row.district || "—",
  };
}

export async function fetchEntriesForSession(role: "dm" | "gm") {
  const { data: rows, error } = await supabase
    .from("entries")
    .select("id, user_id, district, rotation, area, maintenance_year, range_name")
    .order("created_at", { ascending: true });
  if (error) throw error;

  const names = new Map<string, { username: string; district: string | null }>();
  if (role === "gm") {
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("id, username, district");
    if (profileError) throw profileError;
    for (const p of profiles ?? []) {
      names.set(p.id, { username: p.username, district: p.district });
    }
  }

  return (rows ?? []).map((row) => {
    const profile = row.user_id ? names.get(row.user_id) : undefined;
    const district =
      row.district ||
      profile?.district ||
      districts.find((d) => d.username === profile?.username)?.district;
    return mapEntry(row, { dmName: profile?.username, district });
  });
}

export async function insertEntry(input: {
  userId: string;
  district: string;
  rotation: number;
  area: number;
  maintenanceYear: string;
  range: string;
}) {
  const { data, error } = await supabase
    .from("entries")
    .insert({
      user_id: input.userId,
      district: input.district,
      rotation: input.rotation,
      area: input.area,
      maintenance_year: input.maintenanceYear,
      range_name: input.range,
    })
    .select("id, user_id, district, rotation, area, maintenance_year, range_name")
    .single();
  if (error) throw error;
  return data;
}

export async function updateEntry(
  id: string,
  patch: Partial<Pick<Entry, "rotation" | "area" | "maintenanceYear" | "range">>,
) {
  const row: Record<string, unknown> = {};
  if (patch.rotation !== undefined) row.rotation = patch.rotation;
  if (patch.area !== undefined) row.area = patch.area;
  if (patch.maintenanceYear !== undefined) row.maintenance_year = patch.maintenanceYear;
  if (patch.range !== undefined) row.range_name = patch.range;
  const { error } = await supabase.from("entries").update(row).eq("id", id);
  if (error) throw error;
}

export async function deleteEntry(id: string) {
  const { error } = await supabase.from("entries").delete().eq("id", id);
  if (error) throw error;
}
