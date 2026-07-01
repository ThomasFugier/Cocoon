create table if not exists public.push_receipts (
  id uuid primary key default gen_random_uuid(),
  notification_event_id uuid references public.notification_events (id) on delete cascade,
  expo_ticket_id text not null unique,
  expo_push_token text not null,
  status text not null default 'pending' check (status in ('pending', 'ok', 'error')),
  error text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  checked_at timestamptz
);

create index if not exists push_receipts_pending_idx
on public.push_receipts (status, created_at)
where status = 'pending';

create index if not exists push_receipts_event_idx
on public.push_receipts (notification_event_id);

alter table public.push_receipts enable row level security;
