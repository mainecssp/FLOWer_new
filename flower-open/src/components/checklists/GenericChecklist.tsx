import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { Filter, MoreHorizontal, Link as LinkIcon } from "lucide-react";

/** ---------- Types ---------- */
export type ChecklistStatus =
  | "requested"
  | "received"
  | "verified"
  | "waived"
  | "not_applicable";

export interface ChecklistTemplate {
  key: string;
  label: string;
  required: boolean;           // kept for future logic, not shown as a column
  description?: string;
}

export interface ChecklistItemState {
  key: string;
  label: string;
  required: boolean;
  status: ChecklistStatus;
  requestedOn?: string;
  receivedOn?: string;
  verifiedOn?: string;
  notes?: string;
  linkUrl?: string;
  linkLabel?: string;
}

/** ---------- Labels / colors / progress ---------- */
const STATUS_LABEL: Record<ChecklistStatus, string> = {
  requested: "Requested",
  received: "Received",
  verified: "Verified",
  waived: "Waived",
  not_applicable: "N/A",
};

const STATUS_COLOR: Record<ChecklistStatus, string> = {
  requested: "bg-amber-600",
  received: "bg-blue-600",
  verified: "bg-emerald-600",
  waived: "bg-zinc-600",
  not_applicable: "bg-zinc-400",
};

// Linear progression: Requested → Received → Verified.
// Waived and N/A treated as complete for now.
const STATUS_PROGRESS: Record<ChecklistStatus, number> = {
  requested: 33,
  received: 66,
  verified: 100,
  waived: 100,
  not_applicable: 100,
};

/** ---------- Utils ---------- */
function nowISO() {
  return new Date().toISOString();
}

function initFromTemplates(templates: ChecklistTemplate[]): ChecklistItemState[] {
  return templates.map((t) => ({
    key: t.key,
    label: t.label,
    required: t.required,
    status: "requested",
  }));
}

function loadItems(storageKey: string, templates: ChecklistTemplate[]): ChecklistItemState[] {
  const raw = localStorage.getItem(storageKey);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as ChecklistItemState[];
      const byKey = new Map(parsed.map((p) => [p.key, p]));
      // merge with any new/changed templates
      return templates.map((t) => byKey.get(t.key) || { key: t.key, label: t.label, required: t.required, status: "requested" });
    } catch {
      // fall through
    }
  }
  return initFromTemplates(templates);
}

function saveItems(storageKey: string, items: ChecklistItemState[]) {
  localStorage.setItem(storageKey, JSON.stringify(items));
}

const cx = (...xs: (string | false | null | undefined)[]) => xs.filter(Boolean).join(" ");

/** ---------- Component ---------- */
export function GenericChecklist({
  studentId,
  storageKeyPrefix,
  title,                 // e.g., "Intake" (no Stage number)
  templates,
}: {
  studentId: string;
  storageKeyPrefix: "intake" | "enrollment" | "maintenance" | string;
  title: string;
  templates: ChecklistTemplate[];
}) {
  const storageKey = `${storageKeyPrefix}:${studentId}`;
  const [items, setItems] = React.useState<ChecklistItemState>(() => loadItems(storageKey, templates));
  const [q, setQ] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"All" | ChecklistStatus>("All");

  // persist
  React.useEffect(() => {
    saveItems(storageKey, items);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, storageKey]);

  // reconcile if templates change
  React.useEffect(() => {
    setItems((prev) => {
      const byKey = new Map(prev.map((p) => [p.key, p]));
      return templates.map((t) => {
        const old = byKey.get(t.key);
        if (!old) return { key: t.key, label: t.label, required: t.required, status: "requested" };
        return { ...old, label: t.label, required: t.required };
      });
    });
  }, [templates]);

  const rows = React.useMemo(() => {
    const qq = q.toLowerCase();
    return items.filter((it) => {
      const hay = [it.label, STATUS_LABEL[it.status], it.notes, it.linkLabel, it.linkUrl].filter(Boolean).join(" ").toLowerCase();
      const qOK = hay.includes(qq);
      const fOK = statusFilter === "All" ? true : it.status === statusFilter;
      return qOK && fOK;
    });
  }, [items, q, statusFilter]);

  function setStatus(idx: number, status: ChecklistStatus) {
    setItems((prev) => {
      const copy = [...prev];
      const it = { ...copy[idx] };
      it.status = status;
      if (status === "requested") it.requestedOn = it.requestedOn || nowISO();
      if (status === "received") it.receivedOn = nowISO();
      if (status === "verified") it.verifiedOn = nowISO();
      copy[idx] = it;
      return copy;
    });
  }

  function setLink(idx: number, linkUrl: string, linkLabel?: string) {
    setItems((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], linkUrl: linkUrl || undefined, linkLabel: (linkLabel || "").trim() || undefined };
      return copy;
    });
  }

  function markAll(status: ChecklistStatus) {
    setItems((prev) =>
      prev.map((it) => {
        const n = { ...it, status };
        if (status === "requested") n.requestedOn = n.requestedOn || nowISO();
        if (status === "received") n.receivedOn = nowISO();
        if (status === "verified") n.verifiedOn = nowISO();
        return n;
      })
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>{title}</CardTitle>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="whitespace-nowrap">
                  <Filter className="mr-2 h-4 w-4" />
                  Status: {statusFilter === "All" ? "All" : STATUS_LABEL[statusFilter]}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setStatusFilter("All")}>All</DropdownMenuItem>
                {Object.entries(STATUS_LABEL).map(([k, v]) => (
                  <DropdownMenuItem key={k} onClick={() => setStatusFilter(k as ChecklistStatus)}>
                    {v}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search items…" className="w-56" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Bulk actions">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => markAll("requested")}>Mark all Requested</DropdownMenuItem>
                <DropdownMenuItem onClick={() => markAll("received")}>Mark all Received</DropdownMenuItem>
                <DropdownMenuItem onClick={() => markAll("verified")}>Mark all Verified</DropdownMenuItem>
                <DropdownMenuItem onClick={() => markAll("waived")}>Mark all Waived</DropdownMenuItem>
                <DropdownMenuItem onClick={() => markAll("not_applicable")}>Mark all N/A</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {rows.length === 0 ? (
          <div className="text-sm text-zinc-500">No items match your search/filter.</div>
        ) : (
          <Accordion type="multiple" className="w-full">
            {rows.map((it, i) => {
              const progress = STATUS_PROGRESS[it.status] ?? 0;
              return (
                <AccordionItem key={it.key} value={it.key} className="mb-2 rounded-lg border dark:border-zinc-800">
                  <div className="px-3 pt-2">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="truncate font-medium">{it.label}</div>
                        {/** optional helper text */}
                        {/* {it.description ? <div className="text-xs text-zinc-500">{it.description}</div> : null} */}
                      </div>
                      <div className="flex items-center gap-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="outline" className="gap-2">
                              <span className={`inline-block h-2 w-2 rounded-full ${STATUS_COLOR[it.status]}`} />
                              {STATUS_LABEL[it.status]}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {Object.entries(STATUS_LABEL).map(([k, v]) => (
                              <DropdownMenuItem key={k} onClick={() => setStatus(i, k as ChecklistStatus)}>
                                {v}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Badge variant="secondary" className="whitespace-nowrap">{progress}%</Badge>
                      </div>
                    </div>

                    <div className="mt-2">
                      <Progress value={progress} className="h-2" />
                    </div>
                  </div>

                  <AccordionTrigger className="px-3 text-sm hover:no-underline">
                    <span className="text-zinc-600 dark:text-zinc-300">Details</span>
                  </AccordionTrigger>

                  <AccordionContent>
                    <div className="grid gap-3 px-3 pb-3 md:grid-cols-2">
                      <div className="space-y-2">
                        <div className="text-xs uppercase tracking-wide text-zinc-500">Attachment URL</div>
                        <Input
                          type="url"
                          placeholder="https://… (SharePoint or other link)"
                          value={it.linkUrl || ""}
                          onChange={(e) => setLink(i, e.target.value, it.linkLabel)}
                        />
                        <div className="text-xs uppercase tracking-wide text-zinc-500">Link label (optional)</div>
                        <Input
                          placeholder="e.g., Signed PDF"
                          value={it.linkLabel || ""}
                          onChange={(e) => setLink(i, it.linkUrl || "", e.target.value)}
                        />
                        {it.linkUrl ? (
                          <a
                            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline dark:text-blue-400"
                            href={it.linkUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <LinkIcon className="h-4 w-4" /> Open attachment
                          </a>
                        ) : null}
                      </div>
                      <div className="space-y-2">
                        <div className="text-xs uppercase tracking-wide text-zinc-500">Notes</div>
                        <Textarea
                          rows={6}
                          placeholder="Add notes…"
                          value={it.notes || ""}
                          onChange={(e) =>
                            setItems((prev) => {
                              const copy = [...prev];
                              copy[i] = { ...copy[i], notes: e.target.value };
                              return copy;
                            })
                          }
                        />
                        <div className="grid grid-cols-3 gap-2 text-xs text-zinc-500">
                          <div>Requested: {it.requestedOn ? new Date(it.requestedOn).toLocaleDateString() : "—"}</div>
                          <div>Received: {it.receivedOn ? new Date(it.receivedOn).toLocaleDateString() : "—"}</div>
                          <div>Verified: {it.verifiedOn ? new Date(it.verifiedOn).toLocaleDateString() : "—"}</div>
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}
