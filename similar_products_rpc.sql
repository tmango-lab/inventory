-- Enable the pg_trgm extension for fuzzy string matching
create extension if not exists pg_trgm;

-- DROP the existing function first because we are changing the return type (float -> real)
-- Postgres prevents changing return type with just "OR REPLACE"
drop function if exists check_similar_products(text, float);
drop function if exists check_similar_products(text, double precision);

-- Create the function with the correct return type
create or replace function check_similar_products(search_term text, threshold float)
returns table (
  id uuid,
  product_name text,
  similarity_score real -- Correct type matching pg_trgm
) language plpgsql security definer as $$
begin
  return query
  select
    p.id,
    p.name as product_name,
    similarity(p.name, search_term) as similarity_score
  from products p
  where similarity(p.name, search_term) > threshold
  order by similarity_score desc
  limit 5;
end;
$$;
