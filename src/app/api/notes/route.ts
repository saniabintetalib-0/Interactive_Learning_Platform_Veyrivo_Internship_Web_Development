import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const topicId = searchParams.get('topicId');

    const db = await getDb();
    let rows;
    if (topicId) {
      rows = await db.all('SELECT * FROM user_notes WHERE topicId = ? ORDER BY createdAt DESC', [topicId]);
    } else {
      rows = await db.all('SELECT * FROM user_notes ORDER BY createdAt DESC');
    }
    return NextResponse.json({ success: true, notes: rows });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { topicId, text } = await request.json();
    const db = await getDb();
    const noteId = 'note_' + Date.now();
    const createdAt = new Date().toISOString();

    await db.run(
      'INSERT INTO user_notes (id, topicId, text, createdAt) VALUES (?, ?, ?, ?)',
      [noteId, topicId, text, createdAt]
    );

    const rows = await db.all('SELECT * FROM user_notes WHERE topicId = ? ORDER BY createdAt DESC', [topicId]);
    return NextResponse.json({ success: true, notes: rows });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
