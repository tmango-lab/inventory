-- ==========================================
-- FIX SCRIPT: CLEAN & RESET
-- ใช้สำหรับรันใหม่เมื่อเกิด Error "Already exists"
-- ==========================================

-- 1. DROP ทุกอย่างของเก่าทิ้ง (เพื่อความชัวร์)
drop view if exists stock_summary;
drop table if exists transactions cascade;
drop table if exists products cascade;

-- 2. สร้างตารางใหม่ (New Start)

-- Table: Products
create table products (
  id uuid default gen_random_uuid() primary key,
  name text unique not null,
  unit text,
  category text, 
  image_url text,
  created_at timestamptz default now()
);

-- Table: Transactions
create table transactions (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  type text not null, -- 'IN', 'OUT', 'BORROW', 'RETURN', 'CONSUME'
  
  product_name text not null references products(name),
  qty int not null,
  unit text,
  
  -- Details
  zone text,
  channel text,
  request_by text,
  remark text,
  
  -- Borrow/Return flow
  status text default 'COMPLETED', -- 'COMPLETED', 'PENDING_RETURN', 'RETURNED'
  parent_id uuid references transactions(id),
  
  images jsonb default '[]'
);

-- 3. สร้าง View คำนวณสต็อก
create view stock_summary as
select 
  p.name as item_name,
  p.unit,
  coalesce(sum(case when t.type = 'IN' then t.qty else 0 end), 0) as total_in,
  coalesce(sum(case when t.type in ('OUT', 'BORROW', 'CONSUME') then t.qty else 0 end), 0) as total_out,
  coalesce(sum(case when t.type = 'RETURN' then t.qty else 0 end), 0) as total_return,
  (
    coalesce(sum(case when t.type = 'IN' then t.qty else 0 end), 0) 
    - coalesce(sum(case when t.type in ('OUT', 'BORROW', 'CONSUME') then t.qty else 0 end), 0)
    + coalesce(sum(case when t.type = 'RETURN' then t.qty else 0 end), 0)
  ) as balance,
  max(t.created_at) as last_movement
from products p
left join transactions t on p.name = t.product_name
group by p.id, p.name, p.unit;

-- 4. ตั้งค่า Policy (เปิดให้เข้าถึงได้)
alter table products enable row level security;
alter table transactions enable row level security;

-- ใช้ DO block เพื่อป้องกัน error ถ้า policy ซ้ำ (แต่เรา drop table ไปแล้วไม่น่าซ้ำ)
create policy "Public Access Products" on products for all using (true) with check (true);
create policy "Public Access Transactions" on transactions for all using (true) with check (true);

-- 5. เพิ่มข้อมูลตัวอย่าง (Dummy Data)
insert into products (name, unit, category) values
('MacBook Pro M1', 'เครื่อง', 'IT'),
('Mouse Wireless', 'อัน', 'IT'),
('HDMI Cable', 'เส้น', 'AV'),
('Adapter USB-C', 'อัน', 'IT')
on conflict (name) do nothing;

-- 6. เพิ่มสต็อกเริ่มต้น (Transaction แรก)
insert into transactions (type, product_name, qty, unit, remark) values 
('IN', 'MacBook Pro M1', 10, 'เครื่อง', 'Initial Stock'),
('IN', 'Mouse Wireless', 20, 'อัน', 'Initial Stock');
