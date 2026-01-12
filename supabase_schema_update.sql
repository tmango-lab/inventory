-- Create table for Shelf Configurations
create table if not exists shelf_configs (
  zone text primary key,
  floors int not null default 1,
  slots_per_floor int not null default 1,
  created_at timestamptz default now()
);

-- Insert default zones if table is empty (Migration helper)
insert into shelf_configs (zone, floors, slots_per_floor)
select 'A', 5, 5
where not exists (select 1 from shelf_configs where zone = 'A');

insert into shelf_configs (zone, floors, slots_per_floor)
select 'B', 5, 5
where not exists (select 1 from shelf_configs where zone = 'B');

insert into shelf_configs (zone, floors, slots_per_floor)
select 'C', 5, 5
where not exists (select 1 from shelf_configs where zone = 'C');

-- Enable RLS (Optional, depending on your policy needs)
alter table shelf_configs enable row level security;

create policy "Enable all access for all users" on shelf_configs
for all using (true) with check (true);
