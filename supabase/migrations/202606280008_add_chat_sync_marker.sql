create or replace function public.get_chat_sync_marker(
  p_couple_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_couple_id uuid := public.current_couple_id(p_couple_id);
begin
  if v_couple_id is null then
    return jsonb_build_object(
      'latest_message_at', null,
      'latest_message_id', null,
      'message_count', 0
    );
  end if;

  perform public.check_rate_limit('get_chat_sync_marker', 60, 60);

  return coalesce((
    select jsonb_build_object(
      'latest_message_at', latest.created_at,
      'latest_message_id', latest.id,
      'message_count', stats.message_count
    )
    from (
      select count(*)::int as message_count
      from public.chat_messages messages
      where messages.couple_id = v_couple_id
        and messages.expires_at > now()
    ) stats
    left join lateral (
      select messages.id, messages.created_at
      from public.chat_messages messages
      where messages.couple_id = v_couple_id
        and messages.expires_at > now()
      order by messages.created_at desc, messages.id desc
      limit 1
    ) latest on true
  ), jsonb_build_object(
    'latest_message_at', null,
    'latest_message_id', null,
    'message_count', 0
  ));
end;
$$;

revoke execute on function public.get_chat_sync_marker(uuid) from public, anon;
grant execute on function public.get_chat_sync_marker(uuid) to authenticated;
