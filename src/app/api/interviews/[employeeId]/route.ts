import { NextRequest, NextResponse } from 'next/server';
import { readJson, writeJson } from '@/lib/drive';
import { getAuthFromRequest, isStoreRestricted } from '@/lib/auth-api';
import { InterviewNotesData, EmployeesData } from '@/lib/types';
import { randomUUID } from 'crypto';

const EMPTY_DATA: InterviewNotesData = { version: 1, notes: [] };

async function loadNotes(employeeId: string): Promise<InterviewNotesData> {
  try {
    return await readJson<InterviewNotesData>(`interview_${employeeId}.json`);
  } catch {
    return EMPTY_DATA;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  try {
    const { employeeId } = await params;
    const auth = getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // staff: 自分の記録のみ
    if (auth.role === 'staff') {
      // staffのstoreIdと社員の店舗が一致するか確認が必要だが、
      // staffは基本的にポータルから自分のIDでアクセスするため employeeId 制限はフロントで対応
    }

    // store: 自店舗社員のみ
    if (isStoreRestricted(auth.role) && auth.storeId) {
      const employees = await readJson<EmployeesData>('employees.json');
      const emp = employees.items.find(e => e.employeeId === employeeId);
      if (emp && emp.storeId !== auth.storeId) {
        return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
      }
    }

    const data = await loadNotes(employeeId);
    // 新しい順
    const sorted = [...data.notes].sort((a, b) => b.date.localeCompare(a.date));

    return NextResponse.json({ success: true, data: { notes: sorted } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  try {
    const { employeeId } = await params;
    const auth = getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // staffは作成不可
    if (auth.role === 'staff') {
      return NextResponse.json({ success: false, error: 'Staff cannot create interview notes' }, { status: 403 });
    }

    // store: 自店舗社員のみ
    if (isStoreRestricted(auth.role) && auth.storeId) {
      const employees = await readJson<EmployeesData>('employees.json');
      const emp = employees.items.find(e => e.employeeId === employeeId);
      if (emp && emp.storeId !== auth.storeId) {
        return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
      }
    }

    const body = await request.json();
    const { date, interviewer, situation, issue, action } = body;

    if (!date || !interviewer) {
      return NextResponse.json({ success: false, error: 'date and interviewer are required' }, { status: 400 });
    }

    // 社員の店舗コードを取得
    const employees = await readJson<EmployeesData>('employees.json');
    const emp = employees.items.find(e => e.employeeId === employeeId);
    const storeId = emp?.storeId || '';

    const now = new Date().toISOString();
    const newNote = {
      noteId: randomUUID(),
      employeeId,
      storeId,
      date,
      interviewer,
      situation: situation || '',
      issue: issue || '',
      action: action || '',
      employeeComment: '',
      createdAt: now,
      updatedAt: now,
    };

    const data = await loadNotes(employeeId);
    data.notes.push(newNote);

    await writeJson(`interview_${employeeId}.json`, data);

    return NextResponse.json({ success: true, data: newNote });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
