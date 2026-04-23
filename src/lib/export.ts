import * as XLSX from 'xlsx'
import type { StudentRecord } from '@/lib/pdf'

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
// PDF EXPORT
// Dynamic imports + English labels to avoid
// Arabic rendering issues in jsPDF
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

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 12

  const isArabic = lang === 'ar'

  // Use bilingual labels - English for headers (jsPDF compatible), Arabic data as-is
  const headers = ['Student Name', 'Class', 'Parent Phone', 'Email', 'Gender', 'WhatsApp', '#']

  const dateText = new Date().toLocaleDateString(
    isArabic ? 'ar-EG' : 'en-US',
    { year: 'numeric', month: 'long', day: 'numeric' },
  )

  // ── Header Band ──
  doc.setFillColor(5, 150, 105)
  doc.rect(0, 0, pageWidth, 22, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(255, 255, 255)
  doc.text('Al-Eqbal National College', pageWidth / 2, 10, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(200, 230, 210)
  doc.text('Students Data Report', pageWidth / 2, 17, { align: 'center' })

  // ── Info Line ──
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(100, 100, 100)

  const infoY = 28
  doc.text(`Total Students: ${students.length}`, margin, infoY, { align: 'left' })
  doc.text(`Export Date: ${dateText}`, pageWidth - margin, infoY, { align: 'right' })

  // ── Table ──
  const body = students.map((s, idx) => {
    const [g, sec] = (s.className || '//').split('/')
    return [
      s.fullName,
      `${gradeLabels[g] || g} - ${sectionLabels[sec] || sec}`,
      s.parentPhone,
      s.parentEmail,
      getGenderLabel(s.gender, lang),
      s.whatsapp || '',
      idx + 1,
    ]
  })

  autoTable(doc, {
    startY: infoY + 4,
    head: [headers],
    body,
    margin: { left: margin, right: margin },
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: { top: 2.5, bottom: 2.5, left: 2, right: 2 },
      halign: 'left',
      textColor: [30, 30, 30],
      lineColor: [210, 210, 210],
      lineWidth: 0.2,
    },
    headStyles: {
      font: 'helvetica',
      fontStyle: 'bold',
      fillColor: [5, 150, 105],
      textColor: [255, 255, 255],
      fontSize: 9,
      halign: 'left',
      cellPadding: { top: 4, bottom: 4, left: 2, right: 2 },
    },
    alternateRowStyles: {
      fillColor: [240, 253, 244],
    },
    columnStyles: {
      0: { cellWidth: 35 },  // Name
      1: { cellWidth: 28 },  // Class
      2: { cellWidth: 25 },  // Phone
      3: { cellWidth: 40 },  // Email
      4: { cellWidth: 15 },  // Gender
      5: { cellWidth: 25 },  // WhatsApp
      6: { halign: 'center', cellWidth: 12 }, // #
    },
    didDrawPage: (data: { pageNumber: number }) => {
      doc.setDrawColor(220, 220, 220)
      doc.setLineWidth(0.3)
      doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(160, 160, 160)
      const pageNum = data.pageNumber
      const totalPages = doc.getNumberOfPages()
      doc.text(
        `Page ${pageNum} / ${totalPages}`,
        pageWidth / 2,
        pageHeight - 6,
        { align: 'center' },
      )
    },
  })

  return doc.output('blob')
}

// ─────────────────────────────────────────────
// SINGLE STUDENT PDF
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

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  const contentWidth = pageWidth - margin * 2
  const isArabic = lang === 'ar'

  // ── Header Band ──
  doc.setFillColor(5, 150, 105)
  doc.rect(0, 0, pageWidth, 38, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(255, 255, 255)
  doc.text('Al-Eqbal National College', pageWidth / 2, 16, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(200, 230, 210)
  doc.text('Student Data Record', pageWidth / 2, 26, { align: 'center' })

  // Student name
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(255, 255, 255)
  doc.text(student.fullName, pageWidth / 2, 34, { align: 'center' })

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
    ['Student Name', student.fullName],
    ['Class', className],
    ['Gender', getGenderLabel(student.gender, lang)],
    ['Parent Phone', student.parentPhone],
    ['Parent Email', student.parentEmail],
    ['WhatsApp', student.whatsapp || '--'],
    ['Account Email', student.userEmail],
    [
      'Registration Date',
      new Date(student.createdAt).toLocaleDateString(isArabic ? 'ar-EG' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    ],
  ]

  const tableBody = fields.map(([label, value]) => [label, value])

  autoTable(doc, {
    startY: 50,
    body: tableBody,
    margin: { left: margin, right: margin },
    theme: 'plain',
    styles: {
      font: 'helvetica',
      fontSize: 10,
      cellPadding: { top: 4, bottom: 4, left: 3, right: 3 },
      textColor: [30, 30, 30],
      lineColor: [220, 220, 220],
      lineWidth: 0.2,
    },
    columnStyles: {
      0: {
        font: 'helvetica',
        fontStyle: 'bold',
        fillColor: [240, 253, 244],
        textColor: [5, 150, 105],
        cellWidth: contentWidth * 0.35,
        halign: 'right',
      },
      1: {
        cellWidth: contentWidth * 0.65,
        halign: 'left',
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

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(160, 160, 160)

  const footerDate = new Date().toLocaleString(isArabic ? 'ar-EG' : 'en-US')
  const idShort = student.id.slice(0, 8)

  doc.text(
    `Generated: ${footerDate}  |  ID: ${idShort}`,
    pageWidth / 2,
    pageHeight - 12,
    { align: 'center' },
  )

  doc.text(
    'Al-Eqbal National College',
    pageWidth / 2,
    pageHeight - 7,
    { align: 'center' },
  )

  return doc.output('blob')
}
