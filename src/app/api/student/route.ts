import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Helper: validate session and return userId or error response
async function validateSession(request: NextRequest) {
  const sessionCookie = request.cookies.get('session')
  if (!sessionCookie?.value) {
    return { valid: false, response: NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 }) }
  }

  const session = await db.session.findUnique({
    where: { token: sessionCookie.value },
  })

  if (!session || session.expiresAt < new Date()) {
    return { valid: false, response: NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 }) }
  }

  return { valid: true, userId: session.userId }
}

// GET: Retrieve student data for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const auth = await validateSession(request)
    if (!auth.valid) return auth.response!

    const studentData = await db.studentData.findUnique({
      where: { userId: auth.userId },
    })

    return NextResponse.json({
      success: true,
      data: studentData,
    })
  } catch (error) {
    console.error('GET student error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch student data' },
      { status: 500 }
    )
  }
}

// POST: Create student data for the authenticated user
export async function POST(request: NextRequest) {
  try {
    const auth = await validateSession(request)
    if (!auth.valid) return auth.response!

    const body = await request.json()
    const { fullName, className, parentPhone, parentEmail, gender, whatsapp } = body

    // Validate required fields
    const requiredFields = ['fullName', 'className', 'parentPhone', 'parentEmail', 'gender']
    const missingFields = requiredFields.filter((field) => !body[field] || typeof body[field] !== 'string' || body[field].trim() === '')

    if (missingFields.length > 0) {
      return NextResponse.json(
        { success: false, error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(parentEmail.trim())) {
      return NextResponse.json(
        { success: false, error: 'Invalid parent email format' },
        { status: 400 }
      )
    }

    // Check if student data already exists
    const existing = await db.studentData.findUnique({
      where: { userId: auth.userId },
    })

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Student data already exists. Use PUT to update.' },
        { status: 409 }
      )
    }

    // Create student data record
    const studentData = await db.studentData.create({
      data: {
        userId: auth.userId,
        fullName: fullName.trim(),
        className: className.trim(),
        parentPhone: parentPhone.trim(),
        parentEmail: parentEmail.trim(),
        gender: gender.trim(),
        whatsapp: whatsapp ? whatsapp.trim() : null,
      },
    })

    return NextResponse.json(
      { success: true, data: studentData },
      { status: 201 }
    )
  } catch (error) {
    console.error('POST student error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create student data' },
      { status: 500 }
    )
  }
}

// PUT: Update student data for the authenticated user
export async function PUT(request: NextRequest) {
  try {
    const auth = await validateSession(request)
    if (!auth.valid) return auth.response!

    const body = await request.json()
    const { fullName, className, parentPhone, parentEmail, gender, whatsapp } = body

    // Find existing student data
    const existing = await db.studentData.findUnique({
      where: { userId: auth.userId },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Student data not found. Use POST to create.' },
        { status: 404 }
      )
    }

    // Validate parent email if provided
    if (parentEmail !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (typeof parentEmail !== 'string' || !emailRegex.test(parentEmail.trim())) {
        return NextResponse.json(
          { success: false, error: 'Invalid parent email format' },
          { status: 400 }
        )
      }
    }

    // Build update payload with only provided fields
    const updateData: Record<string, string | null> = {}
    if (fullName !== undefined) updateData.fullName = fullName.trim()
    if (className !== undefined) updateData.className = className.trim()
    if (parentPhone !== undefined) updateData.parentPhone = parentPhone.trim()
    if (parentEmail !== undefined) updateData.parentEmail = parentEmail.trim()
    if (gender !== undefined) updateData.gender = gender.trim()
    if (whatsapp !== undefined) updateData.whatsapp = whatsapp ? whatsapp.trim() : null

    // Update student data
    const studentData = await db.studentData.update({
      where: { userId: auth.userId },
      data: updateData,
    })

    return NextResponse.json({
      success: true,
      data: studentData,
    })
  } catch (error) {
    console.error('PUT student error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update student data' },
      { status: 500 }
    )
  }
}
