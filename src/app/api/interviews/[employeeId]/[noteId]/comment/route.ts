import { NextRequest, NextResponse } from 'next/server';
import { readJson, writeJson } from '@/lib/drive';
import { getAuthFromRequest } from '@/lib/auth-api';
import { InterviewNotesData } from '@/lib/types';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ employeeId: string; noteId: string }> }
) {
  try {
    const { employeeId, noteId } = await params;
    const auth = getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // owner/manager は誰のコメントでも編集可能
    // staff は自分の記録のみ（フロントでemployeeIdを制限）
    // store は不可
    if (auth.role === 'store') {
      return NextResponse.json({ success: false, error: 'Store role cannot edit comments' }, { status: 403 });
    }

    const body = await request.json();
    const { employeeComment } = body;

    if (typeof employeeComment !== 'string') {
      return NextResponse.json({ success: false, error: 'employeeComment is required' }, { status: 400 });
    }

    let data: InterviewNotesData;
    try {
      data = await readJson<InterviewNotesData>(`interview_${employeeId}.json`);
    } catch {
      return NextResponse.json({ success: false, error: 'Interview notes not found' }, { status: 404 });
    }

    const note = data.notes.find(n => n.noteId === noteId);
    if (!note) {
      return NextResponse.json({ success: false, error: 'Note not found' }, { status: 404 });
    }

    note.employeeComment = employeeComment;
    note.updatedAt = new Date().toISOString();

    await writeJson(`interview_${employeeId}.json`, data);

    return NextResponse.json({ success: true, data: note });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
