import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { topicId, score, totalQuestions, xpEarned } = await request.json();
    const db = await getDb();

    await db.run(
      'INSERT INTO quiz_attempts (topicId, score, totalQuestions, xpEarned, attemptedAt) VALUES (?, ?, ?, ?, ?)',
      [topicId, score, totalQuestions, xpEarned, new Date().toISOString()]
    );

    // Update profile XP & completed count
    await db.run(
      'UPDATE student_profile SET totalXp = totalXp + ?, topicsCompletedCount = topicsCompletedCount + 1 WHERE id = 1',
      [xpEarned]
    );

    const updatedProfile = await db.get('SELECT * FROM student_profile WHERE id = 1');
    return NextResponse.json({ success: true, profile: updatedProfile });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
