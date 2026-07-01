create table if not exists public.chat_attachment_tombstones (
  id uuid primary key,
  message_id uuid not null references public.chat_messages (id) on delete cascade,
  couple_id uuid not null references public.couples (id) on delete cascade,
  consumed_by uuid not null references public.profiles (id) on delete cascade,
  consumed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists chat_attachment_tombstones_message_idx
on public.chat_attachment_tombstones (message_id);

create index if not exists chat_attachment_tombstones_couple_idx
on public.chat_attachment_tombstones (couple_id, consumed_at desc);

alter table public.chat_attachment_tombstones enable row level security;

drop policy if exists "chat_attachment_tombstones_read_members" on public.chat_attachment_tombstones;
create policy "chat_attachment_tombstones_read_members"
on public.chat_attachment_tombstones for select
using (public.is_couple_member(couple_id));

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
            message_attachments.payload
            order by message_attachments.sort_at asc
          )
          from (
            select
              jsonb_build_object(
                'id', attachments.id,
                'storage_path', attachments.storage_path,
                'mime_type', attachments.mime_type,
                'name', attachments.name,
                'width', attachments.width,
                'height', attachments.height,
                'size_bytes', attachments.size_bytes,
                'disappeared', false,
                'consumed_at', null
              ) as payload,
              attachments.created_at as sort_at
            from public.chat_attachments attachments
            where attachments.message_id = messages.id
            union all
            select
              jsonb_build_object(
                'id', tombstones.id,
                'storage_path', null,
                'mime_type', 'image/jpeg',
                'name', 'Photo disparue',
                'width', null,
                'height', null,
                'size_bytes', null,
                'disappeared', true,
                'consumed_at', tombstones.consumed_at
              ) as payload,
              tombstones.consumed_at as sort_at
            from public.chat_attachment_tombstones tombstones
            where tombstones.message_id = messages.id
          ) message_attachments
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
      'latest_message_at', latest.event_at,
      'latest_message_id', latest.event_id,
      'message_count', stats.message_count
    )
    from (
      select count(*)::int as message_count
      from public.chat_messages messages
      where messages.couple_id = v_couple_id
        and messages.expires_at > now()
    ) stats
    left join lateral (
      select events.event_id, events.event_at
      from (
        select messages.id as event_id, messages.created_at as event_at
        from public.chat_messages messages
        where messages.couple_id = v_couple_id
          and messages.expires_at > now()
        union all
        select tombstones.id as event_id, tombstones.consumed_at as event_at
        from public.chat_attachment_tombstones tombstones
        join public.chat_messages messages on messages.id = tombstones.message_id
        where tombstones.couple_id = v_couple_id
          and messages.expires_at > now()
      ) events
      order by events.event_at desc, events.event_id desc
      limit 1
    ) latest on true
  ), jsonb_build_object(
    'latest_message_at', null,
    'latest_message_id', null,
    'message_count', 0
  ));
end;
$$;

drop function if exists public.consume_chat_attachment(uuid, uuid, uuid);

create or replace function public.consume_chat_attachment(
  p_couple_id uuid,
  p_message_id uuid,
  p_attachment_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  v_attachment record;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if not public.is_couple_member(p_couple_id) then
    raise exception 'not_couple_member';
  end if;

  perform public.check_rate_limit('consume_chat_attachment', 60, 60);

  select attachments.* into v_attachment
  from public.chat_attachments attachments
  join public.chat_messages messages on messages.id = attachments.message_id
  where attachments.id = p_attachment_id
    and attachments.message_id = p_message_id
    and attachments.couple_id = p_couple_id
    and messages.couple_id = p_couple_id
    and messages.expires_at > now();

  if not found then
    return;
  end if;

  if v_attachment.uploaded_by = auth.uid() then
    raise exception 'own_attachment_not_consumable';
  end if;

  insert into public.chat_attachment_tombstones (
    id,
    message_id,
    couple_id,
    consumed_by,
    consumed_at
  )
  values (
    v_attachment.id,
    v_attachment.message_id,
    v_attachment.couple_id,
    auth.uid(),
    now()
  )
  on conflict (id) do nothing;

  delete from storage.objects objects
  where objects.bucket_id = 'chat-attachments'
    and objects.name = v_attachment.storage_path;

  delete from public.chat_attachments attachments
  where attachments.id = v_attachment.id;
end;
$$;

revoke all on table public.chat_attachment_tombstones from anon, authenticated;
grant select on table public.chat_attachment_tombstones to authenticated;

revoke execute on function public.consume_chat_attachment(uuid, uuid, uuid) from public;
revoke execute on function public.consume_chat_attachment(uuid, uuid, uuid) from anon;
grant execute on function public.consume_chat_attachment(uuid, uuid, uuid) to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.chat_attachment_tombstones;
exception when duplicate_object or undefined_object then
  null;
end;
$$;
