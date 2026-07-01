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
    ), '[]'::jsonb)
  );
end;
$$;
