import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAdminUser, adminUnauthorized } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminUser(request)
    if (!admin) return adminUnauthorized()

    const count = await db.pushSubscription.count()

    return NextResponse.json({ success: true, count })
  } catch (error) {
    console.error('Admin push stats error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch push stats' }, { status: 500 })
  }
}
