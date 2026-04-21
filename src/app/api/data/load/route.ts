import { NextRequest, NextResponse } from 'next/server';
import { readJson } from '@/lib/drive';
import { getAuthFromRequest, isStoreRestricted } from '@/lib/auth-api';
import {
  EmployeesData,
  StoresData,
  RankRulesData,
  PromotionRulesData,
  QualitativeCategoriesData,
  QualitativeScoresData,
  QuantitativeScoresData,
  AppSettings,
} from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '2025_H2';

    const auth = getAuthFromRequest(request);

    // 並列でデータを読み込み
    const [
      employees,
      stores,
      rankRules,
      promotionRules,
      qualitativeCategories,
      appSettings,
    ] = await Promise.all([
      readJson<EmployeesData>('employees.json'),
      readJson<StoresData>('stores.json'),
      readJson<RankRulesData>('rank_rules.json'),
      readJson<PromotionRulesData>('promotion_rules.json'),
      readJson<QualitativeCategoriesData>('qualitative_categories.json'),
      readJson<AppSettings>('app_settings.json'),
    ]);

    // store/staff ロールの場合、自店舗のデータのみに絞る
    if (auth && isStoreRestricted(auth.role) && auth.storeId) {
      employees.items = employees.items.filter(
        (e) => e.storeId === auth.storeId
      );
      stores.items = stores.items.filter(
        (s) => s.storeId === auth.storeId
      );
    }

    // 評価データは期間指定でオプショナルに読み込み
    let qualitativeScores: QualitativeScoresData | null = null;
    let quantitativeScores: QuantitativeScoresData | null = null;

    try {
      [qualitativeScores, quantitativeScores] = await Promise.all([
        readJson<QualitativeScoresData>(`qualitative_scores_${period}.json`),
        readJson<QuantitativeScoresData>(`quantitative_scores_${period}.json`),
      ]);
    } catch {
      // 評価データが存在しない期間の場合はnull
    }

    return NextResponse.json({
      success: true,
      data: {
        employees,
        stores,
        rankRules,
        promotionRules,
        qualitativeCategories,
        qualitativeScores,
        quantitativeScores,
        appSettings,
        period,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
