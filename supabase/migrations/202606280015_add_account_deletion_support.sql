alter table public.couples
drop constraint if exists couples_created_by_fkey;

alter table public.couples
alter column created_by drop not null;

alter table public.couples
add constraint couples_created_by_fkey
foreign key (created_by)
references auth.users (id)
on delete set null;
