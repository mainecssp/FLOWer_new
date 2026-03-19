import * as React from "react";

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export function Progress({
  value = 0,
  className,
  label,
}: {
  value?: number; // 0..100
  className?: string;
  label?: string;
}) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={v}
      className={cx("h-2 w-full overflow-hidden rounded bg-zinc-200 dark:bg-zinc-800", className)}
    >
      <div
        className="h-full bg-emerald-600 transition-[width]"
        style={{ width: `${v}%` }}
        aria-label={label}
      />
    </div>
  );
}

export default Progress;
