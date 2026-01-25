-- Enable insert/update for authenticated users on books table
-- This is required because users insert new books when reading/scraping from API.

create policy "Enable insert for authenticated users only"
on "public"."books"
as permissive
for insert
to authenticated
with check (true);

create policy "Enable update for authenticated users only"
on "public"."books"
as permissive
for update
to authenticated
using (true)
with check (true);
