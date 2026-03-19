import React, { useMemo, useState, useEffect } from "react";
import {
  createBrowserRouter,
  RouterProvider,
  Link,
  Outlet,
  useNavigate,
  useParams,
} from "react-router-dom";
import { motion } from "framer-motion";
import {
  Menu,
  ChevronLeft,
  ChevronRight,
  Users,
  GraduationCap,
  FileText,
  Bot,
  BarChart3,
  Settings,
  Search,
  Plus,
  Sun,
  Moon,
  BadgeAlert,
  ClipboardPaste,
  Mail,
  Phone,
  Globe,
  Filter,
  LayoutGrid,
  List as ListIcon,
  ArrowLeft,
  Pencil,
} from "lucide-react";

// Data
import { TEAM, CM_NAMES, type TeamMember } from "@/data/lists";
import { SCHOOLS, type School as SchoolType } from "@/data/schools";

// Stage checklists
import IntakeChecklist from "@/components/checklists/IntakeChecklist";
import EnrollmentChecklist from "@/components/checklists/EnrollmentChecklist";
import MaintenanceChecklist from "@/components/checklists/MaintenanceChecklist";

// shadcn/ui
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// Local store helpers
import { load, save, upsertById } from "@/lib/store";

// Import dialog (default)
import ImportDialog from "@/components/ImportDialog";

/* -------------------------------------------------------
   Utilities
------------------------------------------------------- */

const cx = (...xs: (string | false | null | undefined)[]) => xs.filter(Boolean).join(" ");

const fullName = (s: any) => `${s.firstName} ${s.lastName}`;

function initials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] || "") + (parts[parts.length - 1]?.[0] || "");
}

function isCM(m: TeamMember) {
  return (m.roles || []).some((r) => r.toLowerCase() === "cm");
}

function inferOpenClosed(k: any): "open" | "closed" | null {
  const raw = String(
    k?.status ?? k?.openClosed ?? k?.open ?? k?.isOpen ?? k?.operationalStatus ?? k?.statusText ?? ""
  )
    .toLowerCase()
    .trim();
  if (["true", "yes", "y", "1"].includes(raw) || raw.includes("open")) return "open";
  if (["false", "no", "n", "0"].includes(raw) || raw.includes("closed")) return "closed";
  return null;
}

// Normalize odd state strings or arrays to text
function asText(val: any): string {
  if (Array.isArray(val)) return val.filter(Boolean).map(asText).join(", ");
  if (typeof val === "string") {
    let t = val.trim();
    if (!t) return "";
    if ((t.startsWith("[") && t.endsWith("]")) || (t.startsWith('"') && t.endsWith('"'))) {
      try {
        const parsed = JSON.parse(t);
        if (Array.isArray(parsed)) return parsed.filter(Boolean).map(asText).join(", ");
        if (typeof parsed === "string") return parsed.trim();
      } catch {
        try {
          const fixed = t.replace(/'/g, '"');
          const parsed2 = JSON.parse(fixed);
          if (Array.isArray(parsed2)) return parsed2.filter(Boolean).map(asText).join(", ");
          if (typeof parsed2 === "string") return parsed2.trim();
        } catch {}
      }
    }
    t = t.replace(/^\[(.*)\]$/s, "$1").replace(/^"(.*)"$/s, "$1").replace(/^'(.*)'$/s, "$1");
    return t.trim();
  }
  return val == null ? "" : String(val);
}

/* ---- Role normalization (Manager → MGR, Director → DIR) ---- */
const ROLE_MAP: Record<string, string> = { manager: "MGR", director: "DIR" };
function canonRole(r?: string): string {
  if (!r) return "";
  const key = r.trim().toLowerCase();
  return ROLE_MAP[key] ?? r.trim();
}
function canonRoles(arr?: string[]): string[] {
  return (arr || []).map(canonRole);
}

/* -------------------------------------------------------
   Sample Students (demo)
------------------------------------------------------- */
const SAMPLE_STUDENTS: any[] = [
  { id: "S-001", firstName: "Avery", lastName: "Clark", email: "avery.clark@example.org", city: "Augusta", county: "Kennebec", appDate: "2025-09-14", status: "Record Created" },
  { id: "S-002", firstName: "Sam", lastName: "Merritt", email: "sam.merritt@example.org", city: "Bath", county: "Sagadahoc", appDate: "2025-10-06", status: "Record Updated" },
  { id: "S-003", firstName: "Avery", lastName: "Clark", email: "avery.clark@example.org", city: "Hallowell", county: "Kennebec", appDate: "2025-10-10", status: "Record Created (Prior)" },
  { id: "S-004", firstName: "Kai", lastName: "Thompson", email: "kai.t@example.org", city: "Topsham", county: "Sagadahoc", appDate: "2025-08-28", status: "Rejected – Not a PDF" },
  { id: "S-005", firstName: "Jordan", lastName: "Lee", email: "jordan.lee@example.org", city: "Brunswick", county: "Cumberland", appDate: "2025-10-02", status: "Record Created" },
];
const STATUS_COLOR: Record<string, string> = {
  "Record Created": "bg-emerald-600",
  "Record Updated": "bg-blue-600",
  "Record Created (Prior)": "bg-amber-600",
  "Rejected – Not a PDF": "bg-rose-600",
};
function findDuplicateEmails(rows: any[]) {
  const counts = rows.reduce((acc: Record<string, number>, r) => {
    const k = (r.email || "").toLowerCase();
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
  const dupes = new Set(Object.entries(counts).filter(([, n]) => n > 1).map(([k]) => k));
  return rows.map((r) => ({ ...r, _dupe: dupes.has((r.email || "").toLowerCase()) }));
}

/* -------------------------------------------------------
   Layout Shell — steady left nav (persisted)
------------------------------------------------------- */
function AppShell() {
  const [isDark, setIsDark] = useState(false);
  const [navOpen, setNavOpen] = useState<boolean>(() => {
    const v = localStorage.getItem("navOpen");
    return v ? v === "1" : true;
  });
  useEffect(() => {
    localStorage.setItem("navOpen", navOpen ? "1" : "0");
  }, [navOpen]);
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) root.classList.add("dark");
    else root.classList.remove("dark");
  }, [isDark]);

  return (
    <div className="min-h-screen w-full bg-zinc-50 text-zinc-900 transition-colors dark:bg-zinc-900 dark:text-zinc-50">
      <div className="flex">
        <motion.aside
          initial={false}
          animate={{ width: navOpen ? 240 : 64 }}
          transition={{ type: "tween", duration: 0.2 }}
          className="sticky top-0 h-screen flex-none border-r border-zinc-200 bg-zinc-950/95 text-zinc-100 dark:border-zinc-800"
        >
          <div className="flex h-14 items-center gap-2 px-3">
            <Button size="icon" variant="ghost" className="text-zinc-100" onClick={() => setNavOpen((v) => !v)} aria-label="Toggle sidebar">
              {navOpen ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
            </Button>
            <div className={cx("text-lg font-semibold", navOpen ? "block" : "hidden")}>FLOWer</div>
          </div>
          <nav className="mt-2 space-y-1 px-2">
            <NavItem to="/team" icon={<Users className="h-4 w-4" />} label="Team" />
            <NavItem to="/students" icon={<Users className="h-4 w-4" />} label="Students" />
            <NavItem to="/schools" icon={<GraduationCap className="h-4 w-4" />} label="Schools" />
            <NavItem to="/assignments" icon={<ClipboardPaste className="h-4 w-4" />} label="Assignments" />
            <NavItem to="/docs" icon={<FileText className="h-4 w-4" />} label="Documents" />
            <NavItem to="/reports" icon={<BarChart3 className="h-4 w-4" />} label="Reports" />
            <NavItem to="/settings" icon={<Settings className="h-4 w-4" />} label="Settings" />
          </nav>
          <div className="absolute bottom-3 left-0 right-0 px-2">
            <Link to="/ai">
              <Button variant="secondary" className="w-full">
                <Bot className="mr-2 h-4 w-4" />
                {navOpen ? "Ask AI" : null}
              </Button>
            </Link>
          </div>
        </motion.aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b border-zinc-200 bg-white/80 px-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80">
            <div className="flex-1" />
            <Button onClick={() => alert("Manual entry coming soon")}>
              <Plus className="mr-2 h-4 w-4" /> New
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setIsDark(!isDark)} aria-label="Toggle theme">
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
          </header>

          <main className="mx-auto w-full max-w-7xl flex-1 p-4 md:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

function NavItem({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link to={to}>
      <Button variant="ghost" className="w-full justify-start gap-2 overflow-hidden text-zinc-200 hover:bg-zinc-800/60 hover:text-zinc-100">
        <span className="grid h-5 w-5 place-items-center">{icon}</span>
        <span className="truncate">{label}</span>
      </Button>
    </Link>
  );
}

/* -------------------------------------------------------
   Small shared UI
------------------------------------------------------- */
function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative w-full">
      <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 opacity-60" />
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="pl-8" />
    </div>
  );
}
function Segmented({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex rounded-lg border bg-white p-0.5 dark:border-zinc-800 dark:bg-zinc-900">
      {options.map((opt) => (
        <Button key={opt} variant={value === opt ? "secondary" : "ghost"} className="px-3" onClick={() => onChange(opt)}>
          {opt}
        </Button>
      ))}
    </div>
  );
}
function ViewToggle({ value, onChange }: { value: "card" | "list"; onChange: (v: "card" | "list") => void }) {
  return (
    <div className="flex rounded-lg border bg-white p-0.5 dark:border-zinc-800 dark:bg-zinc-900">
      <Button variant={value === "card" ? "secondary" : "ghost"} size="icon" aria-pressed={value === "card"} onClick={() => onChange("card")}>
        <LayoutGrid className="h-4 w-4" />
      </Button>
      <Button variant={value === "list" ? "secondary" : "ghost"} size="icon" aria-pressed={value === "list"} onClick={() => onChange("list")}>
        <ListIcon className="h-4 w-4" />
      </Button>
    </div>
  );
}
function Info({ label, value, link, external, children }: { label: string; value?: React.ReactNode; link?: string; external?: boolean; children?: React.ReactNode }) {
  return (
    <div className="text-sm">
      <div className="text-xs uppercase tracking-wide text-zinc-500">{label}</div>
      {children ? (
        children
      ) : link && value ? (
        <a className="text-blue-600 hover:underline dark:text-blue-400" href={link} target={external ? "_blank" : undefined} rel="noreferrer">
          {value}
        </a>
      ) : (
        <div className="text-zinc-900 dark:text-zinc-100">{value || <span className="text-zinc-400">—</span>}</div>
      )}
    </div>
  );
}
function AllFields({ obj, omit = [] as string[] }: { obj: Record<string, any>; omit?: string[] }) {
  const entries = Object.entries(obj).filter(([k]) => !omit.includes(k));
  if (!entries.length) return null;
  return (
    <div className="rounded-lg border p-3 text-sm dark:border-zinc-800">
      <div className="mb-2 font-medium">All fields</div>
      <div className="grid gap-2 md:grid-cols-2">
        {entries.map(([k, v]) => (
          <div key={k} className="flex items-start gap-2">
            <div className="w-40 shrink-0 text-xs uppercase tracking-wide text-zinc-500">{k}</div>
            <div className="break-words text-zinc-900 dark:text-zinc-100">{String(v ?? "—")}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------
   TEAM
------------------------------------------------------- */
function TeamListPage() {
  const [teamData, setTeamData] = useState<TeamMember[]>(() => load("team", TEAM).map((m) => ({ ...m, roles: canonRoles(m.roles) })));
  useEffect(() => { save("team", teamData); }, [teamData]);

  const [q, setQ] = useState("");
  const [scope, setScope] = useState<"all" | "cm" | "noncm">("all");
  const [view, setView] = useState<"card" | "list">("card");
  const [editItem, setEditItem] = useState<TeamMember | null>(null);

  const rows = useMemo(() => {
    const qq = q.toLowerCase();
    return teamData
      .filter((m) => {
        const inScope = scope === "all" ? true : scope === "cm" ? isCM(m) : !isCM(m);
        if (!inScope) return false;
        const hay = [m.name, m.familiarName, m.email, m.phone, ...(m.roles || [])].join(" ").toLowerCase();
        return hay.includes(qq);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [q, scope, teamData]);

  return (
    <>
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> CSSP Team</CardTitle>
            <ViewToggle value={view} onChange={setView} />
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            <SearchBox value={q} onChange={setQ} placeholder="Search team by name, role, email, phone…" />
            <div className="flex items-center gap-2">
              <Segmented options={["All", "CMs", "Non-CMs"]} value={scope === "all" ? "All" : scope === "cm" ? "CMs" : "Non-CMs"} onChange={(v) => setScope(v === "All" ? "all" : v === "CMs" ? "cm" : "noncm")} />
            </div>
            <div />
          </div>
        </CardHeader>

        <CardContent>
          {rows.length === 0 ? (
            <div className="text-sm text-zinc-500">No team members match your search/filter.</div>
          ) : view === "card" ? (
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
              {rows.map((m) => (
                <div key={m.id} className="rounded-xl border p-3 dark:border-zinc-800">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-full bg-zinc-200 text-sm font-semibold text-zinc-800 dark:bg-zinc-700 dark:text-zinc-50">
                        {initials(m.name).toUpperCase()}
                      </div>
                      <div className="font-medium">{formatName(m)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link to={`/team/${encodeURIComponent(m.id)}`} className="text-xs text-blue-600 hover:underline dark:text-blue-400">Profile</Link>
                      <Button size="icon" variant="ghost" aria-label="Edit" onClick={() => setEditItem(m)}><Pencil className="h-4 w-4" /></Button>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {(m.roles || []).length ? (m.roles || []).map((r) => <Badge key={r} variant="secondary" className="text-xs">{canonRole(r)}</Badge>) : <Badge variant="outline" className="text-xs">Unspecified</Badge>}
                  </div>
                  <div className="mt-3 grid gap-1 text-sm">
                    {m.email && <a className="inline-flex items-center gap-2 text-blue-600 hover:underline dark:text-blue-400" href={`mailto:${m.email}`} onClick={(e) => e.stopPropagation()}><Mail className="h-3.5 w-3.5" /> {m.email}</a>}
                    {m.phone && <a className="inline-flex items-center gap-2 text-blue-600 hover:underline dark:text-blue-400" href={`tel:${m.phone}`} onClick={(e) => e.stopPropagation()}><Phone className="h-3.5 w-3.5" /> {m.phone}</a>}
                    {m.intake && <div className="text-xs text-zinc-500">Intake: {m.intake}</div>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[220px]">Name</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Intake</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{formatName(m)}</TableCell>
                      <TableCell>{(m.roles || []).length ? (m.roles || []).map(canonRole).join(", ") : <span className="text-zinc-400">—</span>}</TableCell>
                      <TableCell>{m.email || <span className="text-zinc-400">—</span>}</TableCell>
                      <TableCell>{m.phone || <span className="text-zinc-400">—</span>}</TableCell>
                      <TableCell>{m.intake || <span className="text-zinc-400">—</span>}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Link to={`/team/${encodeURIComponent(m.id)}`} className="text-xs text-blue-600 hover:underline dark:text-blue-400">Profile</Link>
                          <Button size="icon" variant="ghost" aria-label="Edit" onClick={() => setEditItem(m)}><Pencil className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <TeamEditDrawer
        open={!!editItem}
        value={editItem as TeamMember | null}
        onOpenChange={(o) => !o && setEditItem(null)}
        onSave={(updated) => {
          updated.roles = canonRoles(updated.roles as any);
          setTeamData((prev) => upsertById(prev, updated));
          setEditItem(null);
        }}
      />
    </>
  );
}
function formatName(m: TeamMember) {
  return m.familiarName && m.familiarName.trim() && !m.name.toLowerCase().includes(m.familiarName.toLowerCase())
    ? `${m.name} (${m.familiarName})` : m.name;
}
function TeamEditDrawer({ open, onOpenChange, value, onSave }: { open: boolean; onOpenChange: (open: boolean) => void; value: TeamMember | null; onSave: (m: TeamMember) => void; }) {
  const [form, setForm] = useState<TeamMember | null>(value);
  useEffect(() => setForm(value), [value]);
  if (!form) return null;
  const set = (k: keyof TeamMember, v: any) => setForm({ ...form, [k]: v });
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[520px] sm:w-[620px]">
        <SheetHeader><SheetTitle>Edit Team Member</SheetTitle><SheetDescription>Update details and save to local storage.</SheetDescription></SheetHeader>
        <div className="mt-4 space-y-3">
          <div className="grid gap-2"><Label>Full name</Label><Input value={form.name || ""} onChange={(e) => set("name", e.target.value)} /></div>
          <div className="grid gap-2"><Label>Nickname (familiar name)</Label><Input value={form.familiarName || ""} onChange={(e) => set("familiarName", e.target.value)} /></div>
          <div className="grid gap-2 md:grid-cols-2">
            <div><Label>Email</Label><Input value={form.email || ""} onChange={(e) => set("email", e.target.value)} /></div>
            <div><Label>Phone</Label><Input value={form.phone || ""} onChange={(e) => set("phone", e.target.value)} /></div>
          </div>
          <div className="grid gap-2"><Label>Roles (comma-separated)</Label>
            <Input value={(form.roles || []).join(", ")} onChange={(e) => set("roles", e.target.value.split(",").map((s) => s.trim()).filter(Boolean).map(canonRole))} />
          </div>
          <div className="grid gap-2"><Label>Intake</Label><Input value={form.intake || ""} onChange={(e) => set("intake", e.target.value)} /></div>
        </div>
        <SheetFooter className="mt-6">
          <div className="flex w-full justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={() => onSave(form!)}>Save</Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/* -------------------------------------------------------
   SCHOOLS (campus-aware)
------------------------------------------------------- */
function campusDisplayName(k: SchoolType, all: SchoolType[]) {
  const base = (k.name || "").trim();
  if (!base) return base;
  const peers = all.filter((s) => (s.name || "").trim().toLowerCase() === base.toLowerCase());
  if (peers.length > 1) {
    const city = (k.city || "").trim();
    if (city) return `${base} at ${city}`;
  }
  return base;
}
function SchoolsListPage() {
  const [schoolsData, setSchoolsData] = useState<SchoolType[]>(() => load("schools", SCHOOLS));
  useEffect(() => { save("schools", schoolsData); }, [schoolsData]);

  const [q, setQ] = useState("");
  const [stateFilter, setStateFilter] = useState<string>("All");
  const [openFilter, setOpenFilter] = useState<"All" | "Open" | "Closed">("All");
  const [view, setView] = useState<"card" | "list">("list");
  const [importOpen, setImportOpen] = useState(false);

  const states = useMemo(() => {
    const s = new Set<string>();
    schoolsData.forEach((k) => { const st = asText((k as any).state); if (st) s.add(st); });
    return ["All", ...Array.from(s).sort((a, b) => a.localeCompare(b))];
  }, [schoolsData]);

  const rows = useMemo<SchoolType[]>(() => {
    const qq = q.toLowerCase();
    return [...schoolsData]
      .filter((k) => {
        const stateStr = asText((k as any).state);
        const hay = [k.name, k.acronym, k.city, stateStr, k.vendorCode, (k as any).status, (k as any).openClosed, (k as any).open, (k as any).isOpen, k.website].filter(Boolean).join(" ").toLowerCase();
        const stOk = stateFilter === "All" ? true : stateStr.toLowerCase() === stateFilter.toLowerCase();
        const oc = inferOpenClosed(k as any);
        const ocOk = openFilter === "All" ? true : openFilter === "Open" ? oc === "open" : oc === "closed";
        return hay.includes(qq) && stOk && ocOk;
      })
      .sort((a, b) => {
        const na = (a.name || "").toLowerCase();
        const nb = (b.name || "").toLowerCase();
        if (na === nb) return (a.city || "").localeCompare(b.city || "");
        return na.localeCompare(nb);
      });
  }, [q, stateFilter, openFilter, schoolsData]);

  function handleImport(newRows: any[], mode: "replace" | "append") {
    const normalized = newRows
      .map((r, idx) => {
        const name = (r.name || r.InstitutionName || r.Name || r.School || "").toString().trim();
        const state = asText(r.state ?? r.State ?? r["State/Province"] ?? r.StateProvince ?? r.Province ?? "");
        const website = r.website || r.Website;
        const item = {
          id: r.id ?? r.Id ?? r.ID ?? `S-${Date.now()}-${idx}`,
          name,
          acronym: r.acronym || r.Acronym || r.Abbreviation || "",
          city: r.city || r.City || "",
          state,
          vendorCode: r.vendorCode || r.VendorCode || r.Vendor || "",
          website: website ? (/^https?:\/\//i.test(website) ? website : `https://${website}`) : "",
          ...r,
        } as SchoolType;
        ["state", "State", "State/Province", "StateProvince", "Province"].forEach((k) => ((item as any)[k] = state));
        return item;
      })
      .filter((s) => {
        const n = (s.name || "").trim().toLowerCase();
        if (!n) return false;
        if (["institutionname", "name", "school"].includes(n)) return false;
        return true;
      });

    const merged = mode === "replace" ? normalized : [...schoolsData, ...normalized];

    const seen = new Set<string>();
    const deduped = merged.filter((k) => {
      const key = [(k.name || "").toLowerCase(), (k.city || "").toLowerCase(), (asText((k as any).state) || "").toLowerCase()].join("|");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    setSchoolsData(deduped);
  }

  return (
    <>
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2"><GraduationCap className="h-5 w-5" /> Schools</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setImportOpen(true)}>Import</Button>
              <ViewToggle value={view} onChange={setView} />
            </div>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            <SearchBox value={q} onChange={setQ} placeholder="Search schools by name, city, state, vendor, website…" />
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="outline" className="whitespace-nowrap"><Filter className="mr-2 h-4 w-4" /> State: {stateFilter}</Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end">{states.map((st) => <DropdownMenuItem key={st} onClick={() => setStateFilter(st)}>{st}</DropdownMenuItem>)}</DropdownMenuContent>
              </DropdownMenu>
              <Segmented options={["All", "Open", "Closed"]} value={openFilter} onChange={(v) => setOpenFilter(v as any)} />
            </div>
            <div />
          </div>
        </CardHeader>

        <CardContent>
          {rows.length === 0 ? (
            <div className="text-sm text-zinc-500">No schools match your search/filter.</div>
          ) : view === "list" ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[260px]">Name</TableHead>
                    <TableHead>Acronym</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Website</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((k) => {
                    const oc = inferOpenClosed(k as any);
                    const displayName = campusDisplayName(k, schoolsData);
                    return (
                      <TableRow key={k.id}>
                        <TableCell className="font-medium">{displayName}</TableCell>
                        <TableCell>{k.acronym}</TableCell>
                        <TableCell>{k.city}</TableCell>
                        <TableCell>{asText((k as any).state)}</TableCell>
                        <TableCell>{k.vendorCode}</TableCell>
                        <TableCell>
                          {oc ? (
                            <span className={cx("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold text-white", oc === "open" ? "bg-emerald-600" : "bg-rose-600")}>
                              {oc === "open" ? "Open" : "Closed"}
                            </span>
                          ) : <span className="text-zinc-400">—</span>}
                        </TableCell>
                        <TableCell>
                          {k.website ? (
                            <a className="inline-flex items-center gap-1 text-blue-600 hover:underline dark:text-blue-400" href={/^https?:\/\//i.test(k.website) ? k.website : `https://${k.website}`} target="_blank" rel="noreferrer">
                              <Globe className="h-3.5 w-3.5" /> Visit
                            </a>
                          ) : <span className="text-zinc-400">—</span>}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Link to={`/schools/${encodeURIComponent(k.id)}`} className="text-xs text-blue-600 hover:underline dark:text-blue-400">Profile</Link>
                            <Button size="icon" variant="ghost" aria-label="Edit" onClick={() => {}}><Pencil className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
              {rows.map((k) => {
                const oc = inferOpenClosed(k as any);
                const displayName = campusDisplayName(k, schoolsData);
                return (
                  <div key={k.id} className="rounded-xl border p-3 dark:border-zinc-800">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-medium">{displayName}</div>
                      <div className="flex items-center gap-2">
                        {oc ? (
                          <span className={cx("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold text-white", oc === "open" ? "bg-emerald-600" : "bg-rose-600")}>
                            {oc === "open" ? "Open" : "Closed"}
                          </span>
                        ) : <span className="text-zinc-400 text-xs">—</span>}
                        <Button size="icon" variant="ghost" aria-label="Edit" onClick={() => {}}><Pencil className="h-4 w-4" /></Button>
                      </div>
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">
                      {[k.acronym, k.city && asText((k as any).state) ? `${k.city}, ${asText((k as any).state)}` : asText((k as any).state)].filter(Boolean).join(" • ")}
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="text-xs text-zinc-500">Vendor: {k.vendorCode || "—"}</div>
                      {k.website ? (
                        <a className="inline-flex items-center gap-1 text-blue-600 hover:underline dark:text-blue-400 text-sm" href={/^https?:\/\//i.test(k.website) ? k.website : `https://${k.website}`} target="_blank" rel="noreferrer">
                          <Globe className="h-3.5 w-3.5" /> Visit
                        </a>
                      ) : <span className="text-zinc-400 text-sm">—</span>}
                    </div>
                    <div className="mt-2">
                      <Link to={`/schools/${encodeURIComponent(k.id)}`} className="text-xs text-blue-600 hover:underline dark:text-blue-400">Profile</Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Import Schools"
        description="Paste CSV/TSV or an HTML table with columns like InstitutionName, City, State, Website, VendorCode, etc."
        target="schools"
        onApply={handleImport}
      />
    </>
  );
}
function SchoolProfilePage() {
  const { id } = useParams();
  const data = load<SchoolType[]>("schools", SCHOOLS);
  const k = data.find((x) => String(x.id) === String(id));
  const nav = useNavigate();
  if (!k) return <div className="text-sm text-zinc-500">Not found.</div>;
  const oc = inferOpenClosed(k as any);
  const displayName = campusDisplayName(k, data);
  return (
    <div className="space-y-4">
      <Button variant="ghost" className="gap-2" onClick={() => nav(-1)}><ArrowLeft className="h-4 w-4" /> Back</Button>
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-start justify-between">
            <CardTitle>{displayName}</CardTitle>
            <div>{oc ? <span className={cx("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold text-white", oc === "open" ? "bg-emerald-600" : "bg-rose-600")}>{oc === "open" ? "Open" : "Closed"}</span> : null}</div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 md:grid-cols-2">
            <Info label="Acronym" value={k.acronym} />
            <Info label="City/State" value={[k.city, asText((k as any).state)].filter(Boolean).join(", ")} />
            <Info label="Vendor Code" value={k.vendorCode} />
            <Info label="Website" value={k.website} link={k.website ? (/^https?:\/\//i.test(k.website) ? k.website : `https://${k.website}`) : undefined} external />
          </div>
          <AllFields obj={k} omit={["id", "name", "acronym", "city", "state", "vendorCode", "website"]} />
        </CardContent>
      </Card>
    </div>
  );
}

/* -------------------------------------------------------
   STUDENTS
------------------------------------------------------- */
function StudentsListPage() {
  const [q, setQ] = useState("");
  const [view, setView] = useState<"card" | "list">("list");
  const [sortKey, setSortKey] = useState<"name" | "date">("date");
  const [statusFilter, setStatusFilter] = useState<"All" | "Record Created" | "Record Updated" | "Record Created (Prior)" | "Rejected – Not a PDF">("All");

  const rows = useMemo(() => {
    const filtered = SAMPLE_STUDENTS.filter((s) => {
      const hay = [fullName(s), s.email, s.city, s.county, s.status].join(" ").toLowerCase();
      const qok = hay.includes(q.toLowerCase());
      const sok = statusFilter === "All" ? true : s.status === statusFilter;
      return qok && sok;
    });
    const enriched = findDuplicateEmails(filtered);
    return [...enriched].sort((a: any, b: any) => (sortKey === "name" ? fullName(a).localeCompare(fullName(b)) : new Date(b.appDate).getTime() - new Date(a.appDate).getTime()));
  }, [q, sortKey, statusFilter]);

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Students</CardTitle>
          <ViewToggle value={view} onChange={setView} />
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          <SearchBox value={q} onChange={setQ} placeholder="Search students, email, city, status…" />
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="outline" className="whitespace-nowrap">Sort: {sortKey === "date" ? "Newest" : "Name"}</Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSortKey("date")}>Newest</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortKey("name")}>Name (A→Z)</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="outline" className="whitespace-nowrap"><Filter className="mr-2 h-4 w-4" /> Status: {statusFilter}</Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {["All", "Record Created", "Record Updated", "Record Created (Prior)", "Rejected – Not a PDF"].map((s) => (
                  <DropdownMenuItem key={s} onClick={() => setStatusFilter(s as any)}>{s}</DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div />
        </div>
      </CardHeader>

      <CardContent>
        {rows.length === 0 ? (
          <div className="text-sm text-zinc-500">No students found.</div>
        ) : view === "list" ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[140px]">Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>County</TableHead>
                  <TableHead className="text-right">Applied</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((s: any) => (
                  <TableRow key={s.id} className="cursor-pointer" onClick={() => (window.location.href = `/students/${encodeURIComponent(s.id)}`)}>
                    <TableCell className="flex items-center gap-2 font-medium">
                      {fullName(s)}
                      {(s as any)._dupe && <Badge variant="secondary" className="gap-1"><BadgeAlert className="h-3 w-3" /> Possible duplicate</Badge>}
                    </TableCell>
                    <TableCell>{s.email}</TableCell>
                    <TableCell>{s.city}</TableCell>
                    <TableCell>{s.county}</TableCell>
                    <TableCell className="text-right tabular-nums">{new Date(s.appDate).toLocaleDateString()}</TableCell>
                    <TableCell><span className={cx("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold text-white", STATUS_COLOR[s.status] || "bg-zinc-600")}>{s.status}</span></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
            {rows.map((s: any) => (
              <Link key={s.id} to={`/students/${encodeURIComponent(s.id)}`}>
                <div className="rounded-xl border p-3 transition-colors dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                  <div className="font-medium">{fullName(s)}</div>
                  <div className="mt-1 text-xs text-zinc-500">{[s.city, s.county].filter(Boolean).join(" • ")}</div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-xs">{s.email}</div>
                    <span className={cx("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold text-white", STATUS_COLOR[s.status] || "bg-zinc-600")}>{s.status}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
function StudentProfilePage() {
  const { id } = useParams();
  const s = SAMPLE_STUDENTS.find((x) => String(x.id) === String(id));
  const nav = useNavigate();
  if (!s) return <div className="text-sm text-zinc-500">Not found.</div>;

  return (
    <div className="space-y-4">
      <Button variant="ghost" className="gap-2" onClick={() => nav(-1)}><ArrowLeft className="h-4 w-4" /> Back</Button>

      {/* Overview */}
      <Card className="shadow-sm">
        <CardHeader><CardTitle>{`${s.firstName} ${s.lastName}`}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 md:grid-cols-2">
            <Info label="Email" value={s.email} link={s.email ? `mailto:${s.email}` : undefined} />
            <Info label="City" value={s.city} />
            <Info label="County" value={s.county} />
            <Info label="Applied" value={new Date(s.appDate).toLocaleDateString()} />
            <Info label="Status">
              <span className={cx("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold text-white", STATUS_COLOR[s.status] || "bg-zinc-600")}>{s.status}</span>
            </Info>
          </div>
          <AllFields obj={s} omit={["id", "firstName", "lastName", "email", "city", "county", "appDate", "status"]} />
        </CardContent>
      </Card>

      {/* Stages as Tabs */}
      <Tabs defaultValue="intake" className="w-full">
        <TabsList className="mb-2">
          <TabsTrigger value="intake">Intake</TabsTrigger>
          <TabsTrigger value="enrollment">Enrollment</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
        </TabsList>

        <TabsContent value="intake">
          <IntakeChecklist studentId={id!} />
        </TabsContent>
        <TabsContent value="enrollment">
          <EnrollmentChecklist studentId={id!} />
        </TabsContent>
        <TabsContent value="maintenance">
          <MaintenanceChecklist studentId={id!} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* -------------------------------------------------------
   AI Panel (demo)
------------------------------------------------------- */
function AiPanel() {
  const [aiOpen, setAiOpen] = useState(true);
  const [aiPrompt, setAiPrompt] = useState("Suggest possible duplicates and missing fields.");
  const [aiResult, setAiResult] = useState<string>("");
  const [aiBusy, setAiBusy] = useState(false);

  async function runAI() {
    setAiBusy(true); setAiResult(""); await new Promise((r) => setTimeout(r, 600));
    const grouped: Record<string, any[]> = {};
    SAMPLE_STUDENTS.forEach((r) => { const k = (r.email || "").toLowerCase(); (grouped[k] = grouped[k] || []).push(r); });
    const lines: string[] = [];
    Object.entries(grouped).forEach(([email, items]) => {
      if (email && items.length > 1) lines.push(`• Possible duplicate group for ${email} → ${items.map((x) => x.id).join(", ")}`);
    });
    if (!lines.length) lines.push("• No obvious duplicate groups detected.");
    setAiResult(lines.join("\n")); setAiBusy(false);
  }

  return (
    <Dialog open={aiOpen} onOpenChange={setAiOpen}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader><DialogTitle>AI assistant (local-friendly)</DialogTitle><DialogDescription>Runs without vendor lock-in. Swap to your own API later.</DialogDescription></DialogHeader>
        <div className="grid gap-3">
          <Label htmlFor="prompt">Prompt</Label>
          <Textarea id="prompt" value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} rows={4} />
          <div className="flex items-center gap-2">
            <Button onClick={runAI} disabled={aiBusy}><Bot className="mr-2 h-4 w-4" /> {aiBusy ? "Thinking…" : "Run"}</Button>
            <span className="text-xs text-zinc-500">This demo analyzes sample Students.</span>
          </div>
          <Label>Result</Label>
          <pre className="max-h-64 overflow-auto rounded-lg border bg-zinc-50 p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900">
{aiResult || "(no output yet)"}
          </pre>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------
   Router
------------------------------------------------------- */
const router = createBrowserRouter([
  { path: "/", element: <AppShell />, children: [
      { index: true, element: <TeamListPage /> },
      { path: "team", element: <TeamListPage /> },
      { path: "team/:id", element: <TeamProfilePage /> },
      { path: "schools", element: <SchoolsListPage /> },
      { path: "schools/:id", element: <SchoolProfilePage /> },
      { path: "students", element: <StudentsListPage /> },
      { path: "students/:id", element: <StudentProfilePage /> },
      { path: "assignments", element: <div className="grid place-items-center rounded-2xl border border-dashed p-16 text-sm text-zinc-500 dark:border-zinc-800">Assignments coming soon. (CMs detected: {CM_NAMES.length})</div> },
      { path: "docs", element: <div className="grid place-items-center rounded-2xl border border-dashed p-16 text-sm text-zinc-500 dark:border-zinc-800">Documents coming soon.</div> },
      { path: "reports", element: <div className="grid place-items-center rounded-2xl border border-dashed p-16 text-sm text-zinc-500 dark:border-zinc-800">Reports coming soon.</div> },
      { path: "settings", element: <div className="grid place-items-center rounded-2xl border border-dashed p-16 text-sm text-zinc-500 dark:border-zinc-800">Settings coming soon.</div> },
      { path: "ai", element: <AiPanel /> },
  ]},
]);
export default function App() { return <RouterProvider router={router} />; }
