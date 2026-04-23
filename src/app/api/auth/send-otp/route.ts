import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendOtpEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    // Validate email
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Generate a 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString()

    // Invalidate existing unverified OTPs for this email
    await db.otp.updateMany({
      where: {
        email,
        verified: false,
      },
      data: {
        verified: true,
      },
    })

    // Create new OTP record (expires in 5 minutes)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000)
    await db.otp.create({
      data: {
        email,
        code,
        expiresAt,
      },
    })

    // Try to send the OTP email
    const emailSent = await sendOtpEmail(email, code)

    if (!emailSent) {
      // Email failed to send - return OTP in response for demo mode
      // In production, you should return an error instead
      return NextResponse.json({
        success: true,
        message: 'otp_generated',
        demo: true,
        otp: code,
      })
    }

    return NextResponse.json({
      success: true,
      message: 'otp_sent',
    })
  } catch (error) {
    console.error('Send OTP error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to send OTP' },
      { status: 500 }
    )
  }
}
