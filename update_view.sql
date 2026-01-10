create or replace view stock_summary as
with all_transactions as (
    select 
        product_name,
        qty,
        type,
        created_at,
        zone,
        channel,
        unit
    from transactions
),
product_balances as (
    select 
        product_name,
        unit,
        sum(case when type = 'IN' then qty else 0 end) as total_in,
        sum(case when type in ('OUT', 'BORROW', 'CONSUME') then qty else 0 end) as total_out,
        sum(case when type = 'RETURN' then qty else 0 end) as total_return,
        max(created_at) as last_movement
    from all_transactions
    group by product_name, unit
),
last_locations as (
    select distinct on (product_name)
        product_name,
        zone,
        channel
    from transactions
    where type = 'IN' and zone is not null and channel is not null
    order by product_name, created_at desc
)
select 
    pb.product_name as item_name,
    pb.unit,
    pb.total_in,
    pb.total_out,
    pb.total_return,
    (pb.total_in - pb.total_out + pb.total_return) as balance,
    pb.last_movement,
    coalesce(ll.zone, '') as zone,
    coalesce(ll.channel, '') as channel
from product_balances pb
left join last_locations ll on pb.product_name = ll.product_name;
