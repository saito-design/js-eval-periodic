import { NextRequest, NextResponse } from 'next/server';
import { readJson } from '@/lib/drive';
import {
  EvaluationResultsData,
  EmployeesData,
  StoresData,
} from '@/lib/types';
import { getAuthFromRequest, isStoreRestricted } from '@/lib/auth-api';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '2025_H2';

    // 認証情報を取得（任意: ヘッダーがなくても従来互換で動作）
    const auth = getAuthFromRequest(request);

    // 評価結果と関連マスタを読み込み
    const [evaluationResults, employees, stores] = await Promise.all([
      readJson<EvaluationResultsData>(`evaluation_results_${period}.json`),
      readJson<EmployeesData>('employees.json'),
      readJson<StoresData>('stores.json'),
    ]);

    // 社員・店舗情報を結合
    let enrichedItems = evaluationResults.items.map((item) => {
      const employee = employees.items.find(
        (e) => e.employeeId === item.employeeId
      );
      const store = stores.items.find((s) => s.storeId === item.storeId);

      return {
        ...item,
        employeeName: employee?.name ?? '',
        employeeCode: employee?.employeeCode ?? '',
        storeName: store?.storeName ?? '',
      };
    });

    // store/staffロールの場合、自店舗のデータのみに絞る
    if (auth && isStoreRestricted(auth.role) && auth.storeId) {
      enrichedItems = enrichedItems.filter(
        (item) => item.storeId === auth.storeId
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        period: evaluationResults.period,
        generatedAt: evaluationResults.generatedAt,
        items: enrichedItems,
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
