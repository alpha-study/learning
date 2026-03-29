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
  PieChart, 
  Pie, 
  Cell,
  Legend
} from "recharts";
import { GraduationCap, TrendingUp, DollarSign, Users, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const monthlyData = [
  { month: "Jan", uploads: 12, sales: 4500 },
  { month: "Feb", uploads: 19, sales: 5200 },
  { month: "Mar", uploads: 8, sales: 6100 },
  { month: "Apr", uploads: 15, sales: 7800 },
  { month: "May", uploads: 22, sales: 9000 },
  { month: "Jun", uploads: 18, sales: 8500 },
];

const categoryData = [
  { name: "Technology", value: 35 },
  { name: "Design", value: 25 },
  { name: "Business", value: 20 },
  { name: "Marketing", value: 20 },
];

const COLORS = ["#0A84FF", "#6366f1", "#a855f7", "#ec4899"];

const stats = [
  { title: "Total Courses", value: "142", icon: GraduationCap, change: "+12", trend: "up", label: "this month" },
  { title: "Enrollments", value: "1,847", icon: TrendingUp, change: "+8.2%", trend: "up", label: "growth" },
  { title: "Total Revenue", value: "₹24,500", icon: DollarSign, change: "+15%", trend: "up", label: "vs last month" },
  { title: "Active Learners", value: "3,290", icon: Users, change: "+340", trend: "up", label: "new" },
];

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

export default function Dashboard() {
  return (
    <div className="space-y-8 pb-12">

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((s) => (
          <Card key={s.title} className="bg-card border-2 shadow-sm relative overflow-hidden group hover:border-primary/20 transition-all">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{s.title}</p>
                  <p className="text-3xl font-bold font-heading tabular-nums tracking-tighter">{s.value}</p>
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
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Area Chart: Monthly Revenue */}
        <Card className="lg:col-span-2 bg-card border-2 shadow-sm overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-8">
            <div className="space-y-1">
              <CardTitle className="font-heading text-xl font-bold">Monthly Revenue</CardTitle>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Growth metrics last 6 months</p>
            </div>
            <Badge variant="outline" className="border-2 font-bold px-3">2026 Season</Badge>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            <ResponsiveContainer width="100%" height={window.innerWidth < 640 ? 280 : 320}>
              <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                <Tooltip content={<GlassTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="sales" 
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

        {/* Donut Chart: Categories */}
        <Card className="bg-card border-2 shadow-sm overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="font-heading text-xl font-bold">Category Distribution</CardTitle>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Enrollment Shares</p>
          </CardHeader>
          <CardContent className="p-0">
             <ResponsiveContainer width="100%" height={window.innerWidth < 640 ? 340 : 380}>
               <PieChart>
                 <Pie 
                    data={categoryData} 
                    cx="50%" 
                    cy="45%" 
                    innerRadius={80} 
                    outerRadius={110} 
                    paddingAngle={8}
                    dataKey="value"
                    stroke="none"
                    animationBegin={200}
                    animationDuration={1500}
                 >
                   {categoryData.map((_, i) => (
                     <Cell key={i} fill={COLORS[i % COLORS.length]} className="hover:opacity-80 transition-opacity outline-none" />
                   ))}
                 </Pie>
                 <Tooltip content={<GlassTooltip />} />
                 <Legend 
                    verticalAlign="bottom" 
                    height={80} 
                    content={(props: any) => {
                      const { payload } = props;
                      return (
                        <div className="flex flex-wrap justify-center gap-4 px-6">
                           {payload.map((entry: any, index: number) => (
                             <div key={index} className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{entry.value}</span>
                             </div>
                           ))}
                        </div>
                      )
                    }}
                 />
               </PieChart>
             </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Bar Chart: Courses Uploaded */}
        <Card className="lg:col-span-3 bg-card border-2 shadow-sm overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-8">
            <div className="space-y-1">
              <CardTitle className="font-heading text-xl font-bold">Course Creation Velocity</CardTitle>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Uploaded chapters and exams per month</p>
            </div>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            <ResponsiveContainer width="100%" height={window.innerWidth < 640 ? 240 : 280}>
              <BarChart data={monthlyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
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
                  dataKey="uploads" 
                  name="Uploads"
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
