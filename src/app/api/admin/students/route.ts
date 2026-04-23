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
    const section = searchParams.get('section') || ''
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
    if (grade && section) {
      where.className = grade + '/' + section
    } else if (grade) {
      where.className = { startsWith: grade + '/' }
    }
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
        include: { user: { select: { email: true, name: true } } },
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

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminUser(request)
    if (!admin) return adminUnauthorized()

    const body = await request.json()
    const { fullName, className, parentPhone, parentEmail, gender, whatsapp, parentName } = body

    if (!fullName || !className || !parentPhone || !parentEmail || !gender) {
      return NextResponse.json({ success: false, error: 'All required fields must be provided' }, { status: 400 })
    }

    // Find or create a user for this student (digitized entry)
    const emailSlug = fullName.trim().replace(/\s+/g, '').slice(0, 20).toLowerCase() + '_' + Date.now().toString(36)
    const dummyEmail = emailSlug + '@digitized.local'

    let user = await db.user.findUnique({ where: { email: dummyEmail } })
    if (!user) {
      user = await db.user.create({
        data: { email: dummyEmail, name: parentName || null, role: 'student' },
      })
    }

    // Check if student already exists for this user
    const existing = await db.studentData.findUnique({ where: { userId: user.id } })
    if (existing) {
      return NextResponse.json({ success: false, error: 'Student record already exists for this entry' }, { status: 409 })
    }

    const student = await db.studentData.create({
      data: {
        userId: user.id,
        fullName,
        className,
        parentPhone,
        parentEmail,
        gender,
        whatsapp: whatsapp || null,
      },
    })

    return NextResponse.json({ success: true, student })
  } catch (error) {
    console.error('Admin create student error:', error)
    return NextResponse.json({ success: false, error: 'Failed to create student' }, { status: 500 })
  }
}
