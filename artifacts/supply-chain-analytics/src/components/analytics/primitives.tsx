import { type ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Download, Info, TriangleAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const CHART_COLORS = {
  teal: "#139c91",
  blue: "#4f83cc",
  coral: "#e77661",
  amber: "#d9a441",
  ink: "#263a52",
};

export function formatNumber(value: number | undefined, digits = 0) {
  if (value === undefined || value === null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(value);
}

export function formatPercent(value: number | undefined, digits = 1) {
  if (value === undefined || value === null || Number.isNaN(value)) return "—";
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatDate(value: string | undefined) {
  if (!value) return "—";
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(year, month - 1, day));
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex min-h-[180px] flex-col items-center justify-center px-5 py-8 text-center">
      <div className="mb-3 grid size-10 place-items-center border border-dashed border-border text-muted-foreground">
        <Info className="size-4" />
      </div>
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">{body}</p>
      {action}
    </div>
  );
}

export function ErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="flex min-h-[180px] flex-col items-center justify-center px-5 py-8 text-center">
      <div className="mb-3 grid size-10 place-items-center border border-coral/40 bg-coral/10 text-coral">
        <TriangleAlert className="size-4" />
      </div>
      <p className="text-sm font-semibold">Couldn’t load this view</p>
      <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">The read-only analytics service is unavailable. Try again without losing your filters.</p>
      {onRetry && <button onClick={onRetry} className="mt-3 text-xs font-bold text-primary underline underline-offset-4">Retry request</button>}
    </div>
  );
}

export function CsvButton({ filename, rows }: { filename: string; rows: Array<unknown> }) {
  const download = () => {
    const safeRows = rows.filter((row): row is Record<string, unknown> => typeof row === "object" && row !== null);
    if (!safeRows.length) return;
    const keys = Object.keys(safeRows[0]);
    const csv = [keys.join(","), ...safeRows.map((row) => keys.map((key) => {
      const value = row[key];
      return `"${String(value ?? "").replaceAll('"', '""')}"`;
    }).join(","))].join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  };
  return (
    <button type="button" onClick={download} disabled={!rows.length} className="print:hidden inline-flex size-7 items-center justify-center border border-border bg-muted/60 text-muted-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40" aria-label={`Export ${filename} as CSV`}>
      <Download className="size-3.5" />
    </button>
  );
}

export function ChartCard({ title, eyebrow, filename, rows, children, className = "" }: { title: string; eyebrow?: string; filename: string; rows: Array<unknown>; children: ReactNode; className?: string }) {
  return (
    <Card data-print-card className={`border-border/80 bg-card shadow-[0_8px_24px_rgba(25,48,70,0.04)] ${className}`}>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 border-b border-border/70 px-5 pb-3 pt-4">
        <div>
          {eyebrow && <p className="mb-1 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-primary">{eyebrow}</p>}
          <CardTitle className="text-[15px] tracking-[-0.01em]">{title}</CardTitle>
        </div>
        <CsvButton filename={filename} rows={rows} />
      </CardHeader>
      <CardContent className="px-5 pb-5 pt-4">{children}</CardContent>
    </Card>
  );
}

export function ChartSkeleton({ height = 280 }: { height?: number }) {
  return <Skeleton className="w-full rounded-none" style={{ height }} />;
}

export function KpiCard({ label, value, helper, tone = "teal", loading, icon, trend }: { label: string; value: string; helper: string; tone?: "teal" | "coral" | "ink"; loading?: boolean; icon?: ReactNode; trend?: "up" | "down" }) {
  const color = tone === "coral" ? "text-coral" : tone === "ink" ? "text-ink" : "text-primary";
  return (
    <Card data-print-card className="border-border/80 bg-card shadow-[0_8px_24px_rgba(25,48,70,0.04)]">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
          {icon && <span className={`grid size-7 place-items-center border border-border/80 bg-muted/50 ${color}`}>{icon}</span>}
        </div>
        {loading ? <><Skeleton className="mt-3 h-8 w-28 rounded-none" /><Skeleton className="mt-2 h-3 w-36 rounded-none" /></> : <>
          <p className={`mt-3 text-[27px] font-extrabold tracking-[-0.045em] ${color}`}>{value}</p>
          <div className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
            {trend === "up" && <ArrowUpRight className="size-3 text-primary" />}
            {trend === "down" && <ArrowDownRight className="size-3 text-coral" />}
            <span>{helper}</span>
          </div>
        </>}
      </CardContent>
    </Card>
  );
}