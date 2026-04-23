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
    // Read school logo
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

    // OTP code in SUBJECT so it shows in push notifications
    const subject = `رمز التحقق: ${code} | كلية الاقبال القوميه`

    await transport.sendMail({
      from: `"كلية الاقبال القوميه" <${EMAIL_FROM}>`,
      to,
      subject,
      attachments,
      html: `
        <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 20px; background: #ffffff;">
          <!-- Header -->
          <div style="text-align: center; margin-bottom: 28px;">
            ${logoCid
              ? `<img src="cid:${logoCid}" alt="كلية الاقبال القوميه" style="width: 90px; height: 90px; border-radius: 50%; object-fit: cover; margin-bottom: 14px; border: 3px solid #059669;" />`
              : `<div style="width: 70px; height: 70px; border-radius: 50%; background: linear-gradient(135deg, #059669, #047857); margin: 0 auto 14px auto; display: flex; align-items: center; justify-content: center;"><span style="color: #fff; font-size: 32px; font-weight: bold;">ك</span></div>`
            }
            <h1 style="color: #111827; font-size: 22px; margin: 0 0 4px 0;">كلية الاقبال القوميه</h1>
            <p style="color: #9ca3af; font-size: 13px; margin: 0;">نظام جمع بيانات الطلاب</p>
          </div>

          <!-- OTP Code -->
          <div style="background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); border: 1px solid #a7f3d0; border-radius: 16px; padding: 32px 24px; text-align: center; margin-bottom: 28px;">
            <p style="color: #374151; font-size: 15px; margin: 0 0 18px 0;">رمز التحقق الخاص بك</p>
            <div style="background: #ffffff; border: 2px dashed #059669; border-radius: 12px; padding: 18px 40px; display: inline-block; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.1);">
              <span style="font-size: 42px; font-weight: bold; color: #059669; letter-spacing: 12px; font-family: 'Courier New', monospace;">${code}</span>
            </div>
            <p style="color: #9ca3af; font-size: 12px; margin: 16px 0 0 0;">⏱ صالح لمدة 5 دقائق فقط</p>
          </div>

          <!-- Footer -->
          <div style="text-align: center; padding-top: 16px; border-top: 1px solid #f3f4f6;">
            <p style="color: #9ca3af; font-size: 11px; margin: 0 0 6px 0;">إذا لم تطلب هذا الرمز، يمكنك تجاهل هذه الرسالة بأمان</p>
            <p style="color: #d1d5db; font-size: 10px; margin: 0;">رقمنة / مستر عمرو صبحي</p>
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
