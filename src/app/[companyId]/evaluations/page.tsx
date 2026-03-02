'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PageHeader, StatusBadge, OpenInNewWindowButton } from '@/components/common';
import { Role, RoleLabels } from '@/lib/types';

interface EvaluationItem {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  role: Role;
  storeId: string;
  storeName: string;
  totalScore: number;
  quantitativeScore: number;
  qualitativeScore: number;
  rank: string;
  overallRank: number;
  roleRank: number;
  promotionStatus: string;
}

const rankColors: Record<string, string> = {
  S: '#7c3aed',
  A: '#2563eb',
  B: '#16a34a',
  C: '#dc2626',
};

const promotionLabels: Record<string, { label: string; color: string }> = {
  promote: { label: '昇格候補', color: '#16a34a' },
  demote: { label: '降格候補', color: '#dc2626' },
  keep: { label: '現状維持', color: '#6b7280' },
};

export default function EvaluationsPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<EvaluationItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  // フィルター
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [rankFilter, setRankFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch('/api/evaluations?period=2025_H2');
        const result = await response.json();

        if (result.success) {
          setItems(result.data.items);
        } else {
          setError(result.error);
        }
      } catch (err) {
        setError('データの読み込みに失敗しました');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // フィルタリング
  const filteredItems = items.filter((item) => {
    if (roleFilter !== 'all' && item.role !== roleFilter) return false;
    if (rankFilter !== 'all' && item.rank !== rankFilter) return false;
    if (
      searchQuery &&
      !item.employeeName.includes(searchQuery) &&
      !item.employeeCode.includes(searchQuery)
    ) {
      return false;
    }
    return true;
  });

  return (
    <div>
      <PageHeader
        title="評価一覧"
        description="社員ごとの評価結果を確認"
        actions={
          <OpenInNewWindowButton
            url="/evaluations"
            label="別ウィンドウで開く"
          />
        }
      />

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
          {error}
        </div>
      )}

      {/* フィルター */}
      <div className="mb-6 flex flex-wrap gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            役職
          </label>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="all">すべて</option>
            <option value="manager">店長</option>
            <option value="assistant_manager">副店長</option>
            <option value="staff">一般社員</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ランク
          </label>
          <select
            value={rankFilter}
            onChange={(e) => setRankFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="all">すべて</option>
            <option value="S">S</option>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            検索
          </label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="氏名または社員番号"
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600"></div>
          <p className="mt-2 text-gray-500">読み込み中...</p>
        </div>
      ) : (
        <>
          {/* PC: テーブル表示 */}
          <div className="hidden md:block bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    順位
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    社員
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    役職
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    店舗
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    総合点
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    ランク
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    昇降格
                  </th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredItems.map((item) => (
                  <tr key={item.employeeId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {item.overallRank}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">
                        {item.employeeName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {item.employeeCode}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {RoleLabels[item.role]}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {item.storeName}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                      {item.totalScore}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge
                        label={item.rank}
                        color={rankColors[item.rank]}
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge
                        label={promotionLabels[item.promotionStatus]?.label}
                        color={promotionLabels[item.promotionStatus]?.color}
                        variant="outline"
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/evaluations/${item.employeeId}`}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        詳細
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* モバイル: カード表示 */}
          <div className="md:hidden space-y-4">
            {filteredItems.map((item) => (
              <div
                key={item.employeeId}
                className="bg-white p-4 rounded-lg shadow-sm border border-gray-200"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-medium text-gray-900">
                      {item.employeeName}
                    </div>
                    <div className="text-sm text-gray-500">
                      {item.employeeCode} / {RoleLabels[item.role]}
                    </div>
                  </div>
                  <StatusBadge
                    label={item.rank}
                    color={rankColors[item.rank]}
                  />
                </div>
                <div className="flex justify-between items-center mt-3">
                  <div className="text-sm text-gray-500">
                    総合点: <span className="font-medium text-gray-900">{item.totalScore}</span>
                    <span className="ml-2">順位: {item.overallRank}位</span>
                  </div>
                  <Link
                    href={`/evaluations/${item.employeeId}`}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    詳細
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {filteredItems.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              該当するデータがありません
            </div>
          )}
        </>
      )}
    </div>
  );
}
