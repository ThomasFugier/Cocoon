create or replace function public.get_chat_messages(
  p_couple_id uuid,
  p_limit int default 80
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_couple_id uuid := public.current_couple_id(p_couple_id);
  v_limit int := least(greatest(coalesce(p_limit, 80), 1), 80);
begin
  if v_couple_id is null then
    return '[]'::jsonb;
  end if;

  perform public.check_rate_limit('get_chat_messages', 240, 60);

  return coalesce((
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
      limit v_limit
    ) messages
  ), '[]'::jsonb);
end;
$$;

revoke execute on function public.get_chat_messages(uuid, int) from public, anon;
grant execute on function public.get_chat_messages(uuid, int) to authenticated;
