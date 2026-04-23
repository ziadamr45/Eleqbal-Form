import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAdminUser, adminUnauthorized } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminUser(request)
    if (!admin) return adminUnauthorized()

    const recentStudents = await db.studentData.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 15,
      include: { user: { select: { email: true } } },
    })

    const activities = recentStudents.map(s => ({
      id: s.id,
      fullName: s.fullName,
      className: s.className,
      userEmail: s.user.email,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }))

    return NextResponse.json({ success: true, activities })
  } catch (error) {
    console.error('Admin activity error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch activity' }, { status: 500 })
  }
}
