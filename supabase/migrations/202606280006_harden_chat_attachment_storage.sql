create table if not exists public.chat_attachment_upload_intents (
  storage_path text primary key,
  couple_id uuid not null references public.couples (id) on delete cascade,
  message_id uuid not null,
  attachment_id uuid not null,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  expires_at timestamptz not null default now() + interval '15 minutes',
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  check (expires_at > created_at)
);

create index if not exists chat_attachment_upload_intents_user_idx
on public.chat_attachment_upload_intents (user_id, expires_at);

create index if not exists chat_attachment_upload_intents_couple_message_idx
on public.chat_attachment_upload_intents (couple_id, message_id);

alter table public.chat_attachment_upload_intents enable row level security;

revoke all on table public.chat_attachment_upload_intents from anon, authenticated;
grant select on table public.chat_attachment_upload_intents to authenticated;

drop policy if exists "chat_attachment_upload_intents_read_own" on public.chat_attachment_upload_intents;
create policy "chat_attachment_upload_intents_read_own"
on public.chat_attachment_upload_intents for select
using (user_id = auth.uid());

drop policy if exists "chat_storage_insert_members" on storage.objects;
drop policy if exists "chat_storage_insert_pending_chat_attachment" on storage.objects;
create policy "chat_storage_insert_pending_chat_attachment"
on storage.objects for insert
with check (
  bucket_id = 'chat-attachments'
  and exists (
    select 1
    from public.chat_attachment_upload_intents intents
    where intents.storage_path = name
      and intents.user_id = auth.uid()
      and intents.couple_id = public.storage_path_couple_id(name)
      and intents.expires_at > now()
      and intents.consumed_at is null
      and public.is_couple_member(intents.couple_id)
  )
);

drop policy if exists "chat_storage_delete_members" on storage.objects;

drop function if exists public.prepare_chat_attachment_upload(uuid, uuid, uuid);

create or replace function public.prepare_chat_attachment_upload(
  p_couple_id uuid,
  p_message_id uuid,
  p_attachment_id uuid
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_storage_path text;
  v_created_path text;
  v_now timestamptz := now();
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if p_message_id is null or p_attachment_id is null then
    raise exception 'missing_attachment_id';
  end if;

  if not public.is_couple_member(p_couple_id) then
    raise exception 'not_couple_member';
  end if;

  perform public.check_rate_limit('prepare_chat_attachment_upload', 120, 60);

  v_storage_path := p_couple_id::text || '/' || p_message_id::text || '/' || p_attachment_id::text || '.jpg';

  insert into public.chat_attachment_upload_intents (
    storage_path,
    couple_id,
    message_id,
    attachment_id,
    user_id,
    expires_at,
    consumed_at,
    created_at
  )
  values (
    v_storage_path,
    p_couple_id,
    p_message_id,
    p_attachment_id,
    auth.uid(),
    v_now + interval '15 minutes',
    null,
    v_now
  )
  on conflict (storage_path) do update
  set expires_at = excluded.expires_at,
      consumed_at = null,
      created_at = excluded.created_at
  where public.chat_attachment_upload_intents.user_id = auth.uid()
    and public.chat_attachment_upload_intents.consumed_at is null
  returning public.chat_attachment_upload_intents.storage_path into v_created_path;

  if v_created_path is null then
    raise exception 'attachment_upload_intent_conflict';
  end if;

  if random() < 0.02 then
    delete from public.chat_attachment_upload_intents
    where expires_at < v_now - interval '1 day'
       or consumed_at < v_now - interval '1 day';
  end if;

  return v_created_path;
end;
$$;

drop function if exists public.discard_chat_attachment_uploads(text[]);

create or replace function public.discard_chat_attachment_uploads(
  p_storage_paths text[]
)
returns int
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  v_deleted int := 0;
  v_paths text[];
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if coalesce(array_length(p_storage_paths, 1), 0) = 0 then
    return 0;
  end if;

  if array_length(p_storage_paths, 1) > 16 then
    raise exception 'too_many_attachments';
  end if;

  perform public.check_rate_limit('discard_chat_attachment_uploads', 120, 60);

  select array_agg(distinct intents.storage_path)
  into v_paths
  from public.chat_attachment_upload_intents intents
  where intents.storage_path = any(p_storage_paths)
    and intents.user_id = auth.uid()
    and intents.consumed_at is null
    and public.is_couple_member(intents.couple_id);

  if coalesce(array_length(v_paths, 1), 0) = 0 then
    return 0;
  end if;

  delete from storage.objects objects
  where objects.bucket_id = 'chat-attachments'
    and objects.name = any(v_paths);

  get diagnostics v_deleted = row_count;

  delete from public.chat_attachment_upload_intents intents
  where intents.storage_path = any(v_paths)
    and intents.user_id = auth.uid()
    and intents.consumed_at is null;

  return v_deleted;
end;
$$;

create or replace function public.send_chat_message(
  p_couple_id uuid,
  p_message_id uuid,
  p_body text default '',
  p_linked_card_id text default null,
  p_attachments jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_body text := left(coalesce(p_body, ''), 2000);
  v_attachment_count int := coalesce(jsonb_array_length(p_attachments), 0);
  v_attachment jsonb;
  v_storage_path text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if not public.is_couple_member(p_couple_id) then
    raise exception 'not_couple_member';
  end if;

  if p_message_id is null then
    raise exception 'missing_message_id';
  end if;

  if length(trim(v_body)) = 0 and v_attachment_count = 0 then
    raise exception 'empty_message';
  end if;

  if v_attachment_count > 4 then
    raise exception 'too_many_attachments';
  end if;

  if p_linked_card_id is not null and not public.card_available_to_couple(p_couple_id, p_linked_card_id) then
    raise exception 'unknown_card';
  end if;

  insert into public.chat_messages (
    id,
    couple_id,
    author_id,
    body,
    linked_card_id,
    expires_at
  )
  values (
    p_message_id,
    p_couple_id,
    auth.uid(),
    trim(v_body),
    p_linked_card_id,
    public.next_chat_expiry()
  )
  on conflict (id) do nothing;

  for v_attachment in select * from jsonb_array_elements(p_attachments)
  loop
    v_storage_path := v_attachment->>'storage_path';

    if v_storage_path is null or public.storage_path_couple_id(v_storage_path) is distinct from p_couple_id then
      raise exception 'invalid_attachment_path';
    end if;

    if position(p_message_id::text in v_storage_path) = 0 then
      raise exception 'attachment_message_mismatch';
    end if;

    if not exists (
      select 1
      from public.chat_attachment_upload_intents intents
      where intents.storage_path = v_storage_path
        and intents.couple_id = p_couple_id
        and intents.message_id = p_message_id
        and intents.user_id = auth.uid()
        and intents.consumed_at is null
        and intents.expires_at > now()
    ) then
      raise exception 'missing_attachment_upload_intent';
    end if;

    insert into public.chat_attachments (
      message_id,
      couple_id,
      uploaded_by,
      storage_path,
      mime_type,
      name,
      width,
      height,
      size_bytes
    )
    values (
      p_message_id,
      p_couple_id,
      auth.uid(),
      v_storage_path,
      coalesce(nullif(v_attachment->>'mime_type', ''), 'image/jpeg'),
      nullif(v_attachment->>'name', ''),
      nullif(v_attachment->>'width', '')::int,
      nullif(v_attachment->>'height', '')::int,
      nullif(v_attachment->>'size_bytes', '')::int
    )
    on conflict (storage_path) do nothing;

    update public.chat_attachment_upload_intents intents
    set consumed_at = coalesce(intents.consumed_at, now())
    where intents.storage_path = v_storage_path
      and intents.user_id = auth.uid();
  end loop;

  return p_message_id;
end;
$$;

create or replace function public.cleanup_expired_chat()
returns int
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  v_deleted int;
begin
  delete from storage.objects objects
  where objects.bucket_id = 'chat-attachments'
    and exists (
      select 1
      from public.chat_attachments attachments
      join public.chat_messages messages on messages.id = attachments.message_id
      where attachments.storage_path = objects.name
        and messages.expires_at <= now()
    );

  delete from storage.objects objects
  where objects.bucket_id = 'chat-attachments'
    and objects.created_at < now() - interval '30 minutes'
    and not exists (
      select 1
      from public.chat_attachments attachments
      where attachments.storage_path = objects.name
    );

  delete from public.chat_messages
  where expires_at <= now();

  get diagnostics v_deleted = row_count;

  delete from public.chat_attachment_upload_intents
  where expires_at < now()
     or consumed_at < now() - interval '1 day';

  return v_deleted;
end;
$$;

revoke execute on function public.prepare_chat_attachment_upload(uuid, uuid, uuid) from public;
revoke execute on function public.discard_chat_attachment_uploads(text[]) from public;
revoke execute on function public.prepare_chat_attachment_upload(uuid, uuid, uuid) from anon;
revoke execute on function public.discard_chat_attachment_uploads(text[]) from anon;

grant execute on function public.prepare_chat_attachment_upload(uuid, uuid, uuid) to authenticated;
grant execute on function public.discard_chat_attachment_uploads(text[]) to authenticated;
