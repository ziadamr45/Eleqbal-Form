'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Plus, Pencil, Loader2 } from 'lucide-react';

interface ActivityItem {
  id: string;
  fullName: string;
  className: string;
  userEmail: string;
  createdAt: string;
  updatedAt: string;
}

function relativeTime(dateStr: string, lang: 'ar' | 'en'): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return lang === 'ar' ? 'الآن' : 'Just now';
  if (minutes < 60) {
    const n = minutes;
    return lang === 'ar' ? `منذ ${n} دقائق` : `${n} min ago`;
  }
  if (hours < 24) {
    const n = hours;
    return lang === 'ar' ? `منذ ${n} ساعات` : `${n} hours ago`;
  }
  const n = days;
  return lang === 'ar' ? `منذ ${n} أيام` : `${n} days ago`;
}

interface ActivityFeedProps {
  lang: 'ar' | 'en';
  t: (key: string) => string;
  parseCN: (cn: string) => string;
}

export default function ActivityFeed({ lang, t, parseCN }: ActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        const res = await fetch('/api/admin/activity');
        if (res.ok) {
          const data = await res.json();
          setActivities(data.activities || []);
        }
      } catch { /* ignore */ }
      finally { setLoading(false); }
    };
    fetchActivity();
  }, []);

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="size-4 text-emerald-600" />
          {t('admin.recentActivity')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="size-5 animate-spin text-emerald-600" />
          </div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center py-6 text-muted-foreground">
            <Activity className="size-8 opacity-20 mb-2" />
            <p className="text-sm">{t('admin.noActivity')}</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {activities.map((item, i) => {
              const isNew = new Date(item.createdAt).getTime() === new Date(item.updatedAt).getTime();
              const timeStr = relativeTime(item.updatedAt, lang);
              return (
                <div
                  key={item.id}
                  className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full shrink-0 ${isNew ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-amber-100 dark:bg-amber-900/30'}`}>
                    {isNew
                      ? <Plus className="size-3.5 text-emerald-600" />
                      : <Pencil className="size-3.5 text-amber-600" />
                    }
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{item.fullName}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{parseCN(item.className)}</span>
                      <span>·</span>
                      <span>{isNew ? t('admin.newStudent') : t('admin.studentUpdated')}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{timeStr}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
