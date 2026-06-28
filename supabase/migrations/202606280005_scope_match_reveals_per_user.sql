alter table public.match_reveals
add column if not exists user_id uuid references public.profiles (id) on delete cascade;

create temp table migrated_match_reveals on commit drop as
select distinct on (source.couple_id, source.user_id, source.card_id)
  source.couple_id,
  source.user_id,
  source.card_id,
  source.first_matched_at,
  source.revealed_at
from (
  select
    reveals.couple_id,
    members.user_id,
    reveals.card_id,
    reveals.first_matched_at,
    case
      when reveals.user_id is not null then reveals.revealed_at
      when reveals.revealed_by = members.user_id then reveals.revealed_at
      else null
    end as revealed_at
  from public.match_reveals reveals
  join public.couple_members members on members.couple_id = reveals.couple_id
) source
order by source.couple_id, source.user_id, source.card_id, source.revealed_at desc nulls last, source.first_matched_at asc;

alter table public.match_reveals
drop constraint if exists match_reveals_pkey;

truncate table public.match_reveals;

insert into public.match_reveals (couple_id, user_id, card_id, first_matched_at, revealed_at)
select couple_id, user_id, card_id, first_matched_at, revealed_at
from migrated_match_reveals;

alter table public.match_reveals
alter column user_id set not null;

alter table public.match_reveals
drop column if exists revealed_by;

alter table public.match_reveals
add constraint match_reveals_pkey primary key (couple_id, user_id, card_id);

drop index if exists match_reveals_couple_idx;
create index if not exists match_reveals_couple_idx
on public.match_reveals (couple_id, user_id, first_matched_at desc);

create index if not exists match_reveals_couple_card_idx
on public.match_reveals (couple_id, card_id);

drop policy if exists "match_reveals_read_members" on public.match_reveals;
create policy "match_reveals_read_members"
on public.match_reveals for select
using (user_id = auth.uid() and public.is_couple_member(couple_id));

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
    insert into public.match_reveals (couple_id, user_id, card_id)
    select p_couple_id, members.user_id, p_card_id
    from public.couple_members members
    where members.couple_id = p_couple_id
    on conflict (couple_id, user_id, card_id) do nothing;
  end if;
end;
$$;

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
    and reveals.user_id = auth.uid()
  where votes.couple_id = v_couple_id
  group by cards.id, cards.title, cards.emoji, cards.category, cards.kind, cards.mood, cards.blurb, cards.safety
  having count(*) filter (where votes.level >= p_threshold) = 2;
end;
$$;

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
  set revealed_at = coalesce(revealed_at, now())
  where couple_id = v_couple_id
    and user_id = auth.uid()
    and card_id = p_card_id
    and exists (
      select 1
      from public.get_revealable_matches(v_couple_id, 1) matches
      where matches.card_id = p_card_id
    );
end;
$$;

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

  perform public.check_rate_limit('get_my_couple_state', 120, 60);

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
        select card_id, first_matched_at, revealed_at, true as revealed_by_current_user
        from public.match_reveals
        where couple_id = v_couple_id
          and user_id = auth.uid()
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
      from (
        select messages.*
        from public.chat_messages messages
        where messages.couple_id = v_couple_id
          and messages.expires_at > now()
        order by messages.created_at desc
        limit 80
      ) messages
    ), '[]'::jsonb)
  );
end;
$$;
