import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Preview = { headers: string[]; rows: string[][] };
export type ImportMode = "replace" | "append";

function csvParse(text: string, delimiter = ","): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let i = 0;
  let inQuotes = false;

  const pushCell = () => { row.push(cell); cell = ""; };
  const pushRow = () => { rows.push(row); row = []; };

  while (i < text.length) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i += 2; continue; } // escaped quote
        inQuotes = false; i++; continue;
      }
      cell += ch; i++; continue;
    } else {
      if (ch === '"') { inQuotes = true; i++; continue; }
      if (ch === "\r") { i++; continue; }
      if (ch === "\n") { pushCell(); pushRow(); i++; continue; }
      if (ch === delimiter) { pushCell(); i++; continue; }
      cell += ch; i++; continue;
    }
  }
  if (cell.length || row.length) { pushCell(); pushRow(); }
  while (rows.length && rows[rows.length - 1].every((c) => c.trim() === "")) rows.pop();
  return rows;
}

function detectFormatAndParse(text: string): Preview {
  const t = text.trim();
  if (!t) return { headers: [], rows: [] };

  // HTML table paste
  if (t.includes("<table")) {
    try {
      const doc = new DOMParser().parseFromString(t, "text/html");
      const table = doc.querySelector("table");
      const headerCells = Array.from(table?.querySelectorAll("thead th") || []);
      let headers = headerCells.map((th) => th.textContent?.trim() || "");
      if (!headers.length) {
        const firstRow = table?.querySelector("tr");
        if (firstRow) {
          headers = Array.from(firstRow.querySelectorAll("th,td")).map(
            (c) => c.textContent?.trim() || ""
          );
        }
      }
      const allRows = Array.from(table?.querySelectorAll("tr") || []);
      const bodyRows = headers.length ? allRows.slice(1) : allRows;
      const rows = bodyRows.map((tr) =>
        Array.from(tr.querySelectorAll("td,th")).map((td) => td.textContent?.trim() || "")
      );
      return { headers, rows };
    } catch { /* fall through to TSV/CSV */ }
  }

  // TSV
  if (t.includes("\t")) {
    const rows = csvParse(t, "\t");
    const headers = rows.shift() || [];
    return { headers, rows };
  }

  // CSV
  const rows = csvParse(t, ",");
  const headers = rows.shift() || [];
  return { headers, rows };
}

function normalizeText(val: any): string {
  if (val == null) return "";
  if (Array.isArray(val)) return val.map(normalizeText).filter(Boolean).join(", ");
  let t = String(val).trim();
  if (!t) return "";
  if ((t.startsWith("[") && t.endsWith("]")) || (t.startsWith('"') && t.endsWith('"'))) {
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
  t = t.replace(/^\[(.*)\]$/s, "$1").replace(/^"(.*)"$/s, "$1").replace(/^'(.*)'$/s, "$1");
  return t.trim();
}

function rowsToObjects(headers: string[], rows: string[][]) {
  return rows.map((r) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = r[i] ?? ""; });
    return obj;
  });
}

export const ImportDialog = ({
  open,
  onOpenChange,
  title = "Import data",
  description = "Paste CSV/TSV or an HTML table. We’ll parse, preview, and import.",
  onApply,
  target
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title?: string;
  description?: string;
  target: "schools" | "team";
  onApply: (rows: any[], mode: ImportMode) => void;
}) => {
  const [mode, setMode] = React.useState<ImportMode>("replace");
  const [text, setText] = React.useState("");
  const [preview, setPreview] = React.useState<Preview>({ headers: [], rows: [] });

  React.useEffect(() => {
    setPreview(detectFormatAndParse(text));
  }, [text]);

  const parsedObjects = React.useMemo(
    () => rowsToObjects(preview.headers, preview.rows),
    [preview]
  );

  // loose column matching per target
  const mapped = React.useMemo(() => {
    const H = preview.headers.map((h) => h.trim());
    const find = (...alts: string[]) => {
      const idx = H.findIndex((h) => alts.some((a) => h.toLowerCase() === a.toLowerCase()));
      return idx >= 0 ? alts[0] : "";
    };
    const get = (row: Record<string, string>, ...alts: string[]) => {
      for (const a of alts) if (a in row && row[a] != null) return normalizeText(row[a]);
      return "";
    };

    if (target === "schools") {
      const nameKey = find("InstitutionName") || find("Name") || find("School") || "InstitutionName";
      const cityKey = find("City") || "City";
      const stateKey = find("State", "State/Province", "StateProvince", "Province") || "State";
      const acrKey = find("Acronym", "ShortName", "Abbreviation") || "";
      const siteKey = find("Website", "URL", "Homepage", "Site") || "Website";
      const vendKey = find("VendorCode", "Vendor", "Vendor Id", "VendorID") || "";

      return parsedObjects.map((row, i) => ({
        id: row.id || row.Id || row.ID || `S-${Date.now()}-${i}`,
        name: get(row, nameKey, "Name", "School"),
        city: get(row, cityKey),
        state: get(row, stateKey),
        acronym: get(row, acrKey),
        website: (() => {
          const u = get(row, siteKey);
          if (!u) return "";
          return /^https?:\/\//i.test(u) ? u : `https://${u}`;
        })(),
        vendorCode: get(row, vendKey),
        ...row,
      }));
    }

    if (target === "team") {
      const nameKey = find("Name", "Full Name") || "Name";
      const famKey = find("Nickname", "FamiliarName") || "";
      const emailKey = find("Email") || "Email";
      const phoneKey = find("Phone", "PhoneNumber") || "";
      const rolesKey = find("Roles", "Role") || "";
      const intakeKey = find("Intake") || "";

      return parsedObjects.map((row, i) => ({
        id: row.id || row.Id || row.ID || row[emailKey] || `T-${Date.now()}-${i}`,
        name: get(row, nameKey, "Full Name", "Name"),
        familiarName: get(row, famKey),
        email: get(row, emailKey),
        phone: get(row, phoneKey),
        roles: normalizeText(get(row, rolesKey))
          .split(/[,;]/).map((s) => s.trim()).filter(Boolean),
        intake: get(row, intakeKey),
        ...row,
      }));
    }

    return parsedObjects;
  }, [parsedObjects, preview.headers, target]);

  const canImport = mapped.length > 0 && (preview.headers.length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <Label>Paste CSV/TSV or HTML table</Label>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            placeholder="Paste data here…"
          />

          <div className="grid gap-2 md:grid-cols-3">
            <div className="flex items-center gap-2">
              <Label className="whitespace-nowrap">Mode</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={mode === "replace" ? "secondary" : "outline"}
                  onClick={() => setMode("replace")}
                >
                  Replace
                </Button>
                <Button
                  type="button"
                  variant={mode === "append" ? "secondary" : "outline"}
                  onClick={() => setMode("append")}
                >
                  Append
                </Button>
              </div>
            </div>
            <div className="text-sm text-zinc-500">
              Detected columns: {preview.headers.length || 0}
            </div>
            <div className="text-sm text-zinc-500">
              Detected rows: {mapped.length || 0}
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border dark:border-zinc-800">
            <Table>
              <TableHeader>
                <TableRow>
                  {preview.headers.map((h, i) => (
                    <TableHead key={i}>{h || <span className="text-zinc-400">—</span>}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.rows.slice(0, 10).map((r, i) => (
                  <TableRow key={i}>
                    {r.map((c, j) => (
                      <TableCell key={j} className="max-w-[240px] truncate">
                        {c}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
                {preview.rows.length > 10 && (
                  <TableRow>
                    <TableCell colSpan={preview.headers.length} className="text-xs text-zinc-500">
                      Preview truncated. Total rows: {preview.rows.length}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              disabled={!canImport}
              onClick={() => {
                onApply(mapped, mode);
                onOpenChange(false);
              }}
            >
              Import
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
