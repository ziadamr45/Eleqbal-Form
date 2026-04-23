import nodemailer from 'nodemailer'

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com'
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587')
const SMTP_USER = process.env.SMTP_USER || ''
const SMTP_PASS = process.env.SMTP_PASS || ''
const EMAIL_FROM = process.env.EMAIL_FROM || SMTP_USER

let transporter: nodemailer.Transporter | null = null

function getTransporter(): nodemailer.Transporter | null {
  if (!SMTP_USER || !SMTP_PASS) {
    console.warn('⚠️ SMTP credentials not configured. Email sending is disabled.')
    console.warn('   Set SMTP_USER and SMTP_PASS in .env to enable email sending.')
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
    const appName = 'كلية الاقبال القوميه'
    
    await transport.sendMail({
      from: `"${appName}" <${EMAIL_FROM}>`,
      to,
      subject: `رمز التحقق | ${appName}`,
      html: `
        <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #059669; font-size: 24px; margin: 0;">${appName}</h1>
            <p style="color: #6b7280; font-size: 14px; margin-top: 4px;">نظام جمع بيانات الطلاب</p>
          </div>
          
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
            <p style="color: #374151; font-size: 16px; margin-bottom: 16px;">رمز التحقق الخاص بك هو</p>
            <div style="background: #ffffff; border: 2px dashed #059669; border-radius: 8px; padding: 16px 32px; display: inline-block;">
              <span style="font-size: 36px; font-weight: bold; color: #059669; letter-spacing: 8px; font-family: 'Courier New', monospace;">${code}</span>
            </div>
            <p style="color: #6b7280; font-size: 12px; margin-top: 16px;">صالح لمدة 5 دقائق فقط</p>
          </div>
          
          <div style="text-align: center; padding-top: 16px; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">إذا لم تطلب هذا الرمز، يمكنك تجاهل هذه الرسالة</p>
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
