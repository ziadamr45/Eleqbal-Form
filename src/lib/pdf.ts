import jsPDF from 'jspdf'

export interface StudentRecord {
  id: string
  fullName: string
  className: string
  parentPhone: string
  parentEmail: string
  gender: string
  whatsapp: string | null
  userEmail: string
  userName: string | null
  createdAt: string
  updatedAt: string
}

// Font cache to avoid re-fetching
let fontLoaded = false
let fontPromise: Promise<void> | null = null

async function loadArabicFont(doc: jsPDF): Promise<void> {
  if (fontLoaded) return
  if (fontPromise) return fontPromise

  fontPromise = (async () => {
    try {
      const [regularResp, boldResp] = await Promise.all([
        fetch('/fonts/Amiri-Regular.ttf'),
        fetch('/fonts/Amiri-Bold.ttf'),
      ])

      const regularBuf = await regularResp.arrayBuffer()
      const boldBuf = await boldResp.arrayBuffer()

      const regularBase64 = arrayBufferToBase64(regularBuf)
      const boldBase64 = arrayBufferToBase64(boldBuf)

      doc.addFileToVFS('Amiri-Regular.ttf', regularBase64)
      doc.addFileToVFS('Amiri-Bold.ttf', boldBase64)

      doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal')
      doc.addFont('Amiri-Bold.ttf', 'Amiri', 'bold')

      fontLoaded = true
    } catch (err) {
      console.error('[PDF] Failed to load Arabic font:', err)
      fontPromise = null
      throw err
    }
  })()

  return fontPromise
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunkSize = 8192
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize)
    binary += String.fromCharCode(...chunk)
  }
  return btoa(binary)
}

function reverseText(text: string): string {
  // jsPDF renders LTR, so we reverse Arabic text for display
  return text.split('').reverse().join('')
}

export async function generateStudentPDF(student: StudentRecord, lang: string): Promise<Blob> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  // Load Arabic font
  await loadArabicFont(doc)

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  const contentWidth = pageWidth - margin * 2

  // ── Emerald Header Band ──
  doc.setFillColor(5, 150, 105)
  doc.roundedRect(0, 0, pageWidth, 42, 0, 0, 'F')

  // School name in Arabic (reversed for display)
  doc.setFont('Amiri', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(255, 255, 255)
  doc.text(reverseText('كلية الاقبال القوميه'), pageWidth / 2, 17, { align: 'center' })

  // English name
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(200, 230, 210)
  doc.text('Al-Eqbal National College', pageWidth / 2, 26, { align: 'center' })

  // Subtitle
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(180, 220, 195)
  doc.text('Student Data Record', pageWidth / 2, 34, { align: 'center' })

  // ── Decorative line under header ──
  doc.setDrawColor(232, 168, 56) // amber accent
  doc.setLineWidth(1)
  doc.line(margin, 46, pageWidth - margin, 46)
  doc.setDrawColor(5, 150, 105)
  doc.setLineWidth(0.3)
  doc.line(margin, 47.5, pageWidth - margin, 47.5)

  // ── Section Title ──
  const sectionY = 58
  doc.setFont('Amiri', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(5, 150, 105)
  doc.text(reverseText('بيانات الطالب'), pageWidth / 2, sectionY, { align: 'center' })

  // ── Data Table ──
  const fields: [string, string][] = [
    [lang === 'ar' ? 'الاسم الكامل' : 'Full Name', student.fullName],
    [lang === 'ar' ? 'الصف والفصل' : 'Grade & Section', student.className],
    [lang === 'ar' ? 'الجنس' : 'Gender', student.gender === 'male' ? (lang === 'ar' ? 'ذكر' : 'Male') : (lang === 'ar' ? 'أنثى' : 'Female')],
    [lang === 'ar' ? 'هاتف ولي الأمر' : 'Parent Phone', student.parentPhone],
    [lang === 'ar' ? 'بريد ولي الأمر' : 'Parent Email', student.parentEmail],
    [lang === 'ar' ? 'واتساب' : 'WhatsApp', student.whatsapp || '—'],
    [lang === 'ar' ? 'البريد الإلكتروني' : 'Email', student.userEmail],
    [lang === 'ar' ? 'تاريخ التسجيل' : 'Registration Date', new Date(student.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })],
  ]

  let y = 68
  const rowHeight = 14
  const labelWidth = contentWidth * 0.38
  const valueWidth = contentWidth * 0.62

  fields.forEach(([label, value], i) => {
    // Alternating row background
    if (i % 2 === 0) {
      doc.setFillColor(245, 247, 250)
      doc.roundedRect(margin, y - 5, contentWidth, rowHeight, 1.5, 1.5, 'F')
    }

    // Label (left side since we reverse text)
    doc.setFont('Amiri', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    const reversedLabel = reverseText(label)
    doc.text(reversedLabel, pageWidth - margin - 2, y + 2, { align: 'right' })

    // Vertical separator
    doc.setDrawColor(220, 220, 220)
    doc.setLineWidth(0.2)
    const sepX = margin + labelWidth
    doc.line(sepX, y - 4, sepX, y + rowHeight - 6)

    // Value
    const isArabic = /[\u0600-\u06FF]/.test(value)
    if (isArabic) {
      doc.setFont('Amiri', 'normal')
      doc.setFontSize(11)
      doc.setTextColor(30, 30, 30)
      doc.text(reverseText(value), margin + labelWidth + 3, y + 2, { align: 'right' })
    } else {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.setTextColor(30, 30, 30)
      doc.text(value, margin + labelWidth + 3, y + 2, { align: 'left' })
    }

    y += rowHeight
  })

  // ── Border around table area ──
  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.3)
  doc.roundedRect(margin, 62, contentWidth, fields.length * rowHeight + 3, 2, 2, 'S')

  // ── Footer ──
  doc.setDrawColor(220, 220, 220)
  doc.setLineWidth(0.3)
  doc.line(margin, pageHeight - 20, pageWidth - margin, pageHeight - 20)

  doc.setFontSize(7.5)
  doc.setTextColor(160, 160, 160)
  doc.setFont('helvetica', 'normal')

  const footerText = `Generated: ${new Date().toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}  |  ID: ${student.id.slice(0, 8)}`
  doc.text(footerText, pageWidth / 2, pageHeight - 13, { align: 'center' })

  doc.text('Digitized by Mr. Amr Sobhy', pageWidth / 2, pageHeight - 8, { align: 'center' })

  return doc.output('blob')
}

export async function generateBulkStudentPDF(students: StudentRecord[], lang: string): Promise<Blob> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  await loadArabicFont(doc)

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 15
  const contentWidth = pageWidth - margin * 2

  const now = new Date().toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  students.forEach((student, studentIdx) => {
    if (studentIdx > 0) doc.addPage()

    // ── Header ──
    doc.setFillColor(5, 150, 105)
    doc.roundedRect(0, 0, pageWidth, 32, 0, 0, 'F')

    doc.setFont('Amiri', 'bold')
    doc.setFontSize(16)
    doc.setTextColor(255, 255, 255)
    doc.text(reverseText('كلية الاقبال القوميه'), pageWidth / 2, 14, { align: 'center' })

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(200, 230, 210)
    doc.text(`Al-Eqbal National College — Student #${studentIdx + 1} of ${students.length}`, pageWidth / 2, 24, { align: 'center' })

    // ── Student name banner ──
    doc.setFillColor(240, 253, 244)
    doc.roundedRect(margin, 36, contentWidth, 12, 2, 2, 'F')

    doc.setFont('Amiri', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(5, 150, 105)
    doc.text(reverseText(student.fullName), pageWidth / 2, 44, { align: 'center' })

    // ── Fields ──
    const fields: [string, string][] = [
      [lang === 'ar' ? 'الصف والفصل' : 'Grade', student.className],
      [lang === 'ar' ? 'الجنس' : 'Gender', student.gender === 'male' ? (lang === 'ar' ? 'ذكر' : 'Male') : (lang === 'ar' ? 'أنثى' : 'Female')],
      [lang === 'ar' ? 'هاتف ولي الأمر' : 'Phone', student.parentPhone],
      [lang === 'ar' ? 'بريد ولي الأمر' : 'Email', student.parentEmail],
      [lang === 'ar' ? 'واتساب' : 'WhatsApp', student.whatsapp || '—'],
      [lang === 'ar' ? 'البريد' : 'Account', student.userEmail],
      [lang === 'ar' ? 'تاريخ التسجيل' : 'Registered', new Date(student.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')],
    ]

    let y = 54
    const rowH = 11

    fields.forEach(([label, value], i) => {
      if (i % 2 === 0) {
        doc.setFillColor(248, 249, 251)
        doc.roundedRect(margin, y - 3.5, contentWidth, rowH, 1, 1, 'F')
      }

      // Label
      doc.setFont('Amiri', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(110, 110, 110)
      doc.text(reverseText(label), pageWidth - margin - 2, y + 2, { align: 'right' })

      // Separator
      doc.setDrawColor(225, 225, 225)
      doc.setLineWidth(0.15)
      const sepX = margin + contentWidth * 0.35
      doc.line(sepX, y - 3, sepX, y + rowH - 5)

      // Value
      const isAr = /[\u0600-\u06FF]/.test(value)
      if (isAr) {
        doc.setFont('Amiri', 'normal')
        doc.setFontSize(9.5)
        doc.setTextColor(30, 30, 30)
        doc.text(reverseText(value), margin + contentWidth * 0.35 + 2, y + 2, { align: 'right' })
      } else {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.setTextColor(30, 30, 30)
        doc.text(value, margin + contentWidth * 0.35 + 2, y + 2, { align: 'left' })
      }

      y += rowH
    })

    // ── Footer ──
    doc.setDrawColor(220, 220, 220)
    doc.setLineWidth(0.2)
    doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15)

    doc.setFontSize(7)
    doc.setTextColor(170, 170, 170)
    doc.setFont('helvetica', 'normal')
    doc.text(`${now}  |  Page ${studentIdx + 1}/${students.length}`, pageWidth / 2, pageHeight - 10, { align: 'center' })
  })

  return doc.output('blob')
}
