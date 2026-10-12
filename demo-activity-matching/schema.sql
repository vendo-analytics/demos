-- Keen MVP schema (Postgres 16 + PostGIS). See MODEL.md for what each part is for.
-- The "graph" is these tables read as nodes and edges; no graph database is needed for the MVP.

create extension if not exists postgis;
create extension if not exists pg_trgm;

-- ---------- reference data ----------

create table categories (
  id    text primary key,              -- racquet, team, water, ...
  label text not null
);

create table activities (
  id          text primary key,        -- padel, football, ...
  label       text not null,
  category_id text not null references categories(id),
  tag_group   text not null check (tag_group in ('Sports', 'Hobbies', 'Professional skills')),
  usual_size  int  not null default 2,
  traits      text[] not null default '{}',   -- water, heights, contact
  synonyms    text[] not null default '{}',   -- soccer -> football (parsed as this activity)
  aliases     text[] not null default '{}'    -- footy, rugby -> football (shown as "the closest thing")
);

create table suburbs (
  id       text primary key,
  name     text not null,
  centroid geography(point) not null
);

create table venues (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,
  suburb_id             text not null references suburbs(id),
  address               text not null,
  location              geography(point) not null,
  activities            text[] not null,
  licensed              boolean not null default false,
  default_meeting_point text not null,
  transport             text,
  parking               text,
  accessibility         text,
  verified_public       boolean not null default false
);
create index on venues using gist (location);

-- ---------- people ----------

create type skill_level as enum ('beginner', 'casual', 'intermediate', 'competitive');

create table users (
  id               uuid primary key default gen_random_uuid(),
  first_name       text not null check (first_name ~ '^[[:alpha:]''-]+( [[:alpha:]''-]+)?$' and length(first_name) <= 30),
  photo_url        text,
  bio              text check (length(bio) <= 160),
  home_suburb_id   text not null references suburbs(id),
  joined_at        timestamptz not null default now(),

  photo_status     text not null default 'none' check (photo_status in ('none', 'pending', 'verified', 'rejected')),
  id_verified      boolean not null default false,
  goodwill         int not null default 0 check (goodwill >= 0),  -- cached sum of goodwill_ledger, floored at 0
  -- private
  goals            text[] not null default '{}' check (cardinality(goals) <= 3),  -- tunes recommendations only
  phone_e164       text not null unique,
  birth_year       int not null check (birth_year > 1900),   -- 18+ is enforced at sign-up
  travel_radius_km int not null default 10 check (travel_radius_km in (2, 5, 10, 20, 50)),
  avoid            text[] not null default '{}',      -- water, heights, alcohol, contact, late, early, big
  availability     text[] not null default '{}',      -- wd-am, wd-pm, we-am, we-pm
  asks_per_week    int not null default 3 check (asks_per_week in (0, 1, 3, 5, 7))
);

create table user_interests (
  user_id     uuid references users(id) on delete cascade,
  activity_id text references activities(id),
  level       skill_level not null default 'casual',
  source      text not null default 'onboarding',    -- onboarding | self | feedback
  primary key (user_id, activity_id)
);

create table blocks (
  blocker_id uuid references users(id) on delete cascade,
  blocked_id uuid references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);

-- ---------- events ----------

create type event_status as enum ('open', 'full', 'live', 'done', 'cancelled');

create table events (
  id                   uuid primary key default gen_random_uuid(),
  organiser_id         uuid not null references users(id),
  activity_id          text not null references activities(id),
  title                text not null check (length(title) <= 60),
  description          text check (length(description) <= 200),
  level                skill_level not null default 'casual',
  venue_id             uuid not null references venues(id),
  meeting_point        text not null check (length(meeting_point) <= 80),
  directions           text check (length(directions) <= 300),
  bring                text check (length(bring) <= 80),
  starts_at            timestamptz not null,
  ends_at              timestamptz not null check (ends_at > starts_at),
  capacity             int not null check (capacity between 2 and 30),
  join_mode            text not null default 'approve' check (join_mode in ('approve', 'open')),
  visibility           text not null default 'public' check (visibility in ('public', 'invite')),
  status               event_status not null default 'open',
  traits               text[] not null default '{}',  -- derived on write: activity traits + licensed venue + late/early/big
  time_bucket          text not null,                 -- derived: wd-am | wd-pm | we-am | we-pm
  created_from_ask_id  uuid,                         -- references asks(id); asks is defined below
  cloned_from_event_id uuid references events(id),
  cancelled_reason     text,
  created_at           timestamptz not null default now()
);
create index on events (starts_at) where status in ('open', 'full');
create index on events (activity_id, starts_at);
create index on events using gin (title gin_trgm_ops);

create type member_status as enum ('interested', 'requested', 'waitlist', 'going', 'declined', 'left', 'removed');

create table event_members (
  event_id             uuid references events(id) on delete cascade,
  user_id              uuid references users(id),
  status               member_status not null,
  joined_at            timestamptz not null default now(),
  left_at              timestamptz,
  late_cancel          boolean not null default false,
  checked_in_at        timestamptz,
  attendance           text check (attendance in ('attended', 'no_show')),
  confirmed_by         uuid[] not null default '{}',
  last_read_message_id bigint,
  primary key (event_id, user_id)
);
create index on event_members (user_id, status);

-- ---------- asks and notifications ----------

create table asks (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id),
  raw_text   text not null check (length(raw_text) <= 300),
  activity_id text not null references activities(id),
  suburb_id  text references suburbs(id),            -- null for online
  radius_km  int not null default 5,
  slots      tstzmultirange not null,                -- one range per day in the asked window
  have       int not null default 1 check (have between 1 and 8),
  seek       int not null default 1 check (seek between 1 and 20),
  level      skill_level,
  role       text check (role in ('learner', 'teacher')),
  status     text not null default 'open' check (status in ('open', 'matched', 'closed', 'expired')),
  expires_at timestamptz not null default now() + interval '7 days',
  created_at timestamptz not null default now()
);
create index on asks (activity_id) where status = 'open';

-- A saved search: a private standing query. Run against each newly posted event; a match sends one notification.
-- Unlike an ask it never reaches other people and nobody can see it.
create table saved_searches (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  raw_text    text not null default '' check (length(raw_text) <= 120),
  activity_id text references activities(id),
  venue_id    uuid references venues(id),
  centre      geography(point),                     -- null = the user's home suburb
  radius_km   int check (radius_km in (2, 5, 10, 20, 50)),
  when_preset text check (when_preset in ('today', 'tomorrow', 'this weekend', 'next 7 days')),
  level       skill_level,
  has_spots   boolean not null default false,
  open_join   boolean not null default false,
  words       text,                                 -- leftover words matched against title and description
  last_notified_at timestamptz,
  created_at  timestamptz not null default now()
);
create index on saved_searches (activity_id);

-- "Not for me" and "Show fewer" from a recommendation card (MODEL.md §6.1). Private; decays after 60 days.
create table recommendation_feedback (
  id          bigserial primary key,
  user_id     uuid not null references users(id) on delete cascade,
  kind        text not null check (kind in ('hide', 'fewer')),
  event_id    uuid references events(id) on delete cascade,  -- for 'hide'
  activity_id text references activities(id),                -- for 'fewer'
  created_at  timestamptz not null default now(),
  check ((kind = 'hide' and event_id is not null) or (kind = 'fewer' and activity_id is not null))
);
create index on recommendation_feedback (user_id, created_at);

-- Search log, kept 90 days. Never shown to anyone. Zero-result queries are demand: grouped by suburb and term,
-- they tell Keen which activities to suggest to people who could host them ("12 people near Manly searched yoga").
create table search_log (
  id          bigserial primary key,
  user_id     uuid references users(id) on delete set null,
  suburb_id   text references suburbs(id),
  raw_text    text not null,
  activity_id text references activities(id),       -- after typo and alias repair
  unknown_term text,                                 -- set when no activity, venue or plan matched
  results     int not null,
  created_at  timestamptz not null default now()
);
create index on search_log (unknown_term, suburb_id) where results = 0;

-- Every "might be keen" ask, plan invite and reach-out sent, so the weekly cap can be enforced.
create table notifications (
  id         bigserial primary key,
  user_id    uuid not null references users(id),
  kind       text not null check (kind in ('ask', 'plan', 'invite', 'thread', 'reminder', 'feedback', 'saved_search')),
  event_id   uuid references events(id),
  ask_id     uuid references asks(id),
  created_at timestamptz not null default now(),
  read_at    timestamptz
);
create index on notifications (user_id, kind, created_at);

-- ---------- threads ----------

create table messages (
  id          bigserial primary key,
  event_id    uuid not null references events(id) on delete cascade,
  author_id   uuid references users(id),            -- null for system messages
  kind        text not null default 'text' check (kind in ('text', 'system', 'pinned')),
  body        text not null check (length(body) <= 1000),
  reply_to_id bigint references messages(id),
  masked      text[] not null default '{}',         -- what screening hid: phone number, email, link, ...
  hidden      boolean not null default false,       -- moderation
  created_at  timestamptz not null default now()
);
create index on messages (event_id, id);

-- ---------- feedback and goodwill ----------

create table event_ratings (
  event_id uuid references events(id),
  user_id  uuid references users(id),
  stars    int not null check (stars between 1 and 5),
  comment  text,                                    -- private, review only
  primary key (event_id, user_id)
);

create table person_feedback (
  event_id   uuid references events(id),
  from_id    uuid references users(id),
  to_id      uuid references users(id),
  came       boolean not null,
  vibe       text check (vibe in ('good', 'bad')),
  tags       text[] not null default '{}',
  created_at timestamptz not null default now(),
  primary key (event_id, from_id, to_id),
  check (from_id <> to_id)
);

create table goodwill_ledger (
  id         bigserial primary key,
  user_id    uuid not null references users(id),
  delta      int not null,
  reason     text not null,                         -- attended, hosted, feedback_given, good_review, id_verified, no_show, late_cancels
  event_id   uuid references events(id),
  created_at timestamptz not null default now()
);

-- ---------- graph edges that are derived, not entered ----------

-- PLAYED_WITH: two people who both attended the same event.
create materialized view played_with as
select a.user_id as user_id, b.user_id as other_id, count(*) as times, max(e.ends_at) as last_at
from event_members a
join event_members b on b.event_id = a.event_id and b.user_id <> a.user_id
join events e on e.id = a.event_id
where a.attendance = 'attended' and b.attendance = 'attended'
group by a.user_id, b.user_id;
create unique index on played_with (user_id, other_id);

-- ATTENDED: what someone actually turns up to, per activity.
create materialized view attended_activity as
select m.user_id, e.activity_id, count(*) as times
from event_members m join events e on e.id = m.event_id
where m.attendance = 'attended'
group by m.user_id, e.activity_id;
create unique index on attended_activity (user_id, activity_id);

-- ---------- core queries ----------

-- Recommendation candidates for :me. Hard filters here; scoring (MODEL.md §6) can run in SQL or in the app.
-- select e.*, st_distance(v.location, s.centroid) / 1000 as km,
--        coalesce(aa.times, 0) as times_attended,
--        (select coalesce(sum(pw.times), 0) from event_members m join played_with pw on pw.other_id = m.user_id
--          where m.event_id = e.id and m.status = 'going' and pw.user_id = :me) as social
-- from events e
-- join venues v on v.id = e.venue_id
-- join users u on u.id = :me
-- join suburbs s on s.id = u.home_suburb_id
-- left join attended_activity aa on aa.user_id = :me and aa.activity_id = e.activity_id
-- where e.status in ('open', 'full') and e.visibility = 'public' and e.starts_at > now()
--   and st_dwithin(v.location, s.centroid, u.travel_radius_km * 1000)
--   and not (e.traits && u.avoid)                                    -- held back; count them separately
--   and not exists (select 1 from event_members m where m.event_id = e.id and m.user_id = :me)
--   and not exists (select 1 from blocks b where (b.blocker_id = :me and b.blocked_id = e.organiser_id)
--                                            or (b.blocker_id = e.organiser_id and b.blocked_id = :me));

-- Search (MODEL.md §4): the parser turns "padel this weekend in Mosman" into :activity, :venue, :slots, :centre,
-- :radius_km, :level, :words. Typos are repaired before this runs: the nearest activity synonym by trigram similarity.
--   select a.id from activities a, unnest(a.synonyms) s where similarity(s, :word) > 0.4 order by similarity(s, :word) desc limit 1;
-- ... where (:activity is null or e.activity_id = :activity
--            or e.activity_id in (select id from activities where category_id = (select category_id from activities where id = :activity)))
--   and (:venue is null or e.venue_id = :venue)
--   and (:slots is null or tstzrange(e.starts_at, e.ends_at) && any(:slots))
--   and st_dwithin(v.location, :centre, :radius_km * 1000)
--   and (:level is null or e.level in (:level, 'casual'))
--   and (:has_spots is false or (select count(*) from event_members m where m.event_id = e.id and m.status = 'going') < e.capacity)
--   and (:open_join is false or e.join_mode = 'open')
--   and (:words is null or e.title % :words or e.description ilike '%' || :words || '%')
-- No exact rows: rerun with one filter relaxed (time, then distance, then level) and show those as "other times" etc.
-- Saved searches for a newly posted event :event (same predicates from the event's side):
--   select s.user_id from saved_searches s, events e join venues v on v.id = e.venue_id
--   where e.id = :event and (s.activity_id is null or s.activity_id = e.activity_id) and (s.venue_id is null or s.venue_id = e.venue_id)
--     and st_dwithin(v.location, coalesce(s.centre, (select centroid from suburbs where id = (select home_suburb_id from users where id = s.user_id))),
--                    coalesce(s.radius_km, (select travel_radius_km from users where id = s.user_id)) * 1000)
--     and (s.level is null or e.level in (s.level, 'casual'))
--     and (s.last_notified_at is null or s.last_notified_at < now() - interval '1 day')   -- at most one a day per search

-- Browse counts by day and activity:
-- select date_trunc('day', e.starts_at at time zone 'Australia/Sydney') as day, e.activity_id, count(*) ... group by 1, 2;

-- Thread access check:
-- select exists (select 1 from event_members where event_id = :event and user_id = :me
--                and status in ('interested', 'requested', 'waitlist', 'going'))
--     or exists (select 1 from events where id = :event and organiser_id = :me);

-- History on your own profile:
-- select e.*, m.attendance, r.stars from event_members m join events e on e.id = m.event_id
-- left join event_ratings r on r.event_id = e.id and r.user_id = m.user_id
-- where m.user_id = :me and (m.attendance = 'attended' or e.organiser_id = :me) order by e.starts_at desc;

-- Reach: who a posted plan :event reaches (MODEL.md §3.4). The same edges as recommendations, from the plan's side.
-- with e as (select e.*, v.location, v.licensed from events e join venues v on v.id = e.venue_id where e.id = :event)
-- select u.id,
--        case when exists (select 1 from blocks b where (b.blocker_id = u.id and b.blocked_id = e.organiser_id)
--                                              or (b.blocker_id = e.organiser_id and b.blocked_id = u.id)) then 'blocked'
--             when not st_dwithin(e.location, s.centroid, u.travel_radius_km * 1000)                  then 'far'
--             when e.traits && u.avoid                                                             then 'avoid'
--             when abs(array_position(enum_range(null::skill_level), ui.level)
--                    - array_position(enum_range(null::skill_level), e.level)) >= 2                  then 'level'
--             when a.id is not null                                                                then 'asked'   -- told now
--             when not (e.time_bucket = any (u.availability))                                       then 'busy'
--             when (select count(*) from notifications n where n.user_id = u.id and n.kind = 'ask'
--                    and n.created_at > now() - interval '7 days') >= u.asks_per_week                then 'cap'
--             else 'likely' end as outcome                                                              -- told within cap
-- from e
-- join users u on u.id <> e.organiser_id
-- join suburbs s on s.id = u.home_suburb_id
-- left join user_interests ui on ui.user_id = u.id and ui.activity_id = e.activity_id
-- left join asks a on a.user_id = u.id and a.activity_id = e.activity_id and a.slots && tstzrange(e.starts_at, e.ends_at)
-- where (ui.user_id is not null or a.id is not null)
--   and not exists (select 1 from event_members m where m.event_id = e.id and m.user_id = u.id);
