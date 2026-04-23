import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean)

export function isAdminEmail(email: string): boolean {
  return ADMIN_EMAILS.includes(email.toLowerCase())
}

export async function getAdminUser(request: NextRequest) {
  const sessionCookie = request.cookies.get('session')
  if (!sessionCookie?.value) return null

  const session = await db.session.findUnique({
    where: { token: sessionCookie.value },
    include: { user: true },
  })

  if (!session || session.expiresAt < new Date()) return null
  if (session.user.role !== 'admin') return null

  return session.user
}

export function adminUnauthorized() {
  return NextResponse.json(
    { success: false, error: 'Unauthorized - Admin access required' },
    { status: 403 }
  )
}
