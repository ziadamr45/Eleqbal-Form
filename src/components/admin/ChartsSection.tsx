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
  // Build bar data with short labels for X-axis and full labels for tooltip
  const barData = stats.studentsByClass
    .filter(c => c.count > 0)
    .sort((a, b) => {
      // Sort by grade then section: "1/1", "1/2", "2/1", etc.
      const [ga, sa] = a.className.split('/').map(Number);
      const [gb, sb] = b.className.split('/').map(Number);
      if (ga !== gb) return ga - gb;
      return sa - sb;
    })
    .map(c => {
      const parts = c.className.split('/');
      const grade = parts[0] || '1';
      const section = parts[1] || '1';
      // Short label: grade + section only (e.g., "٥/٢")
      const shortLabel = `${grade}/${section}`;
      return {
        name: shortLabel,
        fullName: parseCN(c.className),
        count: c.count,
      };
    });

  // Dynamic height based on number of bars
  const chartHeight = Math.max(200, barData.length * 40 + 60);

  const pieData = [
    { name: lang === 'ar' ? 'ذكور' : 'Male', value: stats.maleCount, color: '#0ea5e9' },
    { name: lang === 'ar' ? 'إناث' : 'Female', value: stats.femaleCount, color: '#ec4899' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Bar Chart - Horizontal for better label readability */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="size-4 text-emerald-600" />
            {t('admin.studentsPerClass')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {barData.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
              {lang === 'ar' ? 'لا توجد بيانات' : 'No data'}
            </div>
          ) : (
            <div style={{ height: chartHeight }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={30}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      fontSize: '12px',
                    }}
                    labelStyle={{ fontWeight: 600 }}
                    labelFormatter={() => ''}
                    formatter={(value: number, _name: string, props: { payload: { fullName: string } }) => {
                      return [value, props.payload.fullName];
                    }}
                  />
                  <Bar dataKey="count" fill="#059669" radius={[0, 4, 4, 0]} maxBarSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
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
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
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
