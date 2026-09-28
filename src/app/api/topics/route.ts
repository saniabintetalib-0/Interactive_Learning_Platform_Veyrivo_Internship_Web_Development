import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const grade = searchParams.get('grade');
    const subjectId = searchParams.get('subjectId');

    const db = await getDb();
    let query = 'SELECT * FROM topics';
    const params: (string | number)[] = [];

    if (grade || subjectId) {
      const conditions: string[] = [];
      if (grade) {
        conditions.push('grade = ?');
        params.push(parseInt(grade, 10));
      }
      if (subjectId) {
        conditions.push('subjectId = ?');
        params.push(subjectId);
      }
      query += ' WHERE ' + conditions.join(' AND ');
    }

    const rows = await db.all(query, params);
    
    const formattedTopics = rows.map((r) => ({
      ...r,
      questions: JSON.parse(r.questionsJson || '[]')
    }));

    return NextResponse.json({ success: true, count: formattedTopics.length, topics: formattedTopics });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
