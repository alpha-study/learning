import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
} from "recharts";
import { GraduationCap, DollarSign, Users, ArrowUpRight, ArrowDownRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  emptyCourseRevenueGraph,
  emptyCourseUploadGraph,
  fetchCourseCounts,
  fetchCourseRevenueGraph,
  fetchCourseUploadGraph,
  formatCourseCountDelta,
  formatCourseListingPrice,
  getCourseCreateErrorMessage,
} from "@/lib/api/course";

type StatCard = {
  title: string;
  value: string;
  icon: typeof GraduationCap;
  change: string;
  trend: "up" | "down";
  label: string;
};

function formatStatCount(value: number): string {
  return value.toLocaleString();
}

function buildDashboardStats(counts: {
  totalCourses: number;
  currentMonthCourses: number;
  totalBuyers: number;
  currentMonthBuyers: number;
  totalRevenue: string;
  currentMonthRevenue: string;
}): StatCard[] {
  const monthTrend = (n: number): "up" | "down" => (n >= 0 ? "up" : "down");

  return [
    {
      title: "Total Courses",
      value: formatStatCount(counts.totalCourses),
      icon: GraduationCap,
      change: formatCourseCountDelta(counts.currentMonthCourses),
      trend: monthTrend(counts.currentMonthCourses),
      label: "this month",
    },
    {
      title: "Total Buyers",
      value: formatStatCount(counts.totalBuyers),
      icon: Users,
      change: formatCourseCountDelta(counts.currentMonthBuyers),
      trend: monthTrend(counts.currentMonthBuyers),
      label: "this month",
    },
    {
      title: "Total Revenue",
      value: formatCourseListingPrice(counts.totalRevenue),
      icon: DollarSign,
      change: formatCourseListingPrice(counts.currentMonthRevenue),
      trend: monthTrend(Number.parseFloat(counts.currentMonthRevenue)),
      label: "this month",
    },
  ];
}

const GlassTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background/80 backdrop-blur-md border border-border p-4 rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200">
        <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1">{label}</p>
        <p className="text-sm font-bold flex items-center gap-2 text-foreground">
          <span className="w-2 h-2 rounded-full bg-primary" />
          {payload[0].name}: <span className="text-primary">{payload[0].value.toLocaleString()}</span>
        </p>
      </div>
    );
  }
  return null;
};

const RevenueGlassTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const value = payload[0].value;
    const formatted =
      typeof value === "number" && Number.isFinite(value)
        ? formatCourseListingPrice(String(value))
        : formatCourseListingPrice(String(value ?? 0));
    return (
      <div className="bg-background/80 backdrop-blur-md border border-border p-4 rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200">
        <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1">{label}</p>
        <p className="text-sm font-bold flex items-center gap-2 text-foreground">
          <span className="w-2 h-2 rounded-full bg-primary" />
          {payload[0].name}: <span className="text-primary">{formatted}</span>
        </p>
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const {
    data: counts,
    isPending: countsLoading,
    isError: countsError,
    error: countsQueryError,
  } = useQuery({
    queryKey: ["course", "counts"],
    queryFn: fetchCourseCounts,
    staleTime: 60_000,
  });

  const stats = useMemo(
    () =>
      buildDashboardStats(
        counts ?? {
          totalCourses: 0,
          currentMonthCourses: 0,
          totalBuyers: 0,
          currentMonthBuyers: 0,
          totalRevenue: "0.00",
          currentMonthRevenue: "0.00",
        }
      ),
    [counts]
  );

  const countsErrorMessage = countsError
    ? getCourseCreateErrorMessage(countsQueryError)
    : undefined;

  const {
    data: revenueGraph,
    isPending: revenueGraphLoading,
    isError: revenueGraphError,
    error: revenueGraphQueryError,
  } = useQuery({
    queryKey: ["course", "revenue_graph"],
    queryFn: fetchCourseRevenueGraph,
    staleTime: 60_000,
  });

  const revenueChartData = useMemo(
    () => revenueGraph ?? emptyCourseRevenueGraph(),
    [revenueGraph]
  );

  const revenueGraphErrorMessage = revenueGraphError
    ? getCourseCreateErrorMessage(revenueGraphQueryError)
    : undefined;

  const chartYear = new Date().getFullYear();

  const {
    data: uploadGraph,
    isPending: uploadGraphLoading,
    isError: uploadGraphError,
    error: uploadGraphQueryError,
  } = useQuery({
    queryKey: ["course", "upload_graph"],
    queryFn: fetchCourseUploadGraph,
    staleTime: 60_000,
  });

  const uploadChartData = useMemo(
    () => uploadGraph ?? emptyCourseUploadGraph(),
    [uploadGraph]
  );

  const uploadGraphErrorMessage = uploadGraphError
    ? getCourseCreateErrorMessage(uploadGraphQueryError)
    : undefined;

  return (
    <div className="space-y-8 pb-12">

      {countsErrorMessage ? (
        <p className="text-sm text-destructive font-medium" role="alert">
          Could not load dashboard stats: {countsErrorMessage}
        </p>
      ) : null}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((s) => (
          <Card key={s.title} className="bg-card border-2 shadow-sm relative overflow-hidden group hover:border-primary/20 transition-all">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{s.title}</p>
                  <p className="text-3xl font-bold font-heading tabular-nums tracking-tighter min-h-[2.25rem] flex items-center">
                    {countsLoading ? (
                      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" aria-label="Loading" />
                    ) : (
                      s.value
                    )}
                  </p>
                  <div className="flex items-center gap-1.5 pt-1">
                    <span className={cn(
                      "flex items-center text-[11px] font-bold px-1.5 py-0.5 rounded-lg",
                      s.trend === "up" ? "text-green-600 bg-green-50" : "text-destructive bg-destructive/5"
                    )}>
                      {s.trend === "up" ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
                      {s.change}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">{s.label}</span>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center transition-transform group-hover:scale-110">
                  <s.icon className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
            {/* Subtle background decoration */}
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-primary/5 rounded-full blur-3xl" />
          </Card>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid gap-8">
        {/* Area Chart: Monthly Revenue */}
        <Card className="bg-card border-2 shadow-sm overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-8">
            <div className="space-y-1">
              <CardTitle className="font-heading text-xl font-bold">Monthly Revenue</CardTitle>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Revenue by month</p>
            </div>
            <Badge variant="outline" className="border-2 font-bold px-3">{chartYear} Season</Badge>
          </CardHeader>
          <CardContent className="px-2 sm:px-6 relative">
            {revenueGraphErrorMessage ? (
              <p className="text-xs text-destructive font-medium mb-3" role="alert">
                {revenueGraphErrorMessage}
              </p>
            ) : null}
            {revenueGraphLoading ? (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-card/60 backdrop-blur-[1px] rounded-lg">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" aria-label="Loading revenue chart" />
              </div>
            ) : null}
            <ResponsiveContainer width="100%" height={window.innerWidth < 640 ? 280 : 320}>
              <AreaChart data={revenueChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0A84FF" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#0A84FF" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false} 
                  fontSize={10} 
                  fontWeight="bold"
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                  dy={10}
                />
                <YAxis 
                   axisLine={false} 
                   tickLine={false} 
                   fontSize={10} 
                   fontWeight="bold"
                   tick={{ fill: "hsl(var(--muted-foreground))" }}
                />
                <Tooltip content={<RevenueGlassTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  name="Revenue"
                  stroke="#0A84FF" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#colorSales)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Bar Chart: Courses Uploaded */}
        <Card className="bg-card border-2 shadow-sm overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-8">
            <div className="space-y-1">
              <CardTitle className="font-heading text-xl font-bold">Course Creation Velocity</CardTitle>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Courses uploaded per month</p>
            </div>
          </CardHeader>
          <CardContent className="px-2 sm:px-6 relative">
            {uploadGraphErrorMessage ? (
              <p className="text-xs text-destructive font-medium mb-3" role="alert">
                {uploadGraphErrorMessage}
              </p>
            ) : null}
            {uploadGraphLoading ? (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-card/60 backdrop-blur-[1px] rounded-lg">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" aria-label="Loading upload chart" />
              </div>
            ) : null}
            <ResponsiveContainer width="100%" height={window.innerWidth < 640 ? 240 : 280}>
              <BarChart data={uploadChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0A84FF" />
                    <stop offset="100%" stopColor="#6366f1" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis 
                   dataKey="month" 
                   axisLine={false} 
                   tickLine={false} 
                   fontSize={10} 
                   fontWeight="bold"
                   tick={{ fill: "hsl(var(--muted-foreground))" }}
                   dy={10}
                />
                <YAxis 
                   axisLine={false} 
                   tickLine={false} 
                   fontSize={10} 
                   fontWeight="bold"
                   tick={{ fill: "hsl(var(--muted-foreground))" }}
                />
                <Tooltip content={<GlassTooltip />} cursor={{ fill: 'transparent' }} />
                <Bar 
                  dataKey="totalBooks" 
                  name="Courses"
                  fill="url(#barGradient)" 
                  radius={[10, 10, 0, 0]} 
                  barSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Badge({ children, variant, className }: any) {
  return (
    <span className={cn(
       "px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full",
       variant === "outline" ? "border-border text-muted-foreground" : "bg-primary text-primary-foreground",
       className
    )}>
       {children}
    </span>
  )
}
