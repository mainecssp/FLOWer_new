import * as React from "react";

type Mode = "single" | "multiple";
type AccordionCtx = {
  open: Set<string>;
  toggle: (v: string) => void;
  type: Mode;
};
const Ctx = React.createContext<AccordionCtx | null>(null);

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export function Accordion({
  type = "single",
  defaultValue,
  value,
  onValueChange,
  className,
  children,
}: {
  type?: Mode;
  defaultValue?: string | string[];
  value?: string | string[];
  onValueChange?: (v: string | string[]) => void;
  className?: string;
  children?: React.ReactNode;
}) {
  const initial =
    typeof value !== "undefined"
      ? new Set(Array.isArray(value) ? value : value ? [value] : [])
      : new Set(
          Array.isArray(defaultValue)
            ? defaultValue
            : defaultValue
            ? [defaultValue]
            : []
        );

  const [internal, setInternal] = React.useState<Set<string>>(initial);
  const open = typeof value !== "undefined" ? initial : internal;

  const setOpen = (next: Set<string>) => {
    if (typeof value === "undefined") setInternal(next);
    onValueChange?.(type === "single" ? Array.from(next)[0] ?? "" : Array.from(next));
  };

  const toggle = (v: string) => {
    const next = new Set(open);
    if (type === "single") {
      if (next.has(v)) next.clear();
      else {
        next.clear();
        next.add(v);
      }
    } else {
      next.has(v) ? next.delete(v) : next.add(v);
    }
    setOpen(next);
  };

  return (
    <div className={className}>
      <Ctx.Provider value={{ open, toggle, type }}>{children}</Ctx.Provider>
    </div>
  );
}

export function AccordionItem({
  value,
  className,
  children,
}: {
  value: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div data-accordion-item="" data-value={value} className={cx("rounded-lg border", className)}>
      {children}
    </div>
  );
}

export function AccordionTrigger({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("AccordionTrigger must be used within <AccordionItem>");
  // value is read from closest parent item’s dataset
  return (
    <button
      type="button"
      className={cx(
        "w-full text-left px-3 py-2 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded-b-none rounded-t-lg",
        className
      )}
      onClick={(e) => {
        const item = (e.currentTarget.closest("[data-accordion-item]") as HTMLElement)!;
        const v = item.dataset.value!;
        ctx.toggle(v);
      }}
    >
      {children}
    </button>
  );
}

export function AccordionContent({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("AccordionContent must be used within <AccordionItem>");
  return (
    <div
      className={cx("rounded-b-lg border-t px-3 pb-3 pt-2 dark:border-zinc-800", className)}
      data-accordion-content
      style={{ display: "block" }}
      hidden={
        (() => {
          // read value from parent item
          const container = (typeof document !== "undefined"
            ? (document.currentScript as any)?.closest?.("[data-accordion-item]")
            : null) as HTMLElement | null;
          return false;
        })()
      }
    >
      {/* visibility controlled by the parent item’s value */}
      <AccordionOpenBoundary>{children}</AccordionOpenBoundary>
    </div>
  );
}

/** Helper to hide/show based on parent item’s value + context */
function AccordionOpenBoundary({ children }: { children?: React.ReactNode }) {
  const ctx = React.useContext(Ctx)!;
  const ref = React.useRef<HTMLDivElement>(null);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const el = ref.current?.closest("[data-accordion-item]") as HTMLElement | null;
    if (!el) return;
    const v = el.dataset.value!;
    setOpen(ctx.open.has(v));
  }, [ctx.open]);

  return (
    <div ref={ref} style={{ display: open ? "block" : "none" }}>
      {children}
    </div>
  );
}
