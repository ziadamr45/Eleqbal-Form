'use client';

import { useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Save, User, CheckCircle2, Circle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useLanguage, getT } from '@/lib/i18n/context';

const GRADE_KEYS = ['1', '2', '3', '4', '5', '6'] as const;
const SECTION_KEYS = ['1', '2', '3'] as const;

interface StudentDataFromAPI {
  id: string;
  userId: string;
  fullName: string;
  className: string;
  parentPhone: string;
  parentEmail: string;
  gender: string;
  whatsapp: string | null;
  createdAt: string;
  updatedAt: string;
}

interface StudentFormProps {
  userId: string;
  existingData: StudentDataFromAPI | null;
  onDataChange?: () => void;
}

function createSchema(t: (key: string) => string) {
  return z.object({
    fullName: z
      .string()
      .min(1, t('form.fullNameRequired'))
      .regex(
        /^[\u0600-\u06FF\s]+$/,
        t('form.fullNameArabic')
      ),
    grade: z.string().min(1, t('form.gradeRequired')),
    section: z.string().min(1, t('form.sectionRequired')),
    parentPhone: z
      .string()
      .min(1, t('form.parentPhoneRequired'))
      .regex(/^01[0-9]{9}$/, t('form.parentPhoneInvalid')),
    parentEmail: z
      .string()
      .min(1, t('form.parentEmailRequired'))
      .regex(/^[a-zA-Z0-9._%+-]+@gmail\.com$/i, t('form.parentEmailInvalid')),
    gender: z.string().min(1, t('form.genderRequired')),
    whatsapp: z
      .string()
      .regex(/^01[0-9]{9}$/, t('form.whatsappInvalid'))
      .or(z.literal(''))
      .optional()
      .default(''),
  });
}

type StudentFormData = z.infer<ReturnType<typeof createSchema>>;

const STEPS = ['fullName', 'grade', 'parentPhone', 'gender'] as const;

export function StudentForm({ userId, existingData, onDataChange }: StudentFormProps) {
  const { lang, dir } = useLanguage();
  const t = getT(lang);

  const schema = createSchema(t);

  // Parse existing className into grade/section for form initialization
  const parsedExisting = existingData
    ? {
        fullName: existingData.fullName || '',
        grade: (existingData.className || '').split('/')[0] || '',
        section: (existingData.className || '').split('/')[1] || '',
        parentPhone: existingData.parentPhone || '',
        parentEmail: existingData.parentEmail || '',
        gender: existingData.gender || '',
        whatsapp: existingData.whatsapp || '',
      }
    : {
        fullName: '',
        grade: '',
        section: '',
        parentPhone: '',
        parentEmail: '',
        gender: '',
        whatsapp: '',
      };

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<StudentFormData>({
    defaultValues: parsedExisting,
    mode: 'onChange',
  });

  const watchedGender = useWatch({ control, name: 'gender' });
  const watchedGrade = useWatch({ control, name: 'grade' });
  const watchedSection = useWatch({ control, name: 'section' });
  const watchedFullName = useWatch({ control, name: 'fullName' });
  const watchedParentPhone = useWatch({ control, name: 'parentPhone' });
  const watchedParentEmail = useWatch({ control, name: 'parentEmail' });

  // Calculate form completion progress
  const progress = useMemo(() => {
    let filled = 0;
    const total = 6; // 6 required fields
    if (watchedFullName?.trim()) filled++;
    if (watchedGrade) filled++;
    if (watchedSection) filled++;
    if (watchedParentPhone?.trim()) filled++;
    if (watchedParentEmail?.trim()) filled++;
    if (watchedGender) filled++;
    return Math.round((filled / total) * 100);
  }, [watchedFullName, watchedGrade, watchedSection, watchedParentPhone, watchedParentEmail, watchedGender]);

  // Step indicators
  const getStepStatus = (step: string) => {
    switch (step) {
      case 'fullName': return !!watchedFullName?.trim();
      case 'grade': return !!watchedGrade && !!watchedSection;
      case 'parentPhone': return !!watchedParentPhone?.trim() && !!watchedParentEmail?.trim();
      case 'gender': return !!watchedGender;
      default: return false;
    }
  };

  const [submitted, setSubmitted] = useState(false);

  const onSubmit = async (data: StudentFormData) => {
    try {
      const method = existingData ? 'PUT' : 'POST';
      const body = {
        fullName: data.fullName,
        className: `${data.grade}/${data.section}`,
        parentPhone: data.parentPhone,
        parentEmail: data.parentEmail,
        gender: data.gender,
        whatsapp: data.whatsapp || null,
      };

      const res = await fetch('/api/student', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setSubmitted(true);
        toast.success(
          existingData ? t('form.updateSuccess') : t('form.submitSuccess'),
          {
            icon: <CheckCircle2 className="size-5 text-emerald-500" />,
          }
        );
        setTimeout(() => setSubmitted(false), 2000);
        onDataChange?.();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || t('form.submitError'));
      }
    } catch {
      toast.error(t('form.submitError'));
    }
  };

  const stepLabels = lang === 'ar'
    ? ['الاسم', 'الصف', 'التواصل', 'النوع']
    : ['Name', 'Grade', 'Contact', 'Gender'];

  return (
    <div dir={dir} className="w-full max-w-2xl mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        <Card className="shadow-lg overflow-hidden">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
              <AnimatePresence mode="wait">
                {submitted ? (
                  <motion.div
                    key="check"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  >
                    <CheckCircle2 className="size-7 text-emerald-600 dark:text-emerald-400" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="user"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                  >
                    <User className="size-7 text-emerald-600 dark:text-emerald-400" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <CardTitle className="text-xl">
              {existingData ? t('form.editTitle') : t('form.title')}
            </CardTitle>
            <CardDescription>{t('form.subtitle')}</CardDescription>
          </CardHeader>

          {/* Progress Section */}
          {!submitted && (
            <div className="px-6 pb-2">
              <div className="flex items-center justify-between gap-2 mb-2">
                {STEPS.map((step, idx) => {
                  const done = getStepStatus(step);
                  return (
                    <div key={step} className="flex-1 flex flex-col items-center gap-1">
                      <div className={`flex items-center justify-center rounded-full transition-colors duration-300 ${
                        done
                          ? 'bg-emerald-600 text-white'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {done ? (
                          <CheckCircle className="size-5" />
                        ) : (
                          <Circle className="size-5" />
                        )}
                      </div>
                      <span className={`text-[10px] font-medium transition-colors ${done ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                        {stepLabels[idx]}
                      </span>
                    </div>
                  );
                })}
              </div>
              <Progress value={progress} className="h-1.5" />
              <p className="text-[10px] text-muted-foreground mt-1 text-center">
                {progress === 100
                  ? (lang === 'ar' ? 'جميع الحقول مكتملة ✓' : 'All fields complete ✓')
                  : `${progress}%`
                }
              </p>
            </div>
          )}

          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Full Name */}
              <motion.div
                className="space-y-2"
                initial={{ opacity: 0, x: dir === 'rtl' ? -10 : 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 }}
              >
                <Label htmlFor="fullName">
                  {t('form.fullName')}
                  <span className="text-destructive me-1">*</span>
                </Label>
                <Input
                  id="fullName"
                  placeholder={t('form.fullNamePlaceholder')}
                  {...register('fullName')}
                  className={`h-11 transition-colors ${errors.fullName ? 'border-destructive focus-visible:ring-destructive' : 'focus-visible:ring-emerald-500'}`}
                />
                <AnimatePresence>
                  {errors.fullName && (
                    <motion.p
                      initial={{ opacity: 0, y: -4, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: 'auto' }}
                      exit={{ opacity: 0, y: -4, height: 0 }}
                      className="text-sm text-destructive"
                    >
                      {errors.fullName.message}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Grade & Section - Two dropdowns side by side */}
              <motion.div
                className="grid grid-cols-1 gap-4 sm:grid-cols-2"
                initial={{ opacity: 0, x: dir === 'rtl' ? -10 : 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                {/* Grade (الصف) */}
                <div className="space-y-2">
                  <Label>
                    {t('form.grade')}
                    <span className="text-destructive me-1">*</span>
                  </Label>
                  <Select
                    value={watchedGrade}
                    onValueChange={(value) => setValue('grade', value, { shouldValidate: true })}
                  >
                    <SelectTrigger className={`h-11 w-full transition-colors ${errors.grade ? 'border-destructive' : 'focus:ring-emerald-500'}`}>
                      <SelectValue placeholder={t('form.gradePlaceholder')} />
                    </SelectTrigger>
                    <SelectContent className="max-h-64 overflow-y-auto">
                      {GRADE_KEYS.map((gradeKey) => (
                        <SelectItem key={gradeKey} value={gradeKey}>
                          {t(`grades.${gradeKey}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <AnimatePresence>
                    {errors.grade && (
                      <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="text-sm text-destructive">
                        {errors.grade.message}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>

                {/* Section (الفصل) */}
                <div className="space-y-2">
                  <Label>
                    {t('form.section')}
                    <span className="text-destructive me-1">*</span>
                  </Label>
                  <Select
                    value={watchedSection}
                    onValueChange={(value) => setValue('section', value, { shouldValidate: true })}
                  >
                    <SelectTrigger className={`h-11 w-full transition-colors ${errors.section ? 'border-destructive' : 'focus:ring-emerald-500'}`}>
                      <SelectValue placeholder={t('form.sectionPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent className="max-h-64 overflow-y-auto">
                      {SECTION_KEYS.map((sectionKey) => (
                        <SelectItem key={sectionKey} value={sectionKey}>
                          {t(`sections.${sectionKey}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <AnimatePresence>
                    {errors.section && (
                      <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="text-sm text-destructive">
                        {errors.section.message}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>

              {/* Phone & Email Grid */}
              <motion.div
                className="grid grid-cols-1 gap-4 sm:grid-cols-2"
                initial={{ opacity: 0, x: dir === 'rtl' ? -10 : 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 }}
              >
                <div className="space-y-2">
                  <Label htmlFor="parentPhone">
                    {t('form.parentPhone')}
                    <span className="text-destructive me-1">*</span>
                  </Label>
                  <Input
                    id="parentPhone"
                    type="tel"
                    placeholder={t('form.parentPhonePlaceholder')}
                    dir="ltr"
                    className={`h-11 text-left transition-colors ${errors.parentPhone ? 'border-destructive' : 'focus-visible:ring-emerald-500'}`}
                    {...register('parentPhone')}
                  />
                  <AnimatePresence>
                    {errors.parentPhone && (
                      <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="text-sm text-destructive">
                        {errors.parentPhone.message}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="parentEmail">
                    {t('form.parentEmail')}
                    <span className="text-destructive me-1">*</span>
                  </Label>
                  <Input
                    id="parentEmail"
                    type="email"
                    placeholder={t('form.parentEmailPlaceholder')}
                    dir="ltr"
                    className={`h-11 text-left transition-colors ${errors.parentEmail ? 'border-destructive' : 'focus-visible:ring-emerald-500'}`}
                    {...register('parentEmail')}
                  />
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <svg className="size-3 shrink-0 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    {t('form.parentEmailGmailOnly')}
                  </p>
                  <AnimatePresence>
                    {errors.parentEmail && (
                      <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="text-sm text-destructive">
                        {errors.parentEmail.message}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>

              {/* Gender */}
              <motion.div
                className="space-y-3"
                initial={{ opacity: 0, x: dir === 'rtl' ? -10 : 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Label>
                  {t('form.gender')}
                  <span className="text-destructive me-1">*</span>
                </Label>
                <RadioGroup
                  value={watchedGender}
                  onValueChange={(value) => setValue('gender', value, { shouldValidate: true })}
                  className="flex flex-row gap-6"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="male" id="gender-male" />
                    <Label htmlFor="gender-male" className="cursor-pointer font-normal">
                      {t('form.male')}
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="female" id="gender-female" />
                    <Label htmlFor="gender-female" className="cursor-pointer font-normal">
                      {t('form.female')}
                    </Label>
                  </div>
                </RadioGroup>
                <AnimatePresence>
                  {errors.gender && (
                    <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="text-sm text-destructive">
                      {errors.gender.message}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* WhatsApp */}
              <motion.div
                className="space-y-2"
                initial={{ opacity: 0, x: dir === 'rtl' ? -10 : 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 }}
              >
                <Label htmlFor="whatsapp">
                  {t('form.whatsapp')}{' '}
                  <span className="text-muted-foreground">{t('form.optional')}</span>
                </Label>
                <Input
                  id="whatsapp"
                  type="tel"
                  placeholder={t('form.whatsappPlaceholder')}
                  dir="ltr"
                  className={`h-11 text-left transition-colors ${errors.whatsapp ? 'border-destructive' : 'focus-visible:ring-emerald-500'}`}
                  {...register('whatsapp')}
                />
                <AnimatePresence>
                  {errors.whatsapp && (
                    <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="text-sm text-destructive">
                      {errors.whatsapp.message}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Submit */}
              <motion.div
                className="pt-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Button
                  type="submit"
                  disabled={isSubmitting || submitted}
                  className={`h-11 w-full sm:w-auto sm:min-w-[180px] transition-all duration-200 ${
                    submitted
                      ? 'bg-emerald-500 text-white'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-600/20'
                  }`}
                >
                  <AnimatePresence mode="wait">
                    {submitted ? (
                      <motion.span
                        key="done"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="flex items-center gap-2"
                      >
                        <CheckCircle2 className="size-4" />
                        {lang === 'ar' ? 'تم بنجاح ✓' : 'Done ✓'}
                      </motion.span>
                    ) : isSubmitting ? (
                      <motion.span
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-2"
                      >
                        <Loader2 className="size-4 animate-spin" />
                        {existingData ? t('form.updating') : t('form.submitting')}
                      </motion.span>
                    ) : (
                      <motion.span
                        key="submit"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-2"
                      >
                        <Save className="size-4" />
                        {existingData ? t('form.update') : t('form.submit')}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Button>
              </motion.div>
            </form>
          </CardContent>

          {existingData && (
            <CardFooter className="border-t pt-4">
              <p className="text-xs text-muted-foreground">
                {new Date(existingData.updatedAt).toLocaleDateString(
                  lang === 'ar' ? 'ar-EG' : 'en-US',
                  { year: 'numeric', month: 'long', day: 'numeric' }
                )}
              </p>
            </CardFooter>
          )}
        </Card>
      </motion.div>
    </div>
  );
}
