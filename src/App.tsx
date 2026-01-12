// src/App.tsx

import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';

import ReceiveIn from './pages/ReceiveIn';
import StockPage from './pages/Stock';
import HistoryPage from './pages/History';
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

      {/* หน้า ประวัติรวม */}
      <Route
        path="/history"
        element={
          <MainLayout
            title="ประวัติการทำรายการ"
            subtitle="รายการรับเข้า เบิก และคืน ทั้งหมด"
          >
            <HistoryPage />
          </MainLayout>
        }
      />

      {/* หน้า ค้นหา */}
      <Route
        path="/search"
        element={
          <MainLayout
            title="ค้นหา"
            subtitle="ค้นหาสินค้าและทำรายการเบิก/ยืม"
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
