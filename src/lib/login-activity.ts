import { supabase } from "./supabase";
import { districts } from "./nex-data";

export type LoginEvent = {
  id: string;
  user_id: string;
  username: string;
  role: string;
  district: string | null;
  logged_in_at: string;
  latitude: number | null;
  longitude: number | null;
  device_location: string | null;
  user_agent: string | null;
};

export type DeviceLocation = {
  latitude: number | null;
  longitude: number | null;
  deviceLocation: string;
};

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

function readGps(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("unsupported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }),
      () => reject(new Error("denied")),
      { enableHighAccuracy: false, timeout: 4000, maximumAge: 60_000 },
    );
  });
}

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=12`;
    const res = await withTimeout(
      fetch(url, { headers: { Accept: "application/json" } }),
      3500,
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      address?: { city?: string; town?: string; village?: string; state?: string; county?: string };
    };
    const a = data.address ?? {};
    const place = a.city || a.town || a.village || a.county;
    const parts = [place, a.state].filter(Boolean);
    return parts.length ? parts.join(", ") : null;
  } catch {
    return null;
  }
}

async function locationFromIp(): Promise<DeviceLocation | null> {
  try {
    const res = await withTimeout(fetch("https://ipapi.co/json/"), 3500);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      city?: string;
      region?: string;
      country_name?: string;
      latitude?: number;
      longitude?: number;
    };
    const parts = [data.city, data.region, data.country_name].filter(Boolean);
    if (!parts.length) return null;
    return {
      latitude: typeof data.latitude === "number" ? data.latitude : null,
      longitude: typeof data.longitude === "number" ? data.longitude : null,
      deviceLocation: `${parts.join(", ")} (network)`,
    };
  } catch {
    return null;
  }
}

export async function detectSignInLocation(): Promise<DeviceLocation> {
  try {
    const gps = await withTimeout(readGps(), 4500);
    const place = await reverseGeocode(gps.latitude, gps.longitude);
    return {
      latitude: gps.latitude,
      longitude: gps.longitude,
      deviceLocation: place
        ? `${place} (device)`
        : `${gps.latitude.toFixed(4)}, ${gps.longitude.toFixed(4)} (device)`,
    };
  } catch {
    const fromIp = await locationFromIp();
    if (fromIp) return fromIp;
    return { latitude: null, longitude: null, deviceLocation: "Location unavailable" };
  }
}

/** Sign-in rows older than this are deleted and never shown. */
export const LOGIN_ACTIVITY_RETENTION_DAYS = 3;

export function loginActivitySinceIso(days = LOGIN_ACTIVITY_RETENTION_DAYS) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

async function pruneOldLoginActivity() {
  const { error } = await supabase.rpc("prune_login_activity_older_than_3_days");
  // Older DBs without the migration still work; retention is enforced on fetch.
  if (error && !/function|does not exist|404/i.test(error.message)) {
    console.warn("Could not prune old login activity", error.message);
  }
}

export async function recordLogin(input: {
  userId: string;
  username: string;
  role: string;
  district?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  deviceLocation?: string | null;
}) {
  const { error } = await supabase.from("login_activity").insert({
    user_id: input.userId,
    username: input.username,
    role: input.role,
    district: input.district ?? null,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    device_location: input.deviceLocation ?? null,
    user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
  });
  if (error) throw error;
  await pruneOldLoginActivity();
}

export async function fetchLoginActivity() {
  await pruneOldLoginActivity();
  const since = loginActivitySinceIso();
  const { data, error } = await supabase
    .from("login_activity")
    .select("id, user_id, username, role, district, logged_in_at, latitude, longitude, device_location, user_agent")
    .eq("role", "dm")
    .gte("logged_in_at", since)
    .order("logged_in_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as LoginEvent[];
}

export function formatIst(iso: string | null | undefined, opts?: { seconds?: boolean }) {
  if (!iso) return "Never";
  return new Date(iso).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...(opts?.seconds ? { second: "2-digit" as const } : {}),
  });
}

export function summarizeLoginsByDm(events: LoginEvent[]) {
  return districts.map((d) => {
    const mine = events.filter(
      (e) => e.username === d.username || e.district?.toLowerCase() === d.district.toLowerCase(),
    );
    const last = mine[0];
    const lastAt = last?.logged_in_at ?? null;
    return {
      username: d.username,
      district: d.district,
      location: d.location,
      loginCount: mine.length,
      lastLoginAt: lastAt,
      lastDeviceLocation: last?.device_location ?? null,
      signedInToday: lastAt
        ? new Date(lastAt).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }) ===
          new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })
        : false,
    };
  });
}
