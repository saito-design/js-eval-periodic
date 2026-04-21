'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useAuth, isAdminRole } from '@/lib/auth-context';
import type { InterviewNote } from '@/lib/types';

interface EmployeeInfo {
  employeeId: string;
  employeeCode: string;
  name: string;
  role: string;
  storeId: string;
  storeName?: string;
}

export default function EmployeeInterviewsPage({
  params,
}: {
  params: Promise<{ companyId: string; employeeId: string }>;
}) {
  const { companyId, employeeId } = use(params);
  const auth = useAuth();
  const [notes, setNotes] = useState<InterviewNote[]>([]);
  const [employee, setEmployee] = useState<EmployeeInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');

  // フォーム
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formInterviewer, setFormInterviewer] = useState('');
  const [formSituation, setFormSituation] = useState('');
  const [formIssue, setFormIssue] = useState('');
  const [formAction, setFormAction] = useState('');

  const canCreate = auth.role !== 'staff';
  const canEditComment = auth.role === 'staff' || isAdminRole(auth.role);

  const authHeaders = { Authorization: `Bearer ${auth.token}` };

  const loadData = async () => {
    try {
      const [notesRes, empRes] = await Promise.all([
        fetch(`/api/interviews/${employeeId}`, { headers: authHeaders }),
        fetch(`/api/data/load?period=2025_H2`, { headers: authHeaders }),
      ]);

      const notesResult = await notesRes.json();
      if (notesResult.success) {
        setNotes(notesResult.data.notes);
      }

      const empResult = await empRes.json();
      if (empResult.success) {
        const emp = empResult.data.employees.items.find(
          (e: EmployeeInfo) => e.employeeId === employeeId
        );
        if (emp) {
          const store = empResult.data.stores.items.find(
            (s: { storeId: string; storeName: string }) => s.storeId === emp.storeId
          );
          setEmployee({ ...emp, storeName: store?.storeName });
        }
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [employeeId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDate || !formInterviewer) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/interviews/${employeeId}`, {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: formDate,
          interviewer: formInterviewer,
          situation: formSituation,
          issue: formIssue,
          action: formAction,
        }),
      });
      const result = await res.json();
      if (result.success) {
        setNotes(prev => [result.data, ...prev]);
        setShowForm(false);
        setFormSituation('');
        setFormIssue('');
        setFormAction('');
      }
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  };

  const handleSaveComment = async (noteId: string) => {
    try {
      const res = await fetch(`/api/interviews/${employeeId}/${noteId}/comment`, {
        method: 'PATCH',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeComment: commentText }),
      });
      const result = await res.json();
      if (result.success) {
        setNotes(prev =>
          prev.map(n => (n.noteId === noteId ? { ...n, employeeComment: commentText, updatedAt: result.data.updatedAt } : n))
        );
        setEditingComment(null);
      }
    } catch {
      // silently fail
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600" />
        <p className="mt-2 text-gray-500">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-4 flex items-center gap-4">
        <Link href={`/${companyId}/interviews`} className="text-blue-600 hover:text-blue-800 text-sm">
          ← 面談記録一覧
        </Link>
        {employee && (
          <Link href={`/${companyId}/evaluations/${employeeId}`} className="text-blue-600 hover:text-blue-800 text-sm">
            評価詳細
          </Link>
        )}
      </div>

      {/* ヘッダー */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {employee?.name || employeeId} の面談記録
            </h1>
            {employee && (
              <p className="text-sm text-gray-500 mt-1">
                {employee.employeeCode} / {employee.storeName || employee.storeId}
              </p>
            )}
          </div>
          {canCreate && (
            <button
              onClick={() => setShowForm(v => !v)}
              className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {showForm ? '閉じる' : '新規記録'}
            </button>
          )}
        </div>
      </div>

      {/* 新規作成フォーム */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-white p-6 rounded-lg shadow-sm border border-teal-200 mb-4">
          <h2 className="text-base font-bold text-gray-800 mb-4">新規面談記録</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">面談日</label>
              <input
                type="date"
                value={formDate}
                onChange={e => setFormDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">面談者</label>
              <input
                type="text"
                value={formInterviewer}
                onChange={e => setFormInterviewer(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="面談実施者名"
                required
              />
            </div>
          </div>
          <div className="space-y-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">現状</label>
              <textarea
                value={formSituation}
                onChange={e => setFormSituation(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="現在の状況・取り組み内容"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">課題</label>
              <textarea
                value={formIssue}
                onChange={e => setFormIssue(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="改善が必要な点・気づき"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">アクション</label>
              <textarea
                value={formAction}
                onChange={e => setFormAction(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="次回までに実施すること"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      )}

      {/* 面談記録リスト */}
      {notes.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center text-gray-400">
          面談記録はまだありません
        </div>
      ) : (
        <div className="space-y-4">
          {notes.map(note => (
            <div key={note.noteId} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-sm font-bold text-gray-900">{note.date}</span>
                  <span className="text-sm text-gray-500 ml-3">面談者: {note.interviewer}</span>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(note.updatedAt).toLocaleDateString('ja-JP')} 更新
                </span>
              </div>

              <div className="space-y-3">
                {note.situation && (
                  <div>
                    <div className="text-xs font-medium text-teal-600 mb-1">現状</div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.situation}</p>
                  </div>
                )}
                {note.issue && (
                  <div>
                    <div className="text-xs font-medium text-orange-600 mb-1">課題</div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.issue}</p>
                  </div>
                )}
                {note.action && (
                  <div>
                    <div className="text-xs font-medium text-blue-600 mb-1">アクション</div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.action}</p>
                  </div>
                )}
              </div>

              {/* 本人コメント */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="text-xs font-medium text-purple-600 mb-1">本人コメント</div>
                {editingComment === note.noteId ? (
                  <div>
                    <textarea
                      value={commentText}
                      onChange={e => setCommentText(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                    />
                    <div className="flex gap-2 mt-2 justify-end">
                      <button
                        onClick={() => setEditingComment(null)}
                        className="px-3 py-1 text-xs text-gray-500 hover:text-gray-700"
                      >
                        キャンセル
                      </button>
                      <button
                        onClick={() => handleSaveComment(note.noteId)}
                        className="px-3 py-1 text-xs bg-purple-500 hover:bg-purple-600 text-white rounded"
                      >
                        保存
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <p className="text-sm text-gray-600 whitespace-pre-wrap flex-1">
                      {note.employeeComment || <span className="text-gray-300">コメントなし</span>}
                    </p>
                    {canEditComment && (
                      <button
                        onClick={() => {
                          setEditingComment(note.noteId);
                          setCommentText(note.employeeComment || '');
                        }}
                        className="text-xs text-purple-500 hover:text-purple-700 shrink-0"
                      >
                        編集
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
