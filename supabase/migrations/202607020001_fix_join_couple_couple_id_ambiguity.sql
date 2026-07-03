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

  perform pg_advisory_xact_lock(hashtext(v_user_id::text));
  perform public.check_rate_limit('join_couple', 10, 3600);

  select couples.* into v_couple
  from public.couples as couples
  where couples.invite_code = upper(trim(p_invite_code))
  for update;

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

  with old_couples as (
    select members.couple_id
    from public.couple_members as members
    where members.user_id = v_user_id
      and members.couple_id <> v_couple.id
  ),
  deleted_votes as (
    delete from public.desire_votes votes
    using old_couples
    where votes.couple_id = old_couples.couple_id
      and votes.user_id = v_user_id
    returning votes.couple_id
  ),
  deleted_custom_cards as (
    delete from public.custom_desire_cards cards
    using old_couples
    where cards.couple_id = old_couples.couple_id
      and cards.created_by = v_user_id
    returning cards.couple_id
  ),
  deleted_memberships as (
    delete from public.couple_members members
    using old_couples
    where members.couple_id = old_couples.couple_id
      and members.user_id = v_user_id
    returning members.couple_id
  )
  delete from public.couples couples
  where couples.id in (select deleted_memberships.couple_id from deleted_memberships)
    and not exists (
      select 1
      from public.couple_members remaining
      where remaining.couple_id = couples.id
    );

  insert into public.couple_members (couple_id, user_id, role)
  values (v_couple.id, v_user_id, 'partner')
  on conflict do nothing;

  return query select v_couple.id, v_couple.invite_code;
end;
$$;
