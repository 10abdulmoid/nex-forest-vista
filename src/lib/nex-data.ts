export type Role = "dm" | "gm";

export type Session = {
  role: Role;
  username: string;
  name: string;
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

export const districts = [
  { username: "dm.nashik", name: "S. R. Deshmukh", district: "Nashik", location: "Nashik West Division, Igatpuri Range" },
  { username: "dm.chandrapur", name: "A. K. Meshram", district: "Chandrapur", location: "Chandrapur Division, Bramhapuri Range" },
  { username: "dm.gadchiroli", name: "P. V. Naidu", district: "Gadchiroli", location: "Gadchiroli Division, Dhanora Range" },
  { username: "dm.amravati", name: "R. S. Kulkarni", district: "Amravati", location: "Amravati Division, Chikhaldara Range" },
  { username: "dm.kolhapur", name: "M. B. Patil", district: "Kolhapur", location: "Kolhapur Division, Radhanagari Range" },
  { username: "dm.satara", name: "V. D. Jadhav", district: "Satara", location: "Satara Division, Koyna Range" },
  { username: "dm.thane", name: "N. G. Bhoir", district: "Thane", location: "Thane Division, Shahapur Range" },
];

export const gmAccount = {
  username: "gm.forest",
  name: "Dr. K. Venkatesan",
  designation: "General Manager, Plantation Wing",
};

const rangesByDistrict: Record<string, string[]> = {
  Nashik: ["Igatpuri", "Peth", "Trimbakeshwar", "Sinnar"],
  Chandrapur: ["Bramhapuri", "Mul", "Sindewahi", "Warora"],
  Gadchiroli: ["Dhanora", "Etapalli", "Kurkheda", "Aheri"],
  Amravati: ["Chikhaldara", "Dharni", "Paratwada", "Morshi"],
  Kolhapur: ["Radhanagari", "Gargoti", "Ajra", "Panhala"],
  Satara: ["Koyna", "Mahabaleshwar", "Patan", "Wai"],
  Thane: ["Shahapur", "Murbad", "Bhiwandi", "Vasind"],
};

const years = ["2023-24", "2024-25", "2025-26"];

function seeded(i: number) {
  return (Math.sin(i * 12.9898) * 43758.5453) % 1;
}

export const mockEntries: Entry[] = districts.flatMap((d, di) => {
  const ranges = rangesByDistrict[d.district];
  return Array.from({ length: 5 }, (_, ri) => {
    const k = Math.abs(seeded(di * 7 + ri + 1));
    return {
      id: `${d.district}-${ri}`,
      rotation: (ri % 4) + 1,
      area: Math.round((18 + k * 120) * 10) / 10,
      maintenanceYear: years[(di + ri) % years.length],
      range: ranges[ri % ranges.length],
      dmName: d.name,
      district: d.district,
    };
  });
});

export const rangesFor = (district: string) => rangesByDistrict[district] ?? [];

const KEY = "nex-forest-session";

export function login(username: string, password: string): Session | null {
  if (!password.trim()) return null;
  const u = username.trim().toLowerCase();
  if (u === gmAccount.username) {
    return { role: "gm", username: u, name: gmAccount.name };
  }
  const dm = districts.find((d) => d.username === u);
  if (dm) {
    return { role: "dm", username: u, name: dm.name, district: dm.district, location: dm.location };
  }
  return null;
}

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
}
