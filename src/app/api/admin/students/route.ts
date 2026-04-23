import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAdminUser, adminUnauthorized } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminUser(request)
    if (!admin) return adminUnauthorized()

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const grade = searchParams.get('grade') || ''
    const gender = searchParams.get('gender') || ''
    const sort = searchParams.get('sort') || 'newest'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: Record<string, unknown> = {}
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { parentPhone: { contains: search } },
        { parentEmail: { contains: search, mode: 'insensitive' } },
      ]
    }
    if (grade) where.className = { startsWith: grade + '/' }
    if (gender) where.gender = gender

    const orderBy: Record<string, string> = {}
    switch (sort) {
      case 'name_asc': orderBy.fullName = 'asc'; break
      case 'name_desc': orderBy.fullName = 'desc'; break
      case 'oldest': orderBy.createdAt = 'asc'; break
      default: orderBy.createdAt = 'desc'
    }

    const [students, total] = await Promise.all([
      db.studentData.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: { user: { select: { email: true, name: true, createdAt: true } } },
      }),
      db.studentData.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      students: students.map(s => ({
        id: s.id,
        fullName: s.fullName,
        className: s.className,
        parentPhone: s.parentPhone,
        parentEmail: s.parentEmail,
        gender: s.gender,
        whatsapp: s.whatsapp,
        userEmail: s.user.email,
        userName: s.user.name,
        userCreatedAt: s.user.createdAt,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Admin students list error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch students' }, { status: 500 })
  }
}
