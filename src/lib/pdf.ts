import { registerArabicFonts, prepareArabicText } from './arabic-pdf';

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

export async function generateStudentPDF(student: StudentRecord, lang: string): Promise<Blob> {
  const { default: jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const isArabic = lang === 'ar'
  const fontFamily = isArabic ? 'Amiri' : 'helvetica';

  if (isArabic) {
    await registerArabicFonts(doc);
  }

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  const contentWidth = pageWidth - margin * 2

  const headerTitle = isArabic ? 'كلية الإقبال القومية' : 'Al-Eqbal National College'
  const headerSub = isArabic ? 'سجل بيانات الطالب' : 'Student Data Record'

  // ── Emerald Header Band ──
  doc.setFillColor(5, 150, 105)
  doc.rect(0, 0, pageWidth, 42, 'F')

  doc.setFont(fontFamily, 'bold')
  doc.setFontSize(20)
  doc.setTextColor(255, 255, 255)
  doc.text(isArabic ? await prepareArabicText(headerTitle) : headerTitle, pageWidth / 2, 17, { align: 'center' })

  doc.setFont(fontFamily, 'normal')
  doc.setFontSize(11)
  doc.setTextColor(200, 230, 210)
  doc.text(isArabic ? await prepareArabicText(headerSub) : headerSub, pageWidth / 2, 26, { align: 'center' })

  doc.setFont(fontFamily, 'bold')
  doc.setFontSize(12)
  doc.setTextColor(200, 230, 210)
  doc.text(isArabic ? await prepareArabicText(student.fullName) : student.fullName, pageWidth / 2, 36, { align: 'center' })

  // ── Decorative line ──
  doc.setDrawColor(232, 168, 56)
  doc.setLineWidth(1)
  doc.line(margin, 46, pageWidth - margin, 46)
  doc.setDrawColor(5, 150, 105)
  doc.setLineWidth(0.3)
  doc.line(margin, 47.5, pageWidth - margin, 47.5)

  // ── Data fields ──
  const fields: [string, string][] = [
    [isArabic ? 'الاسم الكامل' : 'Full Name', student.fullName],
    [isArabic ? 'الصف والفصل' : 'Grade & Section', student.className],
    [isArabic ? 'النوع' : 'Gender', student.gender === 'male' ? (isArabic ? 'ذكر' : 'Male') : (isArabic ? 'أنثى' : 'Female')],
    [isArabic ? 'هاتف ولي الأمر' : 'Parent Phone', student.parentPhone],
    [isArabic ? 'بريد ولي الأمر' : 'Parent Email', student.parentEmail],
    [isArabic ? 'رقم الواتساب' : 'WhatsApp', student.whatsapp || '--'],
    [isArabic ? 'البريد الإلكتروني' : 'Email', student.userEmail],
    [isArabic ? 'تاريخ التسجيل' : 'Registration Date', new Date(student.createdAt).toLocaleDateString(isArabic ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })],
  ]

  // Prepare Arabic text for all labels and values
  const preparedFields = await Promise.all(
    fields.map(async ([label, value]) => {
      if (isArabic) {
        return [await prepareArabicText(label), await prepareArabicText(value)] as [string, string];
      }
      return [label, value] as [string, string];
    })
  );

  let y = 58
  const rowHeight = 14
  const labelWidth = contentWidth * 0.38

  preparedFields.forEach(([label, value], i) => {
    if (i % 2 === 0) {
      doc.setFillColor(245, 247, 250)
      doc.roundedRect(margin, y - 5, contentWidth, rowHeight, 1.5, 1.5, 'F')
    }

    // Label on the right in RTL
    doc.setFont(fontFamily, 'bold')
    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    if (isArabic) {
      doc.text(label, margin + labelWidth - 3, y + 2, { align: 'right' })
    } else {
      doc.text(label, pageWidth - margin - 2, y + 2, { align: 'right' })
    }

    doc.setDrawColor(220, 220, 220)
    doc.setLineWidth(0.2)
    const sepX = margin + labelWidth
    doc.line(sepX, y - 4, sepX, y + rowHeight - 6)

    doc.setFont(fontFamily, 'normal')
    doc.setFontSize(10)
    doc.setTextColor(30, 30, 30)
    if (isArabic) {
      doc.text(value, pageWidth - margin - 2, y + 2, { align: 'right' })
    } else {
      doc.text(value, margin + labelWidth + 3, y + 2, { align: 'left' })
    }

    y += rowHeight
  })

  // Border
  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.3)
  doc.roundedRect(margin, 52, contentWidth, fields.length * rowHeight + 3, 2, 2, 'S')

  // Footer
  doc.setDrawColor(220, 220, 220)
  doc.setLineWidth(0.3)
  doc.line(margin, pageHeight - 20, pageWidth - margin, pageHeight - 20)

  doc.setFontSize(7.5)
  doc.setTextColor(160, 160, 160)
  doc.setFont(fontFamily, 'normal')

  const generatedLabel = isArabic ? 'أُنشئ: ' : 'Generated: '
  const dateStr = new Date().toLocaleString(isArabic ? 'ar-EG' : 'en-US')
  const idLabel = isArabic ? ' | الرقم: ' : '  |  ID: '
  const footerText = generatedLabel + dateStr + idLabel + student.id.slice(0, 8)
  if (isArabic) {
    doc.text(await prepareArabicText(footerText), pageWidth / 2, pageHeight - 13, { align: 'center' })
  } else {
    doc.text(footerText, pageWidth / 2, pageHeight - 13, { align: 'center' })
  }

  const creditsText = isArabic ? 'رقمنة/مستر عمرو صبحي' : 'Digitized by Mr. Amr Sobhy'
  if (isArabic) {
    doc.text(await prepareArabicText(creditsText), pageWidth / 2, pageHeight - 8, { align: 'center' })
  } else {
    doc.text(creditsText, pageWidth / 2, pageHeight - 8, { align: 'center' })
  }

  return doc.output('blob')
}

export async function generateBulkStudentPDF(students: StudentRecord[], lang: string): Promise<Blob> {
  const { default: jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const isArabic = lang === 'ar'
  const fontFamily = isArabic ? 'Amiri' : 'helvetica';

  if (isArabic) {
    await registerArabicFonts(doc);
  }

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 15
  const contentWidth = pageWidth - margin * 2

  const now = new Date().toLocaleDateString(isArabic ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  for (let studentIdx = 0; studentIdx < students.length; studentIdx++) {
    const student = students[studentIdx]
    if (studentIdx > 0) doc.addPage()

    const collegeName = isArabic ? 'كلية الإقبال القومية' : 'Al-Eqbal National College'

    // Header
    doc.setFillColor(5, 150, 105)
    doc.rect(0, 0, pageWidth, 32, 'F')

    doc.setFont(fontFamily, 'bold')
    doc.setFontSize(16)
    doc.setTextColor(255, 255, 255)
    doc.text(isArabic ? await prepareArabicText(collegeName) : collegeName, pageWidth / 2, 14, { align: 'center' })

    doc.setFont(fontFamily, 'normal')
    doc.setFontSize(10)
    doc.setTextColor(200, 230, 210)
    const studentNumText = isArabic
      ? `الطالب رقم ${studentIdx + 1} من ${students.length}`
      : `Student #${studentIdx + 1} of ${students.length}`
    doc.text(isArabic ? await prepareArabicText(studentNumText) : studentNumText, pageWidth / 2, 24, { align: 'center' })

    // Student name banner
    doc.setFillColor(240, 253, 244)
    doc.roundedRect(margin, 36, contentWidth, 12, 2, 2, 'F')

    doc.setFont(fontFamily, 'bold')
    doc.setFontSize(13)
    doc.setTextColor(5, 150, 105)
    doc.text(isArabic ? await prepareArabicText(student.fullName) : student.fullName, pageWidth / 2, 44, { align: 'center' })

    // Fields
    const fields: [string, string][] = [
      [isArabic ? 'الصف' : 'Grade', student.className],
      [isArabic ? 'النوع' : 'Gender', student.gender === 'male' ? (isArabic ? 'ذكر' : 'Male') : (isArabic ? 'أنثى' : 'Female')],
      [isArabic ? 'الهاتف' : 'Phone', student.parentPhone],
      [isArabic ? 'البريد' : 'Email', student.parentEmail],
      [isArabic ? 'الواتساب' : 'WhatsApp', student.whatsapp || '--'],
      [isArabic ? 'الحساب' : 'Account', student.userEmail],
      [isArabic ? 'تاريخ التسجيل' : 'Registered', new Date(student.createdAt).toLocaleDateString(isArabic ? 'ar-EG' : 'en-US')],
    ]

    // Prepare Arabic text
    const preparedFields = await Promise.all(
      fields.map(async ([label, value]) => {
        if (isArabic) {
          return [await prepareArabicText(label), await prepareArabicText(value)] as [string, string];
        }
        return [label, value] as [string, string];
      })
    )

    let y = 54
    const rowH = 11

    preparedFields.forEach(([label, value], i) => {
      if (i % 2 === 0) {
        doc.setFillColor(248, 249, 251)
        doc.roundedRect(margin, y - 3.5, contentWidth, rowH, 1, 1, 'F')
      }

      doc.setFont(fontFamily, 'bold')
      doc.setFontSize(9)
      doc.setTextColor(110, 110, 110)
      if (isArabic) {
        const sepX = margin + contentWidth * 0.35
        doc.text(label, sepX - 3, y + 2, { align: 'right' })
      } else {
        doc.text(label, pageWidth - margin - 2, y + 2, { align: 'right' })
      }

      doc.setDrawColor(225, 225, 225)
      doc.setLineWidth(0.15)
      const sepX = margin + contentWidth * 0.35
      doc.line(sepX, y - 3, sepX, y + rowH - 5)

      doc.setFont(fontFamily, 'normal')
      doc.setFontSize(9)
      doc.setTextColor(30, 30, 30)
      if (isArabic) {
        doc.text(value, pageWidth - margin - 2, y + 2, { align: 'right' })
      } else {
        doc.text(value, margin + contentWidth * 0.35 + 2, y + 2, { align: 'left' })
      }

      y += rowH
    })

    // Footer
    doc.setDrawColor(220, 220, 220)
    doc.setLineWidth(0.2)
    doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15)

    doc.setFontSize(7)
    doc.setTextColor(170, 170, 170)
    doc.setFont(fontFamily, 'normal')
    const pageText = isArabic
      ? `${await prepareArabicText(now)}  |  صفحة ${studentIdx + 1}/${students.length}`
      : `${now}  |  Page ${studentIdx + 1}/${students.length}`
    doc.text(pageText, pageWidth / 2, pageHeight - 10, { align: 'center' })
  }

  return doc.output('blob')
}
