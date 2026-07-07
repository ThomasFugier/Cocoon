create or replace function public.reveal_next_match(
  p_couple_id uuid
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
  v_card_id text;
begin
  if v_couple_id is null then
    raise exception 'not_couple_member';
  end if;

  with candidate as (
    select reveals.card_id
    from public.match_reveals reveals
    where reveals.couple_id = v_couple_id
      and reveals.user_id = auth.uid()
      and reveals.revealed_at is null
      and public.card_available_to_couple(v_couple_id, reveals.card_id)
      and exists (
        select 1
        from public.desire_votes votes
        where votes.couple_id = v_couple_id
          and votes.card_id = reveals.card_id
        group by votes.couple_id, votes.card_id
        having count(*) filter (where votes.level >= 1) = 2
      )
    order by reveals.first_matched_at desc
    limit 1
  )
  update public.match_reveals reveals
  set revealed_at = coalesce(reveals.revealed_at, now())
  from candidate
  where reveals.couple_id = v_couple_id
    and reveals.user_id = auth.uid()
    and reveals.card_id = candidate.card_id
  returning reveals.card_id into v_card_id;

  if v_card_id is null then
    return;
  end if;

  return query
  select matches.*
  from public.get_revealable_matches(v_couple_id, 1) matches
  where matches.card_id = v_card_id;
end;
$$;

revoke execute on function public.reveal_next_match(uuid) from public;
revoke execute on function public.reveal_next_match(uuid) from anon;
grant execute on function public.reveal_next_match(uuid) to authenticated;
