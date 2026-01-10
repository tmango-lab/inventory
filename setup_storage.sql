-- 1. Create a new storage bucket called 'images'
insert into storage.buckets (id, name, public) 
values ('images', 'images', true);

-- 2. Enable policy to allow ANYONE to upload (for Anon Key usage)
create policy "Public Access Upload" 
on storage.objects for insert 
with check ( bucket_id = 'images' );

-- 3. Enable policy to allow ANYONE to view (download)
create policy "Public Access View" 
on storage.objects for select 
using ( bucket_id = 'images' );

-- 4. Enable policy to allow ANYONE to update/delete (Optional, for managing files)
create policy "Public Access Update" 
on storage.objects for update 
using ( bucket_id = 'images' );

create policy "Public Access Delete" 
on storage.objects for delete 
using ( bucket_id = 'images' );
