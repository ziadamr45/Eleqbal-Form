import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAdminUser, adminUnauthorized } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminUser(request)
    if (!admin) return adminUnauthorized()

    const [
      totalStudents,
      totalUsers,
      maleCount,
      femaleCount,
      studentsByClass,
      recentStudents,
    ] = await Promise.all([
      db.studentData.count(),
      db.user.count(),
      db.studentData.count({ where: { gender: 'male' } }),
      db.studentData.count({ where: { gender: 'female' } }),
      db.studentData.groupBy({
        by: ['className'],
        _count: { id: true },
        orderBy: { className: 'asc' },
      }),
      db.studentData.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { fullName: true, className: true, createdAt: true },
      }),
    ])

    return NextResponse.json({
      success: true,
      stats: {
        totalStudents,
        totalUsers,
        maleCount,
        femaleCount,
        studentsByClass: studentsByClass.map(c => ({
          className: c.className,
          count: c._count.id,
        })),
        recentStudents,
      },
    })
  } catch (error) {
    console.error('Admin stats error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch stats' }, { status: 500 })
  }
}
