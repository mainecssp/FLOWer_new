// src/data/schools.ts

export type School = {
  id: string | number;
  name: string;
  acronym?: string;
  city?: string;
  state?: string;
  vendorCode?: string;
  website?: string;
  [key: string]: any;
};

import raw from "./schools_enriched.json";

/** Robust text normalizer */
function normalizeText(val: any): string {
  if (val == null) return "";
  if (Array.isArray(val)) return val.map(normalizeText).filter(Boolean).join(", ");
  let t = String(val).trim();
  if (!t) return "";

  // Try JSON parsing for ["Maine"] or '"Maine"'
  if ((t.startsWith("[") && t.endsWith("]")) || (t.startsWith("{") && t.endsWith("}")) || (t.startsWith('"') && t.endsWith('"'))) {
    try {
      const parsed = JSON.parse(t);
      if (Array.isArray(parsed)) return parsed.map(normalizeText).filter(Boolean).join(", ");
      if (typeof parsed === "string") return parsed.trim();
    } catch {
      try {
        const fixed = t.replace(/'/g, '"');
        const parsed2 = JSON.parse(fixed);
        if (Array.isArray(parsed2)) return parsed2.map(normalizeText).filter(Boolean).join(", ");
        if (typeof parsed2 === "string") return parsed2.trim();
      } catch {}
    }
  }

  // Strip simple wrappers if any remain
  t = t.replace(/^\[(.*)\]$/s, "$1").replace(/^"(.*)"$/s, "$1").replace(/^'(.*)'$/s, "$1");
  return t.trim();
}

function pick(row: any, ...keys: string[]): string {
  for (const k of keys) {
    if (k in row && row[k] != null && String(row[k]).trim() !== "") {
      const v = normalizeText(row[k]);
      if (v) return v;
    }
  }
  return "";
}

function pickState(row: any): string {
  return pick(
    row,
    "state","State","stateProvince","StateProvince","State/Province",
    "States","State(s)","State(s) Served","State Served","LocationState","Province"
  );
}
function pickCity(row: any): string { return pick(row, "city", "City", "LocationCity", "CampusCity"); }
function pickName(row: any): string { return pick(row, "InstitutionName", "name", "Name", "School", "SchoolName"); }
function pickAcronym(row: any): string { return pick(row, "Acronym", "acronym", "ShortName", "Abbreviation"); }
function pickVendor(row: any): string { return pick(row, "VendorCode", "vendorCode", "Vendor", "Vendor Id", "VendorID"); }
function pickWebsite(row: any): string {
  let url = pick(row, "Website", "website", "URL", "Homepage", "Site");
  if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`;
  return url;
}

const mapped: School[] = (raw as any[]).map((row, idx) => {
  const name = pickName(row);
  const school: School = {
    id: row.id ?? row.Id ?? row.ID ?? idx + 1,
    name,
    acronym: pickAcronym(row),
    city: pickCity(row),
    state: pickState(row),
    vendorCode: pickVendor(row),
    website: pickWebsite(row),
    ...row,
  };

  // Overwrite any raw state-like keys with normalized state so profiles don't show ["Maine"]
  const stateKeys = [
    "state","State","stateProvince","StateProvince","State/Province","States","State(s)","State(s) Served","State Served","LocationState","Province"
  ];
  for (const k of stateKeys) if (k in school) (school as any)[k] = school.state || "";

  return school;
});

// Filter out nameless/header/garbage rows so nothing empty can surface
export const SCHOOLS: School[] = mapped.filter((s) => {
  const n = (s.name || "").trim().toLowerCase();
  if (!n) return false;
  if (["institutionname", "name", "school"].includes(n)) return false; // header pasted as row
  return true;
});
