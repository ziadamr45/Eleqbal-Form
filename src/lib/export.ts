import * as XLSX from 'xlsx'
import type { StudentRecord } from '@/lib/pdf'
import { registerArabicFonts, prepareArabicText } from './arabic-pdf'

// ─────────────────────────────────────────────
// SHARED HELPERS
// ─────────────────────────────────────────────

const ARABIC_HEADERS = [
  'اسم الطالب',
  'الفصل',
  'رقم ولي الأمر',
  'البريد الإلكتروني',
  'النوع',
  'رقم واتساب',
]

const ENGLISH_HEADERS = [
  'Student Name',
  'Class',
  'Parent Phone',
  'Email',
  'Gender',
  'WhatsApp',
]

function getHeaders(lang: string): string[] {
  return lang === 'ar' ? ARABIC_HEADERS : ENGLISH_HEADERS
}

function getGenderLabel(gender: string, lang: string): string {
  if (lang === 'ar') return gender === 'male' ? 'ذكر' : 'أنثى'
  return gender === 'male' ? 'Male' : 'Female'
}

// ─────────────────────────────────────────────
// EXCEL EXPORT (.xlsx)
// ─────────────────────────────────────────────

export function exportToExcel(
  students: StudentRecord[],
  lang: string,
  gradeLabels: Record<string, string>,
  sectionLabels: Record<string, string>,
): Blob {
  const headers = getHeaders(lang)

  const data = students.map((s) => {
    const [g, sec] = (s.className || '//').split('/')
    return [
      s.fullName,
      `${gradeLabels[g] || g} - ${sectionLabels[sec] || sec}`,
      s.parentPhone,
      s.parentEmail,
      getGenderLabel(s.gender, lang),
      s.whatsapp || '',
    ]
  })

  const wb = XLSX.utils.book_new()
  const wsData = [headers, ...data]
  const ws = XLSX.utils.aoa_to_sheet(wsData)

  const colWidths: number[] = []
  for (let col = 0; col < headers.length; col++) {
    const headerLen = headers[col].length
    const maxDataLen = data.reduce((max, row) => {
      const val = String(row[col] || '')
      const arabicCount = (val.match(/[\u0600-\u06FF]/g) || []).length
      const latinCount = val.length - arabicCount
      return Math.max(max, Math.ceil(latinCount + arabicCount * 1.5))
    }, 0)
    colWidths.push(Math.max(headerLen * 1.3, maxDataLen + 2, 14))
  }
  ws['!cols'] = colWidths.map((w) => ({ wch: Math.ceil(w) }))

  if (lang === 'ar') {
    ws['!dir'] = 'rtl' as never
  }

  const headerRange = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } })
  if (!ws[headerRange]) ws[headerRange] = {}
  Object.assign(ws[headerRange], {
    s: {
      font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 12 },
      fill: { fgColor: { rgb: '059669' } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: {
        top: { style: 'thin', color: { rgb: '047857' } },
        bottom: { style: 'thin', color: { rgb: '047857' } },
        left: { style: 'thin', color: { rgb: '047857' } },
        right: { style: 'thin', color: { rgb: '047857' } },
      },
    },
  })

  for (let r = 1; r <= data.length; r++) {
    for (let c = 0; c < headers.length; c++) {
      const cellRef = XLSX.utils.encode_cell({ r, c })
      if (!ws[cellRef]) ws[cellRef] = {}
      const isEven = r % 2 === 0
      Object.assign(ws[cellRef], {
        s: {
          font: { sz: 11 },
          alignment: {
            horizontal: lang === 'ar' ? 'right' : 'left',
            vertical: 'center',
            wrapText: true,
          },
          fill: isEven ? { fgColor: { rgb: 'ECFDF5' } } : undefined,
          border: {
            bottom: { style: 'thin', color: { rgb: 'E5E7EB' } },
          },
        },
      })
    }
  }

  XLSX.utils.book_append_sheet(wb, ws, lang === 'ar' ? 'بيانات الطلاب' : 'Students')

  const excelBuffer = XLSX.write(wb, {
    bookType: 'xlsx',
    type: 'array',
    cellStyles: true,
  })

  return new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

// ─────────────────────────────────────────────
// JSON EXPORT
// ─────────────────────────────────────────────

export interface StudentJsonEntry {
  name: string
  class: string
  phone: string
  email: string
  gender: string
  whatsapp: string
}

export function exportToJson(
  students: StudentRecord[],
  lang: string,
  gradeLabels: Record<string, string>,
  sectionLabels: Record<string, string>,
): Blob {
  const entries: StudentJsonEntry[] = students.map((s) => {
    const [g, sec] = (s.className || '//').split('/')
    return {
      name: s.fullName,
      class: `${gradeLabels[g] || g} - ${sectionLabels[sec] || sec}`,
      phone: s.parentPhone,
      email: s.parentEmail,
      gender: getGenderLabel(s.gender, lang),
      whatsapp: s.whatsapp || '',
    }
  })

  const jsonContent = JSON.stringify({ students: entries }, null, 2)
  return new Blob([jsonContent], {
    type: 'application/json;charset=utf-8',
  })
}

// ─────────────────────────────────────────────
// PDF EXPORT (with Arabic font support)
// ─────────────────────────────────────────────

export async function exportToPdf(
  students: StudentRecord[],
  lang: string,
  gradeLabels: Record<string, string>,
  sectionLabels: Record<string, string>,
): Promise<Blob> {
  const { default: jsPDF } = await import('jspdf')
  const autoTableMod = await import('jspdf-autotable')
  const autoTable = (autoTableMod as { default: (doc: unknown, options: unknown) => void }).default

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  })

  const isArabic = lang === 'ar'
  const fontFamily = isArabic ? 'Amiri' : 'helvetica'

  if (isArabic) {
    await registerArabicFonts(doc)
  }

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 12

  // Prepare Arabic headers
  const headers = isArabic
    ? ['اسم الطالب', 'الفصل', 'هاتف ولي الأمر', 'البريد', 'النوع', 'الواتساب', '#']
    : ['Student Name', 'Class', 'Parent Phone', 'Email', 'Gender', 'WhatsApp', '#']

  const dateText = new Date().toLocaleDateString(
    isArabic ? 'ar-EG' : 'en-US',
    { year: 'numeric', month: 'long', day: 'numeric' },
  )

  // ── Header Band ──
  doc.setFillColor(5, 150, 105)
  doc.rect(0, 0, pageWidth, 22, 'F')

  doc.setFont(fontFamily, 'bold')
  doc.setFontSize(16)
  doc.setTextColor(255, 255, 255)
  const collegeName = isArabic ? await prepareArabicText('كلية الإقبال القومية') : 'Al-Eqbal National College'
  doc.text(collegeName, pageWidth / 2, 10, { align: 'center' })

  doc.setFont(fontFamily, 'normal')
  doc.setFontSize(10)
  doc.setTextColor(200, 230, 210)
  const reportTitle = isArabic ? await prepareArabicText('تقرير بيانات الطلاب') : 'Students Data Report'
  doc.text(reportTitle, pageWidth / 2, 17, { align: 'center' })

  // ── Info Line ──
  doc.setFont(fontFamily, 'normal')
  doc.setFontSize(8)
  doc.setTextColor(100, 100, 100)

  const infoY = 28
  if (isArabic) {
    const totalText = await prepareArabicText(`إجمالي الطلاب: ${students.length}`)
    const dateInfoText = await prepareArabicText(`تاريخ التصدير: ${dateText}`)
    doc.text(totalText, pageWidth - margin, infoY, { align: 'right' })
    doc.text(dateInfoText, margin, infoY, { align: 'left' })
  } else {
    doc.text(`Total Students: ${students.length}`, margin, infoY, { align: 'left' })
    doc.text(`Export Date: ${dateText}`, pageWidth - margin, infoY, { align: 'right' })
  }

  // ── Prepare table body with Arabic text ──
  const body = await Promise.all(students.map(async (s, idx) => {
    const [g, sec] = (s.className || '//').split('/')
    const className = `${gradeLabels[g] || g} - ${sectionLabels[sec] || sec}`
    const row = [
      s.fullName,
      className,
      s.parentPhone,
      s.parentEmail,
      getGenderLabel(s.gender, lang),
      s.whatsapp || '',
      idx + 1,
    ]
    if (isArabic) {
      return await Promise.all(row.map(v => typeof v === 'string' ? prepareArabicText(v) : v))
    }
    return row
  }))

  // Prepare Arabic headers
  const preparedHeaders = isArabic
    ? await Promise.all(headers.map(h => prepareArabicText(h)))
    : headers

  // ── Table ──
  autoTable(doc, {
    startY: infoY + 4,
    head: [preparedHeaders],
    body: body as string[][],
    margin: { left: margin, right: margin },
    styles: {
      font: fontFamily,
      fontSize: isArabic ? 9 : 8,
      cellPadding: { top: 2.5, bottom: 2.5, left: 2, right: 2 },
      halign: isArabic ? 'right' : 'left',
      textColor: [30, 30, 30],
      lineColor: [210, 210, 210],
      lineWidth: 0.2,
    },
    headStyles: {
      font: fontFamily,
      fontStyle: 'bold',
      fillColor: [5, 150, 105],
      textColor: [255, 255, 255],
      fontSize: isArabic ? 10 : 9,
      halign: isArabic ? 'right' : 'left',
      cellPadding: { top: 4, bottom: 4, left: 2, right: 2 },
    },
    alternateRowStyles: {
      fillColor: [240, 253, 244],
    },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 28 },
      2: { cellWidth: 25 },
      3: { cellWidth: 40 },
      4: { cellWidth: 15 },
      5: { cellWidth: 25 },
      6: { halign: 'center', cellWidth: 12 },
    },
    didDrawPage: (data: { pageNumber: number }) => {
      doc.setDrawColor(220, 220, 220)
      doc.setLineWidth(0.3)
      doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10)

      doc.setFont(fontFamily, 'normal')
      doc.setFontSize(7)
      doc.setTextColor(160, 160, 160)
      const pageNum = data.pageNumber
      const totalPages = doc.getNumberOfPages()
      const pageText = isArabic
        ? `${pageNum} / ${totalPages}`
        : `Page ${pageNum} / ${totalPages}`
      doc.text(pageText, pageWidth / 2, pageHeight - 6, { align: 'center' })
    },
  })

  return doc.output('blob')
}

// ─────────────────────────────────────────────
// SINGLE STUDENT PDF (with Arabic font support)
// ─────────────────────────────────────────────

export async function exportSingleStudentPdf(
  student: StudentRecord,
  lang: string,
  gradeLabels: Record<string, string>,
  sectionLabels: Record<string, string>,
): Promise<Blob> {
  const { default: jsPDF } = await import('jspdf')
  const autoTableMod = await import('jspdf-autotable')
  const autoTable = (autoTableMod as { default: (doc: unknown, options: unknown) => void }).default

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const isArabic = lang === 'ar'
  const fontFamily = isArabic ? 'Amiri' : 'helvetica'

  if (isArabic) {
    await registerArabicFonts(doc)
  }

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  const contentWidth = pageWidth - margin * 2

  // ── Header Band ──
  doc.setFillColor(5, 150, 105)
  doc.rect(0, 0, pageWidth, 38, 'F')

  doc.setFont(fontFamily, 'bold')
  doc.setFontSize(18)
  doc.setTextColor(255, 255, 255)
  const collegeName = isArabic ? await prepareArabicText('كلية الإقبال القومية') : 'Al-Eqbal National College'
  doc.text(collegeName, pageWidth / 2, 16, { align: 'center' })

  doc.setFont(fontFamily, 'normal')
  doc.setFontSize(10)
  doc.setTextColor(200, 230, 210)
  const recordTitle = isArabic ? await prepareArabicText('سجل بيانات الطالب') : 'Student Data Record'
  doc.text(recordTitle, pageWidth / 2, 26, { align: 'center' })

  // Student name
  doc.setFont(fontFamily, 'bold')
  doc.setFontSize(12)
  doc.setTextColor(255, 255, 255)
  doc.text(isArabic ? await prepareArabicText(student.fullName) : student.fullName, pageWidth / 2, 34, { align: 'center' })

  // ── Decorative Lines ──
  doc.setDrawColor(232, 168, 56)
  doc.setLineWidth(1.5)
  doc.line(margin, 42, pageWidth - margin, 42)
  doc.setDrawColor(5, 150, 105)
  doc.setLineWidth(0.3)
  doc.line(margin, 43.5, pageWidth - margin, 43.5)

  // ── Data Table using autotable ──
  const [g, sec] = (student.className || '//').split('/')
  const className = `${gradeLabels[g] || g} - ${sectionLabels[sec] || sec}`

  const fields: [string, string][] = [
    [isArabic ? 'اسم الطالب' : 'Student Name', student.fullName],
    [isArabic ? 'الصف' : 'Class', className],
    [isArabic ? 'الجنس' : 'Gender', getGenderLabel(student.gender, lang)],
    [isArabic ? 'هاتف ولي الأمر' : 'Parent Phone', student.parentPhone],
    [isArabic ? 'بريد ولي الأمر' : 'Parent Email', student.parentEmail],
    [isArabic ? 'رقم الواتساب' : 'WhatsApp', student.whatsapp || '--'],
    [isArabic ? 'البريد الإلكتروني' : 'Account Email', student.userEmail],
    [
      isArabic ? 'تاريخ التسجيل' : 'Registration Date',
      new Date(student.createdAt).toLocaleDateString(isArabic ? 'ar-EG' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    ],
  ]

  // Prepare Arabic text
  const preparedFields = await Promise.all(
    fields.map(async ([label, value]) => {
      if (isArabic) {
        return [await prepareArabicText(label), await prepareArabicText(value)] as [string, string]
      }
      return [label, value] as [string, string]
    })
  )

  const tableBody = preparedFields.map(([label, value]) => [label, value])

  autoTable(doc, {
    startY: 50,
    body: tableBody,
    margin: { left: margin, right: margin },
    theme: 'plain',
    styles: {
      font: fontFamily,
      fontSize: isArabic ? 11 : 10,
      cellPadding: { top: 4, bottom: 4, left: 3, right: 3 },
      textColor: [30, 30, 30],
      lineColor: [220, 220, 220],
      lineWidth: 0.2,
    },
    columnStyles: {
      0: {
        font: fontFamily,
        fontStyle: 'bold',
        fillColor: [240, 253, 244],
        textColor: [5, 150, 105],
        cellWidth: contentWidth * 0.35,
        halign: isArabic ? 'right' : 'right',
      },
      1: {
        cellWidth: contentWidth * 0.65,
        halign: isArabic ? 'right' : 'left',
      },
    },
    alternateRowStyles: {
      fillColor: [248, 249, 251],
    },
    didParseCell: (data: { section: string; column: { index: number }; cell: { styles: { fillColor: number[] } } }) => {
      if (data.section === 'body' && data.column.index === 0) {
        data.cell.styles.fillColor = [240, 253, 244]
      }
    },
  })

  // ── Footer ──
  doc.setDrawColor(220, 220, 220)
  doc.setLineWidth(0.3)
  doc.line(margin, pageHeight - 18, pageWidth - margin, pageHeight - 18)

  doc.setFont(fontFamily, 'normal')
  doc.setFontSize(7)
  doc.setTextColor(160, 160, 160)

  const footerDate = new Date().toLocaleString(isArabic ? 'ar-EG' : 'en-US')
  const idShort = student.id.slice(0, 8)

  let footerText: string
  let creditsText: string
  if (isArabic) {
    footerText = `أُنشئ: ${footerDate}  |  الرقم: ${idShort}`
    creditsText = 'كلية الإقبال القومية'
  } else {
    footerText = `Generated: ${footerDate}  |  ID: ${idShort}`
    creditsText = 'Al-Eqbal National College'
  }

  doc.text(
    isArabic ? await prepareArabicText(footerText) : footerText,
    pageWidth / 2,
    pageHeight - 12,
    { align: 'center' },
  )

  doc.text(
    isArabic ? await prepareArabicText(creditsText) : creditsText,
    pageWidth / 2,
    pageHeight - 7,
    { align: 'center' },
  )

  return doc.output('blob')
}
