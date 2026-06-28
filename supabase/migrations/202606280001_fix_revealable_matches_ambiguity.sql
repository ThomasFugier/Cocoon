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
        where unlocks.couple_id = v_couple_id
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

