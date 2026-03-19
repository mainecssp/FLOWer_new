import * as React from "react";

/** lightweight, dependency-free Tabs that mimics shadcn’s API */
type TabsCtx = {
  value: string;
  setValue: (v: string) => void;
};
const Ctx = React.createContext<TabsCtx | null>(null);

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export function Tabs({
  value,
  defaultValue,
  onValueChange,
  className,
  children,
}: {
  value?: string;
  defaultValue?: string;
  onValueChange?: (v: string) => void;
  className?: string;
  children?: React.ReactNode;
}) {
  const [internal, setInternal] = React.useState<string>(defaultValue || "");
  const current = value ?? internal;
  const setValue = (v: string) => {
    onValueChange?.(v);
    if (value === undefined) setInternal(v);
  };
  return (
    <div className={className}>
      <Ctx.Provider value={{ value: current, setValue }}>{children}</Ctx.Provider>
    </div>
  );
}

export function TabsList({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      role="tablist"
      className={cx(
        "inline-flex items-center gap-1 rounded-lg border bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900",
        className
      )}
    >
      {children}
    </div>
  );
}

export function TabsTrigger({
  value,
  children,
  className,
}: {
  value: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("TabsTrigger must be used within <Tabs>");
  const active = ctx.value === value;
  return (
    <button
      role="tab"
      aria-selected={active}
      data-state={active ? "active" : "inactive"}
      className={cx(
        "px-3 py-1.5 text-sm rounded-md",
        active
          ? "bg-zinc-100 dark:bg-zinc-800 font-medium"
          : "hover:bg-zinc-100 dark:hover:bg-zinc-800",
        className
      )}
      onClick={() => ctx.setValue(value)}
      type="button"
    >
      {children}
    </button>
  );
}

export function TabsContent({
  value,
  children,
  className,
  keepMounted = true,
}: {
  value: string;
  children?: React.ReactNode;
  className?: string;
  /** keepMounted=true keeps DOM for better performance with forms */
  keepMounted?: boolean;
}) {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("TabsContent must be used within <Tabs>");
  const active = ctx.value === value;
  if (!keepMounted && !active) return null;
  return (
    <div
      role="tabpanel"
      hidden={!active}
      className={cx(active ? "block" : "hidden", className)}
    >
      {children}
    </div>
  );
}

export default Tabs;
