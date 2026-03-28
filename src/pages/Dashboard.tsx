import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { BookOpen, TrendingUp, DollarSign, Users } from "lucide-react";

const monthlyData = [
  { month: "Jan", uploads: 12, sales: 45 },
  { month: "Feb", uploads: 19, sales: 52 },
  { month: "Mar", uploads: 8, sales: 61 },
  { month: "Apr", uploads: 15, sales: 78 },
  { month: "May", uploads: 22, sales: 90 },
  { month: "Jun", uploads: 18, sales: 85 },
];

const genreData = [
  { name: "Fiction", value: 35 },
  { name: "Non-Fiction", value: 25 },
  { name: "Science", value: 20 },
  { name: "Biography", value: 20 },
];

const COLORS = ["hsl(40,70%,50%)", "hsl(220,40%,20%)", "hsl(40,60%,70%)", "hsl(220,30%,40%)"];

const stats = [
  { title: "Total Books", value: "142", icon: BookOpen, change: "+12 this month" },
  { title: "Total Sales", value: "1,847", icon: TrendingUp, change: "+8.2% growth" },
  { title: "Revenue", value: "$24,500", icon: DollarSign, change: "+15% vs last month" },
  { title: "Readers", value: "3,290", icon: Users, change: "+340 new" },
];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <h2 className="font-heading text-2xl font-bold">Dashboard</h2>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.title} className="bg-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{s.title}</p>
                  <p className="text-2xl font-bold font-heading">{s.value}</p>
                  <p className="text-xs text-gold mt-1">{s.change}</p>
                </div>
                <div className="w-10 h-10 rounded-lg gradient-gold flex items-center justify-center">
                  <s.icon className="w-5 h-5 text-accent-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="font-heading text-lg">Monthly Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(40,15%,85%)" />
                <XAxis dataKey="month" stroke="hsl(220,10%,50%)" fontSize={12} />
                <YAxis stroke="hsl(220,10%,50%)" fontSize={12} />
                <Tooltip />
                <Line type="monotone" dataKey="sales" stroke="hsl(40,70%,50%)" strokeWidth={2} dot={{ fill: "hsl(40,70%,50%)" }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="font-heading text-lg">Uploads per Month</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(40,15%,85%)" />
                <XAxis dataKey="month" stroke="hsl(220,10%,50%)" fontSize={12} />
                <YAxis stroke="hsl(220,10%,50%)" fontSize={12} />
                <Tooltip />
                <Bar dataKey="uploads" fill="hsl(220,40%,20%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-heading text-lg">Books by Genre</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={genreData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {genreData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
