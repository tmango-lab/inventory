// src/layouts/MainLayout.tsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

type MainLayoutProps = {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
};

const NAV_ITEMS = [
  { to: '/receive', label: 'รับเข้า' },
  { to: '/issue-out', label: 'เบิกสินค้า' },
  { to: '/return', label: 'คืนสินค้า' }, // เพิ่มเมนู
  { to: '/stock', label: 'สต็อกคงเหลือ' },
  { to: '/history', label: 'ประวัติ' },
  { to: '/map', label: 'แผนผังคลัง' },
];

export function MainLayout({ title, subtitle, children }: MainLayoutProps) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Top bar */}
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-black text-white grid place-items-center font-bold">
              TM
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-800">
                T-MANGO – ระบบสต็อก
              </h1>
              <p className="text-xs text-slate-500">
                รับเข้า · เบิก · สต็อกคงเหลือ · แผนผังคลัง · ประวัติ
              </p>
            </div>
          </div>
        </div>

        {/* Nav tabs */}
        <nav className="bg-slate-50 border-t">
          <div className="max-w-6xl mx-auto px-4 flex gap-2 overflow-x-auto">
            {NAV_ITEMS.map((item) => {
              const active = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={
                    'px-3 py-2 text-sm border-b-2 -mb-px whitespace-nowrap rounded-t-md ' +
                    (active
                      ? 'border-blue-500 text-blue-600 font-medium bg-white'
                      : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-white')
                  }
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </header>

      {/* Page content */}
      <main className="max-w-6xl mx-auto px-4 py-5">
        {(title || subtitle) && (
          <div className="mb-4">
            {title && (
              <h2 className="text-xl font-semibold text-slate-800">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
            )}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border p-4">
          {children}
        </div>
      </main>
    </div>
  )
}
