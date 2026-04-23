import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, code, name } = body

    // Validate input
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      )
    }

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { success: false, error: 'OTP code is required' },
        { status: 400 }
      )
    }

    // Find the latest unverified OTP for this email that hasn't expired
    const otp = await db.otp.findFirst({
      where: {
        email,
        code,
        verified: false,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    if (!otp) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired OTP' },
        { status: 400 }
      )
    }

    // Mark OTP as verified
    await db.otp.update({
      where: { id: otp.id },
      data: { verified: true },
    })

    // Find or create user
    let user = await db.user.findUnique({
      where: { email },
    })

    let isNewUser = false
    if (!user) {
      user = await db.user.create({
        data: { email, name: name || null },
      })
      isNewUser = true
    } else {
      // Update name if registering with a new name
      if (name) {
        user = await db.user.update({
          where: { id: user.id },
          data: { name: name || user.name },
        })
      }
    }

    // Create session
    const token = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

    await db.session.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
    })

    // Set HTTP-only session cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      isNewUser,
    })

    response.cookies.set('session', token, {
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
      httpOnly: true,
      sameSite: 'lax',
    })

    return response
  } catch (error) {
    console.error('Verify OTP error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to verify OTP' },
      { status: 500 }
    )
  }
}
