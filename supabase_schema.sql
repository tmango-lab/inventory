-- 1. Create PREDEFINED LIST table (Items/Products)
create table if not exists products (
  id uuid default gen_random_uuid() primary key,
  name text unique not null,
  unit text,
  category text, -- Use for Zone/Channel default if needed
  image_url text, -- For product thumbnail
  created_at timestamptz default now()
);

-- 2. Create TRANSACTIONS table (In, Out, Borrow, Return)
create table if not exists transactions (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  type text not null, -- 'IN', 'OUT', 'BORROW', 'RETURN', 'CONSUME'
  
  -- Product Relation
  product_name text not null references products(name) on update cascade, 
  -- Note: Referencing 'name' is easier for migration. 
  -- ideally reference 'id', but UI sends 'name'.

  qty int not null,
  unit text,
  
  -- Location / Details
  zone text,
  channel text,
  request_by text,
  remark text,
  
  -- For Borrow/Return tracking
  status text default 'COMPLETED', -- 'COMPLETED', 'PENDING_RETURN', 'RETURNED'
  parent_id uuid references transactions(id), -- If RETURN, points to original BORROW id
  
  -- Images (Array of strings/urls)
  images jsonb default '[]'
);

-- 3. Create VIEW for Stock Summary (Real-time calculation)
create or replace view stock_summary as
select 
  p.name as item_name,
  p.unit,
  -- Total IN
  coalesce(sum(case when t.type = 'IN' then t.qty else 0 end), 0) as total_in,
  -- Total OUT (Consume + Borrow + Out)
  coalesce(sum(case when t.type in ('OUT', 'BORROW', 'CONSUME') then t.qty else 0 end), 0) as total_out,
  -- Total RETURN (Add back to shelf)
  coalesce(sum(case when t.type = 'RETURN' then t.qty else 0 end), 0) as total_return,
  -- Balance = IN - OUTs + RETURNS
  (
    coalesce(sum(case when t.type = 'IN' then t.qty else 0 end), 0) 
    - coalesce(sum(case when t.type in ('OUT', 'BORROW', 'CONSUME') then t.qty else 0 end), 0)
    + coalesce(sum(case when t.type = 'RETURN' then t.qty else 0 end), 0)
  ) as balance,
  max(t.created_at) as last_movement
from products p
left join transactions t on p.name = t.product_name
group by p.id, p.name, p.unit;

-- 4. Enable Public Access (Since we use Anon Key for everything initially)
alter table products enable row level security;
alter table transactions enable row level security;

create policy "Public Access Products" on products for all using (true) with check (true);
create policy "Public Access Transactions" on transactions for all using (true) with check (true);

-- 5. Insert Dummy Data (Initial Products)
insert into products (name, unit, category) values
('MacBook Pro M1', 'เครื่อง', 'IT'),
('Mouse Wireless', 'อัน', 'IT'),
('HDMI Cable', 'เส้น', 'AV'),
('Adapter USB-C', 'อัน', 'IT')
on conflict (name) do nothing;

-- 6. Insert Logic for Initial Stock (Optional - Manual Transaction)
-- insert into transactions (type, product_name, qty, unit, remark) values ('IN', 'MacBook Pro M1', 10, 'เครื่อง', 'Initial Stock');
