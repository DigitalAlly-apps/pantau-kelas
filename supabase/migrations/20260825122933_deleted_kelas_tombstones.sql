create table if not exists public.deleted_kelas (
  kelas_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  deleted_at timestamptz not null default timezone('utc', now()),
  primary key (kelas_id, user_id)
);

alter table public.deleted_kelas enable row level security;

grant select, insert, update, delete on public.deleted_kelas to authenticated;

create policy "Users can view their deleted classes"
  on public.deleted_kelas for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can record their deleted classes"
  on public.deleted_kelas for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their deleted classes"
  on public.deleted_kelas for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can remove their deleted classes"
  on public.deleted_kelas for delete
  to authenticated
  using ((select auth.uid()) = user_id);
