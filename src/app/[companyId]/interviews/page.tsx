'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useAuth, isAdminRole, isStoreRestricted } from '@/lib/auth-context';

interface EmployeeItem {
  employeeId: string;
  employeeCode: string;
  name: string;
  role: string;
  storeId: string;
}

interface StoreItem {
  storeId: string;
  storeName: string;
}

export default function InterviewListPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = use(params);
  const auth = useAuth();
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStore, setFilterStore] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetch('/api/data/load?period=2025_H2', {
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        const result = await res.json();
        if (result.success) {
          setEmployees(result.data.employees.items.filter((e: EmployeeItem) => e.employeeId));
          setStores(result.data.stores.items);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const storeNameMap = new Map(stores.map(s => [s.storeId, s.storeName]));

  const filtered = employees.filter(emp => {
    if (filterStore !== 'all' && emp.storeId !== filterStore) return false;
    if (search && !emp.name.includes(search) && !emp.employeeCode.includes(search)) return false;
    return true;
  });

  // 店舗ごとにグルーピング
  const grouped = filtered.reduce((acc, emp) => {
    const storeName = storeNameMap.get(emp.storeId) || emp.storeId;
    if (!acc[storeName]) acc[storeName] = [];
    acc[storeName].push(emp);
    return acc;
  }, {} as Record<string, EmployeeItem[]>);

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
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">面談記録</h1>
        <p className="text-sm text-gray-500 mt-1">社員を選択して面談記録を表示します</p>
      </div>

      {/* フィルタ */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-4 flex gap-4">
        {!isStoreRestricted(auth.role) && (
          <select
            value={filterStore}
            onChange={e => setFilterStore(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="all">全店舗</option>
            {stores.map(s => (
              <option key={s.storeId} value={s.storeId}>{s.storeName}</option>
            ))}
          </select>
        )}
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="氏名・社員番号で検索"
          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>

      {/* 社員リスト（店舗別） */}
      {Object.keys(grouped).length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center text-gray-400">
          該当する社員がいません
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([storeName, emps]) => (
              <div key={storeName} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                  <h2 className="text-sm font-bold text-gray-700">{storeName}</h2>
                </div>
                <div className="divide-y divide-gray-100">
                  {emps.map(emp => (
                    <Link
                      key={emp.employeeId}
                      href={`/${companyId}/interviews/${emp.employeeId}`}
                      className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-900">{emp.name}</span>
                        <span className="text-xs text-gray-400">{emp.employeeCode}</span>
                      </div>
                      <span className="text-xs text-gray-400">→</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
