import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetSupplyChainDriversQueryKey, getGetSupplyChainForecastsQueryKey, getGetSupplyChainOverviewQueryKey, getGetSupplyChainPoliciesQueryKey, getGetSupplyChainRisksQueryKey, getGetSupplyChainScenarioQueryKey, useAskSupplyChainAnalyst, useGetSupplyChainDrivers, useGetSupplyChainForecasts, useGetSupplyChainOverview, useGetSupplyChainPolicies, useGetSupplyChainRisks, useGetSupplyChainScenario } from "@workspace/api-client-react";
import type { DriversResponse, ForecastPoint, GetSupplyChainScenarioDimension, PolicyComparison, RiskRecord, RiskResponse, ScenarioResponse, SupplyChainOverview } from "@workspace/api-client-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, AlertOctagon, BarChart3, Bot, ChevronDown, CircleHelp, Database, Gauge, Layers3, Menu, Moon, PackageCheck, Printer, RefreshCw, ShieldAlert, Sun, Target, Truck, X, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ChartCard, ChartSkeleton, CHART_COLORS, EmptyState, ErrorState, formatDate, formatNumber, formatPercent, KpiCard } from "@/components/analytics/primitives";

type SectionId = "overview" | "forecast" | "inventory" | "risk" | "analyst" | "scenario";
type Interval = { label: string; ms: number };

const INTERVALS: Interval[] = [
  { label: "Every 5 min", ms: 5 * 60 * 1000 },
  { label: "Every 15 min", ms: 15 * 60 * 1000 },
  { label: "Every 1 hour", ms: 60 * 60 * 1000 },
  { label: "Every 24 hours", ms: 24 * 60 * 60 * 1000 },
];
const NAV_ITEMS: Array<{ id: SectionId; label: string; short: string; icon: typeof Activity }> = [
  { id: "overview", label: "Executive Overview", short: "Overview", icon: Gauge },
  { id: "forecast", label: "Demand Forecasting", short: "Forecast", icon: Activity },
  { id: "inventory", label: "Inventory & Replenishment", short: "Inventory", icon: PackageCheck },
  { id: "risk", label: "Supply Chain Risk", short: "Risk", icon: ShieldAlert },
  { id: "analyst", label: "AI Supply Chain Analyst", short: "Analyst", icon: Bot },
  { id: "scenario", label: "Scenario Analysis", short: "Scenarios", icon: Layers3 },
];
const SCENARIO_DIMENSIONS: Array<{ value: GetSupplyChainScenarioDimension; label: string; defaultValue: number }> = [
  { value: "demand_multiplier", label: "Demand / forecast-risk multiplier", defaultValue: 1 },
  { value: "lead_time_days", label: "Lead time (days)", defaultValue: 2 },
  { value: "holding_cost_per_unit_day", label: "Holding cost / unit / day", defaultValue: 0.02 },
  { value: "stockout_cost_per_unit", label: "Stockout cost / unit", defaultValue: 1.5 },
  { value: "shelf_life_days", label: "Shelf life (days)", defaultValue: 3 },
];
const tooltipStyle = { backgroundColor: "#16263a", border: "1px solid #29435b", color: "#f3f7f8", fontSize: 12 };
const axisStyle = { fontSize: 11, fill: "#718196" };

function SectionHeading({ section, title, description }: { section: string; title: string; description: string }) {
  return <div className="mb-5 flex flex-col gap-1">
    <p className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-primary">{section}</p>
    <h1 className="text-[25px] font-extrabold tracking-[-0.045em] text-foreground sm:text-[29px]">{title}</h1>
    <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>
  </div>;
}

function ProvenanceNote({ children }: { children: string }) {
  return <p className="mt-3 flex items-start gap-2 border-l-2 border-primary/40 pl-3 text-[11px] leading-5 text-muted-foreground"><Database className="mt-0.5 size-3 shrink-0 text-primary" />{children}</p>;
}

function DashboardShell({ active, setActive, children, isDark, onToggleDark }: { active: SectionId; setActive: (section: SectionId) => void; children: React.ReactNode; isDark: boolean; onToggleDark: () => void }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return <div className="min-h-[100dvh] bg-background">
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-[252px] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform duration-200 lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
      <div className="flex h-[78px] items-center justify-between border-b border-sidebar-border px-5">
        <button onClick={() => setActive("overview")} className="flex items-center gap-3 text-left" aria-label="Go to executive overview">
          <span className="grid size-9 place-items-center bg-sidebar-primary text-sidebar-primary-foreground"><Zap className="size-4" /></span>
          <span><span className="block text-[13px] font-extrabold tracking-[-0.02em]">nventory<span className="text-sidebar-primary">/</span>OS</span><span className="font-mono text-[9px] uppercase tracking-[0.14em] text-sidebar-foreground/55">Decision intelligence</span></span>
        </button>
        <button className="lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X className="size-4" /></button>
      </div>
      <div className="px-4 pb-3 pt-6"><p className="font-mono text-[9px] uppercase tracking-[0.17em] text-sidebar-foreground/40">Workspace</p></div>
      <nav className="space-y-1 px-3" aria-label="Analytics sections">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const selected = active === item.id;
          return <button key={item.id} onClick={() => { setActive(item.id); setMobileOpen(false); }} className={`group flex w-full items-center gap-3 border-l-2 px-3 py-2.5 text-left text-[12px] font-semibold transition-colors ${selected ? "border-sidebar-primary bg-sidebar-accent text-sidebar-accent-foreground" : "border-transparent text-sidebar-foreground/65 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"}`}>
            <Icon className={`size-4 shrink-0 ${selected ? "text-sidebar-primary" : "text-sidebar-foreground/50 group-hover:text-sidebar-primary"}`} />
            <span>{item.label}</span>
          </button>;
        })}
      </nav>
      <div className="mt-auto border-t border-sidebar-border px-5 py-5">
        <div className="mb-3 flex items-center gap-2 text-[10px] font-medium text-sidebar-foreground/60"><span className="size-1.5 bg-sidebar-primary" />Read-only environment</div>
        <p className="text-[10px] leading-4 text-sidebar-foreground/40">Validated observations and modeled outputs only. No proprietary retailer data.</p>
      </div>
    </aside>
    {mobileOpen && <button className="fixed inset-0 z-30 bg-ink/40 lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation overlay" />}
    <div className="lg:pl-[252px]">
      <header className="sticky top-0 z-20 flex min-h-[64px] items-center justify-between border-b border-border/80 bg-background/95 px-4 backdrop-blur sm:px-7">
        <div className="flex items-center gap-3">
          <button className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu className="size-5" /></button>
          <div><p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Supply chain control room</p><p className="text-[12px] font-semibold text-foreground">AI-driven inventory optimization</p></div>
        </div>
        <button onClick={onToggleDark} className="grid size-8 place-items-center border border-border bg-card text-muted-foreground transition-colors hover:text-foreground" aria-label="Toggle dark mode">{isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}</button>
      </header>
      <main className="mx-auto max-w-[1540px] px-4 py-6 sm:px-7 lg:px-9">{children}</main>
    </div>
  </div>;
}

function RefreshControl({ queries }: { queries: Array<{ refetch: () => unknown; dataUpdatedAt?: number; isFetching: boolean }> }) {
  const queryClient = useQueryClient();
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [interval, setIntervalValue] = useState(INTERVALS[0]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const fetching = queries.some((query) => query.isFetching);
  useEffect(() => {
    const close = (event: MouseEvent) => { if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  useEffect(() => {
    if (!autoRefresh) return;
    const timer = window.setInterval(() => { void queryClient.invalidateQueries(); }, interval.ms);
    return () => window.clearInterval(timer);
  }, [autoRefresh, interval.ms, queryClient]);
  const latest = Math.max(...queries.map((query) => query.dataUpdatedAt || 0));
  const refreshed = latest ? new Date(latest).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "Not yet";
  return <div className="flex flex-wrap items-center gap-2 print:hidden">
    <div ref={ref} className="relative flex h-8 items-center border border-border bg-card">
      <button onClick={() => { queries.forEach((query) => void query.refetch()); }} className="flex h-full items-center gap-2 px-3 text-[11px] font-bold text-foreground transition-colors hover:bg-muted disabled:opacity-50" disabled={fetching}><RefreshCw className={`size-3.5 ${fetching ? "animate-spin" : ""}`} />Refresh</button>
      <span className="h-4 w-px bg-border" />
      <button onClick={() => setOpen((value) => !value)} className="grid h-full w-7 place-items-center text-muted-foreground hover:bg-muted" aria-label="Refresh schedule"><ChevronDown className="size-3.5" /></button>
      {open && <div className="absolute right-0 top-10 z-50 w-56 border border-border bg-popover p-3 shadow-xl">
        <div className="flex items-center justify-between border-b border-border pb-3"><div><p className="text-[11px] font-bold">Auto-refresh</p><p className="text-[10px] text-muted-foreground">Off by default</p></div><button onClick={() => setAutoRefresh((value) => !value)} className={`relative h-5 w-9 border transition-colors ${autoRefresh ? "border-primary bg-primary" : "border-border bg-muted"}`} aria-label="Toggle auto-refresh"><span className={`absolute top-0.5 size-3.5 bg-card transition-transform ${autoRefresh ? "translate-x-[17px]" : "translate-x-0.5"}`} /></button></div>
        <div className="pt-2">{INTERVALS.map((option) => <button key={option.ms} onClick={() => { setIntervalValue(option); setAutoRefresh(true); setOpen(false); }} className={`flex w-full items-center justify-between px-2 py-2 text-left text-[11px] ${interval.ms === option.ms ? "font-bold text-primary" : "text-muted-foreground hover:bg-muted"}`}><span>{option.label}</span>{interval.ms === option.ms && <span className="size-1.5 bg-primary" />}</button>)}</div>
      </div>}
    </div>
    <button onClick={() => window.print()} className="grid size-8 place-items-center border border-border bg-card text-muted-foreground hover:bg-muted" aria-label="Export dashboard as PDF"><Printer className="size-3.5" /></button>
    <span className="hidden font-mono text-[10px] text-muted-foreground sm:inline">Synced {refreshed}</span>
  </div>;
}

function Header({ active, queries }: { active: SectionId; queries: Array<{ refetch: () => unknown; dataUpdatedAt?: number; isFetching: boolean }> }) {
  const item = NAV_ITEMS.find((nav) => nav.id === active) || NAV_ITEMS[0];
  return <div className="mb-7 flex flex-col gap-4 border-b border-border/80 pb-5 xl:flex-row xl:items-end xl:justify-between">
    <div><div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground"><span className="text-primary">/</span> Analytics / {item.short}</div><h1 className="text-[22px] font-extrabold tracking-[-0.04em] sm:text-[26px]">{item.label}</h1></div>
    <RefreshControl queries={queries} />
  </div>;
}

function Overview({ query }: { query: ReturnType<typeof useGetSupplyChainOverview> }) {
  const data = query.data as SupplyChainOverview | undefined;
  const trend = data?.trend || [];
  const riskReasons = data?.riskReasons || [];
  const riskCounts = data?.riskCounts ? Object.entries(data.riskCounts).map(([name, value]) => ({ name, value: Number(value) })) : [];
  const loading = query.isLoading || query.isFetching;
  return <div>
    <SectionHeading section="01 / executive signal" title="Know where the network is exposed." description="A recruiter-facing view of forecast quality, inventory pressure, and the exceptions that deserve a closer look today." />
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard label="Service level proxy" value={formatPercent(data?.serviceLevelProxy)} helper="modeled inventory output" loading={loading} icon={<Target className="size-3.5" />} tone="teal" />
      <KpiCard label="Open exceptions" value={formatNumber(data?.exceptionCount)} helper={`${formatNumber(data?.urgentReplenishmentCount)} urgent replenishments`} loading={loading} icon={<AlertOctagon className="size-3.5" />} tone="coral" />
      <KpiCard label="Stockout quantity" value={formatNumber(data?.stockoutQuantity)} helper={`${formatPercent(data?.observedStockoutFrequency)} observed frequency`} loading={loading} icon={<Truck className="size-3.5" />} tone="ink" />
      <KpiCard label="Spoilage exposure" value={formatNumber(data?.potentialSpoilageQuantity)} helper={`${formatNumber(data?.estimatedSpoilageQuantity)} estimated`} loading={loading} icon={<BarChart3 className="size-3.5" />} tone="coral" />
    </div>
    <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.55fr_0.85fr]">
      <ChartCard title="Observed demand vs forecast path" eyebrow="Demand signal" filename="observed-vs-forecast.csv" rows={trend}>
        {loading ? <ChartSkeleton /> : query.isError ? <ErrorState onRetry={() => void query.refetch()} /> : trend.length ? <><ResponsiveContainer width="100%" height={285}><AreaChart data={trend} margin={{ top: 8, right: 6, left: -12, bottom: 0 }}><defs><linearGradient id="forecastFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={CHART_COLORS.teal} stopOpacity={0.3} /><stop offset="100%" stopColor={CHART_COLORS.teal} stopOpacity={0.02} /></linearGradient></defs><CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="2 4" /><XAxis dataKey="date" tickFormatter={(value) => value.slice(5)} tick={axisStyle} axisLine={false} tickLine={false} /><YAxis tick={axisStyle} axisLine={false} tickLine={false} /><Tooltip contentStyle={tooltipStyle} /><Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} /><Area type="monotone" dataKey="forecastDemand" name="Forecast demand" stroke={CHART_COLORS.teal} fill="url(#forecastFill)" strokeWidth={2} isAnimationActive={false} /><Line type="monotone" dataKey="observedDemand" name="Observed demand" stroke={CHART_COLORS.blue} strokeWidth={2} dot={false} isAnimationActive={false} /></AreaChart></ResponsiveContainer><ProvenanceNote>Observed demand is sourced from validated FreshRetailNet-50K holdout rows. Forecast demand is a modeled output from the selected forecast model.</ProvenanceNote></> : <EmptyState title="No trend rows returned" body="The service returned no observations for this assessment window." />}
      </ChartCard>
      <ChartCard title="Risk distribution" eyebrow="Exposure mix" filename="risk-distribution.csv" rows={riskCounts}>
        {loading ? <ChartSkeleton height={285} /> : riskCounts.length ? <><div className="h-[240px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={riskCounts} dataKey="value" nameKey="name" innerRadius={68} outerRadius={93} paddingAngle={3} stroke="none" isAnimationActive={false}>{riskCounts.map((entry, index) => <Cell key={entry.name} fill={[CHART_COLORS.coral, "#ef9b68", CHART_COLORS.amber, CHART_COLORS.teal][index % 4]} />)}</Pie><Tooltip contentStyle={tooltipStyle} /></PieChart></ResponsiveContainer></div><div className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-border/70 pt-3">{riskCounts.map((entry, index) => <div key={entry.name} className="flex items-center justify-between text-[11px]"><span className="flex items-center gap-2 text-muted-foreground"><span className="size-2" style={{ background: [CHART_COLORS.coral, "#ef9b68", CHART_COLORS.amber, CHART_COLORS.teal][index % 4] }} />{entry.name}</span><span className="font-mono font-medium">{formatNumber(entry.value)}</span></div>)}</div></> : <EmptyState title="No risk distribution" body="Risk levels are not available for this assessment." />}
      </ChartCard>
    </div>
    <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
      <ChartCard title="Why exceptions are appearing" eyebrow="Reason codes" filename="exception-reasons.csv" rows={riskReasons}>
        {loading ? <ChartSkeleton height={235} /> : riskReasons.length ? <ResponsiveContainer width="100%" height={235}><BarChart data={riskReasons} layout="vertical" margin={{ left: 5, right: 10 }}><CartesianGrid horizontal={false} stroke="hsl(var(--border))" strokeDasharray="2 4" /><XAxis type="number" tick={axisStyle} axisLine={false} tickLine={false} /><YAxis type="category" dataKey="reason" width={120} tick={axisStyle} axisLine={false} tickLine={false} /><Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(var(--muted))" }} /><Bar dataKey="count" name="Exceptions" fill={CHART_COLORS.coral} barSize={16} isAnimationActive={false} /></BarChart></ResponsiveContainer> : <EmptyState title="No exception reasons" body="The service did not return reason codes for this assessment." />}
      </ChartCard>
      <Card className="border-border/80 bg-card shadow-[0_8px_24px_rgba(25,48,70,0.04)]"><CardHeader className="border-b border-border/70 px-5 pb-3 pt-4"><CardTitle className="text-[15px]">Assessment context</CardTitle></CardHeader><CardContent className="grid grid-cols-2 gap-x-5 gap-y-5 px-5 py-5 sm:grid-cols-3"><Metric label="Model" value={data?.forecastModel || "—"} /><Metric label="Policy" value={data?.policyLabel || "—"} /><Metric label="Series" value={formatNumber(data?.totalSeries)} /><Metric label="Stores" value={formatNumber(data?.totalStores)} /><Metric label="Products" value={formatNumber(data?.totalProducts)} /><Metric label="Assessment date" value={formatDate(data?.assessmentDate)} /></CardContent></Card>
    </div>
  </div>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div><p className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">{label}</p><p className="mt-1 text-[13px] font-bold leading-5">{value}</p></div>; }

function Forecast({ query, driversQuery, storeId, setStoreId, productId, setProductId, applyFilters }: { query: ReturnType<typeof useGetSupplyChainForecasts>; driversQuery: ReturnType<typeof useGetSupplyChainDrivers>; storeId: string; setStoreId: (value: string) => void; productId: string; setProductId: (value: string) => void; applyFilters: () => void }) {
  const data = (query.data as ForecastPoint[] | undefined) || [];
  const loading = query.isLoading || query.isFetching;
  const chartData = data.slice(-60);
  return <div>
    <SectionHeading section="02 / forecast intelligence" title="Read the signal before it becomes an exception." description="Compare the modeled demand path with observed demand and see which drivers the selected model is using." />
    <div className="mb-4 flex flex-wrap items-end gap-3 border border-border/80 bg-card p-4">
      <FilterField label="Store ID" value={storeId} onChange={setStoreId} placeholder="All stores" />
      <FilterField label="Product ID" value={productId} onChange={setProductId} placeholder="All products" />
      <Button onClick={applyFilters} className="h-9 rounded-none bg-primary px-4 text-xs font-bold text-primary-foreground">Apply filters</Button>
      <span className="mb-2 text-[10px] text-muted-foreground">Filters are held locally until applied.</span>
    </div>
    <ChartCard title="Daily observed and modeled demand" eyebrow={`${data.length ? data.length : "No"} forecast rows`} filename="demand-forecast.csv" rows={chartData}>
      {loading ? <ChartSkeleton height={320} /> : query.isError ? <ErrorState onRetry={() => void query.refetch()} /> : chartData.length ? <><ResponsiveContainer width="100%" height={320}><AreaChart data={chartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}><defs><linearGradient id="forecastBand" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={CHART_COLORS.teal} stopOpacity={0.14} /><stop offset="100%" stopColor={CHART_COLORS.teal} stopOpacity={0.02} /></linearGradient></defs><CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="2 4" /><XAxis dataKey="date" tickFormatter={(value) => value.slice(5)} tick={axisStyle} axisLine={false} tickLine={false} /><YAxis tick={axisStyle} axisLine={false} tickLine={false} /><Tooltip contentStyle={tooltipStyle} /><Legend wrapperStyle={{ fontSize: 11, paddingTop: 14 }} /><Area type="monotone" dataKey="forecastUpper" name="Forecast upper bound" stroke="none" fill="url(#forecastBand)" isAnimationActive={false} /><Area type="monotone" dataKey="forecastLower" name="Forecast lower bound" stroke={CHART_COLORS.teal} strokeDasharray="4 4" fill="none" isAnimationActive={false} /><Line type="monotone" dataKey="forecastDemand" name="Forecast demand" stroke={CHART_COLORS.teal} strokeWidth={2} dot={false} isAnimationActive={false} /><Line type="monotone" dataKey="observedDemand" name="Observed demand" stroke={CHART_COLORS.blue} strokeWidth={1.8} dot={false} isAnimationActive={false} /></AreaChart></ResponsiveContainer><ProvenanceNote>Observed demand and stockout flags come from validated FreshRetailNet-50K observations. Forecast bounds and driver labels are modeled outputs; they are not retailer proprietary data.</ProvenanceNote></> : <EmptyState title="No forecast rows match these filters" body="Try clearing the store or product filter. This view does not create fallback values." />}
    </ChartCard>
    <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.25fr_0.75fr]">
      <Card className="border-border/80 bg-card"><CardHeader className="border-b border-border/70 px-5 pb-3 pt-4"><div className="flex items-center justify-between"><CardTitle className="text-[15px]">Forecast sample</CardTitle><Badge variant="outline" className="rounded-none font-mono text-[10px]">read-only</Badge></div></CardHeader><CardContent className="overflow-x-auto p-0">{loading ? <div className="space-y-2 p-5"><Skeleton className="h-8 w-full rounded-none" /><Skeleton className="h-8 w-full rounded-none" /><Skeleton className="h-8 w-full rounded-none" /></div> : data.length ? <table className="w-full min-w-[650px] text-left text-[11px]"><thead className="bg-muted/50 font-mono uppercase tracking-[0.1em] text-muted-foreground"><tr><th className="px-5 py-3 font-medium">Date</th><th className="px-3 py-3 font-medium">Store / product</th><th className="px-3 py-3 font-medium">Observed</th><th className="px-3 py-3 font-medium">Forecast</th><th className="px-3 py-3 font-medium">Stockout</th><th className="px-5 py-3 font-medium">Drivers</th></tr></thead><tbody>{data.slice(-8).map((row) => <tr key={`${row.storeId}-${row.productId}-${row.date}`} className="border-t border-border/70"><td className="px-5 py-3">{formatDate(row.date)}</td><td className="px-3 py-3 font-mono">{row.storeId} / {row.productId}</td><td className="px-3 py-3">{formatNumber(row.observedDemand)}</td><td className="px-3 py-3 font-semibold text-primary">{formatNumber(row.forecastDemand)}</td><td className="px-3 py-3">{row.observedStockout ? <span className="text-coral">Yes</span> : <span className="text-muted-foreground">No</span>}</td><td className="max-w-[190px] truncate px-5 py-3 text-muted-foreground" title={row.keyDrivers}>{row.keyDrivers || "—"}</td></tr>)}</tbody></table> : <EmptyState title="No forecast sample" body="Rows will appear when the forecast endpoint returns data." />}</CardContent></Card>
      <DriversCard query={driversQuery} />
    </div>
  </div>;
}

function FilterField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) { return <label className="block w-[150px]"><span className="mb-1.5 block font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">{label}</span><Input value={value} onChange={(event) => onChange(event.target.value.replace(/\D/g, ""))} placeholder={placeholder} className="h-9 rounded-none bg-background text-xs" inputMode="numeric" /></label>; }

function DriversCard({ query }: { query: ReturnType<typeof useGetSupplyChainDrivers> }) {
  const data = query.data as DriversResponse | undefined;
  return <Card className="border-border/80 bg-card"><CardHeader className="border-b border-border/70 px-5 pb-3 pt-4"><CardTitle className="text-[15px]">Model drivers</CardTitle></CardHeader><CardContent className="p-5">{query.isLoading || query.isFetching ? <div className="space-y-3"><Skeleton className="h-5 w-40 rounded-none" /><Skeleton className="h-5 w-full rounded-none" /><Skeleton className="h-5 w-4/5 rounded-none" /></div> : query.isError ? <ErrorState onRetry={() => void query.refetch()} /> : data ? <><p className="mb-3 text-xs leading-5 text-muted-foreground">Selected model: <span className="font-semibold text-foreground">{data.selectedModel}</span></p><div className="space-y-2">{data.modelDrivers.map((driver) => <div key={driver} className="flex gap-2 text-xs leading-5"><span className="mt-2 size-1.5 shrink-0 bg-primary" /><span>{driver}</span></div>)}</div><ProvenanceNote>Driver descriptions are supplied by the validated modeling endpoint and are explanatory, not causal proof.</ProvenanceNote></> : <EmptyState title="Driver detail unavailable" body="The model-driver endpoint returned no data." />}</CardContent></Card>;
}

function Inventory({ query }: { query: ReturnType<typeof useGetSupplyChainPolicies> }) {
  const data = (query.data as PolicyComparison[] | undefined) || [];
  const loading = query.isLoading || query.isFetching;
  return <div><SectionHeading section="03 / policy lab" title="Choose the replenishment posture with evidence." description="Compare stored policy simulations on service, cost, ordering activity, and excess inventory. Values are modeled outputs, not realized retailer performance." /><div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.45fr_0.75fr]"><ChartCard title="Policy cost comparison" eyebrow="Modeled simulation" filename="policy-cost-comparison.csv" rows={data}><div className="h-[325px]">{loading ? <ChartSkeleton height={325} /> : query.isError ? <ErrorState onRetry={() => void query.refetch()} /> : data.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 4 }}><CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="2 4" /><XAxis dataKey="policyLabel" tick={axisStyle} axisLine={false} tickLine={false} /><YAxis tick={axisStyle} axisLine={false} tickLine={false} /><Tooltip contentStyle={tooltipStyle} /><Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} /><Bar dataKey="totalInventoryRelatedCost" name="Total modeled cost" fill={CHART_COLORS.blue} fillOpacity={0.85} barSize={34} isAnimationActive={false} /><Bar dataKey="estimatedSpoilage" name="Estimated spoilage" fill={CHART_COLORS.coral} fillOpacity={0.85} barSize={34} isAnimationActive={false} /></BarChart></ResponsiveContainer> : <EmptyState title="No policy comparisons" body="Stored policy simulations are unavailable for this assessment." />}</div><ProvenanceNote>Policy outcomes are simulated under modeled inventory assumptions. They are directional comparisons and should not be read as observed financial results.</ProvenanceNote></ChartCard><Card className="border-border/80 bg-card"><CardHeader className="border-b border-border/70 px-5 pb-3 pt-4"><CardTitle className="text-[15px]">Policy scorecard</CardTitle></CardHeader><CardContent className="p-0">{loading ? <div className="space-y-2 p-5"><Skeleton className="h-8 w-full rounded-none" /><Skeleton className="h-8 w-full rounded-none" /><Skeleton className="h-8 w-full rounded-none" /></div> : data.length ? <div>{data.map((row) => <div key={row.policy} className="border-b border-border/70 p-4 last:border-0"><div className="flex items-center justify-between"><span className="text-xs font-bold">{row.policyLabel}</span><Badge className="rounded-none bg-primary/10 text-[10px] text-primary hover:bg-primary/10">simulated</Badge></div><div className="mt-3 grid grid-cols-2 gap-y-3"><Metric label="Service proxy" value={formatPercent(row.serviceLevelProxy)} /><Metric label="Stockout qty" value={formatNumber(row.stockoutQuantity)} /><Metric label="Order count" value={formatNumber(row.orderCount)} /><Metric label="Excess inventory" value={formatNumber(row.excessInventory)} /></div></div>)}</div> : <EmptyState title="No policy scorecard" body="The policy endpoint returned no rows." />}</CardContent></Card></div></div>;
}

function Risk({ query }: { query: ReturnType<typeof useGetSupplyChainRisks> }) {
  const response = query.data as RiskResponse | undefined;
  const data = response?.records || [];
  const loading = query.isLoading || query.isFetching;
  return <div><SectionHeading section="04 / exception desk" title="Triage the risk that can move the service level." description="Prioritize records by overall modeled risk and inspect the contributing factors behind each exception." /><div className="mb-4 flex items-center justify-between border border-border/80 bg-card px-4 py-3"><div className="flex items-center gap-3"><span className="grid size-8 place-items-center bg-coral/10 text-coral"><AlertOctagon className="size-4" /></span><div><p className="text-xs font-bold">Exception queue</p><p className="text-[11px] text-muted-foreground">{response ? `${formatNumber(response.total)} records returned` : "Loading records"} · sorted by endpoint response</p></div></div><Badge variant="outline" className="rounded-none font-mono text-[10px]">modeled risk</Badge></div><Card className="border-border/80 bg-card"><CardHeader className="flex flex-row items-center justify-between border-b border-border/70 px-5 pb-3 pt-4"><CardTitle className="text-[15px]">Risk exceptions</CardTitle><span className="font-mono text-[10px] text-muted-foreground">limit 100</span></CardHeader><CardContent className="overflow-x-auto p-0">{loading ? <div className="space-y-2 p-5"><Skeleton className="h-8 w-full rounded-none" />{[1, 2, 3, 4, 5].map((row) => <Skeleton key={row} className="h-10 w-full rounded-none" />)}</div> : query.isError ? <ErrorState onRetry={() => void query.refetch()} /> : data.length ? <RiskTable rows={data} /> : <EmptyState title="No risk exceptions" body="No modeled risk records matched the current request. This is not a substitute for observed availability reporting." />}</CardContent></Card><ProvenanceNote>Risk scores, simulated inventory, and replenishment urgency are modeled or simulated outputs. They are not proprietary retailer telemetry.</ProvenanceNote></div>;
}

function RiskTable({ rows }: { rows: RiskRecord[] }) {
  return <table className="w-full min-w-[900px] text-left text-[11px]"><thead className="bg-muted/50 font-mono uppercase tracking-[0.1em] text-muted-foreground"><tr><th className="px-5 py-3 font-medium">Level</th><th className="px-3 py-3 font-medium">Store / product</th><th className="px-3 py-3 font-medium">Score</th><th className="px-3 py-3 font-medium">Coverage</th><th className="px-3 py-3 font-medium">Stockout risk</th><th className="px-3 py-3 font-medium">Urgency</th><th className="px-5 py-3 font-medium">Primary reason</th></tr></thead><tbody>{rows.slice(0, 100).map((row) => { const critical = row.overallRiskLevel === "Critical"; const high = row.overallRiskLevel === "High"; return <tr key={`${row.storeId}-${row.productId}-${row.assessmentDate}`} className="border-t border-border/70"><td className="px-5 py-3"><span className={`inline-flex items-center gap-1.5 font-bold ${critical || high ? "text-coral" : "text-foreground"}`}><span className={`size-1.5 ${critical ? "bg-coral" : high ? "bg-amber-500" : "bg-primary"}`} />{row.overallRiskLevel}</span></td><td className="px-3 py-3 font-mono">{row.storeId} / {row.productId}</td><td className="px-3 py-3 font-semibold">{formatNumber(row.overallRiskScore, 2)}</td><td className="px-3 py-3">{formatNumber(row.inventoryCoverageDays, 1)}d</td><td className="px-3 py-3">{formatPercent(row.stockoutRisk)}</td><td className="px-3 py-3">{formatPercent(row.replenishmentUrgency)}</td><td className="max-w-[240px] truncate px-5 py-3 text-muted-foreground" title={row.primaryReason}>{row.primaryReason || "—"}</td></tr>; })}</tbody></table>;
}

function Analyst({ analyst }: { analyst: ReturnType<typeof useAskSupplyChainAnalyst> }) {
  const [question, setQuestion] = useState("");
  const [safeError, setSafeError] = useState("");
  const ask = () => {
    const normalized = question.trim();
    if (!normalized) return;
    if (/ignore\s+(all|any|the)?\s*(previous|prior|above)|system\s+prompt|reveal\s+(secret|instruction)|act\s+as/i.test(normalized)) {
      setSafeError("This workspace only accepts grounded supply-chain questions. Prompts that attempt to override system instructions are not sent.");
      return;
    }
    setSafeError("");
    analyst.mutate({ data: { question: normalized } });
  };
  const examples = ["Which risk drivers explain the most urgent exceptions?", "Compare the modeled policies on service level and spoilage.", "What should I inspect before increasing replenishment?"];
  return <div><SectionHeading section="05 / grounded copilot" title="Ask the evidence, not the internet." description="The analyst answers from the validated observation and modeled output endpoints, with source files shown beside every response." /><div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.8fr_1.2fr]"><Card className="border-border/80 bg-card"><CardHeader className="border-b border-border/70 px-5 pb-3 pt-4"><div className="flex items-center gap-2"><span className="grid size-7 place-items-center bg-primary/10 text-primary"><Bot className="size-4" /></span><CardTitle className="text-[15px]">Grounded question</CardTitle></div></CardHeader><CardContent className="p-5"><Textarea value={question} onChange={(event) => setQuestion(event.target.value.slice(0, 500))} onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === "Enter") ask(); }} placeholder="Ask about forecasts, risk, policies, or inventory..." className="min-h-[148px] resize-none rounded-none bg-background text-sm" aria-label="Question for the supply-chain analyst" /><div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground"><span>{question.length}/500 · Ctrl/⌘ + Enter to ask</span><span>Grounded only</span></div>{safeError && <div className="mt-3 border-l-2 border-coral bg-coral/10 px-3 py-2 text-[11px] leading-5 text-coral">{safeError}</div>}<Button onClick={ask} disabled={!question.trim() || analyst.isPending} className="mt-4 h-9 w-full rounded-none bg-primary text-xs font-bold">{analyst.isPending ? "Reviewing evidence…" : "Ask analyst"}<Zap className="ml-2 size-3.5" /></Button><div className="mt-5"><p className="mb-2 font-mono text-[9px] uppercase tracking-[0.13em] text-muted-foreground">Example questions</p><div className="space-y-1.5">{examples.map((example) => <button key={example} onClick={() => setQuestion(example)} className="flex w-full items-start gap-2 border border-border/70 p-2.5 text-left text-[11px] leading-4 text-muted-foreground hover:bg-muted"><CircleHelp className="mt-0.5 size-3 shrink-0 text-primary" />{example}</button>)}</div></div></CardContent></Card><AnalystResponse analyst={analyst} /></div></div>;
}

function AnalystResponse({ analyst }: { analyst: ReturnType<typeof useAskSupplyChainAnalyst> }) {
  if (analyst.isPending) return <Card className="border-border/80 bg-card"><CardHeader className="border-b border-border/70 px-5 pb-3 pt-4"><CardTitle className="text-[15px]">Reviewing grounded evidence</CardTitle></CardHeader><CardContent className="space-y-4 p-5"><Skeleton className="h-4 w-3/4 rounded-none" /><Skeleton className="h-4 w-full rounded-none" /><Skeleton className="h-24 w-full rounded-none" /></CardContent></Card>;
  if (analyst.isError) return <Card className="border-border/80 bg-card"><ErrorState onRetry={() => undefined} /></Card>;
  if (!analyst.data) return <Card className="border-border/80 bg-card"><EmptyState title="No answer yet" body="Ask a question to see a grounded answer, intent classification, source period, and evidence files." /></Card>;
  const response = analyst.data;
  if (!response.grounded) return <Card className="border-border/80 bg-card"><EmptyState title="The analyst could not ground that question" body="Try a question about the provided forecast, inventory, risk, or policy records. No unsupported answer was generated." /></Card>;
  return <Card className="border-border/80 bg-card"><CardHeader className="border-b border-border/70 px-5 pb-3 pt-4"><div className="flex items-center justify-between"><CardTitle className="text-[15px]">Analyst response</CardTitle><Badge className="rounded-none bg-primary/10 text-[10px] text-primary hover:bg-primary/10"><span className="mr-1.5 size-1.5 bg-primary" />grounded</Badge></div></CardHeader><CardContent className="p-5"><p className="mb-4 border-l-2 border-primary pl-3 text-xs italic leading-5 text-muted-foreground">“{response.question}”</p><p className="whitespace-pre-wrap text-sm leading-7">{response.answer}</p><div className="mt-6 grid grid-cols-1 gap-4 border-t border-border/70 pt-4 sm:grid-cols-2"><div><p className="font-mono text-[9px] uppercase tracking-[0.13em] text-muted-foreground">Detected intent</p><p className="mt-1 text-xs font-bold">{response.intent || "—"}</p></div><div><p className="font-mono text-[9px] uppercase tracking-[0.13em] text-muted-foreground">Source period</p><p className="mt-1 text-xs font-bold">{response.sourcePeriod || "Not specified"}</p></div></div><div className="mt-4 border-t border-border/70 pt-4"><p className="mb-2 font-mono text-[9px] uppercase tracking-[0.13em] text-muted-foreground">Evidence files</p><div className="flex flex-wrap gap-2">{response.sourceFiles.length ? response.sourceFiles.map((source) => <Badge key={source} variant="outline" className="rounded-none font-mono text-[10px]">{source}</Badge>) : <span className="text-xs text-muted-foreground">No source file names returned.</span>}</div></div></CardContent></Card>;
}

function Scenario({ query, dimension, setDimension, value, setValue }: { query: ReturnType<typeof useGetSupplyChainScenario>; dimension: GetSupplyChainScenarioDimension; setDimension: (value: GetSupplyChainScenarioDimension) => void; value: number; setValue: (value: number) => void }) {
  const response = query.data as ScenarioResponse | undefined;
  const availableValues = response?.availableValues || [];
  const baseline = response?.baseline;
  const selected = response?.scenario;
  const comparison = baseline && selected ? [{ metric: "Service level", baseline: baseline.realizedServiceLevel, scenario: selected.realizedServiceLevel }, { metric: "Stockout qty", baseline: baseline.stockoutQuantity, scenario: selected.stockoutQuantity }, { metric: "Modeled cost", baseline: baseline.totalModeledCost, scenario: selected.totalModeledCost }, { metric: "Excess inventory", baseline: baseline.excessInventory, scenario: selected.excessInventory }] : [];
   return <div><SectionHeading section="06 / scenario analysis" title="Stress one lever. Keep the rest constant." description="Explore stored one-factor sensitivities for demand, lead time, cost, and shelf life without fabricating a live simulation." /><div className="mb-4 grid grid-cols-1 gap-3 border border-border/80 bg-card p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"><label className="block"><span className="mb-1.5 block font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">Sensitivity dimension</span><select value={dimension} onChange={(event) => { const next = SCENARIO_DIMENSIONS.find((item) => item.value === event.target.value); setDimension(event.target.value as GetSupplyChainScenarioDimension); setValue(next?.defaultValue ?? 1); }} className="h-9 w-full rounded-none border border-input bg-background px-3 text-xs outline-none focus:border-primary">{SCENARIO_DIMENSIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><label className="block"><span className="mb-1.5 block font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">Stored value</span><select value={value} onChange={(event) => setValue(Number(event.target.value))} className="h-9 w-full rounded-none border border-input bg-background px-3 text-xs outline-none focus:border-primary">{availableValues.length ? availableValues.map((option) => <option key={option} value={option}>{option}</option>) : <option value={value}>{value} · awaiting available values</option>}</select></label><div className="flex items-center gap-2 text-[10px] text-muted-foreground"><span className="size-1.5 bg-primary" />Precomputed one-factor sensitivity</div></div><div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.35fr_0.65fr]"><ChartCard title="Baseline vs selected sensitivity" eyebrow={response?.label || "Stored scenario"} filename="scenario-sensitivity.csv" rows={comparison}>{query.isLoading || query.isFetching ? <ChartSkeleton height={320} /> : query.isError ? <EmptyState title="Scenario value unavailable" body="This stored sensitivity is not available for the selected dimension/value. Choose a returned value when available." /> : comparison.length ? <ResponsiveContainer width="100%" height={320}><BarChart data={comparison} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}><CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="2 4" /><XAxis dataKey="metric" tick={axisStyle} axisLine={false} tickLine={false} /><YAxis tick={axisStyle} axisLine={false} tickLine={false} /><Tooltip contentStyle={tooltipStyle} /><Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} /><Bar dataKey="baseline" name="Baseline" fill={CHART_COLORS.ink} fillOpacity={0.65} barSize={28} isAnimationActive={false} /><Bar dataKey="scenario" name="Selected sensitivity" fill={CHART_COLORS.teal} fillOpacity={0.9} barSize={28} isAnimationActive={false} /></BarChart></ResponsiveContainer> : <EmptyState title="No scenario returned" body="Choose a stored value to compare against the baseline." />}</ChartCard><Card className="border-border/80 bg-card"><CardHeader className="border-b border-border/70 px-5 pb-3 pt-4"><CardTitle className="text-[15px]">Scenario readout</CardTitle></CardHeader><CardContent className="p-5">{query.isLoading || query.isFetching ? <div className="space-y-3"><Skeleton className="h-6 w-3/4 rounded-none" /><Skeleton className="h-16 w-full rounded-none" /></div> : response ? <><Badge variant="outline" className="mb-3 rounded-none font-mono text-[10px]">{response.dimension} = {response.value}</Badge><p className="text-sm font-bold leading-6">{response.label}</p><p className="mt-2 text-xs leading-5 text-muted-foreground">{response.note}</p><div className="mt-5 grid grid-cols-2 gap-4 border-t border-border/70 pt-4"><Metric label="Service level" value={formatPercent(selected?.realizedServiceLevel)} /><Metric label="Stockout qty" value={formatNumber(selected?.stockoutQuantity)} /><Metric label="Modeled cost" value={formatNumber(selected?.totalModeledCost)} /><Metric label="Spoilage" value={formatNumber(selected?.estimatedSpoilage)} /></div></> : <EmptyState title="Stored values unavailable" body="The endpoint did not return a scenario response. No live what-if result is implied." />}</CardContent></Card></div><ProvenanceNote>Scenario results are stored one-factor sensitivities: one dimension changes while other modeled inputs remain fixed. They are not live optimization recommendations.</ProvenanceNote></div>;
}

export default function Dashboard() {
  const [active, setActive] = useState<SectionId>("overview");
  const [isDark, setIsDark] = useState(false);
  const [storeId, setStoreId] = useState("");
  const [productId, setProductId] = useState("");
  const [forecastParams, setForecastParams] = useState<{ storeId?: number; productId?: number }>({});
  const [scenarioDimension, setScenarioDimension] = useState<GetSupplyChainScenarioDimension>("demand_multiplier");
  const [scenarioValue, setScenarioValue] = useState(1);
  const overview = useGetSupplyChainOverview({ query: { queryKey: getGetSupplyChainOverviewQueryKey(), staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false } });
  const forecasts = useGetSupplyChainForecasts(forecastParams, { query: { queryKey: getGetSupplyChainForecastsQueryKey(forecastParams), staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false } });
  const risks = useGetSupplyChainRisks({ limit: 100 }, { query: { queryKey: getGetSupplyChainRisksQueryKey({ limit: 100 }), staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false } });
  const policies = useGetSupplyChainPolicies({ query: { queryKey: getGetSupplyChainPoliciesQueryKey(), staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false } });
  const drivers = useGetSupplyChainDrivers({ query: { queryKey: getGetSupplyChainDriversQueryKey(), staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false } });
  const scenarioParams = { dimension: scenarioDimension, value: scenarioValue };
  const scenario = useGetSupplyChainScenario(scenarioParams, { query: { queryKey: getGetSupplyChainScenarioQueryKey(scenarioParams), staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false } });
  const analyst = useAskSupplyChainAnalyst();
  const queries = [overview, forecasts, risks, policies, drivers, scenario];
  useEffect(() => { document.documentElement.classList.toggle("dark", isDark); return () => document.documentElement.classList.remove("dark"); }, [isDark]);
  const applyFilters = () => setForecastParams({ storeId: storeId ? Number(storeId) : undefined, productId: productId ? Number(productId) : undefined });
  const content = useMemo(() => {
    if (active === "overview") return <Overview query={overview} />;
    if (active === "forecast") return <Forecast query={forecasts} driversQuery={drivers} storeId={storeId} setStoreId={setStoreId} productId={productId} setProductId={setProductId} applyFilters={applyFilters} />;
    if (active === "inventory") return <Inventory query={policies} />;
    if (active === "risk") return <Risk query={risks} />;
    if (active === "analyst") return <Analyst analyst={analyst} />;
    return <Scenario query={scenario} dimension={scenarioDimension} setDimension={setScenarioDimension} value={scenarioValue} setValue={setScenarioValue} />;
  }, [active, analyst, drivers, forecasts, overview, policies, productId, risks, scenario, scenarioDimension, scenarioValue, storeId]);
  return <DashboardShell active={active} setActive={setActive} isDark={isDark} onToggleDark={() => setIsDark((value) => !value)}><Header active={active} queries={queries} />{content}</DashboardShell>;
}