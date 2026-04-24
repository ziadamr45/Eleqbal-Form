'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, PieChartIcon } from 'lucide-react';

interface Stats {
  totalStudents: number;
  totalUsers: number;
  maleCount: number;
  femaleCount: number;
  studentsByClass: { className: string; count: number }[];
}

interface ChartsSectionProps {
  stats: Stats;
  lang: 'ar' | 'en';
  t: (key: string) => string;
  parseCN: (cn: string) => string;
}

export default function ChartsSection({ stats, lang, t, parseCN }: ChartsSectionProps) {
  const barData = stats.studentsByClass.map(c => ({
    name: parseCN(c.className),
    count: c.count,
  }));

  const pieData = [
    { name: lang === 'ar' ? 'ذكور' : 'Male', value: stats.maleCount, color: '#0ea5e9' },
    { name: lang === 'ar' ? 'إناث' : 'Female', value: stats.femaleCount, color: '#ec4899' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Bar Chart */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="size-4 text-emerald-600" />
            {t('admin.studentsPerClass')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    fontSize: '12px',
                  }}
                  labelStyle={{ fontWeight: 600 }}
                  formatter={(value: number) => [value, lang === 'ar' ? 'العدد' : 'Count']}
                />
                <Bar dataKey="count" fill="#059669" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Pie Chart */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <PieChartIcon className="size-4 text-emerald-600" />
            {t('admin.genderDist')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="h-52 w-52 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    label={false}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-3">
              {pieData.map(item => {
                const total = pieData.reduce((s, d) => s + d.value, 0);
                const pct = total > 0 ? ((item.value / total) * 100).toFixed(0) : 0;
                return (
                  <div key={item.name} className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: item.color }} />
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold">{item.name}</span>
                      <span className="text-xs text-muted-foreground">{item.value} ({pct}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
