'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/common';
import { RankThreshold, RankCode, PromotionRule } from '@/lib/types';

type TabType = 'rank' | 'promotion';

interface CrossMatrixEntry {
  quantitativeRank: RankCode;
  qualitativeRank: RankCode;
  finalRank: RankCode;
}

interface RankRulesData {
  crossMatrix: CrossMatrixEntry[];
  thresholds: {
    quantitative: RankThreshold[];
    managerQualitative: RankThreshold[];
    staffQualitative: RankThreshold[];
  };
  description?: string;
}

interface PromotionRulesData {
  rules: PromotionRule[];
  descriptions: string[];
  salaryAdjustment: {
    manager: { rankA: number; rankC: number };
    staff: { rankA: number };
  };
}

// ランクシミュレーション用
interface RankSimulationResult {
  employeeId: string;
  employeeName: string;
  role: string;
  beforeRank: RankCode;
  afterRank: RankCode;
  rankChange: number;
}

interface RankSimulationSummary {
  totalEmployees: number;
  changedEmployees: number;
  rankUpCount: number;
  rankDownCount: number;
  noChangeCount: number;
}

interface RankSimulationData {
  summary: RankSimulationSummary;
  changedResults: RankSimulationResult[];
  allResults: RankSimulationResult[];
}

// 昇降格シミュレーション用
interface PromotionSimulationResult {
  employeeId: string;
  employeeName: string;
  role: string;
  currentRank: RankCode;
  previousRank: RankCode;
  beforeLevel: number;
  afterLevel: number;
  levelChange: number;
}

interface PromotionSimulationSummary {
  totalEmployees: number;
  changedEmployees: number;
  morePromotionCount: number;
  lessPromotionCount: number;
  noChangeCount: number;
}

interface PromotionSimulationData {
  summary: PromotionSimulationSummary;
  changedResults: PromotionSimulationResult[];
  allResults: PromotionSimulationResult[];
  ruleChanges: Array<{
    prevRank: RankCode;
    nextRank: RankCode;
    beforeLevel: number;
    afterLevel: number;
  }>;
}

const rankColors: Record<RankCode, string> = {
  S: '#7c3aed',
  A: '#2563eb',
  B: '#16a34a',
  C: '#eab308',
  D: '#dc2626',
  E: '#6b7280',
};

const roleLabels: Record<string, string> = {
  manager: '店長',
  assistant_manager: '副店長',
  staff: '一般',
};

const ranks: RankCode[] = ['S', 'A', 'B', 'C', 'D', 'E'];

export default function RulesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('rank');
  const [rankRules, setRankRules] = useState<RankRulesData | null>(null);
  const [promotionRules, setPromotionRules] = useState<PromotionRulesData | null>(null);

  // ランク編集用
  const [isEditingRank, setIsEditingRank] = useState(false);
  const [editThresholds, setEditThresholds] = useState<RankRulesData['thresholds'] | null>(null);
  const [editCrossMatrix, setEditCrossMatrix] = useState<CrossMatrixEntry[] | null>(null);
  const [rankChangeReason, setRankChangeReason] = useState('');
  const [rankSimulationData, setRankSimulationData] = useState<RankSimulationData | null>(null);
  const [showRankSimulation, setShowRankSimulation] = useState(false);
  const [rankSimViewTab, setRankSimViewTab] = useState<'changed' | 'all'>('changed');

  // 昇降格編集用
  const [isEditingPromotion, setIsEditingPromotion] = useState(false);
  const [editPromotionRules, setEditPromotionRules] = useState<PromotionRule[] | null>(null);
  const [promotionChangeReason, setPromotionChangeReason] = useState('');
  const [promotionSimulationData, setPromotionSimulationData] = useState<PromotionSimulationData | null>(null);
  const [showPromotionSimulation, setShowPromotionSimulation] = useState(false);
  const [promotionSimViewTab, setPromotionSimViewTab] = useState<'changed' | 'all' | 'rules'>('rules');

  useEffect(() => {
    const loadRules = async () => {
      try {
        const [rankRes, promotionRes] = await Promise.all([
          fetch('/api/rules/rank'),
          fetch('/api/rules/promotion'),
        ]);
        const rankData = await rankRes.json();
        const promotionData = await promotionRes.json();

        if (rankData.success) {
          setRankRules(rankData.data);
        }
        if (promotionData.success) {
          setPromotionRules(promotionData.data);
        }
      } catch {
        setError('データの読み込みに失敗しました');
      } finally {
        setLoading(false);
      }
    };
    loadRules();
  }, []);

  // ========== ランク編集関数 ==========
  const startEditingRank = () => {
    if (rankRules) {
      setEditThresholds(JSON.parse(JSON.stringify(rankRules.thresholds)));
      setEditCrossMatrix(JSON.parse(JSON.stringify(rankRules.crossMatrix)));
      setIsEditingRank(true);
      setError(null);
      setSuccess(null);
      setRankSimulationData(null);
      setShowRankSimulation(false);
    }
  };

  const cancelEditingRank = () => {
    setIsEditingRank(false);
    setEditThresholds(null);
    setEditCrossMatrix(null);
    setRankChangeReason('');
    setRankSimulationData(null);
    setShowRankSimulation(false);
  };

  const handleThresholdChange = (
    type: 'quantitative' | 'managerQualitative' | 'staffQualitative',
    rank: RankCode,
    value: number
  ) => {
    if (!editThresholds) return;
    setEditThresholds({
      ...editThresholds,
      [type]: editThresholds[type].map((t) =>
        t.rank === rank ? { ...t, minScore: value } : t
      ),
    });
    setRankSimulationData(null);
    setShowRankSimulation(false);
  };

  const handleCrossMatrixChange = (
    quantRank: RankCode,
    qualRank: RankCode,
    newFinalRank: RankCode
  ) => {
    if (!editCrossMatrix) return;
    setEditCrossMatrix(
      editCrossMatrix.map((entry) =>
        entry.quantitativeRank === quantRank && entry.qualitativeRank === qualRank
          ? { ...entry, finalRank: newFinalRank }
          : entry
      )
    );
    setRankSimulationData(null);
    setShowRankSimulation(false);
  };

  const runRankSimulation = async () => {
    if (!editThresholds || !editCrossMatrix) return;
    setSimulating(true);
    setError(null);
    try {
      const res = await fetch('/api/rules/rank/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thresholds: editThresholds, crossMatrix: editCrossMatrix }),
      });
      const data = await res.json();
      if (data.success) {
        setRankSimulationData(data.data);
        setShowRankSimulation(true);
      } else {
        setError(data.error || 'シミュレーションに失敗しました');
      }
    } catch {
      setError('シミュレーション中にエラーが発生しました');
    } finally {
      setSimulating(false);
    }
  };

  const adoptRankChanges = async () => {
    if (!editThresholds || !editCrossMatrix) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/rules/rank', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thresholds: editThresholds,
          crossMatrix: editCrossMatrix,
          reason: rankChangeReason || 'ランク設定を変更',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setRankRules(data.data);
        cancelEditingRank();
        setSuccess('変更を採用しました（ログに記録済み）');
      } else {
        setError(data.error || '保存に失敗しました');
      }
    } catch {
      setError('保存中にエラーが発生しました');
    } finally {
      setSaving(false);
    }
  };

  // ========== 昇降格編集関数 ==========
  const startEditingPromotion = () => {
    if (promotionRules) {
      setEditPromotionRules(JSON.parse(JSON.stringify(promotionRules.rules)));
      setIsEditingPromotion(true);
      setError(null);
      setSuccess(null);
      setPromotionSimulationData(null);
      setShowPromotionSimulation(false);
    }
  };

  const cancelEditingPromotion = () => {
    setIsEditingPromotion(false);
    setEditPromotionRules(null);
    setPromotionChangeReason('');
    setPromotionSimulationData(null);
    setShowPromotionSimulation(false);
  };

  const handlePromotionRuleChange = (
    prevRank: RankCode,
    nextRank: RankCode,
    level: number
  ) => {
    if (!editPromotionRules) return;
    setEditPromotionRules(
      editPromotionRules.map((rule) =>
        rule.currentRank === prevRank && rule.nextRank === nextRank
          ? { ...rule, promotionLevel: level }
          : rule
      )
    );
    setPromotionSimulationData(null);
    setShowPromotionSimulation(false);
  };

  const getEditablePromotionLevel = (prevRank: RankCode, nextRank: RankCode): number => {
    if (editPromotionRules) {
      const rule = editPromotionRules.find(
        (r) => r.currentRank === prevRank && r.nextRank === nextRank
      );
      return rule?.promotionLevel ?? 0;
    }
    return 0;
  };

  const runPromotionSimulation = async () => {
    if (!editPromotionRules) return;
    setSimulating(true);
    setError(null);
    try {
      const res = await fetch('/api/rules/promotion/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rules: editPromotionRules }),
      });
      const data = await res.json();
      if (data.success) {
        setPromotionSimulationData(data.data);
        setShowPromotionSimulation(true);
      } else {
        setError(data.error || 'シミュレーションに失敗しました');
      }
    } catch {
      setError('シミュレーション中にエラーが発生しました');
    } finally {
      setSimulating(false);
    }
  };

  const adoptPromotionChanges = async () => {
    if (!editPromotionRules) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/rules/promotion', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rules: editPromotionRules,
          reason: promotionChangeReason || '昇降格設定を変更',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPromotionRules(data.data);
        cancelEditingPromotion();
        setSuccess('変更を採用しました（ログに記録済み）');
      } else {
        setError(data.error || '保存に失敗しました');
      }
    } catch {
      setError('保存中にエラーが発生しました');
    } finally {
      setSaving(false);
    }
  };

  // ========== 共通関数 ==========
  const tabs: { key: TabType; label: string }[] = [
    { key: 'rank', label: 'ランク基準' },
    { key: 'promotion', label: '昇降格テーブル' },
  ];

  const getPromotionLevel = (prev: RankCode, current: RankCode): number => {
    const rule = promotionRules?.rules.find(
      (r) => r.currentRank === prev && r.nextRank === current
    );
    return rule?.promotionLevel ?? 0;
  };

  const getPromotionCellStyle = (level: number) => {
    if (level >= 2) return 'bg-purple-100 text-purple-700 font-bold';
    if (level === 1) return 'bg-blue-100 text-blue-700 font-bold';
    if (level === -1) return 'bg-orange-100 text-orange-700 font-bold';
    if (level <= -2) return 'bg-red-100 text-red-700 font-bold';
    return 'bg-gray-50 text-gray-400';
  };

  const getPromotionLabel = (level: number) => {
    if (level >= 2) return `+${level}`;
    if (level === 1) return '+1';
    if (level === -1) return '-1';
    if (level <= -2) return `${level}`;
    return '-';
  };

  const getEditableFinalRank = (quantRank: RankCode, qualRank: RankCode): RankCode => {
    if (editCrossMatrix) {
      const entry = editCrossMatrix.find(
        (m) => m.quantitativeRank === quantRank && m.qualitativeRank === qualRank
      );
      return entry?.finalRank || 'E';
    }
    return 'E';
  };

  // ========== 閾値テーブル ==========
  const renderEditableThresholdTable = (
    title: string,
    type: 'quantitative' | 'managerQualitative' | 'staffQualitative',
    thresholds: RankThreshold[]
  ) => (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <h3 className="font-bold text-gray-800">{title}</h3>
      </div>
      <table className="min-w-full">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="py-2 px-4 text-left text-sm font-medium text-gray-600">ランク</th>
            <th className="py-2 px-4 text-right text-sm font-medium text-gray-600">最低点</th>
          </tr>
        </thead>
        <tbody>
          {thresholds.map((t, idx) => (
            <tr key={t.rank} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="py-2 px-4">
                <span
                  className="inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold text-white"
                  style={{ backgroundColor: rankColors[t.rank] }}
                >
                  {t.rank}
                </span>
              </td>
              <td className="py-2 px-4 text-right">
                {isEditingRank && editThresholds ? (
                  <input
                    type="number"
                    value={editThresholds[type].find((et) => et.rank === t.rank)?.minScore ?? 0}
                    onChange={(e) => handleThresholdChange(type, t.rank, parseInt(e.target.value) || 0)}
                    className="w-24 px-2 py-1 text-right border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <span className="font-medium text-gray-900">{t.minScore}点以上</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // ========== ランクシミュレーション結果モーダル ==========
  const renderRankSimulationResults = () => {
    if (!rankSimulationData) return null;
    const { summary, changedResults, allResults } = rankSimulationData;
    const displayResults = rankSimViewTab === 'changed' ? changedResults : allResults;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-bold text-gray-800">ランク設定シミュレーション結果</h2>
          </div>
          <div className="p-6 overflow-y-auto flex-1">
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-100 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-gray-800">{summary.totalEmployees}</div>
                <div className="text-sm text-gray-600">対象社員</div>
              </div>
              <div className="bg-blue-100 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-700">{summary.rankUpCount}</div>
                <div className="text-sm text-blue-600">昇格</div>
              </div>
              <div className="bg-orange-100 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-orange-700">{summary.rankDownCount}</div>
                <div className="text-sm text-orange-600">降格</div>
              </div>
              <div className="bg-gray-100 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-gray-600">{summary.noChangeCount}</div>
                <div className="text-sm text-gray-500">変更なし</div>
              </div>
            </div>
            <div className="border-b border-gray-200 mb-4">
              <nav className="flex space-x-4">
                <button
                  onClick={() => setRankSimViewTab('changed')}
                  className={`py-2 px-4 text-sm font-medium border-b-2 ${rankSimViewTab === 'changed' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'}`}
                >
                  変動あり（{changedResults.length}名）
                </button>
                <button
                  onClick={() => setRankSimViewTab('all')}
                  className={`py-2 px-4 text-sm font-medium border-b-2 ${rankSimViewTab === 'all' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'}`}
                >
                  全員一覧（{allResults.length}名）
                </button>
              </nav>
            </div>
            {displayResults.length > 0 ? (
              <div className="border border-gray-200 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                <table className="min-w-full">
                  <thead className="sticky top-0 bg-gray-50">
                    <tr className="border-b border-gray-200">
                      <th className="py-2 px-4 text-left text-sm font-medium text-gray-600">社員名</th>
                      <th className="py-2 px-4 text-center text-sm font-medium text-gray-600">役職</th>
                      <th className="py-2 px-4 text-center text-sm font-medium text-gray-600">変更前</th>
                      <th className="py-2 px-4 text-center text-sm font-medium text-gray-600">→</th>
                      <th className="py-2 px-4 text-center text-sm font-medium text-gray-600">変更後</th>
                      <th className="py-2 px-4 text-center text-sm font-medium text-gray-600">変動</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayResults.map((result, idx) => (
                      <tr key={result.employeeId} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${result.rankChange !== 0 ? 'font-medium' : ''}`}>
                        <td className="py-2 px-4 text-sm text-gray-900">{result.employeeName}</td>
                        <td className="py-2 px-4 text-center text-sm text-gray-600">{roleLabels[result.role] || result.role}</td>
                        <td className="py-2 px-4 text-center">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold text-white" style={{ backgroundColor: rankColors[result.beforeRank] }}>{result.beforeRank}</span>
                        </td>
                        <td className="py-2 px-4 text-center text-gray-400">→</td>
                        <td className="py-2 px-4 text-center">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold text-white" style={{ backgroundColor: rankColors[result.afterRank] }}>{result.afterRank}</span>
                        </td>
                        <td className="py-2 px-4 text-center">
                          {result.rankChange !== 0 ? (
                            <span className={`text-sm font-bold ${result.rankChange > 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                              {result.rankChange > 0 ? `+${result.rankChange}` : result.rankChange}
                            </span>
                          ) : <span className="text-sm text-gray-400">-</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">{rankSimViewTab === 'changed' ? 'ランク変動がある社員はいません' : '対象社員がいません'}</div>
            )}
          </div>
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
            <input
              type="text"
              placeholder="変更理由を入力（任意）"
              value={rankChangeReason}
              onChange={(e) => setRankChangeReason(e.target.value)}
              className="flex-1 mr-4 px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
            <div className="flex gap-2">
              <button onClick={() => { setShowRankSimulation(false); setRankSimulationData(null); }} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                破棄して編集に戻る
              </button>
              <button onClick={adoptRankChanges} disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50">
                {saving ? '保存中...' : '採用して反映'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ========== 昇降格シミュレーション結果モーダル ==========
  const renderPromotionSimulationResults = () => {
    if (!promotionSimulationData) return null;
    const { summary, changedResults, allResults, ruleChanges } = promotionSimulationData;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-bold text-gray-800">昇降格設定シミュレーション結果</h2>
          </div>
          <div className="p-6 overflow-y-auto flex-1">
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-100 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-gray-800">{summary.totalEmployees}</div>
                <div className="text-sm text-gray-600">対象社員</div>
              </div>
              <div className="bg-blue-100 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-700">{summary.morePromotionCount}</div>
                <div className="text-sm text-blue-600">昇格しやすく</div>
              </div>
              <div className="bg-orange-100 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-orange-700">{summary.lessPromotionCount}</div>
                <div className="text-sm text-orange-600">降格しやすく</div>
              </div>
              <div className="bg-gray-100 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-gray-600">{summary.noChangeCount}</div>
                <div className="text-sm text-gray-500">変更なし</div>
              </div>
            </div>
            <div className="border-b border-gray-200 mb-4">
              <nav className="flex space-x-4">
                <button
                  onClick={() => setPromotionSimViewTab('rules')}
                  className={`py-2 px-4 text-sm font-medium border-b-2 ${promotionSimViewTab === 'rules' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'}`}
                >
                  ルール変更（{ruleChanges.length}箇所）
                </button>
                <button
                  onClick={() => setPromotionSimViewTab('changed')}
                  className={`py-2 px-4 text-sm font-medium border-b-2 ${promotionSimViewTab === 'changed' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'}`}
                >
                  影響あり（{changedResults.length}名）
                </button>
                <button
                  onClick={() => setPromotionSimViewTab('all')}
                  className={`py-2 px-4 text-sm font-medium border-b-2 ${promotionSimViewTab === 'all' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'}`}
                >
                  全員一覧（{allResults.length}名）
                </button>
              </nav>
            </div>

            {promotionSimViewTab === 'rules' && (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr className="border-b border-gray-200">
                      <th className="py-2 px-4 text-center text-sm font-medium text-gray-600">前期ランク</th>
                      <th className="py-2 px-4 text-center text-sm font-medium text-gray-600">今期ランク</th>
                      <th className="py-2 px-4 text-center text-sm font-medium text-gray-600">変更前</th>
                      <th className="py-2 px-4 text-center text-sm font-medium text-gray-600">→</th>
                      <th className="py-2 px-4 text-center text-sm font-medium text-gray-600">変更後</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ruleChanges.map((change, idx) => (
                      <tr key={`${change.prevRank}-${change.nextRank}`} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="py-2 px-4 text-center">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold text-white" style={{ backgroundColor: rankColors[change.prevRank] }}>{change.prevRank}</span>
                        </td>
                        <td className="py-2 px-4 text-center">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold text-white" style={{ backgroundColor: rankColors[change.nextRank] }}>{change.nextRank}</span>
                        </td>
                        <td className="py-2 px-4 text-center font-medium">{getPromotionLabel(change.beforeLevel)}</td>
                        <td className="py-2 px-4 text-center text-gray-400">→</td>
                        <td className="py-2 px-4 text-center font-medium">{getPromotionLabel(change.afterLevel)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {ruleChanges.length === 0 && <div className="text-center py-8 text-gray-500">ルール変更はありません</div>}
              </div>
            )}

            {(promotionSimViewTab === 'changed' || promotionSimViewTab === 'all') && (
              <div className="border border-gray-200 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                <table className="min-w-full">
                  <thead className="sticky top-0 bg-gray-50">
                    <tr className="border-b border-gray-200">
                      <th className="py-2 px-4 text-left text-sm font-medium text-gray-600">社員名</th>
                      <th className="py-2 px-4 text-center text-sm font-medium text-gray-600">役職</th>
                      <th className="py-2 px-4 text-center text-sm font-medium text-gray-600">今期ランク</th>
                      <th className="py-2 px-4 text-center text-sm font-medium text-gray-600">変更前</th>
                      <th className="py-2 px-4 text-center text-sm font-medium text-gray-600">→</th>
                      <th className="py-2 px-4 text-center text-sm font-medium text-gray-600">変更後</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(promotionSimViewTab === 'changed' ? changedResults : allResults).map((result, idx) => (
                      <tr key={result.employeeId} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${result.levelChange !== 0 ? 'font-medium' : ''}`}>
                        <td className="py-2 px-4 text-sm text-gray-900">{result.employeeName}</td>
                        <td className="py-2 px-4 text-center text-sm text-gray-600">{roleLabels[result.role] || result.role}</td>
                        <td className="py-2 px-4 text-center">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold text-white" style={{ backgroundColor: rankColors[result.currentRank] }}>{result.currentRank}</span>
                        </td>
                        <td className="py-2 px-4 text-center font-medium">{getPromotionLabel(result.beforeLevel)}</td>
                        <td className="py-2 px-4 text-center text-gray-400">→</td>
                        <td className="py-2 px-4 text-center font-medium">{getPromotionLabel(result.afterLevel)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(promotionSimViewTab === 'changed' ? changedResults : allResults).length === 0 && (
                  <div className="text-center py-8 text-gray-500">{promotionSimViewTab === 'changed' ? '影響のある社員はいません' : '対象社員がいません'}</div>
                )}
              </div>
            )}
          </div>
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
            <input
              type="text"
              placeholder="変更理由を入力（任意）"
              value={promotionChangeReason}
              onChange={(e) => setPromotionChangeReason(e.target.value)}
              className="flex-1 mr-4 px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
            <div className="flex gap-2">
              <button onClick={() => { setShowPromotionSimulation(false); setPromotionSimulationData(null); }} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                破棄して編集に戻る
              </button>
              <button onClick={adoptPromotionChanges} disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50">
                {saving ? '保存中...' : '採用して反映'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <PageHeader title="基準設定" description="ランク基準と昇降格テーブル" />

      {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">{error}</div>}
      {success && <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md text-green-700">{success}</div>}

      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-4">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`py-2 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.key ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600"></div>
          <p className="mt-2 text-gray-500">読み込み中...</p>
        </div>
      ) : activeTab === 'rank' && rankRules && rankRules.crossMatrix ? (
        <div className="space-y-6">
          <div className="flex justify-end gap-2">
            {isEditingRank ? (
              <>
                <button onClick={cancelEditingRank} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">キャンセル</button>
                <button onClick={runRankSimulation} disabled={simulating} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50">
                  {simulating ? 'シミュレーション中...' : 'シミュレーション実行'}
                </button>
              </>
            ) : (
              <button onClick={startEditingRank} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">編集</button>
            )}
          </div>

          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <h3 className="font-bold text-gray-800">総合ランク決定マトリックス（定量×定性）</h3>
              <p className="text-sm text-gray-500 mt-1">
                定量ランクと定性ランクの組み合わせで総合ランクが決定します（全職種共通）
                {isEditingRank && <span className="text-blue-600 ml-2">※ クリックしてランクを変更</span>}
              </p>
            </div>
            <div className="p-4 overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr>
                    <th className="py-2 px-3 text-center text-sm font-medium text-gray-600 border-b border-r border-gray-200">定量 ＼ 定性</th>
                    {ranks.map((rank) => (
                      <th key={rank} className="py-2 px-4 text-center text-sm font-bold border-b border-gray-200" style={{ color: rankColors[rank] }}>{rank}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ranks.map((quantRank) => (
                    <tr key={quantRank}>
                      <td className="py-2 px-3 text-center text-sm font-bold border-r border-gray-200" style={{ color: rankColors[quantRank] }}>{quantRank}</td>
                      {ranks.map((qualRank) => {
                        const entry = rankRules.crossMatrix.find((m) => m.quantitativeRank === quantRank && m.qualitativeRank === qualRank);
                        const displayRank = isEditingRank ? getEditableFinalRank(quantRank, qualRank) : entry?.finalRank || '-';
                        return (
                          <td key={qualRank} className="py-2 px-4 text-center">
                            {isEditingRank ? (
                              <select
                                value={displayRank}
                                onChange={(e) => handleCrossMatrixChange(quantRank, qualRank, e.target.value as RankCode)}
                                className="w-12 h-8 text-center font-bold rounded border border-gray-300"
                                style={{ backgroundColor: rankColors[displayRank as RankCode], color: 'white' }}
                              >
                                {ranks.map((r) => (<option key={r} value={r} style={{ backgroundColor: 'white', color: 'black' }}>{r}</option>))}
                              </select>
                            ) : (
                              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold text-white" style={{ backgroundColor: displayRank !== '-' ? rankColors[displayRank as RankCode] : '#e5e7eb' }}>{displayRank}</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-4">定量評価ランク閾値（全職種共通）</h2>
            <div className="max-w-md">{renderEditableThresholdTable('定量スコア', 'quantitative', rankRules.thresholds.quantitative)}</div>
          </div>

          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-4">定性評価ランク閾値</h2>
            <div className="grid grid-cols-2 gap-4">
              {renderEditableThresholdTable('店長・副店長（定性スコア）', 'managerQualitative', rankRules.thresholds.managerQualitative)}
              {renderEditableThresholdTable('一般社員（定性スコア）', 'staffQualitative', rankRules.thresholds.staffQualitative)}
            </div>
          </div>
        </div>
      ) : activeTab === 'promotion' && promotionRules ? (
        <div className="space-y-6">
          <div className="flex justify-end gap-2">
            {isEditingPromotion ? (
              <>
                <button onClick={cancelEditingPromotion} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">キャンセル</button>
                <button onClick={runPromotionSimulation} disabled={simulating} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50">
                  {simulating ? 'シミュレーション中...' : 'シミュレーション実行'}
                </button>
              </>
            ) : (
              <button onClick={startEditingPromotion} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">編集</button>
            )}
          </div>

          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <h3 className="font-bold text-gray-800">昇降格テーブル（2期間ランク組み合わせ）</h3>
              {isEditingPromotion && <p className="text-sm text-blue-600 mt-1">※ クリックして昇降格レベルを変更</p>}
            </div>
            <div className="p-4 overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr>
                    <th className="py-2 px-3 text-center text-sm font-medium text-gray-600 border-b border-r border-gray-200">前期 ＼ 今期</th>
                    {ranks.map((rank) => (
                      <th key={rank} className="py-2 px-4 text-center text-sm font-bold border-b border-gray-200" style={{ color: rankColors[rank] }}>{rank}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ranks.map((prevRank) => (
                    <tr key={prevRank}>
                      <td className="py-2 px-3 text-center text-sm font-bold border-r border-gray-200" style={{ color: rankColors[prevRank] }}>{prevRank}</td>
                      {ranks.map((currentRank) => {
                        const level = isEditingPromotion ? getEditablePromotionLevel(prevRank, currentRank) : getPromotionLevel(prevRank, currentRank);
                        return (
                          <td key={currentRank} className={`py-2 px-4 text-center text-sm ${getPromotionCellStyle(level)}`}>
                            {isEditingPromotion ? (
                              <select
                                value={level}
                                onChange={(e) => handlePromotionRuleChange(prevRank, currentRank, parseInt(e.target.value))}
                                className="w-16 h-8 text-center font-bold rounded border border-gray-300 bg-white"
                              >
                                <option value={2}>+2</option>
                                <option value={1}>+1</option>
                                <option value={0}>-</option>
                                <option value={-1}>-1</option>
                                <option value={-2}>-2</option>
                              </select>
                            ) : (
                              getPromotionLabel(level)
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-gray-200">
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2"><span className="inline-block w-6 h-6 bg-purple-100 rounded"></span><span className="text-gray-600">+2: 2段階昇格</span></div>
                <div className="flex items-center gap-2"><span className="inline-block w-6 h-6 bg-blue-100 rounded"></span><span className="text-gray-600">+1: 1段階昇格</span></div>
                <div className="flex items-center gap-2"><span className="inline-block w-6 h-6 bg-gray-50 border border-gray-200 rounded"></span><span className="text-gray-600">-: 維持</span></div>
                <div className="flex items-center gap-2"><span className="inline-block w-6 h-6 bg-orange-100 rounded"></span><span className="text-gray-600">-1: 1段階降格</span></div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <h3 className="font-bold text-gray-800">給与調整ルール</h3>
            </div>
            <div className="p-4">
              <ul className="space-y-2">
                {promotionRules.descriptions.map((desc, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-gray-700"><span className="text-blue-500 mt-1">•</span>{desc}</li>
                ))}
              </ul>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-800 mb-2">店長・副店長</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between"><span className="text-gray-600">Aランク以上</span><span className="font-medium text-green-600">+{promotionRules.salaryAdjustment.manager.rankA.toLocaleString()}円</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">Cランク</span><span className="font-medium text-red-600">{promotionRules.salaryAdjustment.manager.rankC.toLocaleString()}円</span></div>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-800 mb-2">一般社員</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between"><span className="text-gray-600">Aランク以上</span><span className="font-medium text-green-600">+{promotionRules.salaryAdjustment.staff.rankA.toLocaleString()}円</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">データがありません</div>
      )}

      {showRankSimulation && renderRankSimulationResults()}
      {showPromotionSimulation && renderPromotionSimulationResults()}
    </div>
  );
}
