import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { StudentRecord } from './pdf'

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

function getFileName(prefix: string, ext: string): string {
  const date = new Date().toISOString().split('T')[0]
  return `${prefix}_${date}${ext}`
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

  // Create workbook
  const wb = XLSX.utils.book_new()
  const wsData = [headers, ...data]
  const ws = XLSX.utils.aoa_to_sheet(wsData)

  // Column widths - auto-fit with minimum widths for each column
  const colWidths: number[] = []
  for (let col = 0; col < headers.length; col++) {
    const headerLen = headers[col].length
    const maxDataLen = data.reduce((max, row) => {
      const val = String(row[col] || '')
      // Arabic characters are wider, so count them as 1.5
      const arabicCount = (val.match(/[\u0600-\u06FF]/g) || []).length
      const latinCount = val.length - arabicCount
      return Math.max(max, Math.ceil(latinCount + arabicCount * 1.5))
    }, 0)
    colWidths.push(Math.max(headerLen * 1.3, maxDataLen + 2, 14))
  }
  ws['!cols'] = colWidths.map((w) => ({ wch: Math.ceil(w) }))

  // RTL support for Arabic
  if (lang === 'ar') {
    ws['!dir'] = 'rtl' as never
  }

  // Style the header row with emerald background and bold white text
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

  // Style data cells
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

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, lang === 'ar' ? 'بيانات الطلاب' : 'Students')

  // Generate file
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
// PDF EXPORT (with Cairo font + autotable)
// ─────────────────────────────────────────────

let pdfFontLoaded = false
let pdfFontPromise: Promise<void> | null = null

async function loadCairoFont(doc: jsPDF): Promise<void> {
  if (pdfFontLoaded) return
  if (pdfFontPromise) return pdfFontPromise

  pdfFontPromise = (async () => {
    try {
      const [regularResp, boldResp, semiBoldResp] = await Promise.all([
        fetch('/fonts/Cairo-Regular.ttf'),
        fetch('/fonts/Cairo-Bold.ttf'),
        fetch('/fonts/Cairo-SemiBold.ttf'),
      ])

      const [regularBuf, boldBuf, semiBoldBuf] = await Promise.all([
        regularResp.arrayBuffer(),
        boldResp.arrayBuffer(),
        semiBoldResp.arrayBuffer(),
      ])

      const toBase64 = (buf: ArrayBuffer): string => {
        const bytes = new Uint8Array(buf)
        let binary = ''
        const chunkSize = 8192
        for (let i = 0; i < bytes.length; i += chunkSize) {
          binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
        }
        return btoa(binary)
      }

      doc.addFileToVFS('Cairo-Regular.ttf', toBase64(regularBuf))
      doc.addFileToVFS('Cairo-Bold.ttf', toBase64(boldBuf))
      doc.addFileToVFS('Cairo-SemiBold.ttf', toBase64(semiBoldBuf))

      doc.addFont('Cairo-Regular.ttf', 'Cairo', 'normal')
      doc.addFont('Cairo-Bold.ttf', 'Cairo', 'bold')
      doc.addFont('Cairo-SemiBold.ttf', 'Cairo', 'semibold')

      pdfFontLoaded = true
    } catch (err) {
      console.error('[PDF] Failed to load Cairo font:', err)
      pdfFontPromise = null
      throw err
    }
  })()

  return pdfFontPromise
}

/**
 * Reverse Arabic text for jsPDF rendering (jsPDF doesn't support RTL natively).
 * This works because Cairo is a well-designed Arabic font where reversed characters
 * still connect properly via OpenType features.
 */
function reverseArabic(text: string): string {
  // Detect if text has Arabic characters
  if (!/[\u0600-\u06FF]/.test(text)) return text

  // For pure Arabic text, reverse character order
  // Handle mixed Arabic/Latin by detecting blocks
  const parts: string[] = []
  let current = ''
  let isArabicBlock = /[\u0600-\u06FF]/.test(text[0] || '')

  for (const char of text) {
    const isArabicChar = /[\u0600-\u06FF]/.test(char)
    if (isArabicChar !== isArabicBlock) {
      parts.push(current)
      current = char
      isArabicBlock = isArabicChar
    } else {
      current += char
    }
  }
  parts.push(current)

  // Reverse Arabic parts, keep Latin as-is
  const reversed = parts.map((part) => {
    return /[\u0600-\u06FF]/.test(part) ? part.split('').reverse().join('') : part
  })

  return reversed.reverse().join('')
}

export async function exportToPdf(
  students: StudentRecord[],
  lang: string,
  gradeLabels: Record<string, string>,
  sectionLabels: Record<string, string>,
): Promise<Blob> {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  })

  await loadCairoFont(doc)

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 12

  const isArabic = lang === 'ar'
  const titleText = isArabic ? 'بيانات الطلاب' : 'Students Data'
  const schoolName = isArabic ? 'كلية الاقبال القوميه' : 'Al-Eqbal National College'
  const dateText = new Date().toLocaleDateString(
    isArabic ? 'ar-EG' : 'en-US',
    { year: 'numeric', month: 'long', day: 'numeric' },
  )
  const countText = isArabic
    ? `عدد الطلاب: ${students.length}`
    : `Total Students: ${students.length}`
  const dateLabel = isArabic ? 'تاريخ التصدير: ' : 'Export Date: '

  // ── Header Band ──
  doc.setFillColor(5, 150, 105) // emerald-600
  doc.rect(0, 0, pageWidth, 22, 'F')

  doc.setFont('Cairo', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(255, 255, 255)
  doc.text(reverseArabic(schoolName), pageWidth / 2, 10, { align: 'center' })

  doc.setFont('Cairo', 'semibold')
  doc.setFontSize(10)
  doc.setTextColor(200, 230, 210)
  doc.text(reverseArabic(titleText), pageWidth / 2, 17, { align: 'center' })

  // ── Info Line ──
  doc.setFont('Cairo', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(100, 100, 100)

  const infoY = 28
  if (isArabic) {
    doc.text(reverseArabic(countText), pageWidth - margin, infoY, { align: 'right' })
    doc.text(reverseArabic(dateLabel + dateText), margin, infoY, { align: 'left' })
  } else {
    doc.text(countText, margin, infoY, { align: 'left' })
    doc.text(`Export Date: ${dateText}`, pageWidth - margin, infoY, { align: 'right' })
  }

  // ── Table ──
  const headers = getHeaders(lang)
  const reversedHeaders = headers.map(reverseArabic)

  const body = students.map((s, idx) => {
    const [g, sec] = (s.className || '//').split('/')
    const row = [
      idx + 1,
      reverseArabic(s.fullName),
      reverseArabic(`${gradeLabels[g] || g} - ${sectionLabels[sec] || sec}`),
      s.parentPhone,
      s.parentEmail,
      reverseArabic(getGenderLabel(s.gender, lang)),
      s.whatsapp || '',
    ]

    return row
  })

  autoTable(doc, {
    startY: infoY + 4,
    head: [reversedHeaders],
    body,
    margin: { left: margin, right: margin },
    styles: {
      font: 'Cairo',
      fontSize: 8,
      cellPadding: { top: 2.5, bottom: 2.5, left: 2, right: 2 },
      halign: isArabic ? 'right' : 'left',
      textColor: [30, 30, 30],
      lineColor: [210, 210, 210],
      lineWidth: 0.2,
    },
    headStyles: {
      font: 'Cairo',
      fontStyle: 'bold',
      fillColor: [5, 150, 105],
      textColor: [255, 255, 255],
      fontSize: 9,
      halign: isArabic ? 'right' : 'left',
      cellPadding: { top: 4, bottom: 4, left: 2, right: 2 },
    },
    alternateRowStyles: {
      fillColor: [240, 253, 244],
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 12 }, // #
      ...(isArabic
        ? {
            1: { halign: 'right', cellWidth: 35 }, // Name
            2: { halign: 'right', cellWidth: 28 }, // Class
            3: { halign: 'center', cellWidth: 25 }, // Phone
            4: { halign: 'left', cellWidth: 40 }, // Email
            5: { halign: 'right', cellWidth: 15 }, // Gender
            6: { halign: 'center', cellWidth: 25 }, // WhatsApp
          }
        : {
            1: { halign: 'left', cellWidth: 35 },
            2: { halign: 'left', cellWidth: 28 },
            3: { halign: 'center', cellWidth: 25 },
            4: { halign: 'left', cellWidth: 40 },
            5: { halign: 'left', cellWidth: 15 },
            6: { halign: 'center', cellWidth: 25 },
          }),
    },
    didDrawPage: (data) => {
      // Footer on each page
      doc.setDrawColor(220, 220, 220)
      doc.setLineWidth(0.3)
      doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10)

      doc.setFont('Cairo', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(160, 160, 160)
      const pageNum = data.pageNumber
      const totalPages = doc.getNumberOfPages()
      doc.text(
        `${isArabic ? 'صفحة' : 'Page'} ${pageNum} / ${totalPages}`,
        pageWidth / 2,
        pageHeight - 6,
        { align: 'center' },
      )
    },
  })

  return doc.output('blob')
}

// ─────────────────────────────────────────────
// SINGLE STUDENT PDF (Redesigned)
// ─────────────────────────────────────────────

export async function exportSingleStudentPdf(
  student: StudentRecord,
  lang: string,
  gradeLabels: Record<string, string>,
  sectionLabels: Record<string, string>,
): Promise<Blob> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  await loadCairoFont(doc)

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  const contentWidth = pageWidth - margin * 2
  const isArabic = lang === 'ar'
  const schoolName = isArabic ? 'كلية الاقبال القوميه' : 'Al-Eqbal National College'
  const studentTitle = isArabic ? 'بيانات الطالب' : 'Student Data Record'

  // ── Header Band ──
  doc.setFillColor(5, 150, 105)
  doc.rect(0, 0, pageWidth, 38, 'F')

  doc.setFont('Cairo', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(255, 255, 255)
  doc.text(reverseArabic(schoolName), pageWidth / 2, 16, { align: 'center' })

  doc.setFont('Cairo', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(200, 230, 210)
  doc.text(reverseArabic(studentTitle), pageWidth / 2, 26, { align: 'center' })

  // Student name
  doc.setFont('Cairo', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(255, 255, 255)
  doc.text(reverseArabic(student.fullName), pageWidth / 2, 34, { align: 'center' })

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
    [isArabic ? 'الفصل' : 'Class', className],
    [isArabic ? 'النوع' : 'Gender', getGenderLabel(student.gender, lang)],
    [isArabic ? 'رقم ولي الأمر' : 'Parent Phone', student.parentPhone],
    [isArabic ? 'البريد الإلكتروني' : 'Parent Email', student.parentEmail],
    [isArabic ? 'رقم واتساب' : 'WhatsApp', student.whatsapp || '—'],
    [isArabic ? 'الحساب' : 'Account Email', student.userEmail],
    [
      isArabic ? 'تاريخ التسجيل' : 'Registration Date',
      new Date(student.createdAt).toLocaleDateString(isArabic ? 'ar-EG' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    ],
  ]

  const tableBody = fields.map(([label, value]) => [
    reverseArabic(label),
    reverseArabic(value),
  ])

  autoTable(doc, {
    startY: 50,
    body: tableBody,
    margin: { left: margin, right: margin },
    theme: 'plain',
    styles: {
      font: 'Cairo',
      fontSize: 10,
      cellPadding: { top: 4, bottom: 4, left: 3, right: 3 },
      textColor: [30, 30, 30],
      lineColor: [220, 220, 220],
      lineWidth: 0.2,
    },
    columnStyles: {
      0: {
        font: 'Cairo',
        fontStyle: 'bold',
        fillColor: [240, 253, 244],
        textColor: [5, 150, 105],
        cellWidth: contentWidth * 0.35,
        halign: 'right',
      },
      1: {
        cellWidth: contentWidth * 0.65,
        halign: isArabic ? 'right' : 'left',
      },
    },
    alternateRowStyles: {
      fillColor: [248, 249, 251],
    },
    didParseCell: (data) => {
      // Only apply alternateRowStyles to column 1
      if (data.section === 'body' && data.column.index === 0) {
        data.cell.styles.fillColor = [240, 253, 244]
      }
    },
  })

  // ── Footer ──
  doc.setDrawColor(220, 220, 220)
  doc.setLineWidth(0.3)
  doc.line(margin, pageHeight - 18, pageWidth - margin, pageHeight - 18)

  doc.setFont('Cairo', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(160, 160, 160)

  const footerDate = new Date().toLocaleString(isArabic ? 'ar-EG' : 'en-US')
  const idShort = student.id.slice(0, 8)

  doc.text(
    `${isArabic ? 'تم الإنشاء' : 'Generated'}: ${footerDate}  |  ID: ${idShort}`,
    pageWidth / 2,
    pageHeight - 12,
    { align: 'center' },
  )

  doc.text(
    isArabic ? 'كلية الاقبال القوميه — رقمنة المستندات' : 'Al-Eqbal National College',
    pageWidth / 2,
    pageHeight - 7,
    { align: 'center' },
  )

  return doc.output('blob')
}
