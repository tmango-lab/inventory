// src/layouts/MainLayout.tsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

type MainLayoutProps = {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
};

// Simple SVG Icons for Mobile Nav
const Icons = {
  Receive: (props: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12 5v14M5 12l7 7 7-7" /></svg>
  ),
  Stock: (props: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>
  ),
  Search: (props: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
  ),
  History: (props: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
  ),
  Settings: (props: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
  )
};

const NAV_ITEMS = [
  { to: '/receive', label: 'รับเข้า', Icon: Icons.Receive },
  { to: '/stock', label: 'สต็อก', Icon: Icons.Stock },
  { to: '/search', label: 'ค้นหา', Icon: Icons.Search },
  { to: '/history', label: 'ประวัติ', Icon: Icons.History },
  { to: '/settings', label: 'ตั้งค่า', Icon: Icons.Settings },
];

export function MainLayout({ title, subtitle, children }: MainLayoutProps) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-slate-100 pb-20 md:pb-5">
      {/* DESKTOP HEADER & NAV (Hidden on Mobile) */}
      <header className="bg-white border-b shadow-sm hidden md:block">
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
                รับเข้า · สต็อกคงเหลือ · ค้นหา · ประวัติ
              </p>
            </div>
          </div>
        </div>

        {/* Desktop Tabs */}
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

      {/* MOBILE HEADER (Visible on Mobile) */}
      <header className="bg-white border-b shadow-sm md:hidden sticky top-0 z-10">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-black text-white grid place-items-center font-bold text-xs">
              TM
            </div>
            <h1 className="font-semibold text-slate-800 line-clamp-1">
              {title || 'T-MANGO Inventory'}
            </h1>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="max-w-6xl mx-auto px-4 py-5">
        {/* Helper Title (Desktop only or if subtitle needed) */}
        <div className="hidden md:block mb-4">
          {(title || subtitle) && (
            <div>
              {title && <h2 className="text-xl font-semibold text-slate-800">{title}</h2>}
              {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
            </div>
          )}
        </div>

        {/* Mobile Subtitle (optional) */}
        <div className="md:hidden mb-4">
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-4">
          {children}
        </div>
      </main>

      {/* MOBILE BOTTOM NAV (Visible on Mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-[0_-1px_3px_rgba(0,0,0,0.05)] z-50 pb-safe">
        <div className="flex justify-around items-center h-16">
          {NAV_ITEMS.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${active ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
                  }`}
              >
                <div className={`${active ? 'scale-110' : ''} transition-transform duration-200`}>
                  <item.Icon width={22} height={22} />
                </div>
                <span className="text-[10px] font-medium leading-none">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
