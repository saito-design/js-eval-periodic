'use client';

import { useState, useEffect } from 'react';
import { PageHeader, OpenInNewWindowButton } from '@/components/common';
import { RoleLabels, Role } from '@/lib/types';

/** ランキング項目 */
interface RankingEntry {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  role: Role;
  storeName: string;
  storeId: string;
  score: number;
  rank: string;
  position: number;
}

/** 役職別ランキング */
interface RoleRanking {
  total: RankingEntry[];
  quantitative: RankingEntry[];
  qualitative: RankingEntry[];
}

/** APIレスポンス */
interface RankingData {
  period: string;
  generatedAt: string;
  byRole: {
    manager: RoleRanking;
    assistant_manager: RoleRanking;
    staff: RoleRanking;
  };
  overall: {
    total: RankingEntry[];
    quantitative: RankingEntry[];
    qualitative: RankingEntry[];
  };
  availablePeriods: string[];
}

type RoleTab = 'all' | 'manager' | 'assistant_manager' | 'staff';
type EvalType = 'total' | 'quantitative' | 'qualitative';
type ViewMode = 'single' | 'comparison' | 'history';

const roleTabLabels: Record<RoleTab, string> = {
  all: '全体',
  manager: '店長',
  assistant_manager: '副店長',
  staff: '一般社員',
};

const evalTypeLabels: Record<EvalType, string> = {
  total: '総合',
  quantitative: '定量',
  qualitative: '定性',
};

export default function RankingsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<RankingData | null>(null);
  const [historyData, setHistoryData] = useState<Record<string, RankingData>>({});

  // UI状態
  const [roleTab, setRoleTab] = useState<RoleTab>('manager');
  const [evalType, setEvalType] = useState<EvalType>('total');
  const [viewMode, setViewMode] = useState<ViewMode>('single');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('2025_H2');
  const [comparePeriod, setComparePeriod] = useState<string>('');

  // データ読み込み
  useEffect(() => {
    loadData(selectedPeriod);
  }, [selectedPeriod]);

  // 比較期間のデータ読み込み
  useEffect(() => {
    if (comparePeriod && !historyData[comparePeriod]) {
      loadHistoryData(comparePeriod);
    }
  }, [comparePeriod]);

  const loadData = async (period: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/rankings?period=${period}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
        setHistoryData((prev) => ({ ...prev, [period]: result.data }));
        // 比較期間の初期値設定
        if (!comparePeriod && result.data.availablePeriods.length > 1) {
          setComparePeriod(result.data.availablePeriods[1] || '');
        }
      } else {
        setError(result.error);
      }
    } catch {
      setError('データの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const loadHistoryData = async (period: string) => {
    try {
      const response = await fetch(`/api/rankings?period=${period}`);
      const result = await response.json();
      if (result.success) {
        setHistoryData((prev) => ({ ...prev, [period]: result.data }));
      }
    } catch {
      // エラーは無視
    }
  };

  /** 現在のランキングを取得 */
  const getCurrentRanking = (): RankingEntry[] => {
    if (!data) return [];
    if (roleTab === 'all') {
      return data.overall[evalType];
    }
    return data.byRole[roleTab][evalType];
  };

  /** 比較期間のランキングを取得 */
  const getCompareRanking = (): RankingEntry[] => {
    const compareData = historyData[comparePeriod];
    if (!compareData) return [];
    if (roleTab === 'all') {
      return compareData.overall[evalType];
    }
    return compareData.byRole[roleTab][evalType];
  };

  /** 順位バッジの色 */
  const getPositionBadgeColor = (position: number): string => {
    if (position === 1) return 'bg-yellow-400 text-yellow-900';
    if (position === 2) return 'bg-gray-300 text-gray-800';
    if (position === 3) return 'bg-orange-400 text-orange-900';
    return 'bg-gray-100 text-gray-600';
  };

  /** ランクバッジの色 */
  const getRankBadgeColor = (rank: string): string => {
    switch (rank) {
      case 'S':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'A':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'B':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'C':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'D':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'E':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  /** 期間ラベル */
  const formatPeriodLabel = (period: string): string => {
    const match = period.match(/(\d{4})_H([12])/);
    if (!match) return period;
    return `${match[1]}${match[2] === '1' ? '上期' : '下期'}`;
  };

  /** 順位変動 */
  const getPositionChange = (
    employeeId: string,
    currentPos: number
  ): number | null => {
    const compareRanking = getCompareRanking();
    const prevEntry = compareRanking.find((e) => e.employeeId === employeeId);
    if (!prevEntry) return null;
    return prevEntry.position - currentPos; // 正なら上昇、負なら下降
  };

  /** 変動アイコン */
  const ChangeIndicator = ({ change }: { change: number | null }) => {
    if (change === null) return <span className="text-gray-400 text-xs">NEW</span>;
    if (change === 0) return <span className="text-gray-400">-</span>;
    if (change > 0)
      return <span className="text-green-600 font-medium">↑{change}</span>;
    return <span className="text-red-600 font-medium">↓{Math.abs(change)}</span>;
  };

  // 役職ごとの3区分一覧ビュー
  const ComparisonView = () => {
    if (!data) return null;

    const roles: ('manager' | 'assistant_manager' | 'staff')[] = [
      'manager',
      'assistant_manager',
      'staff',
    ];

    return (
      <div className="space-y-8">
        {roles.map((role) => (
          <div key={role} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">
              {RoleLabels[role]}
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {(['total', 'quantitative', 'qualitative'] as EvalType[]).map(
                (type) => (
                  <div key={type} className="border border-gray-200 rounded-lg">
                    <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
                      <h4 className="font-medium text-gray-700">
                        {evalTypeLabels[type]}
                      </h4>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {data.byRole[role][type].slice(0, 5).map((item) => (
                        <div
                          key={item.employeeId}
                          className="px-3 py-2 flex items-center gap-2"
                        >
                          <span
                            className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${getPositionBadgeColor(
                              item.position
                            )}`}
                          >
                            {item.position}
                          </span>
                          <span className="flex-1 text-sm truncate">
                            {item.employeeName}
                          </span>
                          <span className="text-sm text-gray-500">
                            {item.score.toFixed(1)}
                          </span>
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded border ${getRankBadgeColor(
                              item.rank
                            )}`}
                          >
                            {item.rank}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // 推移ビュー
  const HistoryView = () => {
    if (!data) return null;

    const currentRanking = getCurrentRanking();
    const compareRanking = getCompareRanking();

    return (
      <div className="space-y-4">
        {/* 期間選択 */}
        <div className="flex items-center gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div>
            <label className="block text-xs text-gray-500 mb-1">現在期間</label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1.5 text-sm"
            >
              {data.availablePeriods.map((p) => (
                <option key={p} value={p}>
                  {formatPeriodLabel(p)}
                </option>
              ))}
            </select>
          </div>
          <div className="text-gray-400">vs</div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">比較期間</label>
            <select
              value={comparePeriod}
              onChange={(e) => setComparePeriod(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1.5 text-sm"
            >
              {data.availablePeriods
                .filter((p) => p !== selectedPeriod)
                .map((p) => (
                  <option key={p} value={p}>
                    {formatPeriodLabel(p)}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* ランキング表示 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-20">
                  順位
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  社員
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  店舗
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  スコア
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  ランク
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  変動
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentRanking.map((item) => {
                const change = getPositionChange(item.employeeId, item.position);
                return (
                  <tr key={item.employeeId} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${getPositionBadgeColor(
                          item.position
                        )}`}
                      >
                        {item.position}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">
                        {item.employeeName}
                      </div>
                      <div className="text-xs text-gray-500">
                        {RoleLabels[item.role]}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {item.storeName}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium">
                      {item.score.toFixed(1)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded border text-sm font-medium ${getRankBadgeColor(
                          item.rank
                        )}`}
                      >
                        {item.rank}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <ChangeIndicator change={change} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // 単一ビュー（通常表示）
  const SingleView = () => {
    const items = getCurrentRanking();

    return (
      <>
        {/* PC: テーブル表示 */}
        <div className="hidden md:block bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-20">
                  順位
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  社員
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  店舗
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  スコア
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  ランク
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.map((item) => (
                <tr key={item.employeeId} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${getPositionBadgeColor(
                        item.position
                      )}`}
                    >
                      {item.position}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-900">
                      {item.employeeName}
                    </div>
                    <div className="text-xs text-gray-500">
                      {item.employeeCode}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {item.storeName}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium">
                    {item.score.toFixed(1)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded border text-sm font-medium ${getRankBadgeColor(
                        item.rank
                      )}`}
                    >
                      {item.rank}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* モバイル: カード表示 */}
        <div className="md:hidden space-y-3">
          {items.map((item) => (
            <div
              key={item.employeeId}
              className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex items-center gap-4"
            >
              <span
                className={`flex-shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-full text-lg font-bold ${getPositionBadgeColor(
                  item.position
                )}`}
              >
                {item.position}
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900">{item.employeeName}</div>
                <div className="text-sm text-gray-500 truncate">
                  {item.storeName}
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium">{item.score.toFixed(1)}</div>
                <span
                  className={`inline-block px-2 py-0.5 rounded border text-xs font-medium ${getRankBadgeColor(
                    item.rank
                  )}`}
                >
                  {item.rank}
                </span>
              </div>
            </div>
          ))}
        </div>

        {items.length === 0 && (
          <div className="text-center py-12 text-gray-500">データがありません</div>
        )}
      </>
    );
  };

  return (
    <div>
      <PageHeader
        title="ランキング"
        description="役職別・評価タイプ別の順位を確認"
        actions={
          <OpenInNewWindowButton url="/rankings" label="別ウィンドウで開く" />
        }
      />

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
          {error}
        </div>
      )}

      {/* ビューモード切り替え */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setViewMode('single')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            viewMode === 'single'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          ランキング
        </button>
        <button
          onClick={() => setViewMode('comparison')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            viewMode === 'comparison'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          役職別一覧
        </button>
        <button
          onClick={() => setViewMode('history')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            viewMode === 'history'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          推移
        </button>
      </div>

      {/* 役職タブ（単一・推移ビュー用） */}
      {(viewMode === 'single' || viewMode === 'history') && (
        <div className="border-b border-gray-200 mb-4">
          <nav className="flex space-x-4">
            {(Object.keys(roleTabLabels) as RoleTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setRoleTab(tab)}
                className={`py-2 px-4 text-sm font-medium border-b-2 transition-colors ${
                  roleTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {roleTabLabels[tab]}
              </button>
            ))}
          </nav>
        </div>
      )}

      {/* 評価タイプ切り替え（単一・推移ビュー用） */}
      {(viewMode === 'single' || viewMode === 'history') && (
        <div className="mb-6 flex gap-2">
          {(Object.keys(evalTypeLabels) as EvalType[]).map((type) => (
            <button
              key={type}
              onClick={() => setEvalType(type)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                evalType === type
                  ? 'bg-gray-800 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {evalTypeLabels[type]}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600"></div>
          <p className="mt-2 text-gray-500">読み込み中...</p>
        </div>
      ) : (
        <>
          {viewMode === 'single' && <SingleView />}
          {viewMode === 'comparison' && <ComparisonView />}
          {viewMode === 'history' && <HistoryView />}
        </>
      )}
    </div>
  );
}
