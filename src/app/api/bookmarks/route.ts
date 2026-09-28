import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const db = await getDb();
    const rows = await db.all('SELECT topicId FROM user_bookmarks');
    return NextResponse.json({ success: true, bookmarks: rows.map(r => r.topicId) });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { topicId } = await request.json();
    const db = await getDb();

    const existing = await db.get('SELECT topicId FROM user_bookmarks WHERE topicId = ?', [topicId]);

    if (existing) {
      await db.run('DELETE FROM user_bookmarks WHERE topicId = ?', [topicId]);
    } else {
      await db.run('INSERT INTO user_bookmarks (topicId, createdAt) VALUES (?, ?)', [topicId, new Date().toISOString()]);
    }

    const rows = await db.all('SELECT topicId FROM user_bookmarks');
    return NextResponse.json({ success: true, isBookmarked: !existing, bookmarks: rows.map(r => r.topicId) });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
