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

export function generateStudentPDF(student: StudentRecord, lang: string): Blob {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const pageWidth = doc.internal.pageSize.getWidth()

  // Header background
  doc.setFillColor(5, 150, 105) // emerald-600
  doc.rect(0, 0, pageWidth, 35, 'F')

  // School name
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(18)
  if (lang === 'ar') {
    // For Arabic, we use unicode approach - set right-aligned text
    doc.text('كلية الاقبال القوميه', pageWidth / 2, 18, { align: 'center' })
    doc.setFontSize(10)
    doc.text('Al-Eqbal National College', pageWidth / 2, 26, { align: 'center' })
  } else {
    doc.text('Al-Eqbal National College', pageWidth / 2, 18, { align: 'center' })
    doc.setFontSize(10)
    doc.text('كلية الاقبال القوميه', pageWidth / 2, 26, { align: 'center' })
  }

  // Reset text color
  doc.setTextColor(30, 30, 30)

  // Title
  doc.setFontSize(14)
  doc.setTextColor(5, 150, 105)
  const formTitle = lang === 'ar' ? 'بيانات الطالب / Student Record' : 'Student Record / بيانات الطالب'
  doc.text(formTitle, pageWidth / 2, 48, { align: 'center' })

  // Divider line
  doc.setDrawColor(5, 150, 105)
  doc.setLineWidth(0.5)
  doc.line(20, 52, pageWidth - 20, 52)

  // Data rows
  doc.setTextColor(30, 30, 30)
  const fields: [string, string][] = [
    [lang === 'ar' ? 'الاسم الكامل' : 'Full Name', student.fullName],
    [lang === 'ar' ? 'الصف والفصل' : 'Grade & Section', student.className],
    [lang === 'ar' ? 'الجنس' : 'Gender', student.gender === 'male' ? (lang === 'ar' ? 'ذكر' : 'Male') : (lang === 'ar' ? 'أنثى' : 'Female')],
    [lang === 'ar' ? 'هاتف ولي الأمر' : 'Parent Phone', student.parentPhone],
    [lang === 'ar' ? 'بريد ولي الأمر' : 'Parent Email', student.parentEmail],
    [lang === 'ar' ? 'واتساب' : 'WhatsApp', student.whatsapp || '—'],
    [lang === 'ar' ? 'تاريخ التسجيل' : 'Registration Date', new Date(student.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')],
  ]

  let y = 62
  const rowHeight = 10
  const labelX = 25
  const valueX = pageWidth / 2 + 5

  fields.forEach(([label, value], i) => {
    // Alternating row background
    if (i % 2 === 0) {
      doc.setFillColor(245, 245, 245)
      doc.rect(20, y - 5, pageWidth - 40, rowHeight, 'F')
    }

    // Label
    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    doc.text(label, labelX, y)

    // Value
    doc.setTextColor(30, 30, 30)
    doc.setFontSize(11)
    doc.text(value, valueX, y)

    y += rowHeight
  })

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 15
  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.3)
  doc.line(20, footerY - 5, pageWidth - 20, footerY - 5)

  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.text(
    `Generated: ${new Date().toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')} | ID: ${student.id}`,
    pageWidth / 2,
    footerY,
    { align: 'center' }
  )

  return doc.output('blob')
}
