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
  v_existing_couple_id uuid;
  v_existing_invite_code text;
  v_code text;
  v_couple_id uuid;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  select c.id, c.invite_code
  into v_existing_couple_id, v_existing_invite_code
  from public.couple_members cm
  join public.couples c on c.id = cm.couple_id
  where cm.user_id = v_user_id
  order by cm.joined_at desc, c.created_at desc
  limit 1;

  if v_existing_couple_id is not null then
    return query select v_existing_couple_id, v_existing_invite_code;
    return;
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
