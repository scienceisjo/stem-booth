-- HNR TECH · STEM 축제 접수/손님 화면 공유 · 2026-10-21
-- 과학이조선생A > SQL Editor에서 이 파일 전체를 1회 Run 하세요.
-- 기존 앱 테이블은 건드리지 않습니다. 참가자/시험 기록은 생성하지 않습니다.
-- 마지막 결과의 operator_code는 최초 설치 때 한 번만 표시됩니다.
-- 운영 코드와 로그인 토큰을 채팅/소스/공개 URL에 넣지 마세요.
-- 다시 실행해도 기존 기록과 운영 코드는 그대로 유지됩니다.
-- PostgreSQL 13+ 기본 함수만 사용합니다. 별도 확장 설치가 없습니다.

begin;

create table if not exists public.hnr_desk_booths (
  booth_id text primary key,
  operator_hash bytea not null,
  state jsonb,
  revision bigint not null default 0 check (revision between 0 and 9007199254740991),
  updated_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.hnr_desk_sessions (
  token_hash bytea primary key,
  booth_id text not null references public.hnr_desk_booths(booth_id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists hnr_desk_sessions_booth_expiry on public.hnr_desk_sessions(booth_id, expires_at);
create table if not exists public.hnr_desk_operations (
  booth_id text not null references public.hnr_desk_booths(booth_id) on delete cascade,
  operation_id uuid not null,
  revision bigint not null,
  applied_at timestamptz not null default now(),
  primary key (booth_id, operation_id)
);
create table if not exists public.hnr_desk_login_attempts (
  booth_id text not null references public.hnr_desk_booths(booth_id) on delete cascade,
  client_hash bytea not null,
  failures integer not null default 0 check (failures between 0 and 5),
  window_started timestamptz not null default now(),
  locked_until timestamptz,
  primary key (booth_id,client_hash)
);

alter table public.hnr_desk_booths enable row level security;
alter table public.hnr_desk_sessions enable row level security;
alter table public.hnr_desk_operations enable row level security;
alter table public.hnr_desk_login_attempts enable row level security;
revoke all on table public.hnr_desk_booths, public.hnr_desk_sessions, public.hnr_desk_operations, public.hnr_desk_login_attempts from public, anon, authenticated;
-- 의도적으로 직접 조회/수정 RLS 정책을 만들지 않습니다.

create or replace function public.hnr_desk_shape(p_value jsonb, p_required text[], p_optional text[] default '{}')
returns boolean language plpgsql immutable set search_path = pg_catalog as $$
begin
  if jsonb_typeof(p_value) is distinct from 'object' then return false; end if;
  return p_value ?& p_required and not exists (
    select 1 from jsonb_object_keys(p_value) as k where not (k = any(p_required || p_optional))
  );
end;
$$;

create or replace function public.hnr_desk_text(p_value jsonb, p_max integer default 100, p_pattern text default null)
returns boolean language plpgsql immutable set search_path = pg_catalog as $$
declare v text;
begin
  if jsonb_typeof(p_value) is distinct from 'string' then return false; end if;
  v := p_value #>> '{}';
  return length(btrim(v)) > 0 and length(v) <= p_max and v !~ '[[:cntrl:]]'
    and (p_pattern is null or v ~ p_pattern);
end;
$$;

create or replace function public.hnr_desk_integer(p_value jsonb, p_max numeric default 10000)
returns boolean language plpgsql immutable set search_path = pg_catalog as $$
declare v numeric;
begin
  if jsonb_typeof(p_value) is distinct from 'number' then return false; end if;
  v := (p_value #>> '{}')::numeric;
  return v >= 0 and v <= p_max and trunc(v) = v;
exception when others then return false;
end;
$$;

create or replace function public.hnr_desk_stamp(p_value jsonb, p_nullable boolean default false)
returns boolean language plpgsql immutable set search_path = pg_catalog as $$
begin
  if p_nullable and p_value = 'null'::jsonb then return true; end if;
  if not public.hnr_desk_text(p_value, 40, '^[0-9]{4}-[0-9]{2}-[0-9]{2}T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](\.[0-9]{1,3})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$') then return false; end if;
  perform (p_value #>> '{}')::timestamptz;
  return true;
exception when others then return false;
end;
$$;

create or replace function public.hnr_desk_interval(p_value jsonb)
returns boolean language sql immutable set search_path = pg_catalog as $$
  select public.hnr_desk_text(p_value->'start', 5, '^([01][0-9]|2[0-3]):[0-5][0-9]$')
    and public.hnr_desk_text(p_value->'end', 5, '^([01][0-9]|2[0-3]):[0-5][0-9]$')
    and (p_value->>'start') < (p_value->>'end');
$$;

-- DeskModel.validate와 동일한 필수 구조, 허용 키, 날짜/참조/중복 검증.
-- 최대 8 MiB. 임의 필드/연락처/자격증명 등을 상태 안에 끼워 넣을 수 없습니다.
create or replace function public.hnr_desk_valid_state(p_state jsonb)
returns boolean language plpgsql immutable set search_path = pg_catalog as $$
declare
  v_date text; d jsonb; x jsonb; v_key text; v_serial integer;
  v_rounds text[]; v_teams text[];
begin
  if p_state is null or octet_length(p_state::text) > 8388608 then return false; end if;
  if not public.hnr_desk_shape(p_state, array['schema','revision','days'])
    or p_state->'schema' is distinct from '1'::jsonb
    or not public.hnr_desk_integer(p_state->'revision',9007199254740991)
    or not public.hnr_desk_shape(p_state->'days',array['2026-10-23','2026-10-24']) then return false; end if;
  foreach v_date in array array['2026-10-23','2026-10-24'] loop
    d := p_state->'days'->v_date;
    if not public.hnr_desk_shape(d,array['date','paused','currentRoundId','bookingMode','openRoundIds','counter','rounds','teams','breaks','entries','log'])
      or d->>'date' is distinct from v_date
      or jsonb_typeof(d->'paused') is distinct from 'boolean'
      or d->>'bookingMode' not in ('next','all','manual')
      or jsonb_typeof(d->'bookingMode') is distinct from 'string'
      or not public.hnr_desk_integer(d->'counter',999999) then return false; end if;
    foreach v_key in array array['rounds','teams','breaks','openRoundIds','entries','log'] loop
      if jsonb_typeof(d->v_key) is distinct from 'array' then return false; end if;
      if jsonb_array_length(d->v_key) > (case v_key when 'entries' then 50000 when 'log' then 300 else 10000 end) then return false; end if;
    end loop;
    select coalesce(array_agg(e->>'id'),'{}') into v_rounds from jsonb_array_elements(d->'rounds') e;
    select coalesce(array_agg(e->>'id'),'{}') into v_teams from jsonb_array_elements(d->'teams') e;
    if d->'currentRoundId' <> 'null'::jsonb and
      (jsonb_typeof(d->'currentRoundId') <> 'string' or not (d->>'currentRoundId' = any(v_rounds))) then return false; end if;
    if exists (select 1 from jsonb_array_elements(d->'openRoundIds') e
      where jsonb_typeof(e) <> 'string' or not (e #>> '{}' = any(v_rounds)))
      or (select count(*) <> count(distinct e) from jsonb_array_elements(d->'openRoundIds') e) then return false; end if;
    -- IDs are unique across all four collections in a day.
    if exists (select 1 from jsonb_array_elements((d->'rounds') || (d->'teams') || (d->'breaks') || (d->'entries')) e
      group by e->>'id' having count(*) > 1) then return false; end if;
    for x in select * from jsonb_array_elements(d->'rounds') loop
      if not public.hnr_desk_shape(x,array['id','label','start','end','closed'])
        or not public.hnr_desk_text(x->'id',100,'^[A-Za-z0-9_-]+$')
        or not public.hnr_desk_text(x->'label') or not public.hnr_desk_interval(x)
        or jsonb_typeof(x->'closed') is distinct from 'boolean' then return false; end if;
    end loop;
    for x in select * from jsonb_array_elements(d->'teams') loop
      if not public.hnr_desk_shape(x,array['id','roundId','label','start','end','capacity','reserveLimit','closed'])
        or not public.hnr_desk_text(x->'id',100,'^[A-Za-z0-9_-]+$')
        or jsonb_typeof(x->'roundId') is distinct from 'string' or not (x->>'roundId' = any(v_rounds))
        or not public.hnr_desk_text(x->'label') or not public.hnr_desk_interval(x)
        or not public.hnr_desk_integer(x->'capacity') or not public.hnr_desk_integer(x->'reserveLimit')
        or (x->>'reserveLimit')::numeric > (x->>'capacity')::numeric
        or jsonb_typeof(x->'closed') is distinct from 'boolean' then return false; end if;
    end loop;
    for x in select * from jsonb_array_elements(d->'breaks') loop
      if not public.hnr_desk_shape(x,array['id','label','start','end'])
        or not public.hnr_desk_text(x->'id',100,'^[A-Za-z0-9_-]+$')
        or not public.hnr_desk_text(x->'label') or not public.hnr_desk_interval(x) then return false; end if;
    end loop;
    if exists (select 1 from jsonb_array_elements(d->'entries') e group by e->>'ticket' having count(*)>1)
      or exists (select 1 from jsonb_array_elements(d->'entries') e where e->'requestId' is not null and e->'requestId'<>'null'::jsonb group by e->>'requestId' having count(*)>1) then return false; end if;
    for x in select * from jsonb_array_elements(d->'entries') loop
      if not public.hnr_desk_shape(x,array['id','ticket','kind','teamId','age','status','promisedStart','registeredAt','arrivedAt','actualStart','actualEnd'],array['requestId','name','receiptToken'])
        or not public.hnr_desk_text(x->'id',100,'^[A-Za-z0-9_-]+$')
        or not public.hnr_desk_text(x->'ticket',9,'^'||right(v_date,2)||'-[0-9]{3,6}$')
        or jsonb_typeof(x->'kind') is distinct from 'string' or x->>'kind' not in ('reservation','walkin','wait')
        or jsonb_typeof(x->'status') is distinct from 'string' or x->>'status' not in ('booked','arrived','active','done','noshow','cancelled')
        or not public.hnr_desk_text(x->'age',40) then return false; end if;
      v_serial := substring(x->>'ticket' from 4)::integer;
      if v_serial < 1 or v_serial > (d->>'counter')::integer then return false; end if;
      if x->'teamId' = 'null'::jsonb then
        if x->>'kind' <> 'wait' or x->>'status' in ('booked','active','done') or x->'promisedStart' <> 'null'::jsonb then return false; end if;
      elsif jsonb_typeof(x->'teamId') <> 'string' or not (x->>'teamId'=any(v_teams)) or x->'promisedStart'='null'::jsonb then return false;
      end if;
      if not public.hnr_desk_stamp(x->'registeredAt') then return false; end if;
      foreach v_key in array array['promisedStart','arrivedAt','actualStart','actualEnd'] loop
        if not public.hnr_desk_stamp(x->v_key,true) then return false; end if;
      end loop;
      if x->'promisedStart'<>'null'::jsonb and left(x->>'promisedStart',11) <> v_date||'T' then return false; end if;
      if x->>'status' in ('arrived','active','done') and x->'arrivedAt'='null'::jsonb then return false; end if;
      if x->>'status' in ('active','done') and x->'actualStart'='null'::jsonb then return false; end if;
      if x->>'status'='done' and x->'actualEnd'='null'::jsonb then return false; end if;
      if x->'actualEnd'<>'null'::jsonb and (x->'actualStart'='null'::jsonb or (x->>'actualEnd')::timestamptz<(x->>'actualStart')::timestamptz) then return false; end if;
      if x->'requestId' is not null and x->'requestId'<>'null'::jsonb and not public.hnr_desk_text(x->'requestId',100,'^[A-Za-z0-9_-]+$') then return false; end if;
      if x->'name' is not null and x->'name'<>'null'::jsonb and not public.hnr_desk_text(x->'name',40) then return false; end if;
      if x->'receiptToken' is not null and x->'receiptToken'<>'null'::jsonb and not public.hnr_desk_text(x->'receiptToken',36,'^[A-Fa-f0-9]{8}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{12}$') then return false; end if;
    end loop;
    -- Different zero-padding must not allow duplicate ticket serials.
    if exists (select 1 from jsonb_array_elements(d->'entries') e group by substring(e->>'ticket' from 4)::integer having count(*)>1) then return false; end if;
    for x in select * from jsonb_array_elements(d->'log') loop
      if not public.hnr_desk_shape(x,array['at','type','message']) or not public.hnr_desk_stamp(x->'at')
        or not public.hnr_desk_text(x->'type',40) or not public.hnr_desk_text(x->'message',400) then return false; end if;
    end loop;
  end loop;
  if exists (
    select 1 from jsonb_array_elements((p_state->'days'->'2026-10-23'->'entries') || (p_state->'days'->'2026-10-24'->'entries')) e
    where e->'receiptToken' is not null and e->'receiptToken'<>'null'::jsonb
    group by lower(e->>'receiptToken') having count(*)>1
  ) then return false; end if;
  return true;
exception when others then return false;
end;
$$;

create or replace function public.hnr_desk_project(p_state jsonb)
returns jsonb language plpgsql immutable set search_path = pg_catalog as $$
declare result jsonb := p_state; v_date text; d jsonb; v_entries jsonb;
begin
  if p_state is null then return null; end if;
  foreach v_date in array array['2026-10-23','2026-10-24'] loop
    d := p_state->'days'->v_date;
    select coalesce(jsonb_agg((e-'requestId'-'name'-'receiptToken') || jsonb_build_object('age','방문객') order by ord),'[]') into v_entries
      from jsonb_array_elements(d->'entries') with ordinality as items(e,ord)
      where e->'teamId' <> 'null'::jsonb and e->>'status' in ('booked','arrived','active','done');
    result := jsonb_set(result,array['days',v_date],d || jsonb_build_object('entries',v_entries,'log','[]'::jsonb));
  end loop;
  return result;
end;
$$;

-- New reservations are for the next round only. A reduced capacity does not
-- erase old bookings, but new/increased bookings cannot exceed half the round.
create or replace function public.hnr_desk_booking_valid(p_state jsonb,p_previous jsonb)
returns boolean language plpgsql immutable set search_path = pg_catalog as $$
declare v_date text; d jsonb; old_d jsonb; r jsonb; e jsonb; v_next text; v_team_round text; v_new_count integer; v_old_count integer; v_capacity integer;
begin
  if p_previous is null then return true; end if; -- Explicit first-time import preserves existing bookings.
  foreach v_date in array array['2026-10-23','2026-10-24'] loop
    d:=p_state->'days'->v_date; old_d:=p_previous->'days'->v_date;
    select ordered.next_id into v_next from (
      select x->>'id' as id,lead(x->>'id') over(order by x->>'start',x->>'id') as next_id
      from jsonb_array_elements(d->'rounds') x
    ) ordered where ordered.id=d->>'currentRoundId';
    for e in select x from jsonb_array_elements(d->'entries') x
      where x->>'kind'='reservation' and x->>'status' in ('booked','arrived','active','done')
        and not exists(select 1 from jsonb_array_elements(old_d->'entries') old_e where old_e->>'id'=x->>'id') loop
      select x->>'roundId' into v_team_round from jsonb_array_elements(d->'teams') x where x->>'id'=e->>'teamId';
      if v_next is null or v_team_round is distinct from v_next then return false; end if;
    end loop;
    for r in select * from jsonb_array_elements(d->'rounds') loop
      select coalesce(sum((t->>'capacity')::integer),0) into v_capacity from jsonb_array_elements(d->'teams') t where t->>'roundId'=r->>'id';
      select count(*) into v_new_count from jsonb_array_elements(d->'entries') x
        where x->>'kind'='reservation' and x->>'status' in ('booked','arrived','active','done')
          and exists(select 1 from jsonb_array_elements(d->'teams') t where t->>'id'=x->>'teamId' and t->>'roundId'=r->>'id');
      select count(*) into v_old_count from jsonb_array_elements(old_d->'entries') x
        where x->>'kind'='reservation' and x->>'status' in ('booked','arrived','active','done')
          and exists(select 1 from jsonb_array_elements(old_d->'teams') t where t->>'id'=x->>'teamId' and t->>'roundId'=r->>'id');
      if v_new_count>v_capacity/2 and v_new_count>v_old_count then return false; end if;
    end loop;
  end loop;
  return true;
exception when others then return false;
end;
$$;

-- Do not store a raw IP address. The gateway-provided client address is hashed.
-- A missing/invalid address uses one bounded fallback bucket. Correct strong
-- codes remain accepted even while a bucket is locked, avoiding shared-IP DoS.
create or replace function public.hnr_desk_client_hash()
returns bytea language plpgsql stable set search_path = pg_catalog as $$
declare h jsonb; v_address text;
begin
  begin
    h:=coalesce(nullif(current_setting('request.headers',true),''),'{}')::jsonb;
    v_address:=coalesce(nullif(h->>'cf-connecting-ip',''),nullif(h->>'x-real-ip',''),nullif(split_part(h->>'x-forwarded-for',',',1),''));
    v_address:=(btrim(v_address)::inet)::text;
  exception when others then v_address:=null;
  end;
  return sha256(convert_to(coalesce(v_address,'gateway-address-unavailable'),'UTF8'));
end;
$$;

create or replace function public.hnr_desk_authorized(p_booth_id text,p_token text)
returns boolean language sql volatile security definer set search_path = pg_catalog as $$
  select coalesce(length(p_token)=96 and p_token ~ '^[a-f0-9]{96}$' and exists (
    select 1 from public.hnr_desk_sessions s where s.booth_id=p_booth_id
      and s.token_hash=sha256(convert_to(p_token,'UTF8')) and s.expires_at>clock_timestamp()
  ),false);
$$;

create or replace function public.hnr_desk_status(p_booth_id text)
returns jsonb language sql stable security definer set search_path = pg_catalog as $$
  select coalesce((select jsonb_build_object('ok',true,'ready',b.state is not null,'revision',b.revision,'updated_at',b.updated_at)
    from public.hnr_desk_booths b where b.booth_id=p_booth_id),
    jsonb_build_object('ok',true,'ready',false,'revision',0,'updated_at',null));
$$;

create or replace function public.hnr_desk_login(p_booth_id text,p_code text)
returns jsonb language plpgsql security definer set search_path = pg_catalog as $$
declare b public.hnr_desk_booths%rowtype; a public.hnr_desk_login_attempts%rowtype; v_client bytea; v_now timestamptz:=clock_timestamp(); v_code text; v_token text; v_count integer; v_expires timestamptz;
begin
  select * into b from public.hnr_desk_booths where booth_id=p_booth_id for update;
  if not found then return jsonb_build_object('ok',false,'code','not_configured'); end if;
  v_client:=public.hnr_desk_client_hash();
  v_code:=upper(btrim(coalesce(p_code,'')));
  if length(v_code)<>36 or v_code !~ '^HNR-[A-F0-9]{32}$' or sha256(convert_to(v_code,'UTF8'))<>b.operator_hash then
    delete from public.hnr_desk_login_attempts where booth_id=p_booth_id and window_started<v_now-interval '1 day';
    insert into public.hnr_desk_login_attempts(booth_id,client_hash) values(p_booth_id,v_client) on conflict do nothing;
    select * into a from public.hnr_desk_login_attempts where booth_id=p_booth_id and client_hash=v_client for update;
    if a.locked_until>v_now then return jsonb_build_object('ok',false,'code','locked'); end if;
    v_count:=case when a.window_started<=v_now-interval '10 minutes' then 1 else least(5,a.failures+1) end;
    update public.hnr_desk_login_attempts set failures=v_count,
      window_started=case when v_count=1 then v_now else a.window_started end,
      locked_until=case when v_count>=5 then v_now+interval '10 minutes' else null end where booth_id=p_booth_id and client_hash=v_client;
    delete from public.hnr_desk_login_attempts where (booth_id,client_hash) in (
      select booth_id,client_hash from public.hnr_desk_login_attempts where booth_id=p_booth_id order by window_started desc,client_hash offset 2048
    );
    -- Return a value (not an exception): failed-attempt updates must commit.
    return jsonb_build_object('ok',false,'code',case when v_count>=5 then 'locked' else 'invalid_code' end);
  end if;
  delete from public.hnr_desk_login_attempts where booth_id=p_booth_id and client_hash=v_client;
  delete from public.hnr_desk_sessions where booth_id=p_booth_id and expires_at<=v_now;
  -- Each UUID v4 supplies 122 random bits: 366 random bits in this 96-hex token.
  v_token:=replace(gen_random_uuid()::text||gen_random_uuid()::text||gen_random_uuid()::text,'-','');
  v_expires:=v_now+interval '12 hours';
  insert into public.hnr_desk_sessions(token_hash,booth_id,expires_at) values(sha256(convert_to(v_token,'UTF8')),p_booth_id,v_expires);
  -- Bound per-booth session storage. Only a code holder can issue sessions.
  delete from public.hnr_desk_sessions where token_hash in (
    select token_hash from public.hnr_desk_sessions where booth_id=p_booth_id order by created_at desc,token_hash offset 64
  );
  return jsonb_build_object('ok',true,'token',v_token,'expires_at',v_expires);
end;
$$;

-- A visitor's unguessable receipt link exposes only that ticket's schedule.
-- Names, ages, tokens and the full roster never appear in this response.
create or replace function public.hnr_desk_receipt(p_booth_id text,p_receipt_token text)
returns jsonb language plpgsql stable security definer set search_path = pg_catalog as $$
declare b public.hnr_desk_booths%rowtype; d jsonb; e jsonb; t jsonb; v_date text;
begin
  if p_receipt_token is null or p_receipt_token !~* '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$' then return jsonb_build_object('ok',false,'code','not_found'); end if;
  select * into b from public.hnr_desk_booths where booth_id=p_booth_id;
  if not found or b.state is null then return jsonb_build_object('ok',false,'code','not_found'); end if;
  foreach v_date in array array['2026-10-23','2026-10-24'] loop
    d:=b.state->'days'->v_date;
    select x into e from jsonb_array_elements(d->'entries') x where lower(x->>'receiptToken')=lower(p_receipt_token) limit 1;
    if e is not null then
      select x into t from jsonb_array_elements(d->'teams') x where x->>'id'=e->>'teamId';
      return jsonb_build_object('ok',true,'ticket',e->>'ticket','date',v_date,
        'start',coalesce(to_char((e->>'promisedStart')::timestamptz at time zone 'Asia/Seoul','HH24:MI'),t->>'start'),
        'end',t->>'end','status',e->>'status','updated_at',b.updated_at);
    end if;
  end loop;
  return jsonb_build_object('ok',false,'code','not_found');
end;
$$;

create or replace function public.hnr_desk_read(p_booth_id text,p_token text)
returns jsonb language plpgsql stable security definer set search_path = pg_catalog as $$
declare result jsonb;
begin
  if not public.hnr_desk_authorized(p_booth_id,p_token) then return jsonb_build_object('ok',false,'code','unauthorized'); end if;
  select jsonb_build_object('ok',true,'revision',b.revision,'state',b.state,'updated_at',b.updated_at) into result
    from public.hnr_desk_booths b where b.booth_id=p_booth_id;
  return coalesce(result,jsonb_build_object('ok',false,'code','unauthorized'));
end;
$$;

create or replace function public.hnr_desk_public(p_booth_id text)
returns jsonb language sql stable security definer set search_path = pg_catalog as $$
  select coalesce((select jsonb_build_object('ok',true,'revision',b.revision,'state',public.hnr_desk_project(b.state),'updated_at',b.updated_at)
    from public.hnr_desk_booths b where b.booth_id=p_booth_id),
    jsonb_build_object('ok',true,'revision',0,'state',null,'updated_at',null));
$$;

create or replace function public.hnr_desk_save(p_booth_id text,p_token text,p_expected_revision bigint,p_operation_id uuid,p_state jsonb)
returns jsonb language plpgsql security definer set search_path = pg_catalog as $$
declare b public.hnr_desk_booths%rowtype; v_next jsonb; v_date text;
begin
  if not public.hnr_desk_authorized(p_booth_id,p_token) then return jsonb_build_object('ok',false,'code','unauthorized'); end if;
  select * into b from public.hnr_desk_booths where booth_id=p_booth_id for update;
  if not found then return jsonb_build_object('ok',false,'code','unauthorized'); end if;
  -- Recheck after waiting for the lock; an expired token must not mutate data.
  if not public.hnr_desk_authorized(p_booth_id,p_token) then return jsonb_build_object('ok',false,'code','unauthorized'); end if;
  -- Replay check before CAS. A timed-out committed request cannot add a second ticket.
  if exists(select 1 from public.hnr_desk_operations o where o.booth_id=p_booth_id and o.operation_id=p_operation_id) then
    return jsonb_build_object('ok',true,'revision',b.revision,'state',b.state,'updated_at',b.updated_at);
  end if;
  if p_operation_id is null or p_expected_revision is null or p_expected_revision<0 then return jsonb_build_object('ok',false,'code','invalid_state'); end if;
  if b.revision<>p_expected_revision then
    return jsonb_build_object('ok',false,'code','conflict','revision',b.revision,'state',b.state,'updated_at',b.updated_at);
  end if;
  if not public.hnr_desk_valid_state(p_state) or b.revision>=9007199254740991 then return jsonb_build_object('ok',false,'code','invalid_state'); end if;
  if b.state is not null then
    foreach v_date in array array['2026-10-23','2026-10-24'] loop
      if (p_state->'days'->v_date->>'counter')::integer < (b.state->'days'->v_date->>'counter')::integer then
        return jsonb_build_object('ok',false,'code','invalid_state');
      end if;
    end loop;
  end if;
  if not public.hnr_desk_booking_valid(p_state,b.state) then return jsonb_build_object('ok',false,'code','invalid_state'); end if;
  v_next:=jsonb_set(p_state,'{revision}',to_jsonb(b.revision+1));
  update public.hnr_desk_booths set state=v_next,revision=b.revision+1,updated_at=clock_timestamp() where booth_id=p_booth_id returning * into b;
  insert into public.hnr_desk_operations(booth_id,operation_id,revision) values(p_booth_id,p_operation_id,b.revision);
  return jsonb_build_object('ok',true,'revision',b.revision,'state',b.state,'updated_at',b.updated_at);
end;
$$;

-- Revoke PostgreSQL's default PUBLIC EXECUTE on every dedicated function,
-- including validators/projection/auth helpers. Reruns also remove stale grants.
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname like 'hnr\_desk\_%' escape '\' loop
    execute format('revoke all on function %s from public, anon, authenticated', f.signature);
  end loop;
end;
$$;
grant execute on function public.hnr_desk_status(text), public.hnr_desk_login(text,text),
  public.hnr_desk_read(text,text), public.hnr_desk_public(text),
  public.hnr_desk_save(text,text,bigint,uuid,jsonb), public.hnr_desk_receipt(text,text) to anon, authenticated;

-- Create only the booth configuration row. No participant or schedule is seeded.
-- ON CONFLICT never changes an existing code, state, sessions, or operation history.
-- A private temporary result carries the once-only code to the final SELECT.
create temporary table if not exists hnr_desk_install_result (booth_id text, operator_code text, message text) on commit preserve rows;
do $$
declare v_code text; v_inserted text;
begin
  v_code:='HNR-'||upper(replace(gen_random_uuid()::text,'-',''));
  insert into public.hnr_desk_booths(booth_id,operator_hash)
    values('hnr-stem-2026',sha256(convert_to(v_code,'UTF8')))
    on conflict(booth_id) do nothing returning booth_id into v_inserted;
  insert into hnr_desk_install_result values('hnr-stem-2026',case when v_inserted is not null then v_code else null end,
    case when v_inserted is not null then '설치 완료. 운영 코드를 안전하게 보관하고 접수 화면에서 로그인하세요. 기존 기록을 가져오거나 빈 시간표로 시작할 수 있습니다.'
    else '설정 갱신 완료. 기존 운영 코드와 참가자 기록을 유지했습니다. 운영 코드는 재표시하지 않습니다.' end);
end;
$$;
notify pgrst, 'reload schema';
commit;
-- Last statement returns the code and immediately removes its temporary copy.
delete from pg_temp.hnr_desk_install_result returning booth_id,operator_code,message;
