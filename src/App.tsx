// src/App.tsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';

import ReceiveIn from './pages/ReceiveIn';
import IssueOut from './pages/IssueOut';
import ReturnItem from './pages/ReturnItem';
import StockPage from './pages/Stock';
import ReceiveHistoryPage from './pages/ReceiveHistory';
import OutHistoryPage from './pages/OutHistory';
import InventorySearchAndMap from './pages/Map';

function App() {
  return (
    <Routes>
      {/* หน้า รับเข้า */}
      <Route
        path="/receive"
        element={
          <MainLayout
            title="รับเข้า"
            subtitle="บันทึกรายการรับเข้าสินค้าเข้าคลัง"
          >
            <ReceiveIn />
          </MainLayout>
        }
      />

      {/* หน้า เบิกสินค้า */}
      <Route
        path="/issue-out"
        element={
          <MainLayout
            title="เบิกสินค้า"
            subtitle="บันทึกรายการเบิกออกจากคลัง"
          >
            <IssueOut />
          </MainLayout>
        }
      />

      {/* หน้า คืนสินค้า */}
      <Route
        path="/return"
        element={
          <MainLayout
            title="คืนสินค้า"
            subtitle="รายการของที่ยืมไปและแจ้งคืน"
          >
            <ReturnItem />
          </MainLayout>
        }
      />

      {/* หน้า สต็อกคงเหลือ */}
      <Route
        path="/stock"
        element={
          <MainLayout
            title="สต็อกคงเหลือ"
            subtitle="ดูคงเหลือ และตำแหน่งจัดเก็บตามโซน/ช่อง"
          >
            <StockPage />
          </MainLayout>
        }
      />

      {/* หน้า ประวัติรับเข้า */}
      <Route
        path="/receive-history"
        element={
          <MainLayout
            title="ประวัติรับเข้า"
            subtitle="ดูรายการรับเข้าย้อนหลัง พร้อมรูปประกอบ"
          >
            <ReceiveHistoryPage />
          </MainLayout>
        }
      />

      {/* หน้า ประวัติ เบิก / คืน / จำหน่าย */}
      <Route
        path="/out-history"
        element={
          <MainLayout
            title="ประวัติเบิก/จำหน่าย"
            subtitle="รายการเบิกออก คืน และจำหน่ายย้อนหลัง"
          >
            <OutHistoryPage />
          </MainLayout>
        }
      />

      {/* หน้า แผนผังคลัง */}
      <Route
        path="/map"
        element={
          <MainLayout
            title="แผนผังคลัง"
            subtitle="ค้นหาสินค้าและดูตำแหน่งโซน/ช่อง"
          >
            <InventorySearchAndMap />
          </MainLayout>
        }
      />

      {/* default redirect */}
      <Route path="*" element={<Navigate to="/receive" replace />} />
    </Routes>
  );
}

export default App;
