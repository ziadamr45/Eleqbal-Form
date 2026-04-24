'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Users, Shield, Search, Trash2, Pencil, X, ChevronLeft, ChevronRight, School, LogOut, Menu, ArrowUpDown, RefreshCw, CheckCircle2, FileSpreadsheet, Plus, UserPlus, Eye, Download, Filter, Bell, Megaphone, Send, Settings, Database, UserCog, TriangleAlert, KeyRound, Clock, Zap, FileText, Braces } from 'lucide-react';
import { useLanguage, getT } from '@/lib/i18n/context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

import ChartsSection from '@/components/admin/ChartsSection';
import ActivityFeed from '@/components/admin/ActivityFeed';
import SystemStatus from '@/components/admin/SystemStatus';
import AdminNotificationBell from '@/components/admin/AdminNotificationBell';
import SkeletonTable from '@/components/admin/SkeletonTable';
import { generateStudentPDF, generateBulkStudentPDF } from '@/lib/pdf';
import type { StudentRecord } from '@/lib/pdf';
import { exportToExcel, exportToJson, exportToPdf, exportSingleStudentPdf } from '@/lib/export';

interface Stats { totalStudents: number; totalUsers: number; maleCount: number; femaleCount: number; studentsByClass: { className: string; count: number }[] }

const GRADE_KEYS = ['1', '2', '3', '4', '5', '6'] as const;
const SECTION_KEYS = ['1', '2', '3'] as const;
const PAGE_SIZE = 50;

const emptyForm = { fullName: '', parentPhone: '', parentEmail: '', gender: '', whatsapp: '', parentName: '' };

// ── Highlight Match Helper ──
function highlightMatch(text: string, query: string) {
  if (!query.trim()) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 dark:bg-yellow-700/50 rounded px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const { lang, dir } = useLanguage();
  const t = getT(lang);
  const isRTL = dir === 'rtl';

  // Auth
  const [authed, setAuthed] = useState<boolean | null>(null);

  // Data
  const [stats, setStats] = useState<Stats | null>(null);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  // Filters
  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [sort, setSort] = useState('newest');

  // View student
  const [viewStudent, setViewStudent] = useState<StudentRecord | null>(null);

  // Add student
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState(emptyForm);
  const [addGrade, setAddGrade] = useState('');
  const [addSection, setAddSection] = useState('');
  const [adding, setAdding] = useState(false);

  // Edit student
  const [editStudent, setEditStudent] = useState<StudentRecord | null>(null);
  const [editForm, setEditForm] = useState({ fullName: '', parentPhone: '', parentEmail: '', gender: '', whatsapp: '' });
  const [editGrade, setEditGrade] = useState('');
  const [editSection, setEditSection] = useState('');
  const [saving, setSaving] = useState(false);

  // Notifications
  const [showNotif, setShowNotif] = useState(false);
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifTarget, setNotifTarget] = useState<'all' | 'student'>('all');
  const [notifTargetStudent, setNotifTargetStudent] = useState('');
  const [sending, setSending] = useState(false);
  const [sentNotifs, setSentNotifs] = useState<{ id: string; title: string; message: string; sentToAll: boolean; targetName: string | null; recipientCount: number; createdAt: string; status: string; scheduledAt: string | null; sentAt: string | null }[]>([]);
  const [notifSchedule, setNotifSchedule] = useState('');
  const [activeTab, setActiveTab] = useState<'data' | 'notif' | 'control'>('data');

  // Logout confirmation
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Control tab - admin users
  const [adminUsers, setAdminUsers] = useState<{ id: string; email: string; name: string | null; createdAt: string }[]>([]);

  // Mobile
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ── Auth ──
  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) { router.push('/'); return; }
      const data = await res.json();
      if (data.user.role !== 'admin') { router.push('/'); return; }
      setAuthed(true);
    } catch { router.push('/'); }
  }, [router]);

  // ── Fetch Stats (includes admin users) ──
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setAdminUsers(data.stats?.adminUsers || []);
      }
    } catch { /* ignore */ }
  }, []);

  // ── Fetch Students ──
  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (search) p.set('search', search);
      if (gradeFilter) p.set('grade', gradeFilter);
      if (sectionFilter) p.set('section', sectionFilter);
      if (genderFilter) p.set('gender', genderFilter);
      if (sort) p.set('sort', sort);
      p.set('page', page.toString());
      p.set('limit', PAGE_SIZE.toString());

      const res = await fetch(`/api/admin/students?${p}`);
      if (res.ok) {
        const data = await res.json();
        setStudents(data.students);
        setTotal(data.pagination.total);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [search, gradeFilter, sectionFilter, genderFilter, sort, page]);

  // ── Fetch Sent Notifications ──
  const fetchSentNotifs = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/notifications');
      if (res.ok) setSentNotifs((await res.json()).notifications);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { checkAuth(); }, [checkAuth]);
  useEffect(() => {
    if (authed) { fetchStats(); fetchStudents(); fetchSentNotifs(); }
  }, [authed, fetchStats, fetchStudents, fetchSentNotifs]);
  useEffect(() => { setPage(1); }, [search, gradeFilter, sectionFilter, genderFilter, sort]);

  // ── Helpers ──
  const handleLogout = async () => {
    setShowLogoutConfirm(false);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  };

  const parseCN = (cn: string) => {
    if (!cn) return lang === 'ar' ? 'غير محدد' : 'N/A';
    const parts = cn.split('/');
    const g = parts[0] || '';
    const s = parts[1] || '';
    if (!g && !s) return lang === 'ar' ? 'غير محدد' : 'N/A';
    const gradeLabel = g ? t(`grades.${g}`) : t('grades.1');
    const sectionLabel = s ? t(`sections.${s}`) : t('sections.1');
    // Check if translation returned the key (missing translation)
    const gradeDisplay = gradeLabel.startsWith('grades.') ? g : gradeLabel;
    const sectionDisplay = sectionLabel.startsWith('sections.') ? s : sectionLabel;
    return `${gradeDisplay} - ${sectionDisplay}`;
  };
  const cn = (g: string, s: string) => `${g}/${s}`;
  const refresh = () => { fetchStudents(); fetchStats(); };

  // ── PDF Download ──
  const downloadSinglePdf = async (student: StudentRecord) => {
    try {
      toast.loading(lang === 'ar' ? 'جاري إنشاء PDF...' : 'Generating PDF...', { id: 'pdf' });
      const blob = await exportSingleStudentPdf(student, lang, getGradeLabels(), getSectionLabels());
      downloadFile(blob, `${student.fullName.replace(/\s+/g, '_')}.pdf`);
      toast.success(lang === 'ar' ? 'تم تحميل PDF بنجاح' : 'PDF downloaded', { id: 'pdf' });
    } catch {
      toast.error(lang === 'ar' ? 'خطأ في إنشاء PDF' : 'Error generating PDF', { id: 'pdf' });
    }
  };

  const downloadBulkPdf = async () => {
    if (students.length === 0) return;
    try {
      toast.loading(lang === 'ar' ? 'جاري إنشاء PDF...' : 'Generating PDF...', { id: 'pdf' });
      const blob = await exportToPdf(students, lang, getGradeLabels(), getSectionLabels());
      const filterLabel = [gradeFilter, sectionFilter, genderFilter].filter(Boolean).join('_') || 'all';
      downloadFile(blob, `students_${filterLabel}_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success(lang === 'ar' ? 'تم تحميل PDF بنجاح' : 'PDF downloaded', { id: 'pdf' });
    } catch {
      toast.error(lang === 'ar' ? 'خطأ في إنشاء PDF' : 'Error generating PDF', { id: 'pdf' });
    }
  };

  // ── Send Notification ──
  const handleSendNotif = async () => {
    if (!notifTitle.trim() || !notifMessage.trim()) {
      toast.error(lang === 'ar' ? 'يرجى كتابة العنوان والرسالة' : 'Title and message required');
      return;
    }
    if (notifTarget === 'student' && !notifTargetStudent) {
      toast.error(lang === 'ar' ? 'يرجى اختيار الطالب' : 'Please select a student');
      return;
    }
    setSending(true);
    try {
      const body: Record<string, unknown> = { title: notifTitle, message: notifMessage, sentToAll: notifTarget === 'all' };
      if (notifTarget === 'student') body.targetUserId = notifTargetStudent;
      if (notifSchedule) body.scheduledAt = new Date(notifSchedule).toISOString();
      const res = await fetch('/api/admin/notifications', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.scheduled) {
          toast.success(lang === 'ar' ? 'تم جدولة الإشعار بنجاح' : 'Notification scheduled successfully');
        } else {
          toast.success(lang === 'ar' ? `تم إرسال الإشعار إلى ${data.sentTo} مستخدم` : `Sent to ${data.sentTo} users`);
        }
        setShowNotif(false); setNotifTitle(''); setNotifMessage(''); setNotifTargetStudent(''); setNotifSchedule('');
        fetchSentNotifs();
      } else { const d = await res.json().catch(() => ({})); toast.error(d.error || 'Error'); }
    } catch { toast.error('Error'); }
    finally { setSending(false); }
  };

  // ── Add Student ──
  const handleAdd = async () => {
    if (!addForm.fullName || !addGrade || !addSection || !addForm.parentPhone || !addForm.parentEmail || !addForm.gender) {
      toast.error(lang === 'ar' ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields');
      return;
    }
    setAdding(true);
    try {
      const res = await fetch('/api/admin/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...addForm, className: cn(addGrade, addSection) }),
      });
      if (res.ok) {
        toast.success(lang === 'ar' ? 'تم إضافة الطالب بنجاح' : 'Student added successfully');
        setShowAdd(false); setAddForm(emptyForm); setAddGrade(''); setAddSection('');
        refresh();
      } else {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error || 'Error');
      }
    } catch { toast.error('Error'); }
    finally { setAdding(false); }
  };

  // ── Edit ──
  const openEdit = (s: StudentRecord) => {
    const [g, sec] = (s.className || '/').split('/');
    setEditStudent(s);
    setEditForm({ fullName: s.fullName, parentPhone: s.parentPhone, parentEmail: s.parentEmail, gender: s.gender, whatsapp: s.whatsapp || '' });
    setEditGrade(g || ''); setEditSection(sec || '');
  };
  const saveEdit = async () => {
    if (!editStudent) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/students/${editStudent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editForm, className: cn(editGrade, editSection) }),
      });
      if (res.ok) {
        toast.success(lang === 'ar' ? 'تم التحديث' : 'Updated');
        setEditStudent(null); refresh();
      } else { const d = await res.json().catch(() => ({})); toast.error(d.error || 'Error'); }
    } catch { toast.error('Error'); }
    finally { setSaving(false); }
  };

  // ── Delete ──
  const handleDelete = async (s: StudentRecord) => {
    if (!window.confirm(lang === 'ar' ? `حذف "${s.fullName}"؟ لا يمكن التراجع.` : `Delete "${s.fullName}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/admin/students/${s.id}`, { method: 'DELETE' });
      if (res.ok) { toast.success(lang === 'ar' ? 'تم الحذف' : 'Deleted'); refresh(); }
      else { const d = await res.json().catch(() => ({})); toast.error(d.error || 'Error'); }
    } catch { toast.error('Error'); }
  };

  // ── Export ──
  const getGradeLabels = (): Record<string, string> => {
    const labels: Record<string, string> = {};
    ['1','2','3','4','5','6'].forEach(g => { labels[g] = t(`grades.${g}`); });
    return labels;
  };
  const getSectionLabels = (): Record<string, string> => {
    const labels: Record<string, string> = {};
    ['1','2','3'].forEach(s => { labels[s] = t(`sections.${s}`); });
    return labels;
  };

  const downloadFile = (blob: Blob, filename: string) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const doExportExcel = () => {
    if (students.length === 0) { toast.error(lang === 'ar' ? 'لا توجد بيانات للتصدير' : 'No data to export'); return; }
    try {
      const blob = exportToExcel(students, lang, getGradeLabels(), getSectionLabels());
      const filterLabel = [gradeFilter, sectionFilter, genderFilter].filter(Boolean).join('_') || 'all';
      downloadFile(blob, `students_${filterLabel}_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success(lang === 'ar' ? 'تم تصدير Excel بنجاح' : 'Excel exported successfully');
    } catch (err) {
      toast.error(lang === 'ar' ? 'خطأ في تصدير Excel' : 'Error exporting Excel');
    }
  };

  const doExportCsv = () => {
    if (students.length === 0) { toast.error(lang === 'ar' ? 'لا توجد بيانات للتصدير' : 'No data to export'); return; }
    const headers = lang === 'ar'
      ? ['م', 'الاسم', 'الفصل', 'رقم ولي الأمر', 'البريد الإلكتروني', 'النوع', 'واتساب']
      : ['#', 'Name', 'Class', 'Parent Phone', 'Email', 'Gender', 'WhatsApp'];
    const rows = students.map((s, i) => {
      const [g, sec] = (s.className || '//').split('/');
      return [
        i + 1, s.fullName, `${t(`grades.${g}`)} - ${t(`sections.${sec}`)}`,
        s.parentPhone, s.parentEmail,
        s.gender === 'male' ? t('form.male') : t('form.female'),
        s.whatsapp || '',
      ];
    });
    const content = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
    const filterLabel = [gradeFilter, sectionFilter, genderFilter].filter(Boolean).join('_') || 'all';
    downloadFile(blob, `students_${filterLabel}_${new Date().toISOString().split('T')[0]}.csv`);
    toast.success(lang === 'ar' ? 'تم تصدير CSV بنجاح' : 'CSV exported successfully');
  };

  const doExportJson = () => {
    if (students.length === 0) { toast.error(lang === 'ar' ? 'لا توجد بيانات للتصدير' : 'No data to export'); return; }
    try {
      const blob = exportToJson(students, lang, getGradeLabels(), getSectionLabels());
      const filterLabel = [gradeFilter, sectionFilter, genderFilter].filter(Boolean).join('_') || 'all';
      downloadFile(blob, `students_${filterLabel}_${new Date().toISOString().split('T')[0]}.json`);
      toast.success(lang === 'ar' ? 'تم تصدير JSON بنجاح' : 'JSON exported successfully');
    } catch (err) {
      toast.error(lang === 'ar' ? 'خطأ في تصدير JSON' : 'Error exporting JSON');
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // ── Loading ──
  if (authed === null || !authed) {
    return (
      <div dir={dir} className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  // ── Count for current filter
  const filteredCount = total;
  const activeFilters = [gradeFilter, sectionFilter, genderFilter, search].filter(Boolean).length;

  return (
    <div dir={dir} className="min-h-screen flex bg-muted/30">
      {/* Sidebar overlay */}
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 ${isRTL ? 'right-0' : 'left-0'} z-50 w-64 bg-card border-${isRTL ? 'l' : 'r'} transform transition-transform lg:translate-x-0 lg:static lg:z-auto shadow-xl ${sidebarOpen ? 'translate-x-0' : (isRTL ? 'translate-x-full' : '-translate-x-full')}`}>
        <div className="flex flex-col h-full">
          <div className="p-4 border-b flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white shrink-0"><Shield className="size-5" /></div>
            <div className="min-w-0">
              <h2 className="font-bold text-sm truncate">{lang === 'ar' ? 'لوحة التحكم' : 'Admin'}</h2>
              <p className="text-xs text-muted-foreground truncate">كلية الاقبال القوميه</p>
            </div>
            <button className="lg:hidden mr-auto" onClick={() => setSidebarOpen(false)}><X className="size-5" /></button>
          </div>

          <nav className="flex-1 p-3 space-y-1">
            <button onClick={() => { setActiveTab('data'); setSidebarOpen(false); }} className={`flex items-center gap-2 w-full rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${activeTab === 'data' ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300' : 'text-muted-foreground hover:bg-muted'}`}>
              <Users className="size-4" /> {lang === 'ar' ? 'إدارة بيانات الطلاب' : 'Student Data'}
            </button>
            <button onClick={() => { setActiveTab('notif'); setSidebarOpen(false); }} className={`flex items-center gap-2 w-full rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${activeTab === 'notif' ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300' : 'text-muted-foreground hover:bg-muted'}`}>
              <Bell className="size-4" /> {lang === 'ar' ? 'الإشعارات' : 'Notifications'}
            </button>
            <button onClick={() => { setActiveTab('control'); setSidebarOpen(false); }} className={`flex items-center gap-2 w-full rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${activeTab === 'control' ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300' : 'text-muted-foreground hover:bg-muted'}`}>
              <Settings className="size-4" /> {lang === 'ar' ? 'الإحصائيات' : 'Statistics'}
            </button>
          </nav>

          <div className="p-3 border-t">
            <button onClick={() => window.open('/?preview=true', '_blank')} className="flex items-center gap-2 w-full rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
              <School className="size-4" /> {lang === 'ar' ? 'المعاينة' : 'Preview'}
            </button>
            <button onClick={() => setShowLogoutConfirm(true)} className="flex items-center gap-2 w-full rounded-lg px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors mt-1">
              <LogOut className="size-4" /> {lang === 'ar' ? 'خروج' : 'Logout'}
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-card border-b px-4 py-3 flex items-center gap-3">
          <button className="lg:hidden" onClick={() => setSidebarOpen(true)}><Menu className="size-5" /></button>
          <h1 className="font-semibold text-lg">
            {activeTab === 'data' && (lang === 'ar' ? 'إدارة بيانات الطلاب' : 'Student Data Management')}
            {activeTab === 'notif' && (lang === 'ar' ? 'الإشعارات' : 'Notifications')}
            {activeTab === 'control' && (lang === 'ar' ? 'الإحصائيات' : 'Statistics')}
          </h1>
          <div className="ml-auto flex items-center gap-2">
            <AdminNotificationBell />
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
              {stats?.totalStudents || 0} {lang === 'ar' ? 'طالب' : 'students'}
            </span>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 space-y-4">
          {/* Control Tab Content */}
          {activeTab === 'control' && (
            <div className="space-y-4">
              {/* System Status Panel */}
              <SystemStatus stats={stats} lang={lang} t={t} />

              {/* Recent Activity Feed */}
              <ActivityFeed lang={lang} t={t} parseCN={parseCN} />

              {/* Quick Stats */}
              {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 p-3 text-center">
                    <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{stats.totalStudents}</p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">{lang === 'ar' ? 'إجمالي الطلاب' : 'Total'}</p>
                  </div>
                  <div className="rounded-xl bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800 p-3 text-center">
                    <p className="text-2xl font-bold text-sky-700 dark:text-sky-300">{stats.maleCount}</p>
                    <p className="text-xs text-sky-600 dark:text-sky-400">{lang === 'ar' ? 'ذكور' : 'Male'}</p>
                  </div>
                  <div className="rounded-xl bg-pink-50 dark:bg-pink-950/20 border border-pink-200 dark:border-pink-800 p-3 text-center">
                    <p className="text-2xl font-bold text-pink-700 dark:text-pink-300">{stats.femaleCount}</p>
                    <p className="text-xs text-pink-600 dark:text-pink-400">{lang === 'ar' ? 'إناث' : 'Female'}</p>
                  </div>
                  <div className="rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-3 text-center">
                    <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{stats.studentsByClass.length}</p>
                    <p className="text-xs text-amber-600 dark:text-amber-400">{lang === 'ar' ? 'فصل' : 'Classes'}</p>
                  </div>
                </div>
              )}

              {/* Charts Section */}
              {stats && stats.studentsByClass.length > 0 && (
                <ChartsSection stats={stats} lang={lang} t={t} parseCN={parseCN} />
              )}

              {/* Admin List */}
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <UserCog className="size-4 text-emerald-600" />
                    {lang === 'ar' ? 'المديرين' : 'Admins'}
                    {adminUsers.length > 0 && (
                      <span className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full">{adminUsers.length}</span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {!stats ? (
                    <div className="flex items-center justify-center py-6"><Loader2 className="size-5 animate-spin text-emerald-600" /></div>
                  ) : adminUsers.length === 0 ? (
                    <div className="flex flex-col items-center py-6 text-muted-foreground">
                      <KeyRound className="size-8 opacity-20 mb-2" />
                      <p className="text-sm">{lang === 'ar' ? 'لا يوجد مديرين' : 'No admins'}</p>
                    </div>
                  ) : (
                    <div className="divide-y rounded-lg border">
                      {adminUsers.map((admin) => (
                        <div key={admin.id} className="flex items-center gap-3 px-3 py-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 shrink-0">
                            <Shield className="size-4 text-emerald-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{admin.name || admin.email}</p>
                            <p className="text-xs text-muted-foreground font-mono truncate" dir="ltr">{admin.email}</p>
                          </div>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {new Date(admin.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-3">
                    <p className="text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
                      <TriangleAlert className="size-4 shrink-0 mt-0.5" />
                      <span>{lang === 'ar' ? 'لإضافة مدير جديد، أضف بريده الإلكتروني في متغير البيئة ADMIN_EMAILS في لوحة تحكم Vercel ثم سجل دخول بالحساب الجديد' : 'To add a new admin, add their email to the ADMIN_EMAILS env variable in Vercel dashboard, then log in with the new account'}</span>
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Notification Tab Content */}
          {activeTab === 'notif' && (
            <div className="space-y-4">
              {/* Send Notification */}
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Megaphone className="size-4 text-emerald-600" />
                      {lang === 'ar' ? 'إرسال إشعار' : 'Send Notification'}
                    </CardTitle>
                    <div className="flex items-center gap-1.5">
                      <span className="flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
                        <Zap className="size-3" /> Push
                      </span>
                      <Button size="sm" onClick={() => setShowNotif(true)} className="gap-1.5 h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
                        <Send className="size-3.5" /> {lang === 'ar' ? 'إشعار جديد' : 'New'}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="max-h-[400px] overflow-y-auto">
                    {sentNotifs.length === 0 ? (
                      <div className="flex flex-col items-center py-8 text-muted-foreground">
                        <Bell className="size-8 opacity-20 mb-2" />
                        <p className="text-sm">{lang === 'ar' ? 'لم يتم إرسال إشعارات بعد' : 'No notifications sent yet'}</p>
                      </div>
                    ) : (
                      <div className="divide-y">
                        {sentNotifs.map(n => (
                          <div key={n.id} className="py-3 first:pt-0 last:pb-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-medium text-sm">{n.title}</p>
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                {n.status === 'scheduled' && (
                                  <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-[10px] font-medium flex items-center gap-1">
                                    <Clock className="size-3" /> {lang === 'ar' ? 'مجدول' : 'Scheduled'}
                                  </span>
                                )}
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${n.sentToAll ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                                  {n.sentToAll ? (lang === 'ar' ? 'الجميع' : 'All') : n.targetName}
                                </span>
                              </div>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-1">
                              {n.status === 'scheduled' && n.scheduledAt
                                ? <><Clock className="inline size-3 me-0.5" />{new Date(n.scheduledAt).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</>
                                : new Date(n.createdAt).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                              }
                              {n.status === 'sent' && n.recipientCount > 0 && <>{' · '}{n.recipientCount} {lang === 'ar' ? 'مستخدم' : 'users'} {lang === 'ar' ? '+ Push' : '+ Push'}</>}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Show data tab content only on data tab */}
          {activeTab === 'data' && (
            <>
              {/* Class Quick Filter Chips */}
          {stats && stats.studentsByClass.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button onClick={() => { setGradeFilter(''); setSectionFilter(''); }}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${!gradeFilter && !sectionFilter ? 'bg-emerald-600 text-white shadow-sm' : 'bg-card border text-muted-foreground hover:bg-muted'}`}>
                {lang === 'ar' ? 'الكل' : 'All'} ({stats.totalStudents})
              </button>
              {stats.studentsByClass.map(c => {
                const isActive = c.className === cn(gradeFilter, sectionFilter);
                return (
                  <button key={c.className} onClick={() => {
                    const [g, s] = c.className.split('/');
                    if (isActive) { setGradeFilter(''); setSectionFilter(''); }
                    else { setGradeFilter(g); setSectionFilter(s); }
                  }}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${isActive ? 'bg-emerald-600 text-white shadow-sm' : 'bg-card border text-muted-foreground hover:bg-muted'}`}>
                    {parseCN(c.className)} ({c.count})
                  </button>
                );
              })}
            </div>
          )}

          {/* Filters & Actions Bar */}
          <Card className="shadow-sm">
            <CardContent className="p-3">
              <div className="flex flex-col gap-3">
                {/* Row 1: Search + Actions */}
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 size-4 text-muted-foreground`} />
                    <Input placeholder={lang === 'ar' ? 'بحث بالاسم أو الهاتف أو الإيميل...' : 'Search by name, phone or email...'}
                      value={search} onChange={(e) => setSearch(e.target.value)}
                      className={`${isRTL ? 'pr-10' : 'pl-10'} h-9 text-sm`} />
                  </div>
                  <Button size="sm" onClick={() => setShowAdd(true)} className="gap-1.5 h-9 bg-emerald-600 hover:bg-emerald-700 text-white">
                    <UserPlus className="size-4" />
                    <span className="hidden sm:inline">{lang === 'ar' ? 'إضافة طالب' : 'Add Student'}</span>
                  </Button>
                  <Button variant="outline" size="icon" onClick={refresh} className="h-9 w-9 shrink-0">
                    <RefreshCw className="size-4" />
                  </Button>
                </div>

                {/* Row 2: Dropdown Filters */}
                <div className="flex flex-wrap gap-2 items-center">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Filter className="size-3.5" />
                    {lang === 'ar' ? 'تصفية:' : 'Filter:'}
                  </div>
                  <Select value={gradeFilter || '__all__'} onValueChange={(v) => { setGradeFilter(v === '__all__' ? '' : v); setSectionFilter(''); }}>
                    <SelectTrigger className={`h-8 w-auto min-w-[140px] text-xs ${gradeFilter ? 'border-emerald-500' : ''}`}>
                      <SelectValue placeholder={lang === 'ar' ? 'كل الصفوف' : 'All Grades'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">{lang === 'ar' ? 'كل الصفوف' : 'All Grades'}</SelectItem>
                      {GRADE_KEYS.map(g => <SelectItem key={g} value={g}>{t(`grades.${g}`)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {gradeFilter && (
                    <Select value={sectionFilter || '__all__'} onValueChange={(v) => setSectionFilter(v === '__all__' ? '' : v)}>
                      <SelectTrigger className={`h-8 w-auto min-w-[120px] text-xs ${sectionFilter ? 'border-emerald-500' : ''}`}>
                        <SelectValue placeholder={lang === 'ar' ? 'كل الفصول' : 'All Sections'} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">{lang === 'ar' ? 'كل الفصول' : 'All Sections'}</SelectItem>
                        {SECTION_KEYS.map(s => <SelectItem key={s} value={s}>{t(`sections.${s}`)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                  <Select value={genderFilter || '__all__'} onValueChange={(v) => setGenderFilter(v === '__all__' ? '' : v)}>
                    <SelectTrigger className={`h-8 w-auto min-w-[100px] text-xs ${genderFilter ? 'border-emerald-500' : ''}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">{lang === 'ar' ? 'الكل' : 'All'}</SelectItem>
                      <SelectItem value="male">{t('form.male')}</SelectItem>
                      <SelectItem value="female">{t('form.female')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={sort} onValueChange={setSort}>
                    <SelectTrigger className="h-8 w-auto min-w-[130px] text-xs">
                      <ArrowUpDown className="size-3 me-1" /><SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">{lang === 'ar' ? 'الأحدث' : 'Newest'}</SelectItem>
                      <SelectItem value="oldest">{lang === 'ar' ? 'الأقدم' : 'Oldest'}</SelectItem>
                      <SelectItem value="name_asc">{lang === 'ar' ? 'الاسم أ→ي' : 'Name A→Z'}</SelectItem>
                      <SelectItem value="name_desc">{lang === 'ar' ? 'الاسم ي→أ' : 'Name Z→A'}</SelectItem>
                    </SelectContent>
                  </Select>
                  {activeFilters > 0 && (
                    <button onClick={() => { setSearch(''); setGradeFilter(''); setSectionFilter(''); setGenderFilter(''); setSort('newest'); }}
                      className="rounded-full px-2.5 py-1 text-xs text-destructive bg-destructive/10 hover:bg-destructive/20 transition-colors">
                      {lang === 'ar' ? 'مسح الفلاتر' : 'Clear'} ×
                    </button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results bar */}
          <div className="flex items-center justify-between px-1">
            <p className="text-sm text-muted-foreground">
              {lang === 'ar' ? 'عرض' : 'Showing'} <span className="font-semibold text-foreground">{filteredCount}</span> {lang === 'ar' ? 'طالب' : 'students'}
            </p>
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="sm" onClick={doExportExcel} className="gap-1 h-7 text-xs bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700">
                <FileSpreadsheet className="size-3" /> {lang === 'ar' ? 'Excel' : 'Excel'}
              </Button>
              <Button variant="outline" size="sm" onClick={downloadBulkPdf} className="gap-1 h-7 text-xs">
                <FileText className="size-3" /> PDF
              </Button>
              <Button variant="outline" size="sm" onClick={doExportJson} className="gap-1 h-7 text-xs">
                <Braces className="size-3" /> JSON
              </Button>
              <Button variant="outline" size="sm" onClick={doExportCsv} className="gap-1 h-7 text-xs">
                <Download className="size-3" /> CSV
              </Button>
            </div>
          </div>

          {/* Data Table - with Skeleton Loader */}
          {loading ? (
            <SkeletonTable rows={6} />
          ) : students.length === 0 ? (
            <Card className="shadow-sm overflow-hidden">
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <Users className="size-10 mb-3 opacity-20" />
                <p className="text-sm">{lang === 'ar' ? 'لا توجد بيانات' : 'No data'}</p>
                <Button size="sm" onClick={() => setShowAdd(true)} className="mt-3 gap-1.5 h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Plus className="size-3.5" /> {lang === 'ar' ? 'إضافة طالب جديد' : 'Add new student'}
                </Button>
              </div>
            </Card>
          ) : (
          <Card className="shadow-sm overflow-hidden">
              <>
                {/* Desktop Table */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-start px-3 py-2.5 font-medium text-xs w-8">#</th>
                        <th className="text-start px-3 py-2.5 font-medium text-xs">{t('form.fullName')}</th>
                        <th className="text-start px-3 py-2.5 font-medium text-xs">{t('form.grade')}</th>
                        <th className="text-start px-3 py-2.5 font-medium text-xs">{t('form.gender')}</th>
                        <th className="text-start px-3 py-2.5 font-medium text-xs">{t('form.parentPhone')}</th>
                        <th className="text-start px-3 py-2.5 font-medium text-xs">{t('form.parentEmail')}</th>
                        <th className="text-start px-3 py-2.5 font-medium text-xs">{t('form.whatsapp')}</th>
                        <th className="text-center px-3 py-2.5 font-medium text-xs w-24">{lang === 'ar' ? 'إجراءات' : 'Actions'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((s, i) => (
                        <tr key={s.id} className="border-b last:border-0 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/10 transition-colors">
                          <td className="px-3 py-2.5 text-muted-foreground text-xs">{(page - 1) * PAGE_SIZE + i + 1}</td>
                          <td className="px-3 py-2.5 font-medium">{highlightMatch(s.fullName, search)}</td>
                          <td className="px-3 py-2.5 text-xs">{parseCN(s.className)}</td>
                          <td className="px-3 py-2.5">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${s.gender === 'male' ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300' : 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300'}`}>
                              {s.gender === 'male' ? t('form.male') : t('form.female')}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-xs font-mono" dir="ltr">{highlightMatch(s.parentPhone, search)}</td>
                          <td className="px-3 py-2.5 text-xs" dir="ltr">{highlightMatch(s.parentEmail, search)}</td>
                          <td className="px-3 py-2.5 text-xs font-mono" dir="ltr">{s.whatsapp || '—'}</td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center justify-center gap-0.5">
                              <button onClick={() => setViewStudent(s)} className="p-1.5 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 transition-colors" title={lang === 'ar' ? 'عرض' : 'View'}>
                                <Eye className="size-3.5" />
                              </button>
                              <button onClick={() => openEdit(s)} className="p-1.5 rounded-md hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-emerald-600 transition-colors" title={t('form.edit')}>
                                <Pencil className="size-3.5" />
                              </button>
                              <button onClick={() => handleDelete(s)} className="p-1.5 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 transition-colors" title={t('form.delete')}>
                                <Trash2 className="size-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="lg:hidden divide-y">
                  {students.map((s, i) => (
                    <div key={s.id} className="p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{highlightMatch(s.fullName, search)}</p>
                          <p className="text-xs text-muted-foreground">{parseCN(s.className)}</p>
                        </div>
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0 ${s.gender === 'male' ? 'bg-sky-100 text-sky-700' : 'bg-pink-100 text-pink-700'}`}>
                          {s.gender === 'male' ? t('form.male') : t('form.female')}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
                        <div><span className="text-muted-foreground">{t('form.parentPhone')}:</span> <span dir="ltr" className="font-mono">{highlightMatch(s.parentPhone, search)}</span></div>
                        <div><span className="text-muted-foreground">{t('form.parentEmail')}:</span> <span dir="ltr">{highlightMatch(s.parentEmail, search)}</span></div>
                      </div>
                      <div className="flex items-center gap-1.5 pt-1">
                        <Button size="sm" variant="ghost" onClick={() => setViewStudent(s)} className="gap-1 h-7 text-xs"><Eye className="size-3" /></Button>
                        <Button size="sm" variant="outline" onClick={() => openEdit(s)} className="gap-1 h-7 text-xs"><Pencil className="size-3" /> {t('form.edit')}</Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(s)} className="gap-1 h-7 text-xs text-destructive"><Trash2 className="size-3" /></Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-2.5 border-t bg-muted/30">
                    <p className="text-xs text-muted-foreground">
                      {lang === 'ar' ? `صفحة ${page} من ${totalPages}` : `Page ${page}/${totalPages}`}
                    </p>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="icon" className="h-7 w-7" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                        {isRTL ? <ChevronLeft className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                      </Button>
                      {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                        let p: number;
                        if (totalPages <= 5) p = i + 1;
                        else if (page <= 3) p = i + 1;
                        else if (page >= totalPages - 2) p = totalPages - 4 + i;
                        else p = page - 2 + i;
                        return (
                          <Button key={p} variant={p === page ? 'default' : 'outline'} size="icon" className="h-7 w-7 text-xs" onClick={() => setPage(p)}>{p}</Button>
                        );
                      })}
                      <Button variant="outline" size="icon" className="h-7 w-7" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                        {isRTL ? <ChevronRight className="size-3.5" /> : <ChevronLeft className="size-3.5" />}
                      </Button>
                    </div>
                  </div>
                )}
              </>
          </Card>
          )}
            </>
          )}
        </main>
      </div>

      {/* ── Send Notification Dialog ── */}
      <Dialog open={showNotif} onOpenChange={(o) => !o && setShowNotif(false)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{lang === 'ar' ? 'إرسال إشعار جديد' : 'Send New Notification'}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label className="text-xs">{lang === 'ar' ? 'عنوان الإشعار' : 'Title'} *</Label>
              <Input value={notifTitle} onChange={(e) => setNotifTitle(e.target.value)} placeholder={lang === 'ar' ? 'مثال: موعد اختبارات نهاية العام' : 'e.g. Final exam schedule'} className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{lang === 'ar' ? 'نص الإشعار' : 'Message'} *</Label>
              <textarea value={notifMessage} onChange={(e) => setNotifMessage(e.target.value)} rows={4} placeholder={lang === 'ar' ? 'اكتب نص الإشعار هنا...' : 'Write notification message...'} className="w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[80px] resize-none" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{lang === 'ar' ? 'إرسال إلى' : 'Send to'} *</Label>
              <div className="flex gap-2">
                <button onClick={() => setNotifTarget('all')} className={`flex-1 rounded-lg border-2 p-3 text-center text-sm transition-colors ${notifTarget === 'all' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20' : 'border-muted hover:bg-muted'}`}>
                  <p className="font-medium">{lang === 'ar' ? 'جميع الطلاب' : 'All Students'}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{stats?.totalUsers || 0} {lang === 'ar' ? 'مستخدم' : 'users'}</p>
                </button>
                <button onClick={() => setNotifTarget('student')} className={`flex-1 rounded-lg border-2 p-3 text-center text-sm transition-colors ${notifTarget === 'student' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20' : 'border-muted hover:bg-muted'}`}>
                  <p className="font-medium">{lang === 'ar' ? 'طالب محدد' : 'Specific Student'}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{lang === 'ar' ? 'اختر من القائمة' : 'Select from list'}</p>
                </button>
              </div>
            </div>
            {notifTarget === 'student' && (
              <div className="space-y-1.5">
                <Label className="text-xs">{lang === 'ar' ? 'اختر الطالب' : 'Select Student'}</Label>
                <Select value={notifTargetStudent || '__none__'} onValueChange={setNotifTargetStudent}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder={lang === 'ar' ? 'اختر طالب...' : 'Select student...'} /></SelectTrigger>
                  <SelectContent>
                    {students.map(s => (
                      <SelectItem key={s.id} value={s.userEmail}>
                        {s.fullName} ({parseCN(s.className)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <Clock className="size-3" /> {lang === 'ar' ? 'جدولة الإرسال (اختياري)' : 'Schedule (optional)'}
              </Label>
              <Input
                type="datetime-local"
                value={notifSchedule}
                onChange={(e) => setNotifSchedule(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                className="h-9 text-sm"
              />
              <p className="text-[10px] text-muted-foreground">
                {lang === 'ar' ? 'اتركه فارغ للإرسال الفوري. الإشعار المجدول يتبعت كـ Web Push للطلاب المشتركين.' : 'Leave empty for instant send. Scheduled notifications are delivered as Web Push to subscribed students.'}
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowNotif(false)}>{t('form.cancel')}</Button>
            <Button onClick={handleSendNotif} disabled={sending} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {sending ? <><Loader2 className="size-4 animate-spin" /> {lang === 'ar' ? 'جاري الإرسال...' : 'Sending...'}</> : <><Send className="size-4" /> {lang === 'ar' ? 'إرسال' : 'Send'}</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── View Student Dialog ── */}
      <Dialog open={!!viewStudent} onOpenChange={(o) => !o && setViewStudent(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{viewStudent?.fullName}</DialogTitle></DialogHeader>
          {viewStudent && (
            <div className="space-y-3 text-sm">
              {[
                [t('form.fullName'), viewStudent.fullName],
                [t('form.grade'), parseCN(viewStudent.className)],
                [t('form.gender'), viewStudent.gender === 'male' ? t('form.male') : t('form.female')],
                [t('form.parentPhone'), viewStudent.parentPhone],
                [t('form.parentEmail'), viewStudent.parentEmail],
                [t('form.whatsapp'), viewStudent.whatsapp || '—'],
                [lang === 'ar' ? 'حساب المستخدم' : 'User Account', viewStudent.userEmail],
                [lang === 'ar' ? 'آخر تحديث' : 'Last Updated', new Date(viewStudent.updatedAt).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')],
              ].map(([label, value]) => (
                <div key={label as string} className="flex justify-between py-1.5 border-b border-dashed last:border-0">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium" dir={['010', '011', '012', '015'].some(p => (value as string).startsWith(p)) ? 'ltr' : dir}>{value}</span>
                </div>
              ))}
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => downloadSinglePdf(viewStudent!)} className="gap-1.5">
              <FileText className="size-4" /> {t('admin.downloadPdf')}
            </Button>
            <Button variant="outline" onClick={() => openEdit(viewStudent!)} className="gap-1.5"><Pencil className="size-4" /> {t('form.edit')}</Button>
            <Button variant="destructive" onClick={() => { handleDelete(viewStudent!); setViewStudent(null); }} className="gap-1.5"><Trash2 className="size-4" /> {t('form.delete')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add Student Dialog ── */}
      <Dialog open={showAdd} onOpenChange={(o) => !o && setShowAdd(false)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{lang === 'ar' ? 'إضافة طالب جديد' : 'Add New Student'}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label className="text-xs">{t('form.fullName')} *</Label>
              <Input value={addForm.fullName} onChange={(e) => setAddForm(f => ({ ...f, fullName: e.target.value }))} placeholder={t('form.fullNamePlaceholder')} className="h-9 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">{t('form.grade')} *</Label>
                <Select value={addGrade} onValueChange={setAddGrade}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder={t('form.gradePlaceholder')} /></SelectTrigger>
                  <SelectContent>{GRADE_KEYS.map(g => <SelectItem key={g} value={g}>{t(`grades.${g}`)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t('form.section')} *</Label>
                <Select value={addSection} onValueChange={setAddSection}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder={t('form.sectionPlaceholder')} /></SelectTrigger>
                  <SelectContent>{SECTION_KEYS.map(s => <SelectItem key={s} value={s}>{t(`sections.${s}`)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t('form.gender')} *</Label>
              <RadioGroup value={addForm.gender} onValueChange={(v) => setAddForm(f => ({ ...f, gender: v }))} className="flex gap-4">
                <div className="flex items-center gap-1.5"><RadioGroupItem value="male" id="add-male" /><Label htmlFor="add-male" className="cursor-pointer font-normal text-sm">{t('form.male')}</Label></div>
                <div className="flex items-center gap-1.5"><RadioGroupItem value="female" id="add-female" /><Label htmlFor="add-female" className="cursor-pointer font-normal text-sm">{t('form.female')}</Label></div>
              </RadioGroup>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">{t('form.parentPhone')} *</Label>
                <Input dir="ltr" value={addForm.parentPhone} onChange={(e) => setAddForm(f => ({ ...f, parentPhone: e.target.value }))} placeholder={t('form.parentPhonePlaceholder')} className="h-9 text-sm font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t('form.parentEmail')} *</Label>
                <Input dir="ltr" value={addForm.parentEmail} onChange={(e) => setAddForm(f => ({ ...f, parentEmail: e.target.value }))} placeholder={t('form.parentEmailPlaceholder')} className="h-9 text-sm" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t('form.whatsapp')} <span className="text-muted-foreground">{t('form.optional')}</span></Label>
              <Input dir="ltr" value={addForm.whatsapp} onChange={(e) => setAddForm(f => ({ ...f, whatsapp: e.target.value }))} placeholder={t('form.whatsappPlaceholder')} className="h-9 text-sm font-mono" />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowAdd(false)}>{t('form.cancel')}</Button>
            <Button onClick={handleAdd} disabled={adding} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {adding ? <><Loader2 className="size-4 animate-spin" /> {lang === 'ar' ? 'جاري الإضافة...' : 'Adding...'}</> : <><CheckCircle2 className="size-4" /> {lang === 'ar' ? 'إضافة' : 'Add'}</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Student Dialog ── */}
      <Dialog open={!!editStudent} onOpenChange={(o) => !o && setEditStudent(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{lang === 'ar' ? 'تعديل بيانات' : 'Edit'}: {editStudent?.fullName}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label className="text-xs">{t('form.fullName')} *</Label>
              <Input value={editForm.fullName} onChange={(e) => setEditForm(f => ({ ...f, fullName: e.target.value }))} className="h-9 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">{t('form.grade')} *</Label>
                <Select value={editGrade} onValueChange={setEditGrade}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{GRADE_KEYS.map(g => <SelectItem key={g} value={g}>{t(`grades.${g}`)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t('form.section')} *</Label>
                <Select value={editSection} onValueChange={setEditSection}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{SECTION_KEYS.map(s => <SelectItem key={s} value={s}>{t(`sections.${s}`)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t('form.gender')} *</Label>
              <RadioGroup value={editForm.gender} onValueChange={(v) => setEditForm(f => ({ ...f, gender: v }))} className="flex gap-4">
                <div className="flex items-center gap-1.5"><RadioGroupItem value="male" id="ed-male" /><Label htmlFor="ed-male" className="cursor-pointer font-normal text-sm">{t('form.male')}</Label></div>
                <div className="flex items-center gap-1.5"><RadioGroupItem value="female" id="ed-female" /><Label htmlFor="ed-female" className="cursor-pointer font-normal text-sm">{t('form.female')}</Label></div>
              </RadioGroup>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">{t('form.parentPhone')} *</Label>
                <Input dir="ltr" value={editForm.parentPhone} onChange={(e) => setEditForm(f => ({ ...f, parentPhone: e.target.value }))} className="h-9 text-sm font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t('form.parentEmail')} *</Label>
                <Input dir="ltr" value={editForm.parentEmail} onChange={(e) => setEditForm(f => ({ ...f, parentEmail: e.target.value }))} className="h-9 text-sm" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t('form.whatsapp')} <span className="text-muted-foreground">{t('form.optional')}</span></Label>
              <Input dir="ltr" value={editForm.whatsapp} onChange={(e) => setEditForm(f => ({ ...f, whatsapp: e.target.value }))} placeholder={t('form.whatsappPlaceholder')} className="h-9 text-sm font-mono" />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setEditStudent(null)}>{t('form.cancel')}</Button>
            <Button onClick={saveEdit} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
              {saving ? <><Loader2 className="size-4 animate-spin" /> {t('form.updating')}</> : <><CheckCircle2 className="size-4" /> {t('form.update')}</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Logout Confirmation ── */}
      <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <TriangleAlert className="size-5 text-amber-500" />
              {lang === 'ar' ? 'تسجيل الخروج' : 'Logout'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {lang === 'ar' ? 'هل أنت متأكد من تسجيل الخروج؟' : 'Are you sure you want to logout?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel>{lang === 'ar' ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout} className="bg-destructive text-white hover:bg-destructive/90">
              <LogOut className="size-4" />
              {lang === 'ar' ? 'خروج' : 'Logout'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
