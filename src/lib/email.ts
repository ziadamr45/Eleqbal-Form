import nodemailer from 'nodemailer'

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com'
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587')
const SMTP_USER = process.env.SMTP_USER || ''
const SMTP_PASS = process.env.SMTP_PASS || ''
const EMAIL_FROM = process.env.EMAIL_FROM || SMTP_USER

let transporter: nodemailer.Transporter | null = null

function getTransporter(): nodemailer.Transporter | null {
  if (!SMTP_USER || !SMTP_PASS) {
    return null
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    })
  }

  return transporter
}

export async function sendOtpEmail(to: string, code: string): Promise<boolean> {
  const transport = getTransporter()
  if (!transport) return false

  try {
    // Simple lightweight email - NO attachments for instant push notifications
    const subject = `${code} - رمز التحقق | كلية الاقبال القوميه`

    await transport.sendMail({
      from: `"كلية الاقبال القوميه" <${EMAIL_FROM}>`,
      to,
      subject,
      text: `رمز التحقق الخاص بك: ${code}\n\nكلية الاقبال القوميه\nصالح لمدة 5 دقائق فقط`,
      html: `
        <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 20px; background: #ffffff;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="width: 60px; height: 60px; border-radius: 50%; background: linear-gradient(135deg, #059669, #047857); margin: 0 auto 12px auto; display: flex; align-items: center; justify-content: center; line-height: 60px;">
              <span style="color: #fff; font-size: 30px; font-weight: bold;">ك</span>
            </div>
            <h1 style="color: #111827; font-size: 20px; margin: 0 0 4px 0;">كلية الاقبال القوميه</h1>
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">نظام جمع بيانات الطلاب</p>
          </div>
          <div style="background: #f0fdf4; border: 1px solid #a7f3d0; border-radius: 12px; padding: 24px 20px; text-align: center; margin-bottom: 24px;">
            <p style="color: #374151; font-size: 14px; margin: 0 0 14px 0;">رمز التحقق الخاص بك</p>
            <div style="background: #fff; border: 2px dashed #059669; border-radius: 10px; padding: 14px 32px; display: inline-block;">
              <span style="font-size: 38px; font-weight: bold; color: #059669; letter-spacing: 10px; font-family: 'Courier New', monospace;">${code}</span>
            </div>
            <p style="color: #9ca3af; font-size: 11px; margin: 12px 0 0 0;">صالح لمدة 5 دقائق فقط</p>
          </div>
          <div style="text-align: center; padding-top: 12px; border-top: 1px solid #f3f4f6;">
            <p style="color: #9ca3af; font-size: 10px; margin: 0;">إذا لم تطلب هذا الرمز، يمكنك تجاهل هذه الرسالة بأمان</p>
            <p style="color: #d1d5db; font-size: 9px; margin: 4px 0 0 0;">رقمنة / مستر عمرو صبحي</p>
          </div>
        </div>
      `,
    })

    return true
  } catch (error) {
    console.error('Failed to send email:', error)
    return false
  }
}
