create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  color text not null default 'rose',
  vibe text not null default '',
  status_emoji text not null default '💖',
  status_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
add column if not exists status_emoji text not null default '💖';

alter table public.profiles
add column if not exists status_updated_at timestamptz not null default now();

create table if not exists public.couples (
  id uuid primary key default gen_random_uuid(),
  invite_code text not null unique,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.couple_members (
  couple_id uuid not null references public.couples (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('creator', 'partner')),
  joined_at timestamptz not null default now(),
  primary key (couple_id, user_id)
);

create table if not exists public.desire_cards (
  id text primary key,
  title text not null,
  category text not null check (category in ('Vanille', 'Sensuel', 'Séduction', 'Hot', 'Jeux & Défis', 'Scénarios', 'Kinky Soft', 'BDSM', 'Plaisirs explicites', 'Tabous', 'Perso')),
  kind text not null check (kind in ('practice', 'discussion')),
  mood text not null check (mood in ('calme', 'sensuel', 'aventureux')),
  emoji text not null default '💖',
  blurb text not null,
  safety text,
  sort_order int not null default 0
);

create table if not exists public.custom_desire_cards (
  id text primary key,
  couple_id uuid not null references public.couples (id) on delete cascade,
  created_by uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 3 and 70),
  category text not null check (category in ('Vanille', 'Sensuel', 'Séduction', 'Hot', 'Jeux & Défis', 'Scénarios', 'Kinky Soft', 'BDSM', 'Plaisirs explicites', 'Tabous', 'Perso')),
  kind text not null default 'practice' check (kind in ('practice', 'discussion')),
  mood text not null default 'sensuel' check (mood in ('calme', 'sensuel', 'aventureux')),
  emoji text not null default '💖',
  blurb text not null check (char_length(blurb) between 8 and 150),
  created_at timestamptz not null default now()
);

create index if not exists custom_desire_cards_couple_id_idx
on public.custom_desire_cards (couple_id, created_at desc);

alter table public.custom_desire_cards
add column if not exists emoji text not null default '💖';

alter table public.desire_cards
add column if not exists emoji text not null default '💖';

alter table public.desire_cards
drop constraint if exists desire_cards_category_check;

delete from public.desire_cards
where category not in ('Vanille', 'Sensuel', 'Séduction', 'Hot', 'Jeux & Défis', 'Scénarios', 'Kinky Soft', 'BDSM', 'Plaisirs explicites', 'Tabous');

alter table public.desire_cards
add constraint desire_cards_category_check
check (category in ('Vanille', 'Sensuel', 'Séduction', 'Hot', 'Jeux & Défis', 'Scénarios', 'Kinky Soft', 'BDSM', 'Plaisirs explicites', 'Tabous', 'Perso'));

alter table public.custom_desire_cards
drop constraint if exists custom_desire_cards_category_check;

alter table public.custom_desire_cards
add constraint custom_desire_cards_category_check
check (category in ('Vanille', 'Sensuel', 'Séduction', 'Hot', 'Jeux & Défis', 'Scénarios', 'Kinky Soft', 'BDSM', 'Plaisirs explicites', 'Tabous', 'Perso'));

create table if not exists public.couple_category_unlocks (
  couple_id uuid not null references public.couples (id) on delete cascade,
  category text not null check (category in ('Sensuel', 'Séduction', 'Hot', 'Jeux & Défis', 'Scénarios', 'Kinky Soft', 'BDSM', 'Plaisirs explicites', 'Tabous')),
  unlocked_by uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  source text not null default 'iap',
  unlocked_at timestamptz not null default now(),
  primary key (couple_id, category)
);

create index if not exists couple_category_unlocks_couple_id_idx
on public.couple_category_unlocks (couple_id, unlocked_at desc);

alter table public.couple_category_unlocks
drop constraint if exists couple_category_unlocks_category_check;

delete from public.couple_category_unlocks
where category not in ('Sensuel', 'Séduction', 'Hot', 'Jeux & Défis', 'Scénarios', 'Kinky Soft', 'BDSM', 'Plaisirs explicites', 'Tabous');

alter table public.couple_category_unlocks
add constraint couple_category_unlocks_category_check
check (category in ('Sensuel', 'Séduction', 'Hot', 'Jeux & Défis', 'Scénarios', 'Kinky Soft', 'BDSM', 'Plaisirs explicites', 'Tabous'));

create table if not exists public.couple_feature_unlocks (
  couple_id uuid not null references public.couples (id) on delete cascade,
  feature text not null check (feature in ('custom_cards_unlimited', 'no_ads', 'unlimited_responses')),
  unlocked_by uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  source text not null default 'iap',
  unlocked_at timestamptz not null default now(),
  primary key (couple_id, feature)
);

create index if not exists couple_feature_unlocks_couple_id_idx
on public.couple_feature_unlocks (couple_id, unlocked_at desc);

alter table public.couple_feature_unlocks
drop constraint if exists couple_feature_unlocks_feature_check;

alter table public.couple_feature_unlocks
add constraint couple_feature_unlocks_feature_check
check (feature in ('custom_cards_unlimited', 'no_ads', 'unlimited_responses'));

create table if not exists public.desire_votes (
  couple_id uuid not null references public.couples (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  card_id text not null,
  level int not null check (level between 0 and 3),
  updated_at timestamptz not null default now(),
  primary key (couple_id, user_id, card_id)
);

alter table public.desire_votes
drop constraint if exists desire_votes_card_id_fkey;

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text not null default '',
  linked_card_id text,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (char_length(body) <= 2000),
  check (expires_at > created_at and expires_at <= created_at + interval '25 hours')
);

create index if not exists chat_messages_couple_created_idx
on public.chat_messages (couple_id, created_at desc);

create index if not exists chat_messages_expires_idx
on public.chat_messages (expires_at);

create table if not exists public.chat_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.chat_messages (id) on delete cascade,
  couple_id uuid not null references public.couples (id) on delete cascade,
  uploaded_by uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  storage_path text not null unique,
  mime_type text not null default 'image/jpeg',
  name text,
  width int,
  height int,
  size_bytes int,
  created_at timestamptz not null default now()
);

create index if not exists chat_attachments_message_idx
on public.chat_attachments (message_id);

create index if not exists chat_attachments_couple_idx
on public.chat_attachments (couple_id, created_at desc);

create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  expo_push_token text not null unique,
  platform text not null check (platform in ('ios', 'android', 'web', 'unknown')),
  device_id text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists push_tokens_user_idx
on public.push_tokens (user_id, enabled, last_seen_at desc);

create table if not exists public.notification_preferences (
  couple_id uuid not null references public.couples (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  chat_message_enabled boolean not null default false,
  daily_reminder_enabled boolean not null default false,
  match_reveal_enabled boolean not null default false,
  mood_signal_enabled boolean not null default false,
  mood_signal_prompt_seen boolean not null default false,
  promotion_enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (couple_id, user_id)
);

create table if not exists public.couple_moods (
  couple_id uuid not null references public.couples (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  level int not null default 0 check (level between 0 and 3),
  updated_at timestamptz not null default now(),
  primary key (couple_id, user_id)
);

create table if not exists public.notification_events (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid references public.couples (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  event_type text not null check (event_type in ('chat_message', 'new_match', 'mood_aligned', 'daily_reminder', 'promotion')),
  dedupe_key text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued' check (status in ('queued', 'sent', 'skipped', 'failed')),
  error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

drop index if exists notification_events_dedupe_idx;
create unique index notification_events_dedupe_idx
on public.notification_events (couple_id, recipient_id, event_type, dedupe_key);

create index if not exists notification_events_couple_idx
on public.notification_events (couple_id, created_at desc);

create table if not exists public.daily_response_usage (
  couple_id uuid not null references public.couples (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  date_key text not null,
  count int not null default 0 check (count >= 0),
  updated_at timestamptz not null default now(),
  primary key (couple_id, user_id, date_key)
);

create index if not exists daily_response_usage_user_idx
on public.daily_response_usage (user_id, date_key);

create table if not exists public.purchase_entitlements (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  entitlement text not null,
  product_id text not null,
  store text not null default 'unknown' check (store in ('apple', 'google', 'stripe', 'manual', 'unknown')),
  transaction_id text,
  status text not null default 'active' check (status in ('active', 'revoked', 'expired')),
  purchased_by uuid references public.profiles (id) on delete set null,
  source text not null default 'server',
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists purchase_entitlements_transaction_idx
on public.purchase_entitlements (store, transaction_id)
where transaction_id is not null;

create index if not exists purchase_entitlements_couple_idx
on public.purchase_entitlements (couple_id, status, entitlement);

alter table public.purchase_entitlements
drop constraint if exists purchase_entitlements_couple_entitlement_key;

alter table public.purchase_entitlements
add constraint purchase_entitlements_couple_entitlement_key unique (couple_id, entitlement);

create table if not exists public.match_reveals (
  couple_id uuid not null references public.couples (id) on delete cascade,
  card_id text not null,
  first_matched_at timestamptz not null default now(),
  revealed_by uuid references public.profiles (id) on delete set null,
  revealed_at timestamptz,
  primary key (couple_id, card_id)
);

create index if not exists match_reveals_couple_idx
on public.match_reveals (couple_id, first_matched_at desc);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-attachments',
  'chat-attachments',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists desire_votes_touch_updated_at on public.desire_votes;
create trigger desire_votes_touch_updated_at
before update on public.desire_votes
for each row execute function public.touch_updated_at();

drop trigger if exists notification_preferences_touch_updated_at on public.notification_preferences;
create trigger notification_preferences_touch_updated_at
before update on public.notification_preferences
for each row execute function public.touch_updated_at();

drop trigger if exists couple_moods_touch_updated_at on public.couple_moods;
create trigger couple_moods_touch_updated_at
before update on public.couple_moods
for each row execute function public.touch_updated_at();

drop trigger if exists daily_response_usage_touch_updated_at on public.daily_response_usage;
create trigger daily_response_usage_touch_updated_at
before update on public.daily_response_usage
for each row execute function public.touch_updated_at();

drop trigger if exists purchase_entitlements_touch_updated_at on public.purchase_entitlements;
create trigger purchase_entitlements_touch_updated_at
before update on public.purchase_entitlements
for each row execute function public.touch_updated_at();

alter table public.profiles enable row level security;
alter table public.couples enable row level security;
alter table public.couple_members enable row level security;
alter table public.desire_cards enable row level security;
alter table public.custom_desire_cards enable row level security;
alter table public.couple_category_unlocks enable row level security;
alter table public.couple_feature_unlocks enable row level security;
alter table public.desire_votes enable row level security;
alter table public.chat_messages enable row level security;
alter table public.chat_attachments enable row level security;
alter table public.push_tokens enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.couple_moods enable row level security;
alter table public.notification_events enable row level security;
alter table public.daily_response_usage enable row level security;
alter table public.purchase_entitlements enable row level security;
alter table public.match_reveals enable row level security;

create or replace function public.is_couple_member(p_couple_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.couple_members
    where couple_id = p_couple_id
      and user_id = auth.uid()
  );
$$;

create or replace function public.shares_couple_with(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_user_id = auth.uid()
    or exists (
      select 1
      from public.couple_members mine
      join public.couple_members theirs on theirs.couple_id = mine.couple_id
      where mine.user_id = auth.uid()
        and theirs.user_id = p_user_id
    );
$$;

create or replace function public.card_available_to_couple(p_couple_id uuid, p_card_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.desire_cards cards
    where cards.id = p_card_id
      and (
        cards.category in ('Vanille', 'Perso')
        or exists (
          select 1
          from public.couple_category_unlocks unlocks
          where unlocks.couple_id = p_couple_id
            and unlocks.category = cards.category
        )
      )
  )
  or exists (
    select 1
    from public.custom_desire_cards cards
    where cards.id = p_card_id
      and cards.couple_id = p_couple_id
      and (
        cards.category in ('Vanille', 'Perso')
        or exists (
          select 1
          from public.couple_category_unlocks unlocks
          where unlocks.couple_id = p_couple_id
            and unlocks.category = cards.category
        )
      )
  );
$$;

create or replace function public.current_couple_id(p_couple_id uuid default null)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_couple_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if p_couple_id is not null then
    if not public.is_couple_member(p_couple_id) then
      raise exception 'not_couple_member';
    end if;

    return p_couple_id;
  end if;

  select cm.couple_id into v_couple_id
  from public.couple_members cm
  join public.couples c on c.id = cm.couple_id
  where cm.user_id = auth.uid()
  order by cm.joined_at desc, c.created_at desc
  limit 1;

  return v_couple_id;
end;
$$;

create or replace function public.has_couple_feature(p_couple_id uuid, p_feature text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.couple_feature_unlocks unlocks
    where unlocks.couple_id = p_couple_id
      and unlocks.feature = p_feature
  )
  or exists (
    select 1
    from public.purchase_entitlements entitlements
    where entitlements.couple_id = p_couple_id
      and entitlements.entitlement = p_feature
      and entitlements.status = 'active'
      and (entitlements.expires_at is null or entitlements.expires_at > now())
  );
$$;

create or replace function public.today_key()
returns text
language sql
stable
as $$
  select to_char((now() at time zone 'Europe/Paris')::date, 'YYYY-MM-DD');
$$;

create or replace function public.next_chat_expiry()
returns timestamptz
language plpgsql
stable
as $$
declare
  v_local_now timestamp := now() at time zone 'Europe/Paris';
  v_local_expiry timestamp;
begin
  v_local_expiry := date_trunc('day', v_local_now) + interval '6 hours';

  if v_local_expiry <= v_local_now then
    v_local_expiry := v_local_expiry + interval '1 day';
  end if;

  return v_local_expiry at time zone 'Europe/Paris';
end;
$$;

create or replace function public.storage_path_couple_id(p_name text)
returns uuid
language plpgsql
stable
security definer
set search_path = public, storage
as $$
declare
  v_first_folder text;
begin
  v_first_folder := (storage.foldername(p_name))[1];
  return v_first_folder::uuid;
exception when others then
  return null;
end;
$$;

create or replace function public.ensure_match_reveal(p_couple_id uuid, p_card_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1
    from public.desire_votes votes
    where votes.couple_id = p_couple_id
      and votes.card_id = p_card_id
    group by votes.couple_id, votes.card_id
    having count(*) filter (where votes.level >= 1) = 2
  ) then
    insert into public.match_reveals (couple_id, card_id)
    values (p_couple_id, p_card_id)
    on conflict (couple_id, card_id) do nothing;
  end if;
end;
$$;

create or replace function public.desire_vote_after_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.ensure_match_reveal(new.couple_id, new.card_id);
  return new;
end;
$$;

drop trigger if exists desire_votes_create_match_reveal on public.desire_votes;
create trigger desire_votes_create_match_reveal
after insert or update on public.desire_votes
for each row execute function public.desire_vote_after_write();

drop policy if exists "profiles_read_couple" on public.profiles;
create policy "profiles_read_couple"
on public.profiles for select
using (public.shares_couple_with(id));

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self"
on public.profiles for insert
with check (id = auth.uid());

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
on public.profiles for update
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "couples_read_members" on public.couples;
create policy "couples_read_members"
on public.couples for select
using (public.is_couple_member(id));

drop policy if exists "couples_insert_creator" on public.couples;
create policy "couples_insert_creator"
on public.couples for insert
with check (created_by = auth.uid());

drop policy if exists "couple_members_read_own_couple" on public.couple_members;
create policy "couple_members_read_own_couple"
on public.couple_members for select
using (public.is_couple_member(couple_id));

drop policy if exists "couple_members_insert_self" on public.couple_members;
create policy "couple_members_insert_self"
on public.couple_members for insert
with check (user_id = auth.uid());

drop policy if exists "desire_cards_read_all" on public.desire_cards;
create policy "desire_cards_read_all"
on public.desire_cards for select
using (true);

drop policy if exists "custom_desire_cards_read_members" on public.custom_desire_cards;
create policy "custom_desire_cards_read_members"
on public.custom_desire_cards for select
using (public.is_couple_member(couple_id));

drop policy if exists "custom_desire_cards_insert_members" on public.custom_desire_cards;
create policy "custom_desire_cards_insert_members"
on public.custom_desire_cards for insert
with check (
  created_by = auth.uid()
  and public.is_couple_member(couple_id)
);

drop policy if exists "couple_category_unlocks_read_members" on public.couple_category_unlocks;
create policy "couple_category_unlocks_read_members"
on public.couple_category_unlocks for select
using (public.is_couple_member(couple_id));

drop policy if exists "couple_category_unlocks_insert_members" on public.couple_category_unlocks;

drop policy if exists "couple_feature_unlocks_read_members" on public.couple_feature_unlocks;
create policy "couple_feature_unlocks_read_members"
on public.couple_feature_unlocks for select
using (public.is_couple_member(couple_id));

drop policy if exists "couple_feature_unlocks_insert_members" on public.couple_feature_unlocks;

drop policy if exists "desire_votes_read_own" on public.desire_votes;
create policy "desire_votes_read_own"
on public.desire_votes for select
using (user_id = auth.uid());

drop policy if exists "desire_votes_insert_own_member" on public.desire_votes;
create policy "desire_votes_insert_own_member"
on public.desire_votes for insert
with check (
  user_id = auth.uid()
  and public.is_couple_member(couple_id)
);

drop policy if exists "desire_votes_update_own" on public.desire_votes;
create policy "desire_votes_update_own"
on public.desire_votes for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "chat_messages_read_members" on public.chat_messages;
create policy "chat_messages_read_members"
on public.chat_messages for select
using (public.is_couple_member(couple_id));

drop policy if exists "chat_messages_insert_author" on public.chat_messages;
create policy "chat_messages_insert_author"
on public.chat_messages for insert
with check (
  author_id = auth.uid()
  and public.is_couple_member(couple_id)
);

drop policy if exists "chat_attachments_read_members" on public.chat_attachments;
create policy "chat_attachments_read_members"
on public.chat_attachments for select
using (public.is_couple_member(couple_id));

drop policy if exists "chat_attachments_insert_uploader" on public.chat_attachments;
create policy "chat_attachments_insert_uploader"
on public.chat_attachments for insert
with check (
  uploaded_by = auth.uid()
  and public.is_couple_member(couple_id)
);

drop policy if exists "push_tokens_read_own" on public.push_tokens;
create policy "push_tokens_read_own"
on public.push_tokens for select
using (user_id = auth.uid());

drop policy if exists "push_tokens_insert_own" on public.push_tokens;
create policy "push_tokens_insert_own"
on public.push_tokens for insert
with check (user_id = auth.uid());

drop policy if exists "push_tokens_update_own" on public.push_tokens;
create policy "push_tokens_update_own"
on public.push_tokens for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "notification_preferences_read_own" on public.notification_preferences;
create policy "notification_preferences_read_own"
on public.notification_preferences for select
using (user_id = auth.uid() and public.is_couple_member(couple_id));

drop policy if exists "notification_preferences_insert_own" on public.notification_preferences;
create policy "notification_preferences_insert_own"
on public.notification_preferences for insert
with check (user_id = auth.uid() and public.is_couple_member(couple_id));

drop policy if exists "notification_preferences_update_own" on public.notification_preferences;
create policy "notification_preferences_update_own"
on public.notification_preferences for update
using (user_id = auth.uid() and public.is_couple_member(couple_id))
with check (user_id = auth.uid() and public.is_couple_member(couple_id));

drop policy if exists "couple_moods_read_members" on public.couple_moods;
create policy "couple_moods_read_members"
on public.couple_moods for select
using (public.is_couple_member(couple_id));

drop policy if exists "couple_moods_insert_own" on public.couple_moods;
create policy "couple_moods_insert_own"
on public.couple_moods for insert
with check (user_id = auth.uid() and public.is_couple_member(couple_id));

drop policy if exists "couple_moods_update_own" on public.couple_moods;
create policy "couple_moods_update_own"
on public.couple_moods for update
using (user_id = auth.uid() and public.is_couple_member(couple_id))
with check (user_id = auth.uid() and public.is_couple_member(couple_id));

drop policy if exists "notification_events_read_recipient" on public.notification_events;
create policy "notification_events_read_recipient"
on public.notification_events for select
using (recipient_id = auth.uid());

drop policy if exists "daily_response_usage_read_own" on public.daily_response_usage;
create policy "daily_response_usage_read_own"
on public.daily_response_usage for select
using (user_id = auth.uid() and public.is_couple_member(couple_id));

drop policy if exists "purchase_entitlements_read_members" on public.purchase_entitlements;
create policy "purchase_entitlements_read_members"
on public.purchase_entitlements for select
using (public.is_couple_member(couple_id));

drop policy if exists "match_reveals_read_members" on public.match_reveals;
create policy "match_reveals_read_members"
on public.match_reveals for select
using (public.is_couple_member(couple_id));

drop policy if exists "chat_storage_read_members" on storage.objects;
create policy "chat_storage_read_members"
on storage.objects for select
using (
  bucket_id = 'chat-attachments'
  and public.is_couple_member(public.storage_path_couple_id(name))
);

drop policy if exists "chat_storage_insert_members" on storage.objects;
create policy "chat_storage_insert_members"
on storage.objects for insert
with check (
  bucket_id = 'chat-attachments'
  and public.is_couple_member(public.storage_path_couple_id(name))
);

drop policy if exists "chat_storage_delete_members" on storage.objects;
create policy "chat_storage_delete_members"
on storage.objects for delete
using (
  bucket_id = 'chat-attachments'
  and public.is_couple_member(public.storage_path_couple_id(name))
);

create or replace function public.generate_invite_code()
returns text
language plpgsql
as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text := '';
  index int;
begin
  for index in 1..6 loop
    code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  end loop;
  return code;
end;
$$;

drop function if exists public.create_couple(text, text, text);
drop function if exists public.join_couple(text, text, text, text);

create or replace function public.create_couple(
  p_display_name text,
  p_color text,
  p_status_emoji text,
  p_vibe text
)
returns table (couple_id uuid, invite_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_code text;
  v_couple_id uuid;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  insert into public.profiles (id, display_name, color, vibe, status_emoji, status_updated_at)
  values (v_user_id, p_display_name, p_color, coalesce(p_vibe, ''), coalesce(nullif(trim(p_status_emoji), ''), '💖'), now())
  on conflict (id) do update
  set display_name = excluded.display_name,
      color = excluded.color,
      vibe = excluded.vibe,
      status_emoji = excluded.status_emoji,
      status_updated_at = now();

  loop
    v_code := public.generate_invite_code();
    begin
      insert into public.couples (invite_code, created_by)
      values (v_code, v_user_id)
      returning id into v_couple_id;
      exit;
    exception when unique_violation then
      -- Try another short code.
    end;
  end loop;

  insert into public.couple_members (couple_id, user_id, role)
  values (v_couple_id, v_user_id, 'creator')
  on conflict do nothing;

  return query select v_couple_id, v_code;
end;
$$;

create or replace function public.join_couple(
  p_invite_code text,
  p_display_name text,
  p_color text,
  p_status_emoji text,
  p_vibe text
)
returns table (couple_id uuid, invite_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_couple public.couples%rowtype;
  v_member_count int;
  v_already_member boolean;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  select couples.* into v_couple
  from public.couples as couples
  where couples.invite_code = upper(trim(p_invite_code));

  if v_couple.id is null then
    raise exception 'invalid_invite_code';
  end if;

  select count(*) into v_member_count
  from public.couple_members as members
  where members.couple_id = v_couple.id;

  select exists (
    select 1
    from public.couple_members as members
    where members.couple_id = v_couple.id
      and members.user_id = v_user_id
  ) into v_already_member;

  if v_member_count >= 2 and not v_already_member then
    raise exception 'couple_full';
  end if;

  insert into public.profiles (id, display_name, color, vibe, status_emoji, status_updated_at)
  values (v_user_id, p_display_name, p_color, coalesce(p_vibe, ''), coalesce(nullif(trim(p_status_emoji), ''), '💖'), now())
  on conflict (id) do update
  set display_name = excluded.display_name,
      color = excluded.color,
      vibe = excluded.vibe,
      status_emoji = excluded.status_emoji,
      status_updated_at = now();

  insert into public.couple_members (couple_id, user_id, role)
  values (v_couple.id, v_user_id, 'partner')
  on conflict do nothing;

  return query select v_couple.id, v_couple.invite_code;
end;
$$;

create or replace function public.get_couple_members(
  p_couple_id uuid
)
returns table (
  role text,
  is_current_user boolean,
  display_name text,
  color text,
  vibe text,
  status_emoji text,
  status_updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    cm.role,
    cm.user_id = auth.uid() as is_current_user,
    p.display_name,
    p.color,
    p.vibe,
    p.status_emoji,
    p.status_updated_at
  from public.couple_members cm
  join public.profiles p on p.id = cm.user_id
  where cm.couple_id = p_couple_id
    and public.is_couple_member(p_couple_id)
  order by case cm.role when 'creator' then 0 else 1 end;
$$;

create or replace function public.update_profile_status(
  p_couple_id uuid,
  p_status_emoji text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  if not public.is_couple_member(p_couple_id) then
    raise exception 'not_couple_member';
  end if;

  update public.profiles
  set status_emoji = coalesce(nullif(trim(p_status_emoji), ''), '💖'),
      status_updated_at = now()
  where id = v_user_id;
end;
$$;

drop function if exists public.get_couple_matches(uuid, int);

create or replace function public.get_couple_matches(
  p_couple_id uuid,
  p_threshold int default 2
)
returns table (
  card_id text,
  title text,
  emoji text,
  category text,
  kind text,
  mood text,
  blurb text,
  safety text,
  my_level int,
  partner_level int
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.couple_members
    where couple_id = p_couple_id
      and user_id = auth.uid()
  ) then
    raise exception 'not_couple_member';
  end if;

  return query
  with available_cards as (
    select
      cards.id,
      cards.title,
      cards.emoji,
      cards.category,
      cards.kind,
      cards.mood,
      cards.blurb,
      cards.safety
    from public.desire_cards cards
    where cards.category in ('Vanille', 'Perso')
      or exists (
        select 1
        from public.couple_category_unlocks unlocks
        where unlocks.couple_id = p_couple_id
          and unlocks.category = cards.category
      )

    union all

    select
      cards.id,
      cards.title,
      cards.emoji,
      cards.category,
      cards.kind,
      cards.mood,
      cards.blurb,
      null::text as safety
    from public.custom_desire_cards cards
    where cards.couple_id = p_couple_id
      and (
        cards.category in ('Vanille', 'Perso')
        or exists (
          select 1
          from public.couple_category_unlocks unlocks
          where unlocks.couple_id = p_couple_id
            and unlocks.category = cards.category
        )
      )
  )
  select
    cards.id as card_id,
    cards.title,
    cards.emoji,
    cards.category,
    cards.kind,
    cards.mood,
    cards.blurb,
    cards.safety,
    max(votes.level) filter (where votes.user_id = auth.uid()) as my_level,
    max(votes.level) filter (where votes.user_id <> auth.uid()) as partner_level
  from available_cards cards
  join public.desire_votes votes on votes.card_id = cards.id
  where votes.couple_id = p_couple_id
  group by cards.id, cards.title, cards.emoji, cards.category, cards.kind, cards.mood, cards.blurb, cards.safety
  having count(*) filter (where votes.level >= p_threshold) = 2;
end;
$$;

drop function if exists public.get_revealable_matches(uuid, int);

create or replace function public.get_revealable_matches(
  p_couple_id uuid default null,
  p_threshold int default 1
)
returns table (
  card_id text,
  title text,
  emoji text,
  category text,
  kind text,
  mood text,
  blurb text,
  safety text,
  my_level int,
  partner_level int,
  first_matched_at timestamptz,
  revealed_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_couple_id uuid := public.current_couple_id(p_couple_id);
begin
  if v_couple_id is null then
    return;
  end if;

  return query
  with available_cards as (
    select
      id,
      title,
      emoji,
      category,
      kind,
      mood,
      blurb,
      safety
    from public.desire_cards cards
    where cards.category in ('Vanille', 'Perso')
      or exists (
        select 1
        from public.couple_category_unlocks unlocks
        where unlocks.couple_id = v_couple_id
          and unlocks.category = cards.category
      )

    union all

    select
      id,
      title,
      emoji,
      category,
      kind,
      mood,
      blurb,
      null::text as safety
    from public.custom_desire_cards cards
    where cards.couple_id = v_couple_id
      and (
        cards.category in ('Vanille', 'Perso')
        or exists (
          select 1
          from public.couple_category_unlocks unlocks
          where unlocks.couple_id = v_couple_id
            and unlocks.category = cards.category
        )
      )
  )
  select
    cards.id as card_id,
    cards.title,
    cards.emoji,
    cards.category,
    cards.kind,
    cards.mood,
    cards.blurb,
    cards.safety,
    max(votes.level) filter (where votes.user_id = auth.uid()) as my_level,
    max(votes.level) filter (where votes.user_id <> auth.uid()) as partner_level,
    max(reveals.first_matched_at) as first_matched_at,
    max(reveals.revealed_at) as revealed_at
  from available_cards cards
  join public.desire_votes votes on votes.card_id = cards.id
  left join public.match_reveals reveals
    on reveals.couple_id = v_couple_id
    and reveals.card_id = cards.id
  where votes.couple_id = v_couple_id
  group by cards.id, cards.title, cards.emoji, cards.category, cards.kind, cards.mood, cards.blurb, cards.safety
  having count(*) filter (where votes.level >= p_threshold) = 2;
end;
$$;

drop function if exists public.get_my_couple_state(uuid);

create or replace function public.get_my_couple_state(
  p_couple_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_couple_id uuid := public.current_couple_id(p_couple_id);
  v_today text := public.today_key();
begin
  if v_couple_id is null then
    return null;
  end if;

  return jsonb_build_object(
    'couple', (
      select to_jsonb(c)
      from (
        select id, invite_code, created_at
        from public.couples
        where id = v_couple_id
      ) c
    ),
    'members', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'user_id', cm.user_id,
          'role', cm.role,
          'is_current_user', cm.user_id = auth.uid(),
          'display_name', p.display_name,
          'color', p.color,
          'vibe', p.vibe,
          'status_emoji', p.status_emoji,
          'status_updated_at', p.status_updated_at,
          'joined_at', cm.joined_at
        )
        order by case cm.role when 'creator' then 0 else 1 end
      )
      from public.couple_members cm
      join public.profiles p on p.id = cm.user_id
      where cm.couple_id = v_couple_id
    ), '[]'::jsonb),
    'own_votes', coalesce((
      select jsonb_object_agg(card_id, level)
      from public.desire_votes
      where couple_id = v_couple_id
        and user_id = auth.uid()
    ), '{}'::jsonb),
    'custom_desires', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', id,
          'title', title,
          'emoji', emoji,
          'category', category,
          'kind', kind,
          'mood', mood,
          'blurb', blurb,
          'created_at', created_at,
          'created_by_current_user', created_by = auth.uid()
        )
        order by created_at desc
      )
      from public.custom_desire_cards
      where couple_id = v_couple_id
    ), '[]'::jsonb),
    'category_unlocks', coalesce((
      select jsonb_agg(category order by unlocked_at desc)
      from public.couple_category_unlocks
      where couple_id = v_couple_id
    ), '[]'::jsonb),
    'feature_unlocks', coalesce((
      select jsonb_agg(feature)
      from (
        select distinct feature
        from public.couple_feature_unlocks
        where couple_id = v_couple_id
        union
        select distinct entitlement as feature
        from public.purchase_entitlements
        where couple_id = v_couple_id
          and status = 'active'
          and (expires_at is null or expires_at > now())
      ) features
    ), '[]'::jsonb),
    'purchase_entitlements', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'entitlement', entitlement,
          'product_id', product_id,
          'store', store,
          'status', status,
          'expires_at', expires_at,
          'created_at', created_at
        )
        order by created_at desc
      )
      from public.purchase_entitlements
      where couple_id = v_couple_id
    ), '[]'::jsonb),
    'notification_preferences', (
      select to_jsonb(prefs)
      from (
        select
          chat_message_enabled,
          daily_reminder_enabled,
          match_reveal_enabled,
          mood_signal_enabled,
          mood_signal_prompt_seen,
          promotion_enabled,
          updated_at
        from public.notification_preferences
        where couple_id = v_couple_id
          and user_id = auth.uid()
      ) prefs
    ),
    'moods', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'user_id', user_id,
          'level', level,
          'updated_at', updated_at
        )
        order by updated_at desc
      )
      from public.couple_moods
      where couple_id = v_couple_id
    ), '[]'::jsonb),
    'daily_response_usage', (
      select to_jsonb(usage)
      from (
        select date_key, count, updated_at
        from public.daily_response_usage
        where couple_id = v_couple_id
          and user_id = auth.uid()
          and date_key = v_today
      ) usage
    ),
    'matches', coalesce((
      select jsonb_agg(to_jsonb(matches) order by matches.first_matched_at desc nulls last)
      from public.get_revealable_matches(v_couple_id, 1) matches
    ), '[]'::jsonb),
    'match_reveals', coalesce((
      select jsonb_agg(to_jsonb(reveals) order by first_matched_at desc)
      from (
        select card_id, first_matched_at, revealed_at, revealed_by = auth.uid() as revealed_by_current_user
        from public.match_reveals
        where couple_id = v_couple_id
      ) reveals
    ), '[]'::jsonb),
    'chat_messages', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', messages.id,
          'author_id', messages.author_id,
          'author_is_current_user', messages.author_id = auth.uid(),
          'body', messages.body,
          'linked_card_id', messages.linked_card_id,
          'created_at', messages.created_at,
          'expires_at', messages.expires_at,
          'attachments', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'id', attachments.id,
                'storage_path', attachments.storage_path,
                'mime_type', attachments.mime_type,
                'name', attachments.name,
                'width', attachments.width,
                'height', attachments.height,
                'size_bytes', attachments.size_bytes
              )
              order by attachments.created_at asc
            )
            from public.chat_attachments attachments
            where attachments.message_id = messages.id
          ), '[]'::jsonb)
        )
        order by messages.created_at asc
      )
      from public.chat_messages messages
      where messages.couple_id = v_couple_id
        and messages.expires_at > now()
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.save_desire_vote(
  p_couple_id uuid,
  p_card_id text,
  p_level int
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_previous_level int;
  v_today text := public.today_key();
  v_used_count int;
  v_has_unlimited boolean;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if p_level < 0 or p_level > 3 then
    raise exception 'invalid_level';
  end if;

  if not public.is_couple_member(p_couple_id) then
    raise exception 'not_couple_member';
  end if;

  if not public.card_available_to_couple(p_couple_id, p_card_id) then
    raise exception 'unknown_card';
  end if;

  select level into v_previous_level
  from public.desire_votes
  where couple_id = p_couple_id
    and user_id = auth.uid()
    and card_id = p_card_id;

  if v_previous_level is not null and v_previous_level = p_level then
    return;
  end if;

  v_has_unlimited := public.has_couple_feature(p_couple_id, 'unlimited_responses');

  if not v_has_unlimited then
    insert into public.daily_response_usage (couple_id, user_id, date_key, count)
    values (p_couple_id, auth.uid(), v_today, 0)
    on conflict (couple_id, user_id, date_key) do nothing;

    select count into v_used_count
    from public.daily_response_usage
    where couple_id = p_couple_id
      and user_id = auth.uid()
      and date_key = v_today
    for update;

    if coalesce(v_used_count, 0) >= 5 then
      raise exception 'daily_limit_reached';
    end if;

    update public.daily_response_usage
    set count = count + 1,
        updated_at = now()
    where couple_id = p_couple_id
      and user_id = auth.uid()
      and date_key = v_today;
  end if;

  insert into public.desire_votes (couple_id, user_id, card_id, level)
  values (p_couple_id, auth.uid(), p_card_id, p_level)
  on conflict (couple_id, user_id, card_id) do update
  set level = excluded.level,
      updated_at = now();

  perform public.ensure_match_reveal(p_couple_id, p_card_id);
end;
$$;

drop function if exists public.send_chat_message(uuid, uuid, text, text, jsonb);

create or replace function public.send_chat_message(
  p_couple_id uuid,
  p_message_id uuid,
  p_body text default '',
  p_linked_card_id text default null,
  p_attachments jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_body text := left(coalesce(p_body, ''), 2000);
  v_attachment_count int := coalesce(jsonb_array_length(p_attachments), 0);
  v_attachment jsonb;
  v_storage_path text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if not public.is_couple_member(p_couple_id) then
    raise exception 'not_couple_member';
  end if;

  if p_message_id is null then
    raise exception 'missing_message_id';
  end if;

  if length(trim(v_body)) = 0 and v_attachment_count = 0 then
    raise exception 'empty_message';
  end if;

  if v_attachment_count > 4 then
    raise exception 'too_many_attachments';
  end if;

  if p_linked_card_id is not null and not public.card_available_to_couple(p_couple_id, p_linked_card_id) then
    raise exception 'unknown_card';
  end if;

  insert into public.chat_messages (
    id,
    couple_id,
    author_id,
    body,
    linked_card_id,
    expires_at
  )
  values (
    p_message_id,
    p_couple_id,
    auth.uid(),
    trim(v_body),
    p_linked_card_id,
    public.next_chat_expiry()
  )
  on conflict (id) do nothing;

  for v_attachment in select * from jsonb_array_elements(p_attachments)
  loop
    v_storage_path := v_attachment->>'storage_path';

    if v_storage_path is null or public.storage_path_couple_id(v_storage_path) is distinct from p_couple_id then
      raise exception 'invalid_attachment_path';
    end if;

    if position(p_message_id::text in v_storage_path) = 0 then
      raise exception 'attachment_message_mismatch';
    end if;

    insert into public.chat_attachments (
      message_id,
      couple_id,
      uploaded_by,
      storage_path,
      mime_type,
      name,
      width,
      height,
      size_bytes
    )
    values (
      p_message_id,
      p_couple_id,
      auth.uid(),
      v_storage_path,
      coalesce(nullif(v_attachment->>'mime_type', ''), 'image/jpeg'),
      nullif(v_attachment->>'name', ''),
      nullif(v_attachment->>'width', '')::int,
      nullif(v_attachment->>'height', '')::int,
      nullif(v_attachment->>'size_bytes', '')::int
    )
    on conflict (storage_path) do nothing;
  end loop;

  return p_message_id;
end;
$$;

drop function if exists public.upsert_notification_preferences(uuid, boolean, boolean, boolean, boolean, boolean, boolean);

create or replace function public.upsert_notification_preferences(
  p_couple_id uuid,
  p_chat_message_enabled boolean,
  p_daily_reminder_enabled boolean,
  p_match_reveal_enabled boolean,
  p_mood_signal_enabled boolean,
  p_mood_signal_prompt_seen boolean,
  p_promotion_enabled boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if not public.is_couple_member(p_couple_id) then
    raise exception 'not_couple_member';
  end if;

  insert into public.notification_preferences (
    couple_id,
    user_id,
    chat_message_enabled,
    daily_reminder_enabled,
    match_reveal_enabled,
    mood_signal_enabled,
    mood_signal_prompt_seen,
    promotion_enabled
  )
  values (
    p_couple_id,
    auth.uid(),
    coalesce(p_chat_message_enabled, false),
    coalesce(p_daily_reminder_enabled, false),
    coalesce(p_match_reveal_enabled, false),
    coalesce(p_mood_signal_enabled, false),
    coalesce(p_mood_signal_prompt_seen, false),
    coalesce(p_promotion_enabled, false)
  )
  on conflict (couple_id, user_id) do update
  set chat_message_enabled = excluded.chat_message_enabled,
      daily_reminder_enabled = excluded.daily_reminder_enabled,
      match_reveal_enabled = excluded.match_reveal_enabled,
      mood_signal_enabled = excluded.mood_signal_enabled,
      mood_signal_prompt_seen = excluded.mood_signal_prompt_seen,
      promotion_enabled = excluded.promotion_enabled,
      updated_at = now();
end;
$$;

drop function if exists public.update_couple_mood(uuid, int);

create or replace function public.update_couple_mood(
  p_couple_id uuid,
  p_level int
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if p_level < 0 or p_level > 3 then
    raise exception 'invalid_mood_level';
  end if;

  if not public.is_couple_member(p_couple_id) then
    raise exception 'not_couple_member';
  end if;

  insert into public.couple_moods (
    couple_id,
    user_id,
    level,
    updated_at
  )
  values (
    p_couple_id,
    auth.uid(),
    p_level,
    now()
  )
  on conflict (couple_id, user_id) do update
  set level = excluded.level,
      updated_at = now();
end;
$$;

drop function if exists public.register_push_token(text, text, text, boolean);

create or replace function public.register_push_token(
  p_expo_push_token text,
  p_platform text default 'unknown',
  p_device_id text default null,
  p_enabled boolean default true
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if nullif(trim(p_expo_push_token), '') is null then
    raise exception 'missing_push_token';
  end if;

  insert into public.push_tokens (
    user_id,
    expo_push_token,
    platform,
    device_id,
    enabled,
    last_seen_at
  )
  values (
    auth.uid(),
    trim(p_expo_push_token),
    case when p_platform in ('ios', 'android', 'web') then p_platform else 'unknown' end,
    nullif(trim(coalesce(p_device_id, '')), ''),
    coalesce(p_enabled, true),
    now()
  )
  on conflict (expo_push_token) do update
  set user_id = excluded.user_id,
      platform = excluded.platform,
      device_id = excluded.device_id,
      enabled = excluded.enabled,
      last_seen_at = now();
end;
$$;

drop function if exists public.mark_match_revealed(uuid, text);

create or replace function public.mark_match_revealed(
  p_couple_id uuid,
  p_card_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_couple_id uuid := public.current_couple_id(p_couple_id);
begin
  if v_couple_id is null then
    raise exception 'not_couple_member';
  end if;

  perform public.ensure_match_reveal(v_couple_id, p_card_id);

  update public.match_reveals
  set revealed_by = auth.uid(),
      revealed_at = coalesce(revealed_at, now())
  where couple_id = v_couple_id
    and card_id = p_card_id
    and exists (
      select 1
      from public.get_revealable_matches(v_couple_id, 1) matches
      where matches.card_id = p_card_id
    );
end;
$$;

drop function if exists public.cleanup_expired_chat();

create or replace function public.cleanup_expired_chat()
returns int
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  v_deleted int;
begin
  delete from storage.objects objects
  where objects.bucket_id = 'chat-attachments'
    and exists (
      select 1
      from public.chat_attachments attachments
      join public.chat_messages messages on messages.id = attachments.message_id
      where attachments.storage_path = objects.name
        and messages.expires_at <= now()
    );

  delete from public.chat_messages
  where expires_at <= now();

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

drop function if exists public.create_custom_desire(uuid, text, text, text, text);

create or replace function public.create_custom_desire(
  p_couple_id uuid,
  p_card_id text,
  p_title text,
  p_category text,
  p_emoji text,
  p_blurb text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_title text := trim(p_title);
  v_blurb text := trim(p_blurb);
  v_emoji text := left(coalesce(nullif(trim(p_emoji), ''), '💖'), 12);
  v_has_unlimited boolean;
  v_custom_count int;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if not public.is_couple_member(p_couple_id) then
    raise exception 'not_couple_member';
  end if;

  if p_card_id is null or p_card_id not like 'custom-%' then
    raise exception 'invalid_card_id';
  end if;

  if p_category not in ('Vanille', 'Sensuel', 'Séduction', 'Hot', 'Jeux & Défis', 'Scénarios', 'Kinky Soft', 'BDSM', 'Plaisirs explicites', 'Tabous', 'Perso') then
    raise exception 'invalid_category';
  end if;

  if char_length(v_title) < 3 or char_length(v_title) > 70 then
    raise exception 'invalid_title';
  end if;

  if char_length(v_blurb) < 8 or char_length(v_blurb) > 150 then
    raise exception 'invalid_blurb';
  end if;

  select exists (
    select 1
    from public.couple_feature_unlocks
    where couple_id = p_couple_id
      and feature = 'custom_cards_unlimited'
  ) into v_has_unlimited;

  select count(*) into v_custom_count
  from public.custom_desire_cards
  where couple_id = p_couple_id;

  if not v_has_unlimited and v_custom_count >= 3 then
    raise exception 'custom_limit_reached';
  end if;

  insert into public.custom_desire_cards (
    id,
    couple_id,
    created_by,
    title,
    category,
    emoji,
    blurb
  )
  values (
    p_card_id,
    p_couple_id,
    auth.uid(),
    v_title,
    p_category,
    v_emoji,
    v_blurb
  )
  on conflict (id) do update
  set title = excluded.title,
      category = excluded.category,
      emoji = excluded.emoji,
      blurb = excluded.blurb
  where public.custom_desire_cards.couple_id = excluded.couple_id
    and public.custom_desire_cards.created_by = auth.uid();
end;
$$;

create or replace function public.unlock_category_for_couple(
  p_couple_id uuid,
  p_category text,
  p_source text default 'iap'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if p_category not in ('Sensuel', 'Séduction', 'Hot', 'Jeux & Défis', 'Scénarios', 'Kinky Soft', 'BDSM', 'Plaisirs explicites', 'Tabous') then
    raise exception 'invalid_category';
  end if;

  if not public.is_couple_member(p_couple_id) then
    raise exception 'not_couple_member';
  end if;

  insert into public.couple_category_unlocks (
    couple_id,
    category,
    unlocked_by,
    source
  )
  values (
    p_couple_id,
    p_category,
    auth.uid(),
    coalesce(nullif(trim(p_source), ''), 'iap')
  )
  on conflict (couple_id, category) do nothing;
end;
$$;

create or replace function public.unlock_feature_for_couple(
  p_couple_id uuid,
  p_feature text,
  p_source text default 'iap'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if p_feature not in ('custom_cards_unlimited', 'no_ads', 'unlimited_responses') then
    raise exception 'invalid_feature';
  end if;

  if not public.is_couple_member(p_couple_id) then
    raise exception 'not_couple_member';
  end if;

  insert into public.couple_feature_unlocks (
    couple_id,
    feature,
    unlocked_by,
    source
  )
  values (
    p_couple_id,
    p_feature,
    auth.uid(),
    coalesce(nullif(trim(p_source), ''), 'iap')
  )
  on conflict (couple_id, feature) do nothing;
end;
$$;

create or replace function public.leave_couple(
  p_couple_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_remaining_members int;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  if not public.is_couple_member(p_couple_id) then
    raise exception 'not_couple_member';
  end if;

  delete from public.desire_votes
  where couple_id = p_couple_id
    and user_id = v_user_id;

  delete from public.custom_desire_cards
  where couple_id = p_couple_id
    and created_by = v_user_id;

  delete from public.couple_members
  where couple_id = p_couple_id
    and user_id = v_user_id;

  select count(*) into v_remaining_members
  from public.couple_members
  where couple_id = p_couple_id;

  if v_remaining_members = 0 then
    delete from public.couples
    where id = p_couple_id;
  end if;
end;
$$;

revoke execute on function public.create_couple(text, text, text, text) from public;
revoke execute on function public.join_couple(text, text, text, text, text) from public;
revoke execute on function public.get_couple_members(uuid) from public;
revoke execute on function public.update_profile_status(uuid, text) from public;
revoke execute on function public.get_couple_matches(uuid, int) from public;
revoke execute on function public.get_revealable_matches(uuid, int) from public;
revoke execute on function public.get_my_couple_state(uuid) from public;
revoke execute on function public.save_desire_vote(uuid, text, int) from public;
revoke execute on function public.send_chat_message(uuid, uuid, text, text, jsonb) from public;
revoke execute on function public.upsert_notification_preferences(uuid, boolean, boolean, boolean, boolean, boolean, boolean) from public;
revoke execute on function public.update_couple_mood(uuid, int) from public;
revoke execute on function public.register_push_token(text, text, text, boolean) from public;
revoke execute on function public.mark_match_revealed(uuid, text) from public;
revoke execute on function public.cleanup_expired_chat() from public;
revoke execute on function public.create_custom_desire(uuid, text, text, text, text, text) from public;
revoke execute on function public.unlock_category_for_couple(uuid, text, text) from public;
revoke execute on function public.unlock_feature_for_couple(uuid, text, text) from public;
revoke execute on function public.leave_couple(uuid) from public;

revoke execute on function public.create_couple(text, text, text, text) from anon;
revoke execute on function public.join_couple(text, text, text, text, text) from anon;
revoke execute on function public.get_couple_members(uuid) from anon;
revoke execute on function public.update_profile_status(uuid, text) from anon;
revoke execute on function public.get_couple_matches(uuid, int) from anon;
revoke execute on function public.get_revealable_matches(uuid, int) from anon;
revoke execute on function public.get_my_couple_state(uuid) from anon;
revoke execute on function public.save_desire_vote(uuid, text, int) from anon;
revoke execute on function public.send_chat_message(uuid, uuid, text, text, jsonb) from anon;
revoke execute on function public.upsert_notification_preferences(uuid, boolean, boolean, boolean, boolean, boolean, boolean) from anon;
revoke execute on function public.update_couple_mood(uuid, int) from anon;
revoke execute on function public.register_push_token(text, text, text, boolean) from anon;
revoke execute on function public.mark_match_revealed(uuid, text) from anon;
revoke execute on function public.cleanup_expired_chat() from anon;
revoke execute on function public.create_custom_desire(uuid, text, text, text, text, text) from anon;
revoke execute on function public.unlock_category_for_couple(uuid, text, text) from anon;
revoke execute on function public.unlock_feature_for_couple(uuid, text, text) from anon;
revoke execute on function public.leave_couple(uuid) from anon;

grant execute on function public.create_couple(text, text, text, text) to authenticated;
grant execute on function public.join_couple(text, text, text, text, text) to authenticated;
grant execute on function public.get_couple_members(uuid) to authenticated;
grant execute on function public.update_profile_status(uuid, text) to authenticated;
grant execute on function public.get_couple_matches(uuid, int) to authenticated;
grant execute on function public.get_revealable_matches(uuid, int) to authenticated;
grant execute on function public.get_my_couple_state(uuid) to authenticated;
grant execute on function public.save_desire_vote(uuid, text, int) to authenticated;
grant execute on function public.send_chat_message(uuid, uuid, text, text, jsonb) to authenticated;
grant execute on function public.upsert_notification_preferences(uuid, boolean, boolean, boolean, boolean, boolean, boolean) to authenticated;
grant execute on function public.update_couple_mood(uuid, int) to authenticated;
grant execute on function public.register_push_token(text, text, text, boolean) to authenticated;
grant execute on function public.mark_match_revealed(uuid, text) to authenticated;
grant execute on function public.cleanup_expired_chat() to service_role;
grant execute on function public.create_custom_desire(uuid, text, text, text, text, text) to authenticated;
grant execute on function public.unlock_category_for_couple(uuid, text, text) to service_role;
grant execute on function public.unlock_feature_for_couple(uuid, text, text) to service_role;
grant execute on function public.leave_couple(uuid) to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.chat_messages;
exception when duplicate_object or undefined_object then
  null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.chat_attachments;
exception when duplicate_object or undefined_object then
  null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.match_reveals;
exception when duplicate_object or undefined_object then
  null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.notification_preferences;
exception when duplicate_object or undefined_object then
  null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.couple_moods;
exception when duplicate_object or undefined_object then
  null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.notification_events;
exception when duplicate_object or undefined_object then
  null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.purchase_entitlements;
exception when duplicate_object or undefined_object then
  null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.couple_category_unlocks;
exception when duplicate_object or undefined_object then
  null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.couple_feature_unlocks;
exception when duplicate_object or undefined_object then
  null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.custom_desire_cards;
exception when duplicate_object or undefined_object then
  null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.profiles;
exception when duplicate_object or undefined_object then
  null;
end;
$$;

insert into public.desire_cards (id, title, emoji, category, kind, mood, blurb, safety, sort_order) values
  ('vanille-01', 'Premier date', '🌹', 'Vanille', 'practice', 'sensuel', 'Refaire un rendez-vous comme si vous veniez de vous rencontrer.', null, 1010),
  ('vanille-02', 'Dîner doux', '🕯️', 'Vanille', 'practice', 'calme', 'Préparer un dîner romantique juste pour vous deux.', null, 1020),
  ('vanille-03', 'Long baiser', '💋', 'Vanille', 'practice', 'sensuel', 'S’embrasser longtemps sans chercher à aller plus loin.', null, 1030),
  ('vanille-04', 'Peau contre peau', '🛏️', 'Vanille', 'practice', 'sensuel', 'Dormir nus ensemble, simplement collés l’un à l’autre.', null, 1040),
  ('vanille-05', 'Beaux mots', '✨', 'Vanille', 'discussion', 'sensuel', 'Se dire ce que vous trouvez beau chez l’autre.', null, 1050),
  ('vanille-06', 'Câlin long', '🫂', 'Vanille', 'practice', 'calme', 'Se prendre dans les bras pendant plusieurs minutes.', null, 1060),
  ('vanille-07', 'Douche tendre', '🚿', 'Vanille', 'practice', 'calme', 'Prendre une douche ensemble sans objectif sexuel.', null, 1070),
  ('vanille-08', 'Massage relax', '💆', 'Vanille', 'practice', 'sensuel', 'Masser l’autre après une longue journée.', null, 1080),
  ('vanille-09', 'Petit-déj au lit', '🥐', 'Vanille', 'practice', 'calme', 'Surprendre l’autre avec un réveil tout doux.', null, 1090),
  ('vanille-10', 'Main dans la main', '🤝', 'Vanille', 'practice', 'calme', 'Passer une soirée à se tenir la main.', null, 1100),
  ('vanille-11', 'Balade de nuit', '🌙', 'Vanille', 'practice', 'sensuel', 'Marcher ensemble quand la ville est plus calme.', null, 1110),
  ('vanille-12', 'Lettre d’amour', '💌', 'Vanille', 'practice', 'sensuel', 'Écrire quelques lignes sincères à l’autre.', null, 1120),
  ('vanille-13', 'Sans écrans', '📵', 'Vanille', 'practice', 'sensuel', 'Passer une soirée sans téléphone ni distraction.', null, 1130),
  ('vanille-14', 'Slow dance', '🎶', 'Vanille', 'practice', 'sensuel', 'Danser lentement dans le salon.', null, 1140),
  ('vanille-15', 'Yeux dans les yeux', '👀', 'Vanille', 'discussion', 'sensuel', 'Se regarder sans parler et laisser le moment durer.', null, 1150),
  ('vanille-16', 'Beau souvenir', '📸', 'Vanille', 'discussion', 'calme', 'Raconter votre souvenir préféré du couple.', null, 1160),
  ('vanille-17', 'Bisous partout', '😘', 'Vanille', 'practice', 'calme', 'Couvrir l’autre de bisous tendres.', null, 1170),
  ('vanille-18', 'Parfum préféré', '🧴', 'Vanille', 'practice', 'sensuel', 'Porter une odeur que l’autre adore.', null, 1180),
  ('vanille-19', 'Playlist love', '🎧', 'Vanille', 'practice', 'calme', 'Créer une playlist romantique pour vous deux.', null, 1190),
  ('vanille-20', 'Déclaration', '❤️', 'Vanille', 'discussion', 'sensuel', 'Dire à l’autre ce qu’il ou elle représente pour vous.', null, 1200),
  ('vanille-21', 'Bain à deux', '🛁', 'Vanille', 'practice', 'sensuel', 'Prendre un bain chaud ensemble.', null, 1210),
  ('vanille-22', 'Câlin gratuit', '🧸', 'Vanille', 'practice', 'calme', 'Se câliner sans que ça doive devenir sexuel.', null, 1220),
  ('vanille-23', 'Sieste collée', '😴', 'Vanille', 'practice', 'calme', 'Faire une sieste enlacés.', null, 1230),
  ('vanille-24', 'Tenue de date', '👗', 'Vanille', 'discussion', 'sensuel', 'Choisir une tenue pour plaire à l’autre.', null, 1240),
  ('vanille-25', 'Mot caché', '📝', 'Vanille', 'practice', 'calme', 'Laisser un petit mot doux quelque part.', null, 1250),
  ('vanille-26', 'Petite attention', '🎁', 'Vanille', 'practice', 'sensuel', 'Offrir un geste simple mais symbolique.', null, 1260),
  ('vanille-27', 'Matin lent', '☀️', 'Vanille', 'practice', 'sensuel', 'Rester au lit ensemble un peu plus longtemps.', null, 1270),
  ('vanille-28', 'Bras ouverts', '🌛', 'Vanille', 'practice', 'sensuel', 'S’endormir dans les bras l’un de l’autre.', null, 1280),
  ('vanille-29', 'Week-end love', '🧳', 'Vanille', 'practice', 'calme', 'Organiser une escapade romantique.', null, 1290),
  ('vanille-30', 'Moment culte', '🎞️', 'Vanille', 'practice', 'calme', 'Recréer un souvenir fort de votre histoire.', null, 1300),
  ('vanille-31', 'Trois mercis', '🙏', 'Vanille', 'discussion', 'calme', 'Dire trois choses que vous aimez dans la relation.', null, 1310),
  ('vanille-32', 'Massage mains', '🤲', 'Vanille', 'practice', 'sensuel', 'Se masser doucement les mains.', null, 1320),
  ('vanille-33', 'Compliments', '🌷', 'Vanille', 'discussion', 'sensuel', 'Se complimenter sans parler de sexe.', null, 1330),
  ('vanille-34', 'Je te désire', '🔥', 'Vanille', 'discussion', 'calme', 'Dire son désir avec tendresse.', null, 1340),
  ('vanille-35', 'Dîner spécial', '🍝', 'Vanille', 'practice', 'sensuel', 'Préparer un repas comme pour une grande occasion.', null, 1350),
  ('vanille-36', 'Soirée pyjama', '🧦', 'Vanille', 'practice', 'sensuel', 'Passer une soirée douce et régressive à deux.', null, 1360),
  ('vanille-37', 'Lecture love', '📖', 'Vanille', 'practice', 'calme', 'Lire ensemble un texte romantique.', null, 1370),
  ('vanille-38', 'Film collés', '🍿', 'Vanille', 'practice', 'sensuel', 'Regarder un film l’un contre l’autre.', null, 1380),
  ('vanille-39', 'Photo tendre', '📷', 'Vanille', 'practice', 'calme', 'Prendre une photo de couple intime et douce.', null, 1390),
  ('vanille-40', 'Surnom doux', '🐻', 'Vanille', 'practice', 'calme', 'Se donner un surnom amoureux.', null, 1400),
  ('vanille-41', 'Couple d’abord', '🗓️', 'Vanille', 'practice', 'sensuel', 'Réserver une journée où votre couple passe en priorité.', null, 1410),
  ('vanille-42', 'Aimé·e comment', '💞', 'Vanille', 'discussion', 'sensuel', 'Dire ce qui vous fait vous sentir aimé·e.', null, 1420),
  ('vanille-43', 'Rituel du soir', '🌌', 'Vanille', 'practice', 'sensuel', 'Créer un petit rituel avant de dormir.', null, 1430),
  ('vanille-44', 'Nuque douce', '👐', 'Vanille', 'practice', 'sensuel', 'Masser la nuque ou les épaules de l’autre.', null, 1440),
  ('vanille-45', 'Bisou réveil', '🌤️', 'Vanille', 'practice', 'sensuel', 'Commencer la journée par un vrai baiser.', null, 1450),
  ('vanille-46', 'Envie douce', '🫶', 'Vanille', 'practice', 'calme', 'Partager une envie tendre à vivre bientôt.', null, 1460),
  ('vanille-47', 'Surprise love', '🎀', 'Vanille', 'practice', 'calme', 'Préparer une surprise romantique.', null, 1470),
  ('vanille-48', 'Se redécouvrir', '🥂', 'Vanille', 'practice', 'sensuel', 'Faire comme si vous appreniez à vous connaître.', null, 1480),
  ('vanille-49', 'Mot secret', '🗝️', 'Vanille', 'discussion', 'sensuel', 'Dire une chose qu’on n’ose pas assez dire.', null, 1490),
  ('vanille-50', 'Fin tendre', '🕊️', 'Vanille', 'practice', 'calme', 'Terminer la journée par un long moment de tendresse.', null, 1500),
  ('sensuel-01', 'Huile chaude', '🧴', 'Sensuel', 'practice', 'sensuel', 'Faire un massage complet avec de l’huile.', null, 2010),
  ('sensuel-02', 'Bout des doigts', '✋', 'Sensuel', 'practice', 'sensuel', 'Explorer lentement le corps de l’autre.', null, 2020),
  ('sensuel-03', 'Baiser cou', '🦢', 'Sensuel', 'practice', 'sensuel', 'Embrasser le cou avec lenteur.', null, 2030),
  ('sensuel-04', 'Sous les draps', '🛌', 'Sensuel', 'practice', 'sensuel', 'Se caresser doucement sous la couette.', null, 2040),
  ('sensuel-05', 'Déshabillage lent', '👕', 'Sensuel', 'practice', 'sensuel', 'Enlever les vêtements sans se presser.', null, 2050),
  ('sensuel-06', 'À moitié vêtu·e', '🧥', 'Sensuel', 'practice', 'sensuel', 'Garder quelques vêtements pour faire monter le désir.', null, 2060),
  ('sensuel-07', 'Lumière basse', '🕯️', 'Sensuel', 'practice', 'sensuel', 'Créer une ambiance douce et tamisée.', null, 2070),
  ('sensuel-08', 'Musique chaude', '🎼', 'Sensuel', 'practice', 'sensuel', 'Mettre une playlist sensuelle.', null, 2080),
  ('sensuel-09', 'Douche chaude', '🚿', 'Sensuel', 'practice', 'sensuel', 'Partager une douche lente et intime.', null, 2090),
  ('sensuel-10', 'Se laver', '🫧', 'Sensuel', 'practice', 'sensuel', 'Laver le corps de l’autre avec attention.', null, 2100),
  ('sensuel-11', 'Silence', '🤫', 'Sensuel', 'discussion', 'sensuel', 'Se toucher sans parler.', null, 2110),
  ('sensuel-12', 'Respiration', '🌬️', 'Sensuel', 'practice', 'sensuel', 'Respirer ensemble au même rythme.', null, 2120),
  ('sensuel-13', 'À travers le tissu', '🧶', 'Sensuel', 'practice', 'sensuel', 'Se caresser par-dessus les vêtements.', null, 2130),
  ('sensuel-14', 'Bandeau', '🙈', 'Sensuel', 'practice', 'aventureux', 'Couvrir les yeux pour ressentir autrement.', null, 2140),
  ('sensuel-15', 'Avec les lèvres', '👄', 'Sensuel', 'practice', 'sensuel', 'Toucher l’autre uniquement avec la bouche.', null, 2150),
  ('sensuel-16', 'Zones oubliées', '🗺️', 'Sensuel', 'practice', 'sensuel', 'Explorer les parties du corps souvent négligées.', null, 2160),
  ('sensuel-17', 'Hanches', '〰️', 'Sensuel', 'practice', 'sensuel', 'Embrasser le ventre, les hanches ou le dos.', null, 2170),
  ('sensuel-18', 'Jambes', '🦵', 'Sensuel', 'practice', 'sensuel', 'Masser lentement les jambes.', null, 2180),
  ('sensuel-19', 'Pieds', '🦶', 'Sensuel', 'practice', 'sensuel', 'Offrir un massage des pieds.', null, 2190),
  ('sensuel-20', 'Plume', '🪶', 'Sensuel', 'practice', 'sensuel', 'Utiliser une plume ou un tissu doux.', null, 2200),
  ('sensuel-21', 'Chaud froid', '🧊', 'Sensuel', 'practice', 'sensuel', 'Jouer avec des sensations chaudes et froides.', null, 2210),
  ('sensuel-22', 'Guide mes mains', '🧭', 'Sensuel', 'practice', 'sensuel', 'Laisser l’autre placer vos mains où il veut.', null, 2220),
  ('sensuel-23', 'Dis-moi où', '🎯', 'Sensuel', 'discussion', 'sensuel', 'Demander précisément où toucher.', null, 2230),
  ('sensuel-24', 'Préliminaires longs', '⏳', 'Sensuel', 'practice', 'sensuel', 'Faire durer le moment avant l’acte.', null, 2240),
  ('sensuel-25', 'Sans objectif', '🌀', 'Sensuel', 'practice', 'sensuel', 'Explorer le plaisir sans chercher l’orgasme.', null, 2250),
  ('sensuel-26', 'Admiration', '🪞', 'Sensuel', 'discussion', 'sensuel', 'Dire à voix haute ce qu’on aime regarder.', null, 2260),
  ('sensuel-27', 'Se laisser voir', '👁️', 'Sensuel', 'practice', 'sensuel', 'Accepter d’être regardé·e sans se cacher.', null, 2270),
  ('sensuel-28', 'Miroir', '🪞', 'Sensuel', 'practice', 'sensuel', 'Utiliser un miroir pour vous voir ensemble.', null, 2280),
  ('sensuel-29', 'Avant le baiser', '💫', 'Sensuel', 'practice', 'sensuel', 'Se caresser longtemps avant de s’embrasser.', null, 2290),
  ('sensuel-30', 'Très lent', '🐢', 'Sensuel', 'practice', 'sensuel', 'Ralentir chaque geste volontairement.', null, 2300),
  ('sensuel-31', 'Une seule zone', '🔍', 'Sensuel', 'practice', 'sensuel', 'Se concentrer sur une seule partie du corps.', null, 2310),
  ('sensuel-32', 'Soirée lente', '🕰️', 'Sensuel', 'practice', 'sensuel', 'Faire une soirée dédiée à la lenteur.', null, 2320),
  ('sensuel-33', 'Hôtel maison', '🏨', 'Sensuel', 'practice', 'sensuel', 'Transformer la chambre en suite d’hôtel.', null, 2330),
  ('sensuel-34', 'Matière douce', '🧵', 'Sensuel', 'practice', 'sensuel', 'Porter une matière agréable à toucher.', null, 2340),
  ('sensuel-35', 'Sans pénétration', '🚫', 'Sensuel', 'practice', 'sensuel', 'Faire monter le désir sans pénétration.', null, 2350),
  ('sensuel-36', 'Mains seules', '🤲', 'Sensuel', 'practice', 'sensuel', 'Se donner du plaisir uniquement avec les mains.', null, 2360),
  ('sensuel-37', 'Bouche seule', '👅', 'Sensuel', 'practice', 'sensuel', 'Se donner du plaisir uniquement avec la bouche.', null, 2370),
  ('sensuel-38', 'Doux puis fort', '🌊', 'Sensuel', 'practice', 'sensuel', 'Alterner caresses douces et baisers appuyés.', null, 2380),
  ('sensuel-39', 'Murmures', '🗣️', 'Sensuel', 'discussion', 'sensuel', 'Dire doucement ce qui fait du bien.', null, 2390),
  ('sensuel-40', 'Réveil sensuel', '🌅', 'Sensuel', 'practice', 'sensuel', 'Commencer la journée avec des caresses lentes.', null, 2400),
  ('sensuel-41', 'Nuit sensuelle', '🌙', 'Sensuel', 'practice', 'sensuel', 'Finir la journée par un moment de peau.', null, 2410),
  ('sensuel-42', 'Massage avant', '💆', 'Sensuel', 'practice', 'sensuel', 'Faire un massage avant un rapport.', null, 2420),
  ('sensuel-43', 'Massage gratuit', '🕊️', 'Sensuel', 'practice', 'sensuel', 'Se masser sans obligation d’aller plus loin.', null, 2430),
  ('sensuel-44', 'Frissons', '⚡', 'Sensuel', 'practice', 'sensuel', 'Chercher ce qui donne des frissons à l’autre.', null, 2440),
  ('sensuel-45', 'Baiser minute', '⏱️', 'Sensuel', 'practice', 'sensuel', 'Faire durer un baiser plusieurs minutes.', null, 2450),
  ('sensuel-46', 'Rythme choisi', '🎚️', 'Sensuel', 'discussion', 'sensuel', 'Laisser l’autre choisir le rythme des caresses.', null, 2460),
  ('sensuel-47', 'Lubrifiant doux', '💧', 'Sensuel', 'practice', 'sensuel', 'Utiliser du lubrifiant pour plus de confort.', null, 2470),
  ('sensuel-48', 'Yeux fermés', '😌', 'Sensuel', 'practice', 'sensuel', 'Explorer les sensations les yeux fermés.', null, 2480),
  ('sensuel-49', 'Corps immobiles', '🧲', 'Sensuel', 'practice', 'sensuel', 'Rester collés sans bouger.', null, 2490),
  ('sensuel-50', 'Retour calme', '🫶', 'Sensuel', 'practice', 'sensuel', 'Finir par des câlins et de l’aftercare doux.', null, 2500),
  ('seduction-01', 'Message chaud', '📱', 'Séduction', 'practice', 'sensuel', 'Envoyer un message suggestif dans la journée.', null, 3010),
  ('seduction-02', 'Tension lente', '🔥', 'Séduction', 'practice', 'sensuel', 'Faire monter l’envie avant de vous retrouver.', null, 3020),
  ('seduction-03', 'Photo privée', '📸', 'Séduction', 'practice', 'sensuel', 'Envoyer une photo sexy avec accord clair.', null, 3030),
  ('seduction-04', 'Vocal intime', '🎙️', 'Séduction', 'practice', 'sensuel', 'Envoyer un message vocal plus sensuel.', null, 3040),
  ('seduction-05', 'Tenue choisie', '👠', 'Séduction', 'practice', 'sensuel', 'Porter une tenue pensée pour exciter l’autre.', null, 3050),
  ('seduction-06', 'Inconnus au bar', '🍸', 'Séduction', 'practice', 'sensuel', 'Flirter comme deux personnes qui viennent de se rencontrer.', null, 3060),
  ('seduction-07', 'Première fois', '🥂', 'Séduction', 'practice', 'sensuel', 'Faire semblant de vous découvrir à nouveau.', null, 3070),
  ('seduction-08', 'Rendez-vous secret', '🚪', 'Séduction', 'practice', 'sensuel', 'Se donner rendez-vous dans une pièce de la maison.', null, 3080),
  ('seduction-09', 'Jeu de regards', '👀', 'Séduction', 'practice', 'sensuel', 'Se provoquer du regard pendant un dîner.', null, 3090),
  ('seduction-10', 'À l’oreille', '🐚', 'Séduction', 'discussion', 'sensuel', 'Chuchoter une envie directement à l’oreille.', null, 3100),
  ('seduction-11', 'Pas de baiser', '🚫💋', 'Séduction', 'discussion', 'aventureux', 'Interdire les baisers pendant quelques minutes.', null, 3110),
  ('seduction-12', 'Pas de caresse', '🙅', 'Séduction', 'discussion', 'aventureux', 'Interdire les caresses pour faire monter l’attente.', null, 3120),
  ('seduction-13', 'Qui craque', '🎲', 'Séduction', 'practice', 'aventureux', 'Jouer à celui ou celle qui résiste le plus longtemps.', null, 3130),
  ('seduction-14', 'Plus tard', '⏰', 'Séduction', 'discussion', 'sensuel', 'Dire ce qu’on veut faire à l’autre plus tard.', null, 3140),
  ('seduction-15', 'Chauffe SMS', '💬', 'Séduction', 'practice', 'sensuel', 'Se chauffer par messages sans agir tout de suite.', null, 3150),
  ('seduction-16', 'Devine', '❓', 'Séduction', 'practice', 'sensuel', 'Laisser l’autre deviner ce que vous portez.', null, 3160),
  ('seduction-17', 'Mot-code', '🗝️', 'Séduction', 'discussion', 'sensuel', 'Choisir un mot secret avec un double sens coquin.', null, 3170),
  ('seduction-18', 'Détail caché', '🧦', 'Séduction', 'practice', 'sensuel', 'Porter quelque chose de discret mais excitant.', null, 3180),
  ('seduction-19', 'Note sexy', '📝', 'Séduction', 'practice', 'sensuel', 'Cacher un message intime dans un endroit privé.', null, 3190),
  ('seduction-20', 'Compte à rebours', '⏳', 'Séduction', 'practice', 'sensuel', 'Créer une attente avant le moment intime.', null, 3200),
  ('seduction-21', 'Invitation', '💌', 'Séduction', 'practice', 'sensuel', 'Envoyer une invitation privée pour le soir.', null, 3210),
  ('seduction-22', 'Drague', '😏', 'Séduction', 'practice', 'sensuel', 'Draguer l’autre comme si tout recommençait.', null, 3220),
  ('seduction-23', 'Résistance', '🫦', 'Séduction', 'practice', 'aventureux', 'Faire semblant de résister au charme de l’autre.', null, 3230),
  ('seduction-24', 'Stop baiser', '⏸️', 'Séduction', 'practice', 'sensuel', 'S’embrasser puis s’arrêter pour prolonger l’envie.', null, 3240),
  ('seduction-25', 'Souvenir hot', '🧠', 'Séduction', 'practice', 'sensuel', 'Décrire un souvenir sexuel marquant du couple.', null, 3250),
  ('seduction-26', 'J’ai envie', '🔥', 'Séduction', 'discussion', 'sensuel', 'Dire clairement “ce soir, j’ai envie de toi”.', null, 3260),
  ('seduction-27', 'Préparation', '🪞', 'Séduction', 'practice', 'sensuel', 'Se préparer séparément avant de se retrouver.', null, 3270),
  ('seduction-28', 'Danse privée', '💃', 'Séduction', 'practice', 'sensuel', 'Faire une danse sexy juste pour l’autre.', null, 3280),
  ('seduction-29', 'Premier contact', '🕰️', 'Séduction', 'practice', 'sensuel', 'Retarder volontairement le premier toucher.', null, 3290),
  ('seduction-30', 'Règle de flirt', '📏', 'Séduction', 'practice', 'sensuel', 'Inventer une règle de séduction pour la soirée.', null, 3300),
  ('seduction-31', 'Trois indices', '🔎', 'Séduction', 'practice', 'sensuel', 'Donner trois indices sur ce que vous voulez.', null, 3310),
  ('seduction-32', 'Emoji secret', '😈', 'Séduction', 'practice', 'sensuel', 'Envoyer une envie seulement avec des emojis.', null, 3320),
  ('seduction-33', 'Vouvoiement', '🎭', 'Séduction', 'practice', 'sensuel', 'Se vouvoyer pour créer une tension inhabituelle.', null, 3330),
  ('seduction-34', 'Trajet chaud', '🚗', 'Séduction', 'practice', 'sensuel', 'Faire monter le désir pendant un trajet.', null, 3340),
  ('seduction-35', 'Compliment sexuel', '🫶', 'Séduction', 'discussion', 'sensuel', 'Dire ce qui vous excite physiquement chez l’autre.', null, 3350),
  ('seduction-36', 'Attirance', '🧲', 'Séduction', 'practice', 'sensuel', 'Décrire ce qui vous attire chez son corps.', null, 3360),
  ('seduction-37', 'Remarque-moi', '✨', 'Séduction', 'discussion', 'sensuel', 'Dire ce que vous aimeriez que l’autre remarque.', null, 3370),
  ('seduction-38', 'Ambiance choisie', '🎛️', 'Séduction', 'discussion', 'sensuel', 'Laisser l’autre choisir l’ambiance du soir.', null, 3380),
  ('seduction-39', 'Strip soft', '👗', 'Séduction', 'practice', 'aventureux', 'Faire un strip-tease simple et assumé.', null, 3390),
  ('seduction-40', 'Défi séduction', '🎯', 'Séduction', 'practice', 'aventureux', 'Donner un petit défi pour séduire l’autre.', null, 3400),
  ('seduction-41', 'Phrase crue', '🌶️', 'Séduction', 'discussion', 'aventureux', 'Susurrer une phrase plus directe au bon moment.', null, 3410),
  ('seduction-42', 'Pas encore', '⛔', 'Séduction', 'practice', 'sensuel', 'Jouer avec l’attente et le refus temporaire.', null, 3420),
  ('seduction-43', 'Attente', '🕯️', 'Séduction', 'practice', 'sensuel', 'Faire durer le moment avant de toucher l’autre.', null, 3430),
  ('seduction-44', 'Mots seuls', '🗣️', 'Séduction', 'practice', 'sensuel', 'Séduire l’autre uniquement avec les mots.', null, 3440),
  ('seduction-45', 'Regard seul', '👁️', 'Séduction', 'practice', 'sensuel', 'Séduire l’autre uniquement avec les yeux.', null, 3450),
  ('seduction-46', 'Surprise sexy', '🎁', 'Séduction', 'practice', 'sensuel', 'Préparer une surprise excitante mais élégante.', null, 3460),
  ('seduction-47', 'Amants secrets', '🕵️', 'Séduction', 'practice', 'aventureux', 'Se donner rendez-vous comme si c’était interdit.', null, 3470),
  ('seduction-48', 'Interdit fictif', '🚪', 'Séduction', 'practice', 'aventureux', 'Jouer une tension “on ne devrait pas” entre adultes consentants.', null, 3480),
  ('seduction-49', 'Menu intime', '🍽️', 'Séduction', 'discussion', 'sensuel', 'Chaque étape du dîner débloque une question intime.', null, 3490),
  ('seduction-50', 'Envie révélée', '🔓', 'Séduction', 'practice', 'sensuel', 'Finir la soirée en avouant une envie précise.', null, 3500),
  ('hot-01', 'Initiative', '🚀', 'Hot', 'practice', 'aventureux', 'Prendre les devants sans attendre.', null, 4010),
  ('hot-02', 'Dis-le', '🗣️', 'Hot', 'discussion', 'aventureux', 'Dire clairement ce que vous voulez.', null, 4020),
  ('hot-03', 'Plus intense', '🔥', 'Hot', 'practice', 'aventureux', 'Faire l’amour avec plus d’énergie que d’habitude.', null, 4030),
  ('hot-04', 'Nouvelle position', '🔄', 'Hot', 'practice', 'aventureux', 'Essayer une position que vous ne faites pas souvent.', null, 4040),
  ('hot-05', 'Hors du lit', '🛋️', 'Hot', 'practice', 'aventureux', 'Faire l’amour ailleurs que dans le lit, en privé.', null, 4050),
  ('hot-06', 'Matin chaud', '🌅', 'Hot', 'practice', 'aventureux', 'Faire l’amour au réveil.', null, 4060),
  ('hot-07', 'Plein jour', '☀️', 'Hot', 'practice', 'aventureux', 'Faire l’amour en journée.', null, 4070),
  ('hot-08', 'Soirée sexe', '🌶️', 'Hot', 'practice', 'aventureux', 'Réserver une soirée entière au plaisir.', null, 4080),
  ('hot-09', 'Préliminaires', '⏳', 'Hot', 'practice', 'aventureux', 'Faire durer les préliminaires plus longtemps.', null, 4090),
  ('hot-10', 'Plus vocal', '🔊', 'Hot', 'practice', 'aventureux', 'Oser faire plus de bruit pendant l’acte.', null, 4100),
  ('hot-11', 'En direct', '📡', 'Hot', 'discussion', 'aventureux', 'Dire ce qui fait du bien pendant que ça arrive.', null, 4110),
  ('hot-12', 'Plus lent', '🐢', 'Hot', 'discussion', 'aventureux', 'Demander un rythme plus lent.', null, 4120),
  ('hot-13', 'Plus fort', '⚡', 'Hot', 'discussion', 'aventureux', 'Demander un rythme plus intense.', null, 4130),
  ('hot-14', 'Doux puis sauvage', '🌊', 'Hot', 'practice', 'aventureux', 'Alterner tendresse et passion.', null, 4140),
  ('hot-15', 'Habillé·e', '👔', 'Hot', 'practice', 'aventureux', 'Garder certains vêtements pendant le rapport.', null, 4150),
  ('hot-16', 'Miroir', '🪞', 'Hot', 'practice', 'aventureux', 'Se regarder dans un miroir pendant l’intimité.', null, 4160),
  ('hot-17', 'Debout', '🧍', 'Hot', 'practice', 'aventureux', 'Tester une position debout.', null, 4170),
  ('hot-18', 'Assis', '🪑', 'Hot', 'practice', 'aventureux', 'Tester une position assise.', null, 4180),
  ('hot-19', 'L’un mène', '🧭', 'Hot', 'practice', 'aventureux', 'Laisser une personne guider entièrement le rapport.', null, 4190),
  ('hot-20', 'Recevoir oral', '👅', 'Hot', 'practice', 'aventureux', 'Recevoir une fellation ou un cunnilingus.', null, 4200),
  ('hot-21', 'Donner oral', '😮‍💨', 'Hot', 'practice', 'aventureux', 'Donner une fellation ou un cunnilingus.', null, 4210),
  ('hot-22', 'Cunnilingus', '👅', 'Hot', 'practice', 'aventureux', 'Recevoir ou offrir un cunnilingus long et attentif.', null, 4220),
  ('hot-23', 'Fellation', '👄', 'Hot', 'practice', 'aventureux', 'Recevoir ou offrir une fellation avec envie.', null, 4230),
  ('hot-24', '69', '☯️', 'Hot', 'practice', 'aventureux', 'Se donner du plaisir oral en même temps.', null, 4240),
  ('hot-25', 'Oral long', '⏰', 'Hot', 'practice', 'aventureux', 'Faire durer le sexe oral comme moment principal.', null, 4250),
  ('hot-26', 'Guide oral', '🎚️', 'Hot', 'practice', 'aventureux', 'Guider l’autre pendant une fellation ou un cunnilingus.', null, 4260),
  ('hot-27', 'Main + bouche', '🤲', 'Hot', 'practice', 'aventureux', 'Mélanger bouche, langue et mains.', null, 4270),
  ('hot-28', 'Clito précis', '🎯', 'Hot', 'practice', 'aventureux', 'Explorer une stimulation clitoridienne plus ciblée.', null, 4280),
  ('hot-29', 'Pénis lent', '🍌', 'Hot', 'practice', 'aventureux', 'Explorer une stimulation du pénis plus lente.', null, 4290),
  ('hot-30', 'Sextoy simple', '🧸', 'Hot', 'practice', 'aventureux', 'Introduire un jouet facile à utiliser.', null, 4300),
  ('hot-31', 'Lubrifiant', '💧', 'Hot', 'practice', 'aventureux', 'Utiliser du lubrifiant pour plus de confort et de glisse.', null, 4310),
  ('hot-32', 'Profond lent', '🌊', 'Hot', 'practice', 'aventureux', 'Essayer une pénétration plus lente et profonde.', null, 4320),
  ('hot-33', 'Rythmé', '🥁', 'Hot', 'practice', 'aventureux', 'Essayer une pénétration plus rythmée.', null, 4330),
  ('hot-34', 'Se laisser désirer', '🫠', 'Hot', 'practice', 'aventureux', 'Recevoir pleinement le désir de l’autre.', null, 4340),
  ('hot-35', 'Recevoir', '🎁', 'Hot', 'practice', 'aventureux', 'Se laisser donner du plaisir sans culpabiliser.', null, 4350),
  ('hot-36', 'Donner', '🤲', 'Hot', 'practice', 'aventureux', 'Donner du plaisir sans attendre de retour immédiat.', null, 4360),
  ('hot-37', 'Tour de rôle', '🔁', 'Hot', 'practice', 'aventureux', 'Chacun son tour, l’un reçoit puis l’autre.', null, 4370),
  ('hot-38', 'Nuit culte', '🏆', 'Hot', 'practice', 'aventureux', 'Rejouer une nuit particulièrement excitante.', null, 4380),
  ('hot-39', 'Dirty talk', '🌶️', 'Hot', 'discussion', 'aventureux', 'Parler plus cru pendant l’amour.', null, 4390),
  ('hot-40', 'Contrôle', '🎮', 'Hot', 'discussion', 'aventureux', 'Demander à l’autre de prendre les commandes.', null, 4400),
  ('hot-41', 'Encore', '✅', 'Hot', 'practice', 'aventureux', 'Utiliser “encore” comme feu vert excitant.', null, 4410),
  ('hot-42', 'Continue', '⏩', 'Hot', 'discussion', 'aventureux', 'Demander à l’autre de ne pas s’arrêter.', null, 4420),
  ('hot-43', 'Sur le corps', '💦', 'Hot', 'practice', 'aventureux', 'Explorer l’éjaculation sur le corps.', null, 4430),
  ('hot-44', 'Dans la bouche', '👅', 'Hot', 'practice', 'aventureux', 'Explorer l’éjaculation dans la bouche, si désirée.', null, 4440),
  ('hot-45', 'À l’intérieur', '🔒', 'Hot', 'practice', 'aventureux', 'Finir à l’intérieur avec accord, contraception et santé sexuelle.', null, 4450),
  ('hot-46', 'Lumière allumée', '💡', 'Hot', 'practice', 'aventureux', 'Faire l’amour en assumant d’être vus par l’autre.', null, 4460),
  ('hot-47', 'Noir complet', '🌑', 'Hot', 'practice', 'aventureux', 'Faire l’amour dans le noir total.', null, 4470),
  ('hot-48', 'Pause feedback', '🛑', 'Hot', 'discussion', 'aventureux', 'Faire une pause pour dire ce qui plaît.', null, 4480),
  ('hot-49', 'Plus sauvage', '🐺', 'Hot', 'practice', 'aventureux', 'Refaire une pratique connue en version plus animale.', null, 4490),
  ('hot-50', 'Debrief doux', '🫶', 'Hot', 'practice', 'aventureux', 'Terminer en parlant de ce qui a excité.', null, 4500),
  ('jeux-et-defis-01', 'Carte 24h', '🃏', 'Jeux & Défis', 'practice', 'aventureux', 'Tirer une carte et la réaliser dans les 24 heures.', null, 5010),
  ('jeux-et-defis-02', 'Action vérité', '🎲', 'Jeux & Défis', 'practice', 'aventureux', 'Jouer à action ou vérité version couple.', null, 5020),
  ('jeux-et-defis-03', 'Trois défis', '3️⃣', 'Jeux & Défis', 'practice', 'aventureux', 'Chacun propose trois défis coquins.', null, 5030),
  ('jeux-et-defis-04', 'Sans les mains', '🙌', 'Jeux & Défis', 'practice', 'aventureux', 'Faire un défi où les mains sont interdites.', null, 5040),
  ('jeux-et-defis-05', 'Sans parler', '🤐', 'Jeux & Défis', 'discussion', 'aventureux', 'Faire un défi dans le silence.', null, 5050),
  ('jeux-et-defis-06', 'Yeux bandés', '🙈', 'Jeux & Défis', 'practice', 'aventureux', 'Faire un défi avec un bandeau.', null, 5060),
  ('jeux-et-defis-07', 'Minuteur', '⏱️', 'Jeux & Défis', 'practice', 'aventureux', 'Utiliser un minuteur pour faire durer une caresse.', null, 5070),
  ('jeux-et-defis-08', 'Dé du désir', '🎲', 'Jeux & Défis', 'discussion', 'sensuel', 'Laisser un dé choisir l’action.', null, 5080),
  ('jeux-et-defis-09', 'Règle du soir', '📏', 'Jeux & Défis', 'practice', 'aventureux', 'Créer une règle intime pour la soirée.', null, 5090),
  ('jeux-et-defis-10', 'Zone interdite', '⛔', 'Jeux & Défis', 'discussion', 'sensuel', 'Interdire une zone du corps temporairement.', null, 5100),
  ('jeux-et-defis-11', 'Baisers interdits', '🚫💋', 'Jeux & Défis', 'discussion', 'sensuel', 'Interdire les baisers pour créer de l’attente.', null, 5110),
  ('jeux-et-defis-12', 'Devine envie', '🔍', 'Jeux & Défis', 'practice', 'aventureux', 'Faire deviner une envie avec des indices.', null, 5120),
  ('jeux-et-defis-13', 'Tirage fantasme', '🎟️', 'Jeux & Défis', 'practice', 'aventureux', 'Écrire trois fantasmes et en tirer un.', null, 5130),
  ('jeux-et-defis-14', 'Roue des envies', '🎡', 'Jeux & Défis', 'discussion', 'sensuel', 'Faire tourner une roue pour choisir une envie.', null, 5140),
  ('jeux-et-defis-15', 'Tu préfères', '⚖️', 'Jeux & Défis', 'practice', 'aventureux', 'Jouer à “tu préfères” version sexuelle.', null, 5150),
  ('jeux-et-defis-16', 'Oui peut-être non', '🚦', 'Jeux & Défis', 'discussion', 'aventureux', 'Classer les envies en trois niveaux.', null, 5160),
  ('jeux-et-defis-17', 'Récompense', '🏅', 'Jeux & Défis', 'practice', 'aventureux', 'Prévoir une récompense après un défi réussi.', null, 5170),
  ('jeux-et-defis-18', 'Gage doux', '🍬', 'Jeux & Défis', 'practice', 'sensuel', 'Donner un gage tendre ou sensuel.', null, 5180),
  ('jeux-et-defis-19', 'Gage spicy', '🌶️', 'Jeux & Défis', 'practice', 'aventureux', 'Donner un gage plus osé mais consenti.', null, 5190),
  ('jeux-et-defis-20', 'Massage only', '💆', 'Jeux & Défis', 'practice', 'aventureux', 'Faire un défi massage uniquement.', null, 5200),
  ('jeux-et-defis-21', 'Baisers only', '💋', 'Jeux & Défis', 'practice', 'aventureux', 'Faire un défi baisers uniquement.', null, 5210),
  ('jeux-et-defis-22', 'Préliminaires only', '⏳', 'Jeux & Défis', 'discussion', 'sensuel', 'Faire un défi sans aller directement à l’acte.', null, 5220),
  ('jeux-et-defis-23', 'Sans pénétration', '🚫', 'Jeux & Défis', 'practice', 'aventureux', 'Faire un moment intime sans pénétration.', null, 5230),
  ('jeux-et-defis-24', 'Oral only', '👅', 'Jeux & Défis', 'practice', 'aventureux', 'Faire un défi centré sur le sexe oral.', null, 5240),
  ('jeux-et-defis-25', 'Oral prolongé', '⏰', 'Jeux & Défis', 'practice', 'aventureux', 'Faire durer une fellation ou un cunnilingus.', null, 5250),
  ('jeux-et-defis-26', 'Guide-moi', '🧭', 'Jeux & Défis', 'practice', 'aventureux', 'L’un guide, l’autre suit.', null, 5260),
  ('jeux-et-defis-27', 'Rythme imposé', '🎚️', 'Jeux & Défis', 'practice', 'aventureux', 'L’autre décide du rythme.', null, 5270),
  ('jeux-et-defis-28', 'Permission', '🙋', 'Jeux & Défis', 'discussion', 'aventureux', 'Demander la permission avant chaque étape.', null, 5280),
  ('jeux-et-defis-29', 'Ne touche pas', '🙅', 'Jeux & Défis', 'practice', 'aventureux', 'L’un n’a pas le droit de toucher.', null, 5290),
  ('jeux-et-defis-30', 'Reste immobile', '🗿', 'Jeux & Défis', 'practice', 'aventureux', 'L’un doit rester immobile pendant que l’autre joue.', null, 5300),
  ('jeux-et-defis-31', 'Plus vocal', '🔊', 'Jeux & Défis', 'practice', 'aventureux', 'Le défi est d’oser être plus bruyant.', null, 5310),
  ('jeux-et-defis-32', 'Mots crus', '🌶️', 'Jeux & Défis', 'discussion', 'sensuel', 'Les mots plus directs sont autorisés.', null, 5320),
  ('jeux-et-defis-33', 'Nouvelle pièce', '🚪', 'Jeux & Défis', 'practice', 'aventureux', 'Essayer une pièce inhabituelle de la maison.', null, 5330),
  ('jeux-et-defis-34', 'Nouvelle position', '🔄', 'Jeux & Défis', 'practice', 'aventureux', 'Tester une position tirée au hasard.', null, 5340),
  ('jeux-et-defis-35', 'Nouvel accessoire', '🧰', 'Jeux & Défis', 'practice', 'aventureux', 'Ajouter un objet, un bandeau ou un sextoy.', null, 5350),
  ('jeux-et-defis-36', 'Bandeau', '🙈', 'Jeux & Défis', 'practice', 'aventureux', 'Un défi avec les yeux couverts.', null, 5360),
  ('jeux-et-defis-37', 'Mains liées', '🪢', 'Jeux & Défis', 'practice', 'aventureux', 'Les mains sont attachées doucement.', null, 5370),
  ('jeux-et-defis-38', 'Strip', '👗', 'Jeux & Défis', 'practice', 'aventureux', 'Faire un strip-tease comme défi.', null, 5380),
  ('jeux-et-defis-39', 'Photo privée', '📸', 'Jeux & Défis', 'practice', 'aventureux', 'Prendre ou envoyer une photo consentie.', null, 5390),
  ('jeux-et-defis-40', 'Vocal sexy', '🎙️', 'Jeux & Défis', 'practice', 'aventureux', 'Enregistrer un message vocal intime.', null, 5400),
  ('jeux-et-defis-41', 'Surprise', '🎁', 'Jeux & Défis', 'practice', 'aventureux', 'Préparer une surprise sexuelle ou sensuelle.', null, 5410),
  ('jeux-et-defis-42', 'Question avant', '❓', 'Jeux & Défis', 'discussion', 'sensuel', 'Répondre à une question intime avant d’agir.', null, 5420),
  ('jeux-et-defis-43', 'Échange rôles', '🔁', 'Jeux & Défis', 'practice', 'aventureux', 'Inverser les rôles habituels.', null, 5430),
  ('jeux-et-defis-44', 'Orgasme attente', '⏳', 'Jeux & Défis', 'practice', 'aventureux', 'Retarder l’orgasme pendant un temps choisi.', null, 5440),
  ('jeux-et-defis-45', 'Edging soft', '📈', 'Jeux & Défis', 'practice', 'aventureux', 'Faire monter le plaisir sans aller jusqu’au bout tout de suite.', null, 5450),
  ('jeux-et-defis-46', 'L’un reçoit', '🎁', 'Jeux & Défis', 'practice', 'aventureux', 'Une personne reçoit, l’autre donne.', null, 5460),
  ('jeux-et-defis-47', 'Carte perso', '✍️', 'Jeux & Défis', 'practice', 'aventureux', 'Créer une carte personnalisée ensemble.', null, 5470),
  ('jeux-et-defis-48', 'Favori', '⭐', 'Jeux & Défis', 'practice', 'aventureux', 'Mettre une carte aimée de côté pour la refaire.', null, 5480),
  ('jeux-et-defis-49', 'Debrief défi', '🫶', 'Jeux & Défis', 'discussion', 'aventureux', 'Parler de ce qui a plu après le défi.', null, 5490),
  ('jeux-et-defis-50', 'Mot sécurité', '🛟', 'Jeux & Défis', 'discussion', 'sensuel', 'Choisir un mot pour arrêter immédiatement le jeu.', null, 5500),
  ('scenarios-01', 'Première rencontre', '🥂', 'Scénarios', 'practice', 'aventureux', 'Rejouer le moment où vous vous découvrez.', null, 6010),
  ('scenarios-02', 'Inconnus', '🍷', 'Scénarios', 'practice', 'aventureux', 'Faire semblant d’être deux inconnus au restaurant.', null, 6020),
  ('scenarios-03', 'Rendez-vous secret', '🕵️', 'Scénarios', 'practice', 'aventureux', 'Jouer une rencontre cachée entre adultes consentants.', null, 6030),
  ('scenarios-04', 'Amants', '💌', 'Scénarios', 'practice', 'aventureux', 'Jouer des amants qui se retrouvent enfin.', null, 6040),
  ('scenarios-05', 'Retrouvailles', '✈️', 'Scénarios', 'practice', 'aventureux', 'Jouer une scène après une longue absence.', null, 6050),
  ('scenarios-06', 'Chambre d’hôtel', '🏨', 'Scénarios', 'discussion', 'aventureux', 'Imaginer une nuit dans une chambre d’hôtel.', null, 6060),
  ('scenarios-07', 'Vacances', '🏖️', 'Scénarios', 'practice', 'aventureux', 'Jouer une rencontre chaude en vacances.', null, 6070),
  ('scenarios-08', 'Massage privé', '💆', 'Scénarios', 'practice', 'aventureux', 'Jouer une scène de massage sensuel.', null, 6080),
  ('scenarios-09', 'Photo modèle', '📸', 'Scénarios', 'practice', 'aventureux', 'Jouer photographe et modèle.', null, 6090),
  ('scenarios-10', 'Bar', '🍸', 'Scénarios', 'practice', 'aventureux', 'Jouer barman et client qui flirtent.', null, 6100),
  ('scenarios-11', 'Voisin', '🏠', 'Scénarios', 'practice', 'aventureux', 'Jouer le voisin séduisant.', null, 6110),
  ('scenarios-12', 'Colocs', '🛋️', 'Scénarios', 'practice', 'aventureux', 'Jouer deux colocs qui craquent l’un pour l’autre.', null, 6120),
  ('scenarios-13', 'Confession', '🗝️', 'Scénarios', 'practice', 'aventureux', 'Jouer l’aveu d’une envie cachée.', null, 6130),
  ('scenarios-14', 'Tentation', '🍎', 'Scénarios', 'practice', 'aventureux', 'Faire monter une tentation progressive.', null, 6140),
  ('scenarios-15', 'Secret adulte', '🤫', 'Scénarios', 'practice', 'aventureux', 'Jouer un secret intime entre adultes.', null, 6150),
  ('scenarios-16', 'Danse privée', '💃', 'Scénarios', 'practice', 'aventureux', 'Jouer une scène autour d’une danse sexy.', null, 6160),
  ('scenarios-17', 'Strip scène', '👗', 'Scénarios', 'practice', 'aventureux', 'Jouer une scène de strip-tease.', null, 6170),
  ('scenarios-18', 'Rendez-vous arrangé', '🎭', 'Scénarios', 'practice', 'aventureux', 'Jouer deux adultes forcés de se découvrir par jeu.', null, 6180),
  ('scenarios-19', 'Pari intime', '🎲', 'Scénarios', 'practice', 'aventureux', 'Le perdant d’un pari doit réaliser une envie.', null, 6190),
  ('scenarios-20', 'Défi perdu', '🏳️', 'Scénarios', 'practice', 'aventureux', 'Jouer une scène où l’un doit assumer son défi.', null, 6200),
  ('scenarios-21', 'Jalousie fictive', '😈', 'Scénarios', 'practice', 'aventureux', 'Jouer une jalousie inventée et consentie.', null, 6210),
  ('scenarios-22', 'Bureau fictif', '💼', 'Scénarios', 'practice', 'aventureux', 'Jouer une tension au bureau hors vrai cadre professionnel.', null, 6220),
  ('scenarios-23', 'Patron adulte', '📋', 'Scénarios', 'practice', 'aventureux', 'Jouer une dynamique patron/employé entre adultes consentants.', null, 6230),
  ('scenarios-24', 'Formation adulte', '📚', 'Scénarios', 'practice', 'aventureux', 'Jouer une scène professeur/adulte en formation.', null, 6240),
  ('scenarios-25', 'Coach', '🏋️', 'Scénarios', 'practice', 'aventureux', 'Jouer coach et élève adulte.', null, 6250),
  ('scenarios-26', 'Star fan', '⭐', 'Scénarios', 'practice', 'aventureux', 'Jouer star et fan adulte.', null, 6260),
  ('scenarios-27', 'Dom élégant', '🕴️', 'Scénarios', 'practice', 'aventureux', 'Jouer une personne dominante et raffinée.', null, 6270),
  ('scenarios-28', 'Service privé', '🛎️', 'Scénarios', 'practice', 'aventureux', 'Jouer maître/serviteur adulte dans un cadre consenti.', null, 6280),
  ('scenarios-29', 'Royal', '👑', 'Scénarios', 'practice', 'aventureux', 'Jouer roi ou reine et favori adulte.', null, 6290),
  ('scenarios-30', 'Espionnage', '🕶️', 'Scénarios', 'practice', 'aventureux', 'Jouer une mission secrète très intime.', null, 6300),
  ('scenarios-31', 'Bal masqué', '🎭', 'Scénarios', 'practice', 'aventureux', 'Jouer une rencontre masquée en privé.', null, 6310),
  ('scenarios-32', 'Vouvoiement', '🧐', 'Scénarios', 'practice', 'aventureux', 'Jouer une scène avec vouvoiement.', null, 6320),
  ('scenarios-33', 'Costumes', '🧥', 'Scénarios', 'practice', 'aventureux', 'Utiliser des costumes ou accessoires.', null, 6330),
  ('scenarios-34', 'Personnage', '🎬', 'Scénarios', 'practice', 'aventureux', 'Inventer un personnage pour la soirée.', null, 6340),
  ('scenarios-35', 'Plan secret', '🗺️', 'Scénarios', 'practice', 'aventureux', 'L’un arrive avec un scénario préparé.', null, 6350),
  ('scenarios-36', 'Sans toucher', '🚫', 'Scénarios', 'practice', 'aventureux', 'Séduire l’autre sans le toucher.', null, 6360),
  ('scenarios-37', 'Trois consignes', '3️⃣', 'Scénarios', 'practice', 'aventureux', 'L’un doit obéir à trois consignes.', null, 6370),
  ('scenarios-38', 'Début choisi', '⏯️', 'Scénarios', 'practice', 'aventureux', 'L’autre décide quand la scène commence.', null, 6380),
  ('scenarios-39', 'Oral scénarisé', '👅', 'Scénarios', 'practice', 'aventureux', 'Intégrer une fellation ou un cunnilingus au rôle.', null, 6390),
  ('scenarios-40', 'Récompense orale', '🏅', 'Scénarios', 'practice', 'aventureux', 'Recevoir du sexe oral comme récompense consentie.', null, 6400),
  ('scenarios-41', 'Punition jeu', '⚖️', 'Scénarios', 'practice', 'aventureux', 'Jouer une punition symbolique et sexy.', null, 6410),
  ('scenarios-42', 'Récompense sexy', '🎁', 'Scénarios', 'practice', 'aventureux', 'Jouer une récompense sexuelle négociée.', null, 6420),
  ('scenarios-43', 'Interrogatoire', '🕵️', 'Scénarios', 'practice', 'aventureux', 'Jouer un interrogatoire sexy mais léger.', null, 6430),
  ('scenarios-44', 'Pas raisonnable', '🚪', 'Scénarios', 'practice', 'aventureux', 'Jouer un “on ne devrait pas” fictif entre adultes.', null, 6440),
  ('scenarios-45', 'Possession verbale', '🔐', 'Scénarios', 'practice', 'aventureux', 'Jouer avec des phrases de possession consentie.', null, 6450),
  ('scenarios-46', 'Instinctif', '🐺', 'Scénarios', 'practice', 'aventureux', 'Jouer une scène plus animale ou spontanée.', null, 6460),
  ('scenarios-47', 'Dom sans douleur', '🎮', 'Scénarios', 'practice', 'aventureux', 'Jouer une domination sans douleur.', null, 6470),
  ('scenarios-48', 'Sub sans honte', '🫶', 'Scénarios', 'practice', 'aventureux', 'Jouer une soumission sans humiliation.', null, 6480),
  ('scenarios-49', 'Scénario écrit', '✍️', 'Scénarios', 'practice', 'aventureux', 'Écrire une scène avant de la jouer.', null, 6490),
  ('scenarios-50', 'Sur mesure', '🧩', 'Scénarios', 'discussion', 'aventureux', 'Inventer un scénario avec limites claires.', null, 6500),
  ('kinky-soft-01', 'Bandeau', '🙈', 'Kinky Soft', 'practice', 'aventureux', 'Se bander les yeux pour lâcher prise.', null, 7010),
  ('kinky-soft-02', 'Foulard', '🧣', 'Kinky Soft', 'practice', 'aventureux', 'Attacher doucement les poignets avec un foulard.', null, 7020),
  ('kinky-soft-03', 'Menottes douces', '🔗', 'Kinky Soft', 'practice', 'aventureux', 'Utiliser des menottes confortables.', null, 7030),
  ('kinky-soft-04', 'Sans voir', '🧭', 'Kinky Soft', 'practice', 'aventureux', 'Laisser l’autre guider pendant qu’on ne voit rien.', null, 7040),
  ('kinky-soft-05', 'Permission toucher', '🙋', 'Kinky Soft', 'discussion', 'aventureux', 'Demander la permission avant de toucher.', null, 7050),
  ('kinky-soft-06', 'Permission baiser', '💋', 'Kinky Soft', 'discussion', 'aventureux', 'Demander la permission avant d’embrasser.', null, 7060),
  ('kinky-soft-07', 'Permission jouir', '⏳', 'Kinky Soft', 'discussion', 'aventureux', 'Demander la permission avant l’orgasme.', null, 7070),
  ('kinky-soft-08', 'Pas toucher', '🚫', 'Kinky Soft', 'discussion', 'aventureux', 'Interdire de toucher pendant quelques minutes.', null, 7080),
  ('kinky-soft-09', 'Silence', '🤐', 'Kinky Soft', 'discussion', 'aventureux', 'Interdire de parler pendant quelques minutes.', null, 7090),
  ('kinky-soft-10', 'Règle intime', '📏', 'Kinky Soft', 'practice', 'aventureux', 'Créer une règle de jeu pour la soirée.', null, 7100),
  ('kinky-soft-11', 'Ordres doux', '🗣️', 'Kinky Soft', 'practice', 'aventureux', 'Recevoir des consignes simples et excitantes.', null, 7110),
  ('kinky-soft-12', 'Donner ordre', '🎮', 'Kinky Soft', 'practice', 'aventureux', 'Donner des consignes douces à l’autre.', null, 7120),
  ('kinky-soft-13', 'Ne bouge pas', '🗿', 'Kinky Soft', 'practice', 'aventureux', 'Jouer à rester immobile.', null, 7130),
  ('kinky-soft-14', 'Demande mieux', '😇', 'Kinky Soft', 'discussion', 'aventureux', 'Jouer à devoir demander gentiment.', null, 7140),
  ('kinky-soft-15', 'Attente', '⏳', 'Kinky Soft', 'practice', 'aventureux', 'Faire monter l’envie sans donner tout de suite.', null, 7150),
  ('kinky-soft-16', 'Teasing', '🪄', 'Kinky Soft', 'practice', 'aventureux', 'Prolonger l’excitation volontairement.', null, 7160),
  ('kinky-soft-17', 'Baiser privé', '🚫💋', 'Kinky Soft', 'practice', 'aventureux', 'Priver l’autre de baiser temporairement.', null, 7170),
  ('kinky-soft-18', 'Récompense caresse', '✋', 'Kinky Soft', 'practice', 'aventureux', 'Récompenser l’autre par une caresse.', null, 7180),
  ('kinky-soft-19', 'Récompense orale', '👅', 'Kinky Soft', 'practice', 'aventureux', 'Récompenser par une fellation ou un cunnilingus.', null, 7190),
  ('kinky-soft-20', 'Fessée légère', '🍑', 'Kinky Soft', 'practice', 'aventureux', 'Recevoir une fessée douce et consentie.', null, 7200),
  ('kinky-soft-21', 'Donner fessée', '👋', 'Kinky Soft', 'practice', 'aventureux', 'Donner une fessée légère si l’autre aime.', null, 7210),
  ('kinky-soft-22', 'Morsure douce', '🦷', 'Kinky Soft', 'practice', 'aventureux', 'Tester une morsure légère et consentie.', null, 7220),
  ('kinky-soft-23', 'Griffure douce', '🐾', 'Kinky Soft', 'practice', 'aventureux', 'Tester une griffure légère.', null, 7230),
  ('kinky-soft-24', 'Mains tenues', '🤝', 'Kinky Soft', 'practice', 'aventureux', 'Se faire maintenir les mains.', null, 7240),
  ('kinky-soft-25', 'Contre le mur', '🧱', 'Kinky Soft', 'practice', 'aventureux', 'Être plaqué·e doucement contre un mur.', null, 7250),
  ('kinky-soft-26', 'Rythme choisi', '🎚️', 'Kinky Soft', 'practice', 'aventureux', 'Laisser l’autre imposer le rythme.', null, 7260),
  ('kinky-soft-27', 'Position choisie', '🔄', 'Kinky Soft', 'discussion', 'aventureux', 'Laisser l’autre choisir la position.', null, 7270),
  ('kinky-soft-28', 'Commence quand', '▶️', 'Kinky Soft', 'practice', 'aventureux', 'Laisser l’autre décider du début.', null, 7280),
  ('kinky-soft-29', 'Stop quand', '⏸️', 'Kinky Soft', 'practice', 'aventureux', 'Laisser l’autre décider de la pause.', null, 7290),
  ('kinky-soft-30', 'Dom douce', '👑', 'Kinky Soft', 'practice', 'aventureux', 'Explorer une domination sans douleur.', null, 7300),
  ('kinky-soft-31', 'Sub douce', '🫶', 'Kinky Soft', 'practice', 'aventureux', 'Explorer la soumission sans humiliation.', null, 7310),
  ('kinky-soft-32', 'Contrôle plaisir', '🎛️', 'Kinky Soft', 'practice', 'aventureux', 'Laisser l’autre contrôler l’intensité du plaisir.', null, 7320),
  ('kinky-soft-33', 'Contrôle orgasme', '🔒', 'Kinky Soft', 'practice', 'aventureux', 'Jouer avec le moment de l’orgasme.', null, 7330),
  ('kinky-soft-34', 'Edging léger', '📈', 'Kinky Soft', 'practice', 'aventureux', 'Faire monter puis ralentir le plaisir.', null, 7340),
  ('kinky-soft-35', 'Pas tout de suite', '⏰', 'Kinky Soft', 'practice', 'aventureux', 'Retarder volontairement le moment de jouir.', null, 7350),
  ('kinky-soft-36', 'Oral bandé', '👅', 'Kinky Soft', 'practice', 'aventureux', 'Recevoir du sexe oral avec les yeux bandés.', null, 7360),
  ('kinky-soft-37', 'Oral mains liées', '🪢', 'Kinky Soft', 'practice', 'aventureux', 'Recevoir une fellation ou un cunnilingus les mains liées.', null, 7370),
  ('kinky-soft-38', 'Oral sous ordre', '🎯', 'Kinky Soft', 'practice', 'aventureux', 'Donner du plaisir oral en suivant des consignes.', null, 7380),
  ('kinky-soft-39', 'Voix guide', '🎙️', 'Kinky Soft', 'practice', 'aventureux', 'Être guidé·e uniquement par la voix.', null, 7390),
  ('kinky-soft-40', 'Surnom intime', '🏷️', 'Kinky Soft', 'practice', 'aventureux', 'Utiliser un surnom plus sexuel.', null, 7400),
  ('kinky-soft-41', 'Langage direct', '🌶️', 'Kinky Soft', 'discussion', 'aventureux', 'Employer des mots plus explicites.', null, 7410),
  ('kinky-soft-42', 'Vouvoiement', '🎭', 'Kinky Soft', 'practice', 'aventureux', 'Se vouvoyer pendant l’intimité.', null, 7420),
  ('kinky-soft-43', 'Glaçon', '🧊', 'Kinky Soft', 'practice', 'aventureux', 'Tester une sensation froide sur la peau.', null, 7430),
  ('kinky-soft-44', 'Plume', '🪶', 'Kinky Soft', 'practice', 'aventureux', 'Tester une sensation légère et douce.', null, 7440),
  ('kinky-soft-45', 'Mouvement limité', '🧘', 'Kinky Soft', 'practice', 'aventureux', 'Limiter doucement les mouvements.', null, 7450),
  ('kinky-soft-46', 'L’un décide', '🕹️', 'Kinky Soft', 'practice', 'aventureux', 'L’un mène, l’autre suit.', null, 7460),
  ('kinky-soft-47', 'Check avant', '✅', 'Kinky Soft', 'discussion', 'aventureux', 'Vérifier les envies et limites avant de commencer.', null, 7470),
  ('kinky-soft-48', 'Check pendant', '🚦', 'Kinky Soft', 'discussion', 'aventureux', 'Demander si tout va bien pendant le jeu.', null, 7480),
  ('kinky-soft-49', 'Check après', '🫶', 'Kinky Soft', 'discussion', 'aventureux', 'Faire un retour tendre après l’expérience.', null, 7490),
  ('kinky-soft-50', 'À refaire', '⭐', 'Kinky Soft', 'practice', 'aventureux', 'Refaire seulement ce qui a vraiment plu.', null, 7500),
  ('bdsm-01', 'Safeword', '🛟', 'BDSM', 'discussion', 'aventureux', 'Choisir un mot qui arrête tout immédiatement.', null, 8010),
  ('bdsm-02', 'Feu tricolore', '🚦', 'BDSM', 'practice', 'aventureux', 'Utiliser vert, orange et rouge pour communiquer.', null, 8020),
  ('bdsm-03', 'Négociation', '📋', 'BDSM', 'discussion', 'aventureux', 'Définir la scène avant de commencer.', null, 8030),
  ('bdsm-04', 'Limites dures', '⛔', 'BDSM', 'discussion', 'aventureux', 'Lister ce qui est clairement non.', null, 8040),
  ('bdsm-05', 'Limites souples', '⚠️', 'BDSM', 'discussion', 'aventureux', 'Lister ce qui peut être discuté.', null, 8050),
  ('bdsm-06', 'Aftercare', '🫂', 'BDSM', 'practice', 'aventureux', 'Prévoir un retour au calme après la scène.', null, 8060),
  ('bdsm-07', 'Domination', '👑', 'BDSM', 'practice', 'aventureux', 'Jouer une scène où l’un mène clairement.', null, 8070),
  ('bdsm-08', 'Soumission', '🧎', 'BDSM', 'practice', 'aventureux', 'Jouer une scène où l’un accepte de suivre.', null, 8080),
  ('bdsm-09', 'Poignets liés', '🪢', 'BDSM', 'practice', 'aventureux', 'Attacher les poignets avec sécurité.', null, 8090),
  ('bdsm-10', 'Chevilles liées', '🔗', 'BDSM', 'practice', 'aventureux', 'Attacher les chevilles avec confort et prudence.', null, 8100),
  ('bdsm-11', 'Bondage lit', '🛏️', 'BDSM', 'practice', 'aventureux', 'Tester une immobilisation au lit.', null, 8110),
  ('bdsm-12', 'Immobilisé·e', '🧘', 'BDSM', 'practice', 'aventureux', 'Tester une position bloquée mais confortable.', null, 8120),
  ('bdsm-13', 'Ordres clairs', '🗣️', 'BDSM', 'practice', 'aventureux', 'Recevoir des ordres précis.', null, 8130),
  ('bdsm-14', 'Donner ordres', '🎮', 'BDSM', 'practice', 'aventureux', 'Donner des consignes plus strictes.', null, 8140),
  ('bdsm-15', 'Permission bouger', '🙋', 'BDSM', 'discussion', 'aventureux', 'Demander la permission de bouger.', null, 8150),
  ('bdsm-16', 'Permission parler', '🤐', 'BDSM', 'discussion', 'aventureux', 'Demander la permission de parler.', null, 8160),
  ('bdsm-17', 'Permission jouir', '🔒', 'BDSM', 'discussion', 'aventureux', 'Demander la permission avant l’orgasme.', null, 8170),
  ('bdsm-18', 'Orgasm control', '🎛️', 'BDSM', 'practice', 'aventureux', 'Laisser l’autre contrôler le moment de jouir.', null, 8180),
  ('bdsm-19', 'Edging', '📈', 'BDSM', 'practice', 'aventureux', 'Faire monter le plaisir puis ralentir.', null, 8190),
  ('bdsm-20', 'Déni temporaire', '⏳', 'BDSM', 'practice', 'aventureux', 'Retarder l’orgasme dans un cadre consenti.', null, 8200),
  ('bdsm-21', 'Fessée', '🍑', 'BDSM', 'practice', 'aventureux', 'Recevoir une fessée consentie.', null, 8210),
  ('bdsm-22', 'Impact léger', '👋', 'BDSM', 'practice', 'aventureux', 'Tester des sensations d’impact douces.', null, 8220),
  ('bdsm-23', 'Impact intense', '⚡', 'BDSM', 'discussion', 'aventureux', 'Tester plus fort avec limites très claires.', null, 8230),
  ('bdsm-24', 'Paddle', '🏓', 'BDSM', 'practice', 'aventureux', 'Utiliser une paddle douce.', null, 8240),
  ('bdsm-25', 'Cravache', '🐎', 'BDSM', 'practice', 'aventureux', 'Utiliser une cravache de manière symbolique ou légère.', null, 8250),
  ('bdsm-26', 'Discipline', '📏', 'BDSM', 'discussion', 'aventureux', 'Créer une dynamique de règles et conséquences.', null, 8260),
  ('bdsm-27', 'Règles soirée', '📜', 'BDSM', 'discussion', 'aventureux', 'Fixer des règles pour une scène.', null, 8270),
  ('bdsm-28', 'Récompenses', '🏆', 'BDSM', 'discussion', 'aventureux', 'Définir ce qui est gagné en obéissant.', null, 8280),
  ('bdsm-29', 'Punitions', '⚖️', 'BDSM', 'discussion', 'aventureux', 'Définir des punitions consenties et réversibles.', null, 8290),
  ('bdsm-30', 'Tenue contrôlée', '👔', 'BDSM', 'discussion', 'aventureux', 'Laisser l’autre choisir la tenue.', null, 8300),
  ('bdsm-31', 'Parole contrôlée', '🤫', 'BDSM', 'discussion', 'aventureux', 'Limiter quand l’autre peut parler.', null, 8310),
  ('bdsm-32', 'Regard contrôlé', '👁️', 'BDSM', 'practice', 'aventureux', 'Limiter quand l’autre peut regarder.', null, 8320),
  ('bdsm-33', 'Plaisir contrôlé', '🎚️', 'BDSM', 'practice', 'aventureux', 'Contrôler le rythme et l’intensité du plaisir.', null, 8330),
  ('bdsm-34', 'Fellation sous ordre', '👅', 'BDSM', 'practice', 'aventureux', 'Faire ou recevoir une fellation guidée par consignes.', null, 8340),
  ('bdsm-35', 'Cunni sous ordre', '👅', 'BDSM', 'practice', 'aventureux', 'Faire ou recevoir un cunnilingus guidé par consignes.', null, 8350),
  ('bdsm-36', 'Pénétration guidée', '🎯', 'BDSM', 'practice', 'aventureux', 'Laisser le dominant contrôler la pénétration.', null, 8360),
  ('bdsm-37', 'Collier', '⭕', 'BDSM', 'practice', 'aventureux', 'Porter un collier symbolique en privé.', null, 8370),
  ('bdsm-38', 'Laisse privée', '🐾', 'BDSM', 'practice', 'aventureux', 'Utiliser une laisse avec accord clair.', null, 8380),
  ('bdsm-39', 'Dom/sub', '♟️', 'BDSM', 'practice', 'aventureux', 'Explorer une dynamique dominant/soumis.', null, 8390),
  ('bdsm-40', 'Brat/tamer', '😈', 'BDSM', 'practice', 'aventureux', 'Jouer la provocation et la reprise de contrôle.', null, 8400),
  ('bdsm-41', 'Praise kink', '🌟', 'BDSM', 'practice', 'aventureux', 'Recevoir beaucoup de compliments excitants.', null, 8410),
  ('bdsm-42', 'Humiliation légère', '🫣', 'BDSM', 'practice', 'aventureux', 'Explorer des mots humiliants mais consentis.', null, 8420),
  ('bdsm-43', 'Ordres stricts', '📢', 'BDSM', 'practice', 'aventureux', 'Recevoir des ordres plus fermes.', null, 8430),
  ('bdsm-44', 'Service sexuel', '🛎️', 'BDSM', 'practice', 'aventureux', 'Jouer une scène de service sexuel consenti.', null, 8440),
  ('bdsm-45', 'Possession', '🔐', 'BDSM', 'practice', 'aventureux', 'Jouer avec des phrases de possession consentie.', null, 8450),
  ('bdsm-46', 'Scène courte', '⏱️', 'BDSM', 'practice', 'aventureux', 'Faire une scène BDSM de 10 minutes.', null, 8460),
  ('bdsm-47', 'Scène longue', '🕯️', 'BDSM', 'practice', 'aventureux', 'Préparer une scène plus longue.', null, 8470),
  ('bdsm-48', 'Ce qui excite', '🔥', 'BDSM', 'discussion', 'aventureux', 'Débriefer ce qui a vraiment fonctionné.', null, 8480),
  ('bdsm-49', 'Trop intense', '⚠️', 'BDSM', 'discussion', 'aventureux', 'Débriefer ce qui a été trop fort.', null, 8490),
  ('bdsm-50', 'Rejouer', '🔁', 'BDSM', 'practice', 'aventureux', 'Refaire une scène réussie avec ajustements.', null, 8500),
  ('plaisirs-explicites-01', 'Fellation lente', '👄', 'Plaisirs explicites', 'practice', 'aventureux', 'Recevoir ou donner une fellation douce et progressive.', null, 9010),
  ('plaisirs-explicites-02', 'Donner fellation', '👅', 'Plaisirs explicites', 'practice', 'aventureux', 'Prendre le temps de donner du plaisir avec la bouche.', null, 9020),
  ('plaisirs-explicites-03', 'Fellation intense', '🔥', 'Plaisirs explicites', 'practice', 'aventureux', 'Explorer une fellation plus rythmée.', null, 9030),
  ('plaisirs-explicites-04', 'Bouche experte', '👅', 'Plaisirs explicites', 'practice', 'aventureux', 'Jouer avec la langue, les lèvres et les mains.', null, 9040),
  ('plaisirs-explicites-05', 'Plus profond', '🌊', 'Plaisirs explicites', 'practice', 'aventureux', 'Explorer une fellation plus profonde si c’est confortable.', null, 9050),
  ('plaisirs-explicites-06', 'Rythme oral', '🎚️', 'Plaisirs explicites', 'practice', 'aventureux', 'Guider le rythme d’une fellation.', null, 9060),
  ('plaisirs-explicites-07', 'Main + fellation', '🤲', 'Plaisirs explicites', 'practice', 'aventureux', 'Combiner main et bouche pendant une fellation.', null, 9070),
  ('plaisirs-explicites-08', 'Jusqu’au bout', '🏁', 'Plaisirs explicites', 'practice', 'aventureux', 'Recevoir une fellation jusqu’à l’orgasme.', null, 9080),
  ('plaisirs-explicites-09', 'Dans la bouche', '💦', 'Plaisirs explicites', 'practice', 'aventureux', 'Explorer l’éjaculation dans la bouche avec accord clair.', null, 9090),
  ('plaisirs-explicites-10', 'Sur le corps', '🎨', 'Plaisirs explicites', 'practice', 'aventureux', 'Explorer l’éjaculation sur une zone du corps choisie.', null, 9100),
  ('plaisirs-explicites-11', 'Cunnilingus lent', '👅', 'Plaisirs explicites', 'practice', 'aventureux', 'Recevoir ou offrir un cunnilingus lent et attentif.', null, 9110),
  ('plaisirs-explicites-12', 'Donner cunni', '🫦', 'Plaisirs explicites', 'practice', 'aventureux', 'Prendre le temps de lécher et d’écouter les réactions.', null, 9120),
  ('plaisirs-explicites-13', 'Cunni intense', '🔥', 'Plaisirs explicites', 'practice', 'aventureux', 'Explorer un cunnilingus plus appuyé.', null, 9130),
  ('plaisirs-explicites-14', 'Langue précise', '🎯', 'Plaisirs explicites', 'practice', 'aventureux', 'Utiliser la langue de manière plus ciblée.', null, 9140),
  ('plaisirs-explicites-15', 'Guide cunni', '🎚️', 'Plaisirs explicites', 'practice', 'aventureux', 'Guider le rythme d’un cunnilingus.', null, 9150),
  ('plaisirs-explicites-16', 'Jusqu’à l’orgasme', '🏁', 'Plaisirs explicites', 'practice', 'aventureux', 'Faire durer le cunnilingus jusqu’à l’orgasme.', null, 9160),
  ('plaisirs-explicites-17', 'Soixante-neuf', '☯️', 'Plaisirs explicites', 'practice', 'aventureux', 'Se donner du plaisir oral en même temps.', null, 9170),
  ('plaisirs-explicites-18', 'Oral principal', '👅', 'Plaisirs explicites', 'practice', 'aventureux', 'Faire du sexe oral le centre du moment intime.', null, 9180),
  ('plaisirs-explicites-19', 'Oral bandé', '🙈', 'Plaisirs explicites', 'practice', 'aventureux', 'Recevoir du sexe oral les yeux bandés.', null, 9190),
  ('plaisirs-explicites-20', 'Oral attaché', '🪢', 'Plaisirs explicites', 'practice', 'aventureux', 'Recevoir du sexe oral avec les mains liées.', null, 9200),
  ('plaisirs-explicites-21', 'Doigts clito', '✌️', 'Plaisirs explicites', 'practice', 'aventureux', 'Explorer la stimulation clitoridienne avec les doigts.', null, 9210),
  ('plaisirs-explicites-22', 'Main pénis', '✊', 'Plaisirs explicites', 'practice', 'aventureux', 'Explorer la stimulation du pénis avec la main.', null, 9220),
  ('plaisirs-explicites-23', 'Masturbation mutuelle', '🔁', 'Plaisirs explicites', 'practice', 'aventureux', 'Se masturber ensemble, côte à côte ou face à face.', null, 9230),
  ('plaisirs-explicites-24', 'Se montrer', '👀', 'Plaisirs explicites', 'practice', 'aventureux', 'Se masturber devant l’autre.', null, 9240),
  ('plaisirs-explicites-25', 'Regarder', '👁️', 'Plaisirs explicites', 'practice', 'aventureux', 'Regarder l’autre se donner du plaisir.', null, 9250),
  ('plaisirs-explicites-26', 'Vibromasseur', '🧸', 'Plaisirs explicites', 'practice', 'aventureux', 'Utiliser un vibromasseur ensemble.', null, 9260),
  ('plaisirs-explicites-27', 'Stimulateur clito', '⚡', 'Plaisirs explicites', 'practice', 'aventureux', 'Utiliser un stimulateur clitoridien.', null, 9270),
  ('plaisirs-explicites-28', 'Anneau vibrant', '⭕', 'Plaisirs explicites', 'practice', 'aventureux', 'Essayer un anneau vibrant.', null, 9280),
  ('plaisirs-explicites-29', 'Sextoy pénétration', '🧰', 'Plaisirs explicites', 'practice', 'aventureux', 'Ajouter un sextoy pendant la pénétration.', null, 9290),
  ('plaisirs-explicites-30', 'Sextoy distance', '📡', 'Plaisirs explicites', 'practice', 'aventureux', 'Utiliser un sextoy contrôlable à distance.', null, 9300),
  ('plaisirs-explicites-31', 'Anal externe', '🍑', 'Plaisirs explicites', 'practice', 'aventureux', 'Explorer la stimulation anale externe.', null, 9310),
  ('plaisirs-explicites-32', 'Doigt anal', '☝️', 'Plaisirs explicites', 'practice', 'aventureux', 'Essayer une stimulation anale avec un doigt.', null, 9320),
  ('plaisirs-explicites-33', 'Plug anal', '🔌', 'Plaisirs explicites', 'practice', 'aventureux', 'Utiliser un plug anal progressivement.', null, 9330),
  ('plaisirs-explicites-34', 'Anal doux', '🍑', 'Plaisirs explicites', 'practice', 'aventureux', 'Découvrir la pénétration anale avec lenteur.', null, 9340),
  ('plaisirs-explicites-35', 'Sodomie', '🍑', 'Plaisirs explicites', 'practice', 'aventureux', 'Explorer la sodomie consentie et préparée.', null, 9350),
  ('plaisirs-explicites-36', 'Recevoir anal', '🫶', 'Plaisirs explicites', 'practice', 'aventureux', 'Recevoir une pénétration anale avec confort et accord.', null, 9360),
  ('plaisirs-explicites-37', 'Donner anal', '💧', 'Plaisirs explicites', 'practice', 'aventureux', 'Donner une pénétration anale avec écoute et lubrifiant.', null, 9370),
  ('plaisirs-explicites-38', 'Anal lubrifié', '💦', 'Plaisirs explicites', 'practice', 'aventureux', 'Explorer l’anal avec beaucoup de lubrifiant et de patience.', null, 9380),
  ('plaisirs-explicites-39', 'Prostate', '🎯', 'Plaisirs explicites', 'practice', 'aventureux', 'Découvrir le plaisir prostatique.', null, 9390),
  ('plaisirs-explicites-40', 'Doigt prostate', '☝️', 'Plaisirs explicites', 'practice', 'aventureux', 'Explorer la stimulation de la prostate avec les doigts.', null, 9400),
  ('plaisirs-explicites-41', 'Masseur prostate', '🧸', 'Plaisirs explicites', 'practice', 'aventureux', 'Utiliser un masseur prostatique.', null, 9410),
  ('plaisirs-explicites-42', 'Pegging', '🦄', 'Plaisirs explicites', 'practice', 'aventureux', 'Explorer le pegging avec gode-ceinture ou sextoy adapté.', null, 9420),
  ('plaisirs-explicites-43', 'Anal masculin', '🍑', 'Plaisirs explicites', 'practice', 'aventureux', 'Recevoir une stimulation ou pénétration anale masculine.', null, 9430),
  ('plaisirs-explicites-44', 'Plaisir homme', '🎯', 'Plaisirs explicites', 'practice', 'aventureux', 'Donner du plaisir anal à un homme.', null, 9440),
  ('plaisirs-explicites-45', 'Double stimulation', '✌️', 'Plaisirs explicites', 'practice', 'aventureux', 'Stimuler deux zones en même temps avec un sextoy.', null, 9450),
  ('plaisirs-explicites-46', 'Double avec sextoy', '🔱', 'Plaisirs explicites', 'practice', 'aventureux', 'Explorer une double pénétration avec sextoy.', null, 9460),
  ('plaisirs-explicites-47', 'Squirting', '💦', 'Plaisirs explicites', 'practice', 'aventureux', 'Explorer le squirting sans pression de résultat.', null, 9470),
  ('plaisirs-explicites-48', 'Orgasmes multiples', '🔁', 'Plaisirs explicites', 'practice', 'aventureux', 'Explorer plusieurs orgasmes dans un même moment.', null, 9480),
  ('plaisirs-explicites-49', 'Finir dedans', '🔒', 'Plaisirs explicites', 'practice', 'aventureux', 'Finir à l’intérieur avec accord, contraception et santé sexuelle.', null, 9490),
  ('plaisirs-explicites-50', 'Menu plaisir', '📋', 'Plaisirs explicites', 'discussion', 'aventureux', 'Dire clairement ce qu’on veut essayer, refaire ou éviter.', null, 9500),
  ('tabous-01', 'Fantasme secret', '🗝️', 'Tabous', 'discussion', 'aventureux', 'Avouer un fantasme jamais dit.', null, 10010),
  ('tabous-02', 'Oui peut-être jamais', '🚦', 'Tabous', 'discussion', 'aventureux', 'Classer ses fantasmes par niveau d’envie.', null, 10020),
  ('tabous-03', 'Juste en parler', '💬', 'Tabous', 'discussion', 'aventureux', 'Explorer un fantasme sans devoir le réaliser.', null, 10030),
  ('tabous-04', 'Par la parole', '🗣️', 'Tabous', 'practice', 'aventureux', 'Vivre un fantasme uniquement en le décrivant.', null, 10040),
  ('tabous-05', 'Lecture érotique', '📖', 'Tabous', 'practice', 'aventureux', 'Lire un texte érotique ensemble.', null, 10050),
  ('tabous-06', 'Audio érotique', '🎧', 'Tabous', 'practice', 'aventureux', 'Écouter un audio excitant choisi ensemble.', null, 10060),
  ('tabous-07', 'Vidéo choisie', '🎬', 'Tabous', 'practice', 'aventureux', 'Regarder un contenu érotique validé par les deux.', null, 10070),
  ('tabous-08', 'Fantasme dom', '👑', 'Tabous', 'discussion', 'aventureux', 'Parler d’un fantasme de domination.', null, 10080),
  ('tabous-09', 'Fantasme sub', '🧎', 'Tabous', 'discussion', 'aventureux', 'Parler d’un fantasme de soumission.', null, 10090),
  ('tabous-10', 'Possession', '🔐', 'Tabous', 'practice', 'aventureux', 'Explorer le fantasme d’appartenir symboliquement à l’autre.', null, 10100),
  ('tabous-11', 'Humiliation', '🫣', 'Tabous', 'discussion', 'aventureux', 'Parler d’humiliation consentie et cadrée.', null, 10110),
  ('tabous-12', 'Praise', '🌟', 'Tabous', 'practice', 'aventureux', 'Explorer le fantasme d’être couvert·e de compliments sexuels.', null, 10120),
  ('tabous-13', 'Être utilisé·e', '🎭', 'Tabous', 'practice', 'aventureux', 'Jouer avec l’idée d’être objet de désir, avec accord clair.', null, 10130),
  ('tabous-14', 'Servir', '🛎️', 'Tabous', 'practice', 'aventureux', 'Explorer le fantasme de servir sexuellement l’autre.', null, 10140),
  ('tabous-15', 'Mots crus', '🌶️', 'Tabous', 'discussion', 'aventureux', 'Utiliser un langage plus direct et sexuel.', null, 10150),
  ('tabous-16', 'Insultes consenties', '⚠️', 'Tabous', 'practice', 'aventureux', 'Explorer des mots plus durs, uniquement si désirés.', null, 10160),
  ('tabous-17', 'Surnoms osés', '🏷️', 'Tabous', 'practice', 'aventureux', 'Utiliser des surnoms sexuels plus provocants.', null, 10170),
  ('tabous-18', 'Jalousie fictive', '😈', 'Tabous', 'practice', 'aventureux', 'Jouer une jalousie inventée et contrôlée.', null, 10180),
  ('tabous-19', 'Interdit fictif', '🚪', 'Tabous', 'practice', 'aventureux', 'Explorer un scénario interdit imaginaire entre adultes.', null, 10190),
  ('tabous-20', 'Pouvoir', '♟️', 'Tabous', 'practice', 'aventureux', 'Jouer avec une dynamique de pouvoir symbolique.', null, 10200),
  ('tabous-21', 'Lâcher prise', '🌊', 'Tabous', 'practice', 'aventureux', 'Explorer la perte de contrôle dans un cadre sécurisé.', null, 10210),
  ('tabous-22', 'Primal soft', '🐺', 'Tabous', 'practice', 'aventureux', 'Jouer une énergie plus animale, mais cadrée.', null, 10220),
  ('tabous-23', 'Morsures', '🦷', 'Tabous', 'practice', 'aventureux', 'Explorer les morsures consenties.', null, 10230),
  ('tabous-24', 'Marquage', '🖊️', 'Tabous', 'practice', 'aventureux', 'Explorer un marquage symbolique ou temporaire.', null, 10240),
  ('tabous-25', 'Lingerie', '👙', 'Tabous', 'practice', 'aventureux', 'Explorer un fétiche de lingerie.', null, 10250),
  ('tabous-26', 'Talons', '👠', 'Tabous', 'practice', 'aventureux', 'Explorer un fétiche des talons.', null, 10260),
  ('tabous-27', 'Cuir latex', '🖤', 'Tabous', 'practice', 'aventureux', 'Explorer l’attirance pour le cuir ou le latex.', null, 10270),
  ('tabous-28', 'Pieds', '🦶', 'Tabous', 'practice', 'aventureux', 'Explorer un fétiche des pieds.', null, 10280),
  ('tabous-29', 'Mains', '🤲', 'Tabous', 'practice', 'aventureux', 'Explorer un fétiche des mains.', null, 10290),
  ('tabous-30', 'Odeurs', '🫧', 'Tabous', 'practice', 'aventureux', 'Explorer l’attirance pour les odeurs corporelles.', null, 10300),
  ('tabous-31', 'Voix', '🎙️', 'Tabous', 'practice', 'aventureux', 'Explorer l’excitation liée à la voix.', null, 10310),
  ('tabous-32', 'Film privé', '📹', 'Tabous', 'practice', 'aventureux', 'Se filmer uniquement pour soi, avec accord clair.', null, 10320),
  ('tabous-33', 'Photos privées', '📸', 'Tabous', 'practice', 'aventureux', 'Prendre des photos intimes consenties.', null, 10330),
  ('tabous-34', 'Trio fantasme', '🔺', 'Tabous', 'discussion', 'aventureux', 'Parler du fantasme de trio.', null, 10340),
  ('tabous-35', 'Limites trio', '📋', 'Tabous', 'discussion', 'aventureux', 'Définir les limites avant d’imaginer un trio.', null, 10350),
  ('tabous-36', 'Trio imaginaire', '💭', 'Tabous', 'discussion', 'aventureux', 'Imaginer un trio sans forcément le réaliser.', null, 10360),
  ('tabous-37', 'Être regardés', '👀', 'Tabous', 'discussion', 'aventureux', 'Parler du fantasme d’être vus par d’autres adultes consentants.', null, 10370),
  ('tabous-38', 'Regarder couple', '👁️', 'Tabous', 'discussion', 'aventureux', 'Parler du fantasme de regarder un autre couple.', null, 10380),
  ('tabous-39', 'Candaulisme', '🔥', 'Tabous', 'discussion', 'aventureux', 'Parler du fantasme de voir son/sa partenaire désiré·e.', null, 10390),
  ('tabous-40', 'Hotwife/hothusband', '💍', 'Tabous', 'practice', 'aventureux', 'Explorer ce fantasme si les deux connaissent les codes.', null, 10400),
  ('tabous-41', 'Échangisme', '🔁', 'Tabous', 'discussion', 'aventureux', 'Parler d’échangisme sans obligation de passer à l’action.', null, 10410),
  ('tabous-42', 'Club libertin', '🪩', 'Tabous', 'discussion', 'aventureux', 'Évoquer l’idée d’un club libertin.', null, 10420),
  ('tabous-43', 'Observer seulement', '👀', 'Tabous', 'practice', 'aventureux', 'Aller dans un lieu libertin uniquement pour observer.', null, 10430),
  ('tabous-44', 'Exclusif', '🔒', 'Tabous', 'discussion', 'aventureux', 'Définir ce qui reste réservé au couple.', null, 10440),
  ('tabous-45', 'Partageable', '🔓', 'Tabous', 'discussion', 'aventureux', 'Définir ce qui pourrait être partagé.', null, 10450),
  ('tabous-46', 'Droit de veto', '🛑', 'Tabous', 'discussion', 'aventureux', 'Pouvoir dire non à tout moment, sans justification.', null, 10460),
  ('tabous-47', 'Flirt extérieur', '💬', 'Tabous', 'discussion', 'aventureux', 'Définir les règles de flirt avec d’autres.', null, 10470),
  ('tabous-48', 'Protection', '🛡️', 'Tabous', 'discussion', 'aventureux', 'Parler santé sexuelle, contraception et dépistage.', null, 10480),
  ('tabous-49', 'Debrief obligatoire', '🫶', 'Tabous', 'practice', 'aventureux', 'Prévoir une discussion après toute exploration.', null, 10490),
  ('tabous-50', 'Fantasme pas réel', '💭', 'Tabous', 'practice', 'aventureux', 'Assumer qu’un fantasme peut rester seulement un fantasme.', null, 10500)
on conflict (id) do update
set title = excluded.title,
    emoji = excluded.emoji,
    category = excluded.category,
    kind = excluded.kind,
    mood = excluded.mood,
    blurb = excluded.blurb,
    safety = excluded.safety,
    sort_order = excluded.sort_order;
