'use client';

import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { Loader2, Save, User, CheckCircle2 } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useLanguage, getT } from '@/lib/i18n/context';

const GRADE_KEYS = [
  '1-primary', '2-primary', '3-primary',
  '4-primary', '5-primary', '6-primary',
  '1-prep', '2-prep', '3-prep',
  '1-sec', '2-sec', '3-sec',
] as const;

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
    className: z.string().min(1, t('form.classRequired')),
    parentPhone: z
      .string()
      .min(1, t('form.parentPhoneRequired'))
      .regex(/^01[0-9]{9}$/, t('form.parentPhoneInvalid')),
    parentEmail: z
      .string()
      .min(1, t('form.parentEmailRequired'))
      .email(t('form.parentEmailInvalid')),
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

export function StudentForm({ userId, existingData, onDataChange }: StudentFormProps) {
  const { lang, dir } = useLanguage();
  const t = getT(lang);

  const schema = createSchema(t);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<StudentFormData>({
    defaultValues: {
      fullName: '',
      className: '',
      parentPhone: '',
      parentEmail: '',
      gender: '',
      whatsapp: '',
    },
  });

  // Auto-fill when existingData changes
  useEffect(() => {
    if (existingData) {
      reset({
        fullName: existingData.fullName || '',
        className: existingData.className || '',
        parentPhone: existingData.parentPhone || '',
        parentEmail: existingData.parentEmail || '',
        gender: existingData.gender || '',
        whatsapp: existingData.whatsapp || '',
      });
    }
  }, [existingData, reset]);

  const watchedGender = useWatch({ control, name: 'gender' });
  const watchedGrade = useWatch({ control, name: 'className' });

  const onSubmit = async (data: StudentFormData) => {
    try {
      const method = existingData ? 'PUT' : 'POST';
      const body = {
        fullName: data.fullName,
        className: data.className,
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
        toast.success(
          existingData ? t('form.updateSuccess') : t('form.submitSuccess'),
          {
            icon: <CheckCircle2 className="size-5 text-emerald-500" />,
          }
        );
        onDataChange?.();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || t('form.submitError'));
      }
    } catch {
      toast.error(t('form.submitError'));
    }
  };

  return (
    <div dir={dir} className="w-full max-w-2xl mx-auto px-4">
      <Card className="shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
            <User className="size-7 text-emerald-600 dark:text-emerald-400" />
          </div>
          <CardTitle className="text-xl">
            {existingData ? t('form.editTitle') : t('form.title')}
          </CardTitle>
          <CardDescription>{t('form.subtitle')}</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="fullName">
                {t('form.fullName')}
                <span className="text-destructive me-1">*</span>
              </Label>
              <Input
                id="fullName"
                placeholder={t('form.fullNamePlaceholder')}
                {...register('fullName')}
                className="h-11"
              />
              {errors.fullName && (
                <p className="text-sm text-destructive">{errors.fullName.message}</p>
              )}
            </div>

            {/* Class / Grade */}
            <div className="space-y-2">
              <Label>
                {t('form.className')}
                <span className="text-destructive me-1">*</span>
              </Label>
              <Select
                value={watchedGrade}
                onValueChange={(value) => setValue('className', value, { shouldValidate: true })}
              >
                <SelectTrigger className="h-11 w-full">
                  <SelectValue placeholder={t('form.classPlaceholder')} />
                </SelectTrigger>
                <SelectContent className="max-h-64 overflow-y-auto">
                  {GRADE_KEYS.map((gradeKey) => (
                    <SelectItem key={gradeKey} value={gradeKey}>
                      {t(`grades.${gradeKey}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.className && (
                <p className="text-sm text-destructive">{errors.className.message}</p>
              )}
            </div>

            {/* Phone & Email Grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                  className="h-11 text-left"
                  {...register('parentPhone')}
                />
                {errors.parentPhone && (
                  <p className="text-sm text-destructive">{errors.parentPhone.message}</p>
                )}
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
                  className="h-11 text-left"
                  {...register('parentEmail')}
                />
                {errors.parentEmail && (
                  <p className="text-sm text-destructive">{errors.parentEmail.message}</p>
                )}
              </div>
            </div>

            {/* Gender */}
            <div className="space-y-3">
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
              {errors.gender && (
                <p className="text-sm text-destructive">{errors.gender.message}</p>
              )}
            </div>

            {/* WhatsApp */}
            <div className="space-y-2">
              <Label htmlFor="whatsapp">
                {t('form.whatsapp')}{' '}
                <span className="text-muted-foreground">{t('form.optional')}</span>
              </Label>
              <Input
                id="whatsapp"
                type="tel"
                placeholder={t('form.whatsappPlaceholder')}
                dir="ltr"
                className="h-11 text-left"
                {...register('whatsapp')}
              />
              {errors.whatsapp && (
                <p className="text-sm text-destructive">{errors.whatsapp.message}</p>
              )}
            </div>

            {/* Submit */}
            <div className="pt-2">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-11 w-full bg-emerald-600 text-white hover:bg-emerald-700 sm:w-auto sm:min-w-[180px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    {existingData
                      ? t('form.updating')
                      : t('form.submitting')}
                  </>
                ) : (
                  <>
                    <Save className="size-4" />
                    {existingData
                      ? t('form.update')
                      : t('form.submit')}
                  </>
                )}
              </Button>
            </div>
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
    </div>
  );
}
