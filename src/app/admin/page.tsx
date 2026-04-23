'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, GraduationCap, Users, User, Shield, Search, Download, Trash2, Pencil, X, ChevronLeft, ChevronRight, School, LayoutDashboard, LogOut, Menu, ArrowUpDown, Filter, RefreshCw, CheckCircle2, FileSpreadsheet } from 'lucide-react';
import { useLanguage, getT } from '@/lib/i18n/context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface StudentRecord {
  id: string;
  fullName: string;
  className: string;
  parentPhone: string;
  parentEmail: string;
  gender: string;
  whatsapp: string | null;
  userEmail: string;
  userName: string | null;
  userCreatedAt: string;
  createdAt: string;
  updatedAt: string;
}

interface Stats {
  totalStudents: number;
  totalUsers: number;
  maleCount: number;
  femaleCount: number;
  studentsByClass: { className: string; count: number }[];
  recentStudents: { fullName: string; className: string; createdAt: string }[];
}

const GRADE_KEYS = ['1', '2', '3', '4', '5', '6'] as const;
const PAGE_SIZE = 25;

export default function AdminDashboard() {
  const router = useRouter();
  const { lang, dir } = useLanguage();
  const t = getT(lang);

  const [authed, setAuthed] = useState<boolean | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  // Filters
  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [sort, setSort] = useState('newest');

  // Edit modal
  const [editStudent, setEditStudent] = useState<StudentRecord | null>(null);
  const [editForm, setEditForm] = useState({ fullName: '', className: '', parentPhone: '', parentEmail: '', gender: '', whatsapp: '' });
  const [editGrade, setEditGrade] = useState('');
  const [editSection, setEditSection] = useState('');
  const [saving, setSaving] = useState(false);

  // Mobile sidebar
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Check admin auth
  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) { router.push('/'); return; }
      const data = await res.json();
      if (data.user.role !== 'admin') { router.push('/'); return; }
      setAuthed(true);
    } catch { router.push('/'); }
  }, [router]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
      }
    } catch { /* ignore */ }
  }, []);

  // Fetch students
  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (gradeFilter) params.set('grade', gradeFilter);
      if (genderFilter) params.set('gender', genderFilter);
      if (sort) params.set('sort', sort);
      params.set('page', page.toString());
      params.set('limit', PAGE_SIZE.toString());

      const res = await fetch(`/api/admin/students?${params}`);
      if (res.ok) {
        const data = await res.json();
        setStudents(data.students);
        setTotal(data.pagination.total);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [search, gradeFilter, genderFilter, sort, page]);

  useEffect(() => { checkAuth(); }, [checkAuth]);

  useEffect(() => {
    if (authed) {
      fetchStats();
      fetchStudents();
    }
  }, [authed, fetchStats, fetchStudents]);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [search, gradeFilter, genderFilter, sort]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  };

  const parseClassName = (cn: string) => {
    const [g, s] = (cn || '/').split('/');
    return `${t(`grades.${g}`)} - ${t(`sections.${s}`)}`;
  };

  // Edit
  const openEdit = (s: StudentRecord) => {
    const [g, sec] = (s.className || '/').split('/');
    setEditStudent(s);
    setEditForm({ fullName: s.fullName, className: s.className, parentPhone: s.parentPhone, parentEmail: s.parentEmail, gender: s.gender, whatsapp: s.whatsapp || '' });
    setEditGrade(g || '');
    setEditSection(sec || '');
  };

  const saveEdit = async () => {
    if (!editStudent) return;
    setSaving(true);
    try {
      const className = `${editGrade}/${editSection}`;
      const res = await fetch(`/api/admin/students/${editStudent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editForm, className }),
      });
      if (res.ok) {
        toast.success(lang === 'ar' ? 'تم التحديث بنجاح' : 'Updated successfully');
        setEditStudent(null);
        fetchStudents();
        fetchStats();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || 'Error');
      }
    } catch { toast.error('Error'); }
    finally { setSaving(false); }
  };

  // Delete
  const handleDelete = async (s: StudentRecord) => {
    const msg = lang === 'ar'
      ? `هل أنت متأكد من حذف بيانات الطالب "${s.fullName}"؟`
      : `Are you sure you want to delete "${s.fullName}"?`;
    if (!window.confirm(msg)) return;
    try {
      const res = await fetch(`/api/admin/students/${s.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success(lang === 'ar' ? 'تم الحذف بنجاح' : 'Deleted successfully');
        fetchStudents();
        fetchStats();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || 'Error');
      }
    } catch { toast.error('Error'); }
  };

  // Export CSV
  const exportCSV = () => {
    const headers = lang === 'ar'
      ? ['الاسم', 'الصف - الفصل', 'هاتف ولي الأمر', 'بريد ولي الأمر', 'الجنس', 'واتساب', 'بريد المستخدم', 'تاريخ التسجيل']
      : ['Name', 'Class', 'Parent Phone', 'Parent Email', 'Gender', 'WhatsApp', 'User Email', 'Registered At'];
    const rows = students.map(s => [
      s.fullName,
      parseClassName(s.className),
      s.parentPhone,
      s.parentEmail,
      s.gender === 'male' ? t('form.male') : t('form.female'),
      s.whatsapp || '',
      s.userEmail,
      new Date(s.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US'),
    ]);
    const csvContent = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `students_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(lang === 'ar' ? 'تم تصدير CSV' : 'CSV exported');
  };

  // Export Excel (as TSV with BOM - opens in Excel)
  const exportExcel = () => {
    const headers = lang === 'ar'
      ? ['الاسم', 'الصف - الفصل', 'هاتف ولي الأمر', 'بريد ولي الأمر', 'الجنس', 'واتساب', 'بريد المستخدم', 'تاريخ التسجيل']
      : ['Name', 'Class', 'Parent Phone', 'Parent Email', 'Gender', 'WhatsApp', 'User Email', 'Registered At'];
    const rows = students.map(s => [
      s.fullName,
      parseClassName(s.className),
      s.parentPhone,
      s.parentEmail,
      s.gender === 'male' ? t('form.male') : t('form.female'),
      s.whatsapp || '',
      s.userEmail,
      new Date(s.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US'),
    ]);
    const tsvContent = [headers, ...rows].map(r => r.map(c => `"${c}"`).join('\t')).join('\n');
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + tsvContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `students_${new Date().toISOString().split('T')[0]}.xls`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(lang === 'ar' ? 'تم تصدير Excel' : 'Excel exported');
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const isRTL = dir === 'rtl';

  if (authed === null || !authed) {
    return (
      <div dir={dir} className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div dir={dir} className="min-h-screen flex bg-muted/30">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 ${isRTL ? 'right-0' : 'left-0'} z-40 w-64 bg-card border-${isRTL ? 'l' : 'r'} transform transition-transform lg:translate-x-0 lg:static lg:z-auto ${sidebarOpen ? 'translate-x-0' : (isRTL ? 'translate-x-full' : '-translate-x-full')}`}>
        <div className="flex flex-col h-full">
          <div className="p-4 border-b flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <Shield className="size-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm">{lang === 'ar' ? 'لوحة التحكم' : 'Admin Panel'}</h2>
              <p className="text-xs text-muted-foreground">كلية الاقبال القوميه</p>
            </div>
            <button className="lg:hidden ml-auto" onClick={() => setSidebarOpen(false)}>
              <X className="size-5" />
            </button>
          </div>

          <nav className="flex-1 p-3 space-y-1">
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2.5 text-sm font-medium text-emerald-700 dark:text-emerald-300">
              <LayoutDashboard className="size-4" />
              {lang === 'ar' ? 'الرئيسية' : 'Dashboard'}
            </div>
          </nav>

          <div className="p-3 border-t">
            <button onClick={handleLogout} className="flex items-center gap-2 w-full rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
              <LogOut className="size-4" />
              {lang === 'ar' ? 'تسجيل الخروج' : 'Logout'}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-card border-b px-4 py-3 flex items-center gap-3">
          <button className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="size-5" />
          </button>
          <h1 className="font-semibold text-lg">{lang === 'ar' ? 'لوحة تحكم المدير' : 'Admin Dashboard'}</h1>
          <Button variant="ghost" size="sm" onClick={() => router.push('/')} className="gap-1.5 mr-auto">
            <School className="size-4" />
            {lang === 'ar' ? 'الموقع الرئيسي' : 'Main Site'}
          </Button>
        </header>

        <main className="flex-1 p-4 md:p-6 space-y-6">
          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="shadow-sm">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                    <Users className="size-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.totalStudents}</p>
                    <p className="text-xs text-muted-foreground">{lang === 'ar' ? 'إجمالي الطلاب' : 'Total Students'}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                    <GraduationCap className="size-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.totalUsers}</p>
                    <p className="text-xs text-muted-foreground">{lang === 'ar' ? 'إجمالي المستخدمين' : 'Total Users'}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-900/30">
                    <User className="size-5 text-sky-600 dark:text-sky-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.maleCount}</p>
                    <p className="text-xs text-muted-foreground">{lang === 'ar' ? 'ذكور' : 'Male'}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pink-100 dark:bg-pink-900/30">
                    <User className="size-5 text-pink-600 dark:text-pink-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.femaleCount}</p>
                    <p className="text-xs text-muted-foreground">{lang === 'ar' ? 'إناث' : 'Female'}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Class Distribution */}
          {stats && stats.studentsByClass.length > 0 && (
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{lang === 'ar' ? 'توزيع الطلاب على الفصول' : 'Students by Class'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {stats.studentsByClass.map(c => (
                    <div key={c.className} className="rounded-lg bg-muted p-3 text-center">
                      <p className="text-lg font-bold text-emerald-600">{c.count}</p>
                      <p className="text-xs text-muted-foreground">{parseClassName(c.className)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Filters & Search */}
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                {/* Search */}
                <div className="flex-1 relative">
                  <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 size-4 text-muted-foreground`} />
                  <Input
                    placeholder={lang === 'ar' ? 'بحث بالاسم أو الهاتف...' : 'Search by name or phone...'}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className={`${isRTL ? 'pr-10' : 'pl-10'} h-10`}
                  />
                </div>
                {/* Grade Filter */}
                <Select value={gradeFilter} onValueChange={(v) => setGradeFilter(v === '__all__' ? '' : v)}>
                  <SelectTrigger className="h-10 w-full sm:w-[180px]">
                    <SelectValue placeholder={lang === 'ar' ? 'كل الصفوف' : 'All Grades'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">{lang === 'ar' ? 'كل الصفوف' : 'All Grades'}</SelectItem>
                    {GRADE_KEYS.map(g => (
                      <SelectItem key={g} value={g}>{t(`grades.${g}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {/* Gender Filter */}
                <Select value={genderFilter} onValueChange={(v) => setGenderFilter(v === '__all__' ? '' : v)}>
                  <SelectTrigger className="h-10 w-full sm:w-[140px]">
                    <SelectValue placeholder={lang === 'ar' ? 'الجنس' : 'Gender'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">{lang === 'ar' ? 'الكل' : 'All'}</SelectItem>
                    <SelectItem value="male">{t('form.male')}</SelectItem>
                    <SelectItem value="female">{t('form.female')}</SelectItem>
                  </SelectContent>
                </Select>
                {/* Sort */}
                <Select value={sort} onValueChange={setSort}>
                  <SelectTrigger className="h-10 w-full sm:w-[160px]">
                    <ArrowUpDown className="size-4 me-1.5" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">{lang === 'ar' ? 'الأحدث' : 'Newest'}</SelectItem>
                    <SelectItem value="oldest">{lang === 'ar' ? 'الأقدم' : 'Oldest'}</SelectItem>
                    <SelectItem value="name_asc">{lang === 'ar' ? 'الاسم (أ-ي)' : 'Name (A-Z)'}</SelectItem>
                    <SelectItem value="name_desc">{lang === 'ar' ? 'الاسم (ي-أ)' : 'Name (Z-A)'}</SelectItem>
                  </SelectContent>
                </Select>
                {/* Refresh */}
                <Button variant="outline" size="icon" onClick={() => { fetchStudents(); fetchStats(); }} className="h-10 w-10 shrink-0">
                  <RefreshCw className="size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Data Table */}
          <Card className="shadow-sm">
            <CardContent className="p-0">
              {/* Export buttons */}
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{lang === 'ar' ? 'سجلات الطلاب' : 'Student Records'}</span>
                  <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{total}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5 h-8 text-xs">
                    <Download className="size-3.5" />
                    CSV
                  </Button>
                  <Button variant="outline" size="sm" onClick={exportExcel} className="gap-1.5 h-8 text-xs">
                    <FileSpreadsheet className="size-3.5" />
                    Excel
                  </Button>
                </div>
              </div>

              {/* Table */}
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="size-6 animate-spin text-emerald-600" />
                </div>
              ) : students.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Users className="size-10 mb-3 opacity-30" />
                  <p className="text-sm">{lang === 'ar' ? 'لا توجد بيانات' : 'No data found'}</p>
                </div>
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-start px-4 py-3 font-medium">#</th>
                          <th className="text-start px-4 py-3 font-medium">{t('form.fullName')}</th>
                          <th className="text-start px-4 py-3 font-medium">{t('form.grade')}</th>
                          <th className="text-start px-4 py-3 font-medium">{t('form.gender')}</th>
                          <th className="text-start px-4 py-3 font-medium">{t('form.parentPhone')}</th>
                          <th className="text-start px-4 py-3 font-medium">{t('form.parentEmail')}</th>
                          <th className="text-start px-4 py-3 font-medium">{t('form.whatsapp')}</th>
                          <th className="text-center px-4 py-3 font-medium">{lang === 'ar' ? 'إجراءات' : 'Actions'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map((s, i) => (
                          <tr key={s.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3 text-muted-foreground">{(page - 1) * PAGE_SIZE + i + 1}</td>
                            <td className="px-4 py-3 font-medium">{s.fullName}</td>
                            <td className="px-4 py-3">{parseClassName(s.className)}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${s.gender === 'male' ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300' : 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300'}`}>
                                {s.gender === 'male' ? t('form.male') : t('form.female')}
                              </span>
                            </td>
                            <td className="px-4 py-3" dir="ltr">{s.parentPhone}</td>
                            <td className="px-4 py-3" dir="ltr">{s.parentEmail}</td>
                            <td className="px-4 py-3" dir="ltr">{s.whatsapp || '—'}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-1">
                                <button onClick={() => openEdit(s)} className="p-1.5 rounded-md hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-emerald-600 transition-colors" title={t('form.edit')}>
                                  <Pencil className="size-4" />
                                </button>
                                <button onClick={() => handleDelete(s)} className="p-1.5 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 transition-colors" title={t('form.delete')}>
                                  <Trash2 className="size-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile cards */}
                  <div className="md:hidden divide-y">
                    {students.map((s, i) => (
                      <div key={s.id} className="p-4 space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">{s.fullName}</p>
                            <p className="text-xs text-muted-foreground">{parseClassName(s.className)}</p>
                          </div>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${s.gender === 'male' ? 'bg-sky-100 text-sky-700' : 'bg-pink-100 text-pink-700'}`}>
                            {s.gender === 'male' ? t('form.male') : t('form.female')}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-1 text-xs">
                          <div><span className="text-muted-foreground">{t('form.parentPhone')}:</span> <span dir="ltr">{s.parentPhone}</span></div>
                          <div><span className="text-muted-foreground">{t('form.parentEmail')}:</span> <span dir="ltr">{s.parentEmail}</span></div>
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                          <Button size="sm" variant="outline" onClick={() => openEdit(s)} className="gap-1 h-7 text-xs">
                            <Pencil className="size-3" /> {t('form.edit')}
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDelete(s)} className="gap-1 h-7 text-xs">
                            <Trash2 className="size-3" /> {t('form.delete')}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t">
                      <p className="text-xs text-muted-foreground">
                        {lang === 'ar'
                          ? `صفحة ${page} من ${totalPages} (${total} طالب)`
                          : `Page ${page} of ${totalPages} (${total} students)`}
                      </p>
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                          {isRTL ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
                        </Button>
                        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                          let p: number;
                          if (totalPages <= 5) p = i + 1;
                          else if (page <= 3) p = i + 1;
                          else if (page >= totalPages - 2) p = totalPages - 4 + i;
                          else p = page - 2 + i;
                          return (
                            <Button key={p} variant={p === page ? 'default' : 'outline'} size="icon" className="h-8 w-8" onClick={() => setPage(p)}>
                              {p}
                            </Button>
                          );
                        })}
                        <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                          {isRTL ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editStudent} onOpenChange={(open) => !open && setEditStudent(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{lang === 'ar' ? 'تعديل بيانات الطالب' : 'Edit Student Data'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t('form.fullName')}</Label>
              <Input value={editForm.fullName} onChange={(e) => setEditForm(f => ({ ...f, fullName: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t('form.grade')}</Label>
                <Select value={editGrade} onValueChange={setEditGrade}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{GRADE_KEYS.map(g => <SelectItem key={g} value={g}>{t(`grades.${g}`)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('form.section')}</Label>
                <Select value={editSection} onValueChange={setEditSection}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['1', '2', '3'].map(s => <SelectItem key={s} value={s}>{t(`sections.${s}`)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('form.parentPhone')}</Label>
              <Input dir="ltr" value={editForm.parentPhone} onChange={(e) => setEditForm(f => ({ ...f, parentPhone: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>{t('form.parentEmail')}</Label>
              <Input dir="ltr" value={editForm.parentEmail} onChange={(e) => setEditForm(f => ({ ...f, parentEmail: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>{t('form.gender')}</Label>
              <RadioGroup value={editForm.gender} onValueChange={(v) => setEditForm(f => ({ ...f, gender: v }))} className="flex gap-4">
                <div className="flex items-center gap-2"><RadioGroupItem value="male" id="edit-male" /><Label htmlFor="edit-male" className="cursor-pointer font-normal">{t('form.male')}</Label></div>
                <div className="flex items-center gap-2"><RadioGroupItem value="female" id="edit-female" /><Label htmlFor="edit-female" className="cursor-pointer font-normal">{t('form.female')}</Label></div>
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label>{t('form.whatsapp')} <span className="text-muted-foreground">{t('form.optional')}</span></Label>
              <Input dir="ltr" value={editForm.whatsapp} onChange={(e) => setEditForm(f => ({ ...f, whatsapp: e.target.value }))} placeholder={t('form.whatsappPlaceholder')} />
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
    </div>
  );
}
