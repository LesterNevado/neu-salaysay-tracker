
import React from "react";
import { 
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle 
} from "@/components/ui/card";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartTooltip,
  Legend
} from "recharts";
import { 
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import { ChartBarStacked, ChartPie, FileBarChart, PieChart as PieChartIcon } from "lucide-react";

interface DashboardChartsProps {
  violationCounts: Record<string, number>;
  topSenders: Array<[string, { count: number }]>;
  totalFiles: number;
}

export function DashboardCharts({ violationCounts, topSenders, totalFiles }: DashboardChartsProps) {
  // Process violation types data for pie chart
  const pieData = Object.entries(violationCounts).map(([name, value]) => ({
    name,
    value
  }));

  // Process top senders data for bar chart
  const barData = topSenders.map(([name, { count }]) => ({
    name: name.length > 12 ? name.substring(0, 12) + '...' : name,
    count
  }));

  // Colors for charts
  const COLORS = [
    '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A259FF',
    '#4CAF50', '#F44336', '#2196F3', '#FF5722', '#607D8B'
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Violation Types Distribution */}
      <Card className="shadow-md border-blue-100 hover:shadow-lg transition-shadow duration-300">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-blue-800 flex items-center gap-2">
              <ChartPie className="h-5 w-5" />
              Classification Distribution
            </CardTitle>
            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-1 rounded-full">
              {totalFiles} files
            </span>
          </div>
          <CardDescription className="text-gray-600">
            Distribution of document classifications
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-[300px]">
            <ChartContainer
              config={{
                violation: { color: "#0088FE" },
                minor: { color: "#00C49F" },
                major: { color: "#FFBB28" },
                critical: { color: "#FF8042" },
              }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                    label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        </CardContent>
      </Card>
      
      {/* Top Submitters */}
      <Card className="shadow-md border-blue-100 hover:shadow-lg transition-shadow duration-300">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-blue-800 flex items-center gap-2">
              <ChartBarStacked className="h-5 w-5" />
              Top Submitters
            </CardTitle>
            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-1 rounded-full">
              Top {topSenders.length}
            </span>
          </div>
          <CardDescription className="text-gray-600">
            Users with most salaysay submissions
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-[300px]">
            <ChartContainer
              config={{
                count: { color: "#0E254E" },
              }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={barData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={120} 
                    tick={{ fontSize: 11 }} 
                  />
                  <RechartTooltip 
                    formatter={(value, name) => [`${value} submissions`, 'Count']}
                    labelFormatter={(label) => `User: ${label}`}
                  />
                  <Bar dataKey="count" fill="#0E254E" barSize={24} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
