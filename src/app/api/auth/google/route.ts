import { NextRequest, NextResponse } from 'next/server'
import { OAuth2Client } from 'google-auth-library'
import { db } from '@/lib/db'
import { isAdminEmail } from '@/lib/admin-auth'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || ''

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { credential } = body

    if (!credential || typeof credential !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Google credential is required' },
        { status: 400 }
      )
    }

    if (!GOOGLE_CLIENT_ID) {
      return NextResponse.json(
        { success: false, error: 'Google OAuth not configured' },
        { status: 500 }
      )
    }

    // Verify the Google ID token
    const client = new OAuth2Client(GOOGLE_CLIENT_ID)
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    })

    const payload = ticket.getPayload()
    if (!payload || !payload.email) {
      return NextResponse.json(
        { success: false, error: 'Invalid Google token' },
        { status: 400 }
      )
    }

    const { email, name, picture } = payload

    const isAdmin = isAdminEmail(email)
    const role = isAdmin ? 'admin' : 'student'

    // Find or create user
    let user = await db.user.findUnique({ where: { email } })
    let isNewUser = false

    if (!user) {
      user = await db.user.create({
        data: {
          email,
          name: name || null,
          role,
        },
      })
      isNewUser = true
    } else {
      const updates: Record<string, unknown> = {}
      if (name && (!user.name || user.name !== name)) updates.name = name || user.name
      if (isAdmin && user.role !== 'admin') updates.role = 'admin'
      if (Object.keys(updates).length > 0) {
        user = await db.user.update({
          where: { id: user.id },
          data: updates,
        })
      }
    }

    // Create session (same as OTP flow)
    const token = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    await db.session.create({
      data: { token, userId: user.id, expiresAt },
    })

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: picture || null,
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
    console.error('Google auth error:', error)
    return NextResponse.json(
      { success: false, error: 'Google authentication failed' },
      { status: 500 }
    )
  }
}
