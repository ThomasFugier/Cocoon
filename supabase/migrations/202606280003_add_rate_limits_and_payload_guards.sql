create table if not exists public.app_rate_limits (
  user_id uuid not null references auth.users (id) on delete cascade,
  action text not null check (char_length(action) between 1 and 80),
  window_start timestamptz not null,
  count int not null default 0 check (count >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, action, window_start)
);

create index if not exists app_rate_limits_updated_idx
on public.app_rate_limits (updated_at);

create index if not exists couple_members_user_joined_idx
on public.couple_members (user_id, joined_at desc);

create index if not exists desire_votes_couple_card_idx
on public.desire_votes (couple_id, card_id);

alter table public.app_rate_limits enable row level security;

update storage.buckets
set public = false,
    file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'chat-attachments';

create or replace function public.check_rate_limit(
  p_action text,
  p_limit int,
  p_window_seconds int
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
  v_window_start timestamptz;
  v_count int;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  if nullif(trim(p_action), '') is null or char_length(p_action) > 80 then
    raise exception 'invalid_rate_limit_action';
  end if;

  if p_limit < 1 or p_window_seconds < 1 then
    raise exception 'invalid_rate_limit_window';
  end if;

  v_window_start := to_timestamp(floor(extract(epoch from v_now) / p_window_seconds) * p_window_seconds);

  insert into public.app_rate_limits (user_id, action, window_start, count, updated_at)
  values (v_user_id, trim(p_action), v_window_start, 1, v_now)
  on conflict (user_id, action, window_start) do update
  set count = public.app_rate_limits.count + 1,
      updated_at = excluded.updated_at
  returning count into v_count;

  if random() < 0.01 then
    delete from public.app_rate_limits
    where updated_at < v_now - interval '2 days';
  end if;

  if v_count > p_limit then
    raise exception 'rate_limited' using detail = trim(p_action);
  end if;
end;
$$;

create or replace function public.apply_write_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_action text;
  v_limit int;
  v_window_seconds int;
begin
  if auth.uid() is null then
    return new;
  end if;

  if TG_TABLE_NAME = 'couples' then
    v_action := 'create_couple';
    v_limit := 6;
    v_window_seconds := 3600;
  elsif TG_TABLE_NAME = 'desire_votes' then
    v_action := 'save_desire_vote';
    v_limit := 120;
    v_window_seconds := 60;
  elsif TG_TABLE_NAME = 'chat_messages' then
    v_action := 'send_chat_message';
    v_limit := 30;
    v_window_seconds := 60;
  elsif TG_TABLE_NAME = 'chat_attachments' then
    v_action := 'send_chat_attachment';
    v_limit := 120;
    v_window_seconds := 60;
  elsif TG_TABLE_NAME = 'custom_desire_cards' then
    v_action := 'create_custom_desire';
    v_limit := 20;
    v_window_seconds := 3600;
  elsif TG_TABLE_NAME = 'couple_moods' then
    v_action := 'update_couple_mood';
    v_limit := 30;
    v_window_seconds := 60;
  elsif TG_TABLE_NAME = 'notification_preferences' then
    v_action := 'notification_preferences';
    v_limit := 40;
    v_window_seconds := 3600;
  elsif TG_TABLE_NAME = 'push_tokens' then
    v_action := 'register_push_token';
    v_limit := 20;
    v_window_seconds := 3600;
  elsif TG_TABLE_NAME = 'match_reveals' then
    v_action := 'mark_match_revealed';
    v_limit := 200;
    v_window_seconds := 60;
  elsif TG_TABLE_NAME = 'profiles' then
    if TG_OP = 'UPDATE' and old.status_emoji is distinct from new.status_emoji then
      v_action := 'profile_status';
      v_limit := 30;
      v_window_seconds := 60;
    end if;
  end if;

  if v_action is not null then
    perform public.check_rate_limit(v_action, v_limit, v_window_seconds);
  end if;

  return new;
end;
$$;

drop trigger if exists app_rate_limit_couples on public.couples;
create trigger app_rate_limit_couples
before insert on public.couples
for each row execute function public.apply_write_rate_limit();

drop trigger if exists app_rate_limit_desire_votes on public.desire_votes;
create trigger app_rate_limit_desire_votes
before insert or update on public.desire_votes
for each row execute function public.apply_write_rate_limit();

drop trigger if exists app_rate_limit_chat_messages on public.chat_messages;
create trigger app_rate_limit_chat_messages
before insert on public.chat_messages
for each row execute function public.apply_write_rate_limit();

drop trigger if exists app_rate_limit_chat_attachments on public.chat_attachments;
create trigger app_rate_limit_chat_attachments
before insert on public.chat_attachments
for each row execute function public.apply_write_rate_limit();

drop trigger if exists app_rate_limit_custom_desire_cards on public.custom_desire_cards;
create trigger app_rate_limit_custom_desire_cards
before insert on public.custom_desire_cards
for each row execute function public.apply_write_rate_limit();

drop trigger if exists app_rate_limit_couple_moods on public.couple_moods;
create trigger app_rate_limit_couple_moods
before insert or update on public.couple_moods
for each row execute function public.apply_write_rate_limit();

drop trigger if exists app_rate_limit_notification_preferences on public.notification_preferences;
create trigger app_rate_limit_notification_preferences
before insert or update on public.notification_preferences
for each row execute function public.apply_write_rate_limit();

drop trigger if exists app_rate_limit_push_tokens on public.push_tokens;
create trigger app_rate_limit_push_tokens
before insert or update on public.push_tokens
for each row execute function public.apply_write_rate_limit();

drop trigger if exists app_rate_limit_match_reveals on public.match_reveals;
create trigger app_rate_limit_match_reveals
before insert or update on public.match_reveals
for each row execute function public.apply_write_rate_limit();

drop trigger if exists app_rate_limit_profiles on public.profiles;
create trigger app_rate_limit_profiles
before update on public.profiles
for each row execute function public.apply_write_rate_limit();

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

  perform public.check_rate_limit('join_couple', 10, 3600);

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
  values (v_user_id, p_display_name, p_color, coalesce(p_vibe, ''), coalesce(nullif(trim(p_status_emoji), ''), chr(128150)), now())
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

revoke all on table public.app_rate_limits from anon, authenticated;
revoke execute on function public.check_rate_limit(text, int, int) from public, anon, authenticated;
revoke execute on function public.apply_write_rate_limit() from public, anon, authenticated;

grant execute on function public.join_couple(text, text, text, text, text) to authenticated;
grant execute on function public.get_my_couple_state(uuid) to authenticated;
