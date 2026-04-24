'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wifi, Users, Clock, Server, Zap, Loader2 } from 'lucide-react';

interface SystemStatusProps {
  stats: { totalStudents: number; totalUsers: number } | null;
  lang: 'ar' | 'en';
  t: (key: string) => string;
}

export default function SystemStatus({ stats, lang, t }: SystemStatusProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [pushCount, setPushCount] = useState<number | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetch('/api/admin/push-stats')
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data) setPushCount(data.count); })
      .catch(() => {});
  }, []);

  const timeStr = currentTime.toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Cairo',
  });

  const items = [
    {
      icon: <Wifi className="size-4 text-emerald-600" />,
      label: t('admin.online'),
      value: (
        <span className="flex items-center gap-1.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          {t('admin.online')}
        </span>
      ),
    },
    {
      icon: <Users className="size-4 text-sky-600" />,
      label: t('admin.totalStudents'),
      value: stats?.totalStudents ?? <Loader2 className="size-3.5 animate-spin" />,
    },
    {
      icon: <Users className="size-4 text-amber-600" />,
      label: t('admin.totalUsers'),
      value: stats?.totalUsers ?? <Loader2 className="size-3.5 animate-spin" />,
    },
    {
      icon: <Clock className="size-4 text-purple-600" />,
      label: t('admin.lastUpdated'),
      value: timeStr,
    },
    {
      icon: <Server className="size-4 text-emerald-600" />,
      label: t('admin.hosting'),
      value: 'Vercel',
    },
    {
      icon: <Zap className="size-4 text-yellow-500" />,
      label: t('admin.activePush'),
      value: pushCount !== null ? pushCount : <Loader2 className="size-3.5 animate-spin" />,
    },
  ];

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Server className="size-4 text-emerald-600" />
          {t('admin.systemStatus')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {items.map(item => (
            <div key={item.label} className="flex items-center gap-2.5 rounded-lg border p-2.5">
              {item.icon}
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground">{item.label}</p>
                <p className="text-sm font-semibold truncate">{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
