'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth, isAdminRole } from '@/lib/auth-context';

interface LoadStatus {
  employees: number;
  stores: number;
  evaluationResults: number;
  period: string;
}

export default function DashboardPage() {
  const params = useParams();
  const companyId = params.companyId as string;
  const auth = useAuth();

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<LoadStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recalculating, setRecalculating] = useState(false);

  const authHeaders = { Authorization: `Bearer ${auth.token}` };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/data/load?period=2025_H2', {
        headers: authHeaders,
      });
      const result = await response.json();

      if (result.success) {
        setStatus({
          employees: result.data.employees.items.length,
          stores: result.data.stores.items.length,
          evaluationResults: 0,
          period: result.data.period,
        });

        const evalResponse = await fetch('/api/evaluations?period=2025_H2', {
          headers: authHeaders,
        });
        const evalResult = await evalResponse.json();
        if (evalResult.success) {
          setStatus((prev) =>
            prev
              ? { ...prev, evaluationResults: evalResult.data.items.length }
              : null
          );
        }
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('データの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleRecalculate = async () => {
    try {
      setRecalculating(true);
      const response = await fetch('/api/evaluations/recalculate?period=2025_H2', {
        method: 'POST',
        headers: authHeaders,
      });
      const result = await response.json();
      if (result.success) {
        await loadData();
        alert(`再計算完了: ${result.data.count}件の評価を更新しました`);
      } else {
        alert(`エラー: ${result.error}`);
      }
    } catch (err) {
      alert('再計算に失敗しました');
    } finally {
      setRecalculating(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">ダッシュボード</h2>
        <p className="text-gray-600 mt-1">評価期間: 2025年度下期</p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="text-gray-500">データを読み込み中...</div>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">{error}</div>
      ) : status ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="text-3xl font-bold text-blue-600">{status.employees}</div>
            <div className="text-sm text-gray-600 mt-1">従業員数</div>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="text-3xl font-bold text-green-600">{status.stores}</div>
            <div className="text-sm text-gray-600 mt-1">店舗数</div>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="text-3xl font-bold text-purple-600">{status.evaluationResults}</div>
            <div className="text-sm text-gray-600 mt-1">評価結果</div>
          </div>
        </div>
      ) : null}

      <div className="flex gap-4">
        <a
          href={`/${companyId}/evaluations`}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          評価一覧を見る
        </a>
        {isAdminRole(auth.role) && (
          <button
            onClick={handleRecalculate}
            disabled={recalculating}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
          >
            {recalculating ? '再計算中...' : '全評価を再計算'}
          </button>
        )}
      </div>
    </div>
  );
}
