create table public.push_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  subscription jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

create table public.push_notification_deliveries (
  id uuid primary key default uuid_generate_v4(),
  kasus_id text not null references public.kasus_records(id) on delete cascade,
  endpoint text not null,
  scheduled_date text not null,
  scheduled_time text not null,
  sent_at timestamptz not null default now(),
  unique (kasus_id, endpoint, scheduled_date, scheduled_time)
);

alter table public.push_subscriptions enable row level security;
alter table public.push_notification_deliveries enable row level security;

grant select, insert, update, delete on public.push_subscriptions to authenticated;

create policy "Users can view their own push subscriptions"
  on public.push_subscriptions for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can add their own push subscriptions"
  on public.push_subscriptions for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own push subscriptions"
  on public.push_subscriptions for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can remove their own push subscriptions"
  on public.push_subscriptions for delete to authenticated
  using ((select auth.uid()) = user_id);
