'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';

interface StoreRanking {
  store_code: string;
  store_name: string;
  rank: number;
}

interface OrgDiagnosisData {
  survey_id: string;
  updated_at: string;
  total_ranking: StoreRanking[];
  pa_ranking: StoreRanking[];
}

interface MonthlyData {
  year: number;
  month: number;
  storeId: string;
  storeName: string;
  salesBudget: number;
  salesActual: number;
  salesRatio: number;
  expenseRatio: number;
  salesZone: string;
  mngLevel: number;
  mngScore: number;
}

interface QualitativeDetail {
  sheetType: string;
  category: string;
  itemName: string;
  isImportant: boolean;
  subordinateScore: number;
  managerScore: number;
  finalScore: number;
  description: string;
}

interface EvaluationResult {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  role: string;
  storeId: string;
  storeName: string;
  grade: string;
  rank: string;
  totalScore: number;
  companyAverage: number;
  companyRank: number;
  totalCount: number;
  quantitativeScore: number;
  quantitativeAverage: number;
  quantitativeRank: number;
  quantitativeWeight: number;
  mngScore: number;
  mngAverage: number;
  qscBonus: number;
  qualitativeScore: number;
  qualitativeMax: number;
  qualitativeAverage: number;
  qualitativeRank: number;
  qualitativeWeight: number;
  monthlyData: MonthlyData[];
  qualitativeDetails: QualitativeDetail[];
  promotionStatus: string;
}

const rankColors: Record<string, string> = {
  S: '#7c3aed',
  A: '#2563eb',
  B: '#16a34a',
  C: '#eab308',
  D: '#dc2626',
  E: '#6b7280',
};

export default function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  const { employeeId } = use(params);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<EvaluationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [orgDiagnosis, setOrgDiagnosis] = useState<OrgDiagnosisData | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [evalResponse, orgResponse] = await Promise.all([
          fetch(`/api/evaluations/${employeeId}?period=2025_H2`),
          fetch('/api/org-diagnosis/ranking')
        ]);

        const evalResult = await evalResponse.json();
        if (evalResult.success) {
          setData(evalResult.data);
        } else {
          setError(evalResult.error);
        }

        const orgResult = await orgResponse.json();
        if (orgResult.success) {
          setOrgDiagnosis(orgResult.data);
        }
      } catch {
        setError('データの読み込みに失敗しました');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [employeeId]);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600"></div>
        <p className="mt-2 text-gray-500">読み込み中...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
        {error || '社員が見つかりません'}
      </div>
    );
  }

  // 定性評価をカテゴリごとにグループ化
  const qualitativeByCategory = data.qualitativeDetails.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, QualitativeDetail[]>);

  const isManager = data.role === 'manager' || data.role === 'assistant_manager';

  // カテゴリ別合計を計算（店長はmanagerScore、一般社員はfinalScore）
  const categoryTotals = Object.entries(qualitativeByCategory).map(([category, items]) => ({
    category,
    total: items.reduce((sum, item) => sum + (isManager ? (item.managerScore || 0) : (item.finalScore || 0)), 0),
    count: items.length,
  }));

  // 数値フォーマット
  const formatNumber = (n: number, decimals = 1) => {
    return n.toLocaleString('ja-JP', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  };

  const formatCurrency = (n: number) => {
    return (n / 1000).toLocaleString('ja-JP', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + '千円';
  };

  const formatPercent = (n: number) => {
    return (n * 100).toFixed(1) + '%';
  };

  return (
    <div className="max-w-6xl mx-auto print:max-w-none">
      <div className="mb-4 print:hidden">
        <Link href="/evaluations" className="text-blue-600 hover:text-blue-800 text-sm">
          ← 評価一覧に戻る
        </Link>
      </div>

      {/* ヘッダー */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-4">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">
            株式会社ジュネストリー<br />定期評価通知票
          </h1>
          <div className="flex gap-8 text-sm">
            <div className="flex gap-2">
              <span className="text-gray-500">社員番号</span>
              <span className="font-semibold text-gray-900 min-w-[60px]">{data.employeeCode}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-gray-500">氏名</span>
              <span className="font-semibold text-gray-900 min-w-[80px]">{data.employeeName}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-gray-500">等級</span>
              <span className="font-semibold text-gray-900 min-w-[30px]">{data.grade || '-'}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-gray-500">評価期間</span>
              <span className="font-semibold text-gray-900">2025年下期</span>
            </div>
          </div>
        </div>
      </div>

      {/* 総合評価 */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-4">
        <h2 className="text-base font-bold text-gray-800 mb-4">【総合評価】</h2>
        <div className="grid grid-cols-6 gap-6 text-center">
          <div>
            <div className="text-sm text-gray-500 mb-2">ランク</div>
            <span
              className="inline-flex items-center justify-center w-12 h-12 rounded-full text-xl font-bold text-white"
              style={{ backgroundColor: rankColors[data.rank] || '#6b7280' }}
            >
              {data.rank}
            </span>
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-2">点数</div>
            <div className="text-3xl font-bold text-gray-900">{formatNumber(data.totalScore)}</div>
            <div className="text-xs text-gray-400 mt-1">
              <span className="text-blue-500">{formatNumber(data.quantitativeScore)}</span>
              <span className="text-gray-400">×{data.quantitativeWeight}</span>
              <span className="mx-0.5">+</span>
              <span className="text-green-500">{formatNumber(data.qualitativeScore)}</span>
              <span className="text-gray-400">×{data.qualitativeWeight}</span>
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-2">社内平均</div>
            <div className="text-2xl font-medium text-gray-600">{formatNumber(data.companyAverage)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-2">社内順位</div>
            <div className="text-2xl font-medium text-gray-600">
              <span className="text-blue-600">{data.companyRank}</span>
              <span className="text-base text-gray-400">/{data.totalCount}</span>
            </div>
          </div>
          <div className="border-l border-gray-200 pl-6">
            <div className="text-sm text-gray-500 mb-2">前回ランク</div>
            <div className="text-xl font-medium text-gray-400">-</div>
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-2">前回点数</div>
            <div className="text-xl font-medium text-gray-400">-</div>
          </div>
        </div>
      </div>

      {/* 定量・定性評価 */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* 定量評価 */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-base font-bold text-gray-800 mb-4">【定量評価】</h2>
          <div className="grid grid-cols-4 gap-4 text-center mb-3">
            <div>
              <div className="text-sm text-gray-500 mb-1">点数</div>
              <div className="text-2xl font-bold text-blue-600">{formatNumber(data.quantitativeScore)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">社内平均</div>
              <div className="text-xl font-medium text-gray-600">{formatNumber(data.quantitativeAverage)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">社内順位</div>
              <div className="text-xl font-medium text-gray-600">
                <span className="text-blue-600">{data.quantitativeRank}</span>
                <span className="text-sm text-gray-400">/{data.totalCount}</span>
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">ウエイト</div>
              <div className="text-xl font-medium text-gray-600">{data.quantitativeWeight}</div>
            </div>
          </div>
          <div className="text-xs text-gray-500 pt-2 border-t border-gray-100">
            Mngスコア: {formatNumber(data.mngScore)} + QSC加点: {formatNumber(data.qscBonus)} = {formatNumber(data.quantitativeScore)}
          </div>
        </div>

        {/* 定性評価 */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-base font-bold text-gray-800 mb-4">【定性評価】</h2>
          <div className="grid grid-cols-5 gap-3 text-center mb-3">
            <div>
              <div className="text-sm text-gray-500 mb-1">点数</div>
              <div className="text-2xl font-bold text-green-600">{formatNumber(data.qualitativeScore)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">満点</div>
              <div className="text-xl font-medium text-gray-600">{data.qualitativeMax}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">社内平均</div>
              <div className="text-xl font-medium text-gray-600">{formatNumber(data.qualitativeAverage)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">社内順位</div>
              <div className="text-xl font-medium text-gray-600">
                <span className="text-blue-600">{data.qualitativeRank}</span>
                <span className="text-sm text-gray-400">/{data.totalCount}</span>
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">ウエイト</div>
              <div className="text-xl font-medium text-gray-600">{data.qualitativeWeight}</div>
            </div>
          </div>
          <div className="text-xs text-gray-500 pt-2 border-t border-gray-100">
            {isManager ? 'Mgr0.8+部下0.2で算出' : '店長評価で算出'}
          </div>
        </div>
      </div>

      {/* 定量評価詳細 */}
      {data.monthlyData.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-4">
          <h2 className="text-base font-bold text-gray-800 mb-4">【定量評価 詳細】</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="py-3 px-3 text-left font-medium text-gray-600">年</th>
                  <th className="py-3 px-3 text-left font-medium text-gray-600">月</th>
                  <th className="py-3 px-3 text-left font-medium text-gray-600">店舗名</th>
                  <th className="py-3 px-3 text-right font-medium text-gray-600">売上実績</th>
                  <th className="py-3 px-3 text-right font-medium text-gray-600">予算</th>
                  <th className="py-3 px-3 text-right font-medium text-gray-600">達成率</th>
                  <th className="py-3 px-3 text-right font-medium text-gray-600">経費率</th>
                  <th className="py-3 px-3 text-center font-medium text-gray-600">売上Zone</th>
                  <th className="py-3 px-3 text-center font-medium text-gray-600">Mng水準</th>
                  <th className="py-3 px-3 text-right font-medium text-gray-600">Mngスコア</th>
                </tr>
              </thead>
              <tbody>
                {data.monthlyData.sort((a, b) => a.month - b.month).map((m, idx) => (
                  <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2.5 px-3 text-gray-700">{m.year}</td>
                    <td className="py-2.5 px-3 text-gray-700">{m.month}</td>
                    <td className="py-2.5 px-3 text-gray-900">{m.storeName}</td>
                    <td className="py-2.5 px-3 text-right font-medium text-blue-600">{formatCurrency(m.salesActual)}</td>
                    <td className="py-2.5 px-3 text-right text-gray-500">{formatCurrency(m.salesBudget)}</td>
                    <td className="py-2.5 px-3 text-right text-gray-700">{formatPercent(m.salesRatio)}</td>
                    <td className="py-2.5 px-3 text-right text-gray-700">{formatPercent(m.expenseRatio)}</td>
                    <td className="py-2.5 px-3 text-center font-medium text-gray-700">{m.salesZone}</td>
                    <td className="py-2.5 px-3 text-center text-gray-700">{m.mngLevel}</td>
                    <td className="py-2.5 px-3 text-right font-semibold text-gray-900">{m.mngScore}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50">
                  <td colSpan={9} className="py-2.5 px-3 text-right font-medium text-gray-600">Mngスコア合計:</td>
                  <td className="py-2.5 px-3 text-right font-bold text-gray-900">{formatNumber(data.mngScore)}</td>
                </tr>
                <tr className="bg-blue-50">
                  <td colSpan={9} className="py-2.5 px-3 text-right font-medium text-gray-600">QSC加点:</td>
                  <td className="py-2.5 px-3 text-right font-bold text-blue-600">{formatNumber(data.qscBonus)}</td>
                </tr>
                <tr className="bg-blue-100">
                  <td colSpan={9} className="py-3 px-3 text-right font-bold text-gray-800">定量評価計（Mng+QSC）:</td>
                  <td className="py-3 px-3 text-right font-bold text-xl text-blue-700">{formatNumber(data.quantitativeScore)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* 定性評価詳細 */}
      {data.qualitativeDetails.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-4">
          <h2 className="text-base font-bold text-gray-800 mb-2">【定性評価 詳細】</h2>
          <div className="text-xs text-gray-500 mb-4">
            <span className="text-red-500">★</span>…重点項目（1点以上で2.5倍加点）
            <br />
            4：とても良く出来ている　3：出来ている　2：やや不足している　1：不足している
          </div>

          {/* カテゴリ別サマリ */}
          <div className="flex flex-wrap gap-2 mb-4">
            {categoryTotals.map((ct) => (
              <div key={ct.category} className="bg-gray-50 border border-gray-200 px-4 py-2 rounded text-center min-w-[100px]">
                <div className="text-xs text-gray-500 mb-1">{ct.category}</div>
                <div className="text-lg font-bold text-gray-800">{ct.total.toFixed(1)}</div>
              </div>
            ))}
            <div className="bg-green-50 border border-green-200 px-4 py-2 rounded text-center min-w-[100px]">
              <div className="text-xs text-gray-500 mb-1">合計</div>
              <div className="text-lg font-bold text-green-600">{formatNumber(data.qualitativeScore)}</div>
            </div>
          </div>

          {/* カテゴリ別詳細 */}
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(qualitativeByCategory).map(([category, items]) => (
              <div key={category} className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                  <h3 className="font-bold text-gray-800">{category}</h3>
                </div>
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="py-2 px-3 text-left font-medium text-gray-600">項目</th>
                      {isManager && <th className="py-2 px-3 text-right font-medium text-gray-600 w-16">部下</th>}
                      <th className="py-2 px-3 text-right font-medium text-gray-600 w-16">{isManager ? 'Mgr' : '店長'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={idx} className="border-b border-gray-50 hover:bg-blue-50 group cursor-help">
                        <td className="py-2 px-3 text-gray-800 relative">
                          <div className="flex items-center">
                            {item.isImportant && <span className="text-red-500 mr-1">★</span>}
                            <span className="border-b border-dashed border-gray-400">{item.itemName}</span>
                          </div>
                          {item.description && (
                            <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-50 w-72">
                              <div className="bg-gray-800 text-white text-xs rounded-lg py-2 px-3 shadow-lg">
                                <div className="font-semibold mb-1">{item.itemName}</div>
                                <div className="text-gray-200">{item.description}</div>
                                <div className="absolute left-4 top-full w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-gray-800"></div>
                              </div>
                            </div>
                          )}
                        </td>
                        {isManager && (
                          <td className="py-2 px-3 text-right text-gray-500">
                            {item.subordinateScore || '-'}
                          </td>
                        )}
                        <td className="py-2 px-3 text-right font-semibold text-gray-900">
                          {isManager ? (item.managerScore || '-') : (item.finalScore || '-')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 組織診断（評価対象外） */}
      {orgDiagnosis && data && (() => {
        const rankings = isManager ? orgDiagnosis.total_ranking : orgDiagnosis.pa_ranking;
        const storeRank = rankings.find(r => r.store_code === data.storeId);
        if (!storeRank) return null;

        return (
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-4">
            <h2 className="text-base font-bold text-gray-800 mb-2">【組織診断】<span className="text-sm font-normal text-gray-500 ml-2">※評価対象外</span></h2>
            <div className="text-xs text-gray-500 mb-4">
              {isManager ? '総合ランキング' : 'PA（アルバイト）からの評価ランキング'}
              <span className="ml-2 text-gray-400">（{orgDiagnosis.survey_id}実施分）</span>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-center">
                <div className="text-sm text-gray-600 mb-1">あなたの店舗は</div>
                <div className="text-3xl font-bold text-blue-600">
                  {storeRank.rank}<span className="text-lg text-gray-500">位</span>
                  <span className="text-lg text-gray-400 ml-1">/ {rankings.length}店舗中</span>
                </div>
                <div className="text-sm text-gray-500 mt-1">{storeRank.store_name}</div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
