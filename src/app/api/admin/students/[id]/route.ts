import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAdminUser, adminUnauthorized } from '@/lib/admin-auth'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getAdminUser(request)
    if (!admin) return adminUnauthorized()

    const { id } = await params
    const body = await request.json()
    const { fullName, className, parentPhone, parentEmail, gender, whatsapp } = body

    const student = await db.studentData.findUnique({ where: { id } })
    if (!student) {
      return NextResponse.json({ success: false, error: 'Student not found' }, { status: 404 })
    }

    const updated = await db.studentData.update({
      where: { id },
      data: {
        ...(fullName && { fullName }),
        ...(className && { className }),
        ...(parentPhone && { parentPhone }),
        ...(parentEmail && { parentEmail }),
        ...(gender && { gender }),
        ...(whatsapp !== undefined && { whatsapp: whatsapp || null }),
      },
    })

    await db.adminNotification.create({
      data: {
        type: 'student_update',
        title: 'تحديث بيانات طالب / Student data updated',
        message: `تم تحديث بيانات الطالب: ${updated.fullName} - ${updated.className}`,
        metadata: { studentId: updated.id, fullName: updated.fullName, className: updated.className },
      },
    })

    return NextResponse.json({ success: true, student: updated })
  } catch (error) {
    console.error('Admin student update error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update student' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getAdminUser(request)
    if (!admin) return adminUnauthorized()

    const { id } = await params
    const student = await db.studentData.findUnique({ where: { id } })
    if (!student) {
      return NextResponse.json({ success: false, error: 'Student not found' }, { status: 404 })
    }

    await db.studentData.delete({ where: { id } })

    return NextResponse.json({ success: true, message: 'Student deleted' })
  } catch (error) {
    console.error('Admin student delete error:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete student' }, { status: 500 })
  }
}
