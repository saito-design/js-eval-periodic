import { NextRequest, NextResponse } from 'next/server';
import { readJson } from '@/lib/drive';
import { EvaluationResultsData, EvaluationResultItem } from '@/lib/types/results';
import { Role } from '@/lib/types';
import { getAuthFromRequest, isStoreRestricted } from '@/lib/auth-api';

/** 評価タイプ */
type EvaluationType = 'total' | 'quantitative' | 'qualitative';

/** ランキング項目 */
interface RankingEntry {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  role: Role;
  storeName: string;
  storeId: string;
  score: number;
  rank: string; // S, A, B, C, D, E
  position: number; // 順位
}

/** 役職別ランキング */
interface RoleRanking {
  total: RankingEntry[];
  quantitative: RankingEntry[];
  qualitative: RankingEntry[];
}

/** APIレスポンス */
interface RankingResponse {
  period: string;
  generatedAt: string;
  // 役職別×評価タイプ別ランキング
  byRole: {
    manager: RoleRanking;
    assistant_manager: RoleRanking;
    staff: RoleRanking;
  };
  // 全体ランキング（評価タイプ別）
  overall: {
    total: RankingEntry[];
    quantitative: RankingEntry[];
    qualitative: RankingEntry[];
  };
  // 利用可能な期間一覧
  availablePeriods: string[];
}

/** スコア取得関数 */
function getScore(item: EvaluationResultItem, type: EvaluationType): number {
  switch (type) {
    case 'total':
      return item.totalScore;
    case 'quantitative':
      return item.quantitativeScore;
    case 'qualitative':
      return item.qualitativeScore;
  }
}

/** ランキング生成 */
function generateRanking(
  items: EvaluationResultItem[],
  type: EvaluationType
): RankingEntry[] {
  // スコア順にソート（降順）
  const sorted = [...items].sort((a, b) => getScore(b, type) - getScore(a, type));

  // 順位を割り当て（同スコアは同順位）
  let position = 0;
  let prevScore: number | null = null;
  let skipCount = 0;

  return sorted.map((item) => {
    const score = getScore(item, type);
    if (prevScore === null || score !== prevScore) {
      position += 1 + skipCount;
      skipCount = 0;
    } else {
      skipCount++;
    }
    prevScore = score;

    return {
      employeeId: item.employeeId,
      employeeName: item.employeeName,
      employeeCode: item.employeeCode,
      role: item.role,
      storeName: item.storeName,
      storeId: item.storeId,
      score: Math.round(score * 100) / 100,
      rank: item.rank,
      position,
    };
  });
}

/** 利用可能な期間一覧を取得 */
async function getAvailablePeriods(): Promise<string[]> {
  // TODO: listFiles実装後に動的取得に切り替え
  // 現在は固定の期間リストを返す
  const possiblePeriods = [
    '2025_H2', '2025_H1', '2024_H2', '2024_H1',
  ];

  const available: string[] = [];
  for (const period of possiblePeriods) {
    try {
      await readJson<EvaluationResultsData>(`evaluation_results_${period}.json`);
      available.push(period);
    } catch {
      // ファイルが存在しない場合はスキップ
    }
  }

  return available;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '2025_H2';

    // 認証情報を取得
    const auth = getAuthFromRequest(request);

    // 評価結果を読み込み
    const results = await readJson<EvaluationResultsData>(
      `evaluation_results_${period}.json`
    );

    // store/staffロールの場合、自店舗のデータのみに絞る
    let items = results.items;
    if (auth && isStoreRestricted(auth.role) && auth.storeId) {
      items = items.filter((item) => item.storeId === auth.storeId);
    }

    // 利用可能な期間一覧を取得
    const availablePeriods = await getAvailablePeriods();

    // 役職別にフィルタ
    const managers = items.filter((i) => i.role === 'manager');
    const assistantManagers = items.filter(
      (i) => i.role === 'assistant_manager'
    );
    const staffMembers = items.filter((i) => i.role === 'staff');

    // 役職別×評価タイプ別ランキング生成
    const response: RankingResponse = {
      period: results.period,
      generatedAt: results.generatedAt,
      byRole: {
        manager: {
          total: generateRanking(managers, 'total'),
          quantitative: generateRanking(managers, 'quantitative'),
          qualitative: generateRanking(managers, 'qualitative'),
        },
        assistant_manager: {
          total: generateRanking(assistantManagers, 'total'),
          quantitative: generateRanking(assistantManagers, 'quantitative'),
          qualitative: generateRanking(assistantManagers, 'qualitative'),
        },
        staff: {
          total: generateRanking(staffMembers, 'total'),
          quantitative: generateRanking(staffMembers, 'quantitative'),
          qualitative: generateRanking(staffMembers, 'qualitative'),
        },
      },
      overall: {
        total: generateRanking(items, 'total'),
        quantitative: generateRanking(items, 'quantitative'),
        qualitative: generateRanking(items, 'qualitative'),
      },
      availablePeriods,
    };

    return NextResponse.json({
      success: true,
      data: response,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
