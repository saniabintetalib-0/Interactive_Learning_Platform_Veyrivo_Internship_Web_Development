import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const db = await getDb();
    const profile = await db.get('SELECT * FROM student_profile WHERE id = 1');
    return NextResponse.json({ success: true, profile });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const db = await getDb();

    if (body.xpEarned) {
      await db.run(
        `UPDATE student_profile 
         SET totalXp = totalXp + ?, 
             topicsCompletedCount = topicsCompletedCount + 1 
         WHERE id = 1`,
        [body.xpEarned]
      );
    }

    const updated = await db.get('SELECT * FROM student_profile WHERE id = 1');
    return NextResponse.json({ success: true, profile: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
