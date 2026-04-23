import nodemailer from 'nodemailer'
import fs from 'fs'
import path from 'path'

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

    // Read school logo and attach as inline image
    const logoPath = path.join(process.cwd(), 'public', 'school-logo.jpg')
    let logoCid = ''
    const attachments: Array<{ filename: string; path: string; cid: string }> = []

    if (fs.existsSync(logoPath)) {
      logoCid = 'school-logo'
      attachments.push({
        filename: 'school-logo.jpg',
        path: logoPath,
        cid: logoCid,
      })
    }

    await transport.sendMail({
      from: `"${appName}" <${EMAIL_FROM}>`,
      to,
      subject: `رمز التحقق | ${appName}`,
      attachments,
      html: `
        <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 20px; background: #ffffff;">
          <!-- Header with Logo -->
          <div style="text-align: center; margin-bottom: 24px;">
            ${logoCid ? `<img src="cid:${logoCid}" alt="${appName}" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; margin-bottom: 12px;" />` : ''}
            <h1 style="color: #059669; font-size: 22px; margin: 0 0 4px 0;">${appName}</h1>
            <p style="color: #6b7280; font-size: 13px; margin: 0;">نظام جمع بيانات الطلاب</p>
          </div>
          
          <!-- OTP Code Section -->
          <div style="background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); border: 1px solid #bbf7d0; border-radius: 16px; padding: 28px 24px; text-align: center; margin-bottom: 24px;">
            <p style="color: #374151; font-size: 15px; margin: 0 0 16px 0;">رمز التحقق الخاص بك هو</p>
            <div style="background: #ffffff; border: 2px dashed #059669; border-radius: 12px; padding: 16px 36px; display: inline-block; box-shadow: 0 2px 8px rgba(5, 150, 105, 0.1);">
              <span style="font-size: 38px; font-weight: bold; color: #059669; letter-spacing: 10px; font-family: 'Courier New', monospace;">${code}</span>
            </div>
            <p style="color: #9ca3af; font-size: 12px; margin: 14px 0 0 0;">⏱ صالح لمدة 5 دقائق فقط</p>
          </div>
          
          <!-- Footer -->
          <div style="text-align: center; padding-top: 16px; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 11px; margin: 0;">إذا لم تطلب هذا الرمز، يمكنك تجاهل هذه الرسالة بأمان</p>
            <p style="color: #d1d5db; font-size: 10px; margin: 8px 0 0 0;">رقمنة / مستر عمرو صبحي</p>
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
