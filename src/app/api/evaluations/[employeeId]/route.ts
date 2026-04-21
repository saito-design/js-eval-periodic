import { NextRequest, NextResponse } from 'next/server';
import { readJson } from '@/lib/drive';
import { EvaluationResultsData, EmployeesData, StoresData } from '@/lib/types';
import { getAuthFromRequest, isStoreRestricted } from '@/lib/auth-api';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  try {
    const { employeeId } = await params;
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '2025_H2';

    // 認証情報を取得
    const auth = getAuthFromRequest(request);

    const [evaluationResults, employees, stores] = await Promise.all([
      readJson<EvaluationResultsData>(`evaluation_results_${period}.json`),
      readJson<EmployeesData>('employees.json'),
      readJson<StoresData>('stores.json'),
    ]);

    const result = evaluationResults.items.find(
      (item) => item.employeeId === employeeId
    );

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      );
    }

    // store/staffロールの場合、自店舗以外のデータへのアクセスを拒否
    if (auth && isStoreRestricted(auth.role) && auth.storeId) {
      if (result.storeId !== auth.storeId) {
        return NextResponse.json(
          { success: false, error: 'この評価データにアクセスする権限がありません' },
          { status: 403 }
        );
      }
    }

    const employee = employees.items.find((e) => e.employeeId === employeeId);
    const store = stores.items.find((s) => s.storeId === result.storeId);

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        employeeName: employee?.name ?? '',
        employeeCode: employee?.employeeCode ?? '',
        storeName: store?.storeName ?? '',
        joinedAt: employee?.joinedAt ?? '',
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
