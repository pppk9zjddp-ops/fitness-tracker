-- Einmal im Supabase SQL Editor ausfuehren.
create table if not exists weights (
  date text primary key,
  kg numeric not null
);

create table if not exists recovery (
  date text primary key,
  sleep_h numeric,
  rhr numeric,
  hrv numeric,
  recovery numeric
);

create table if not exists measurements (
  date text primary key,
  waist numeric,
  arm numeric,
  chest numeric,
  shoulder numeric,
  thigh numeric
);

create table if not exists meals (
  id text primary key,
  date text not null,
  name text not null,
  kcal numeric not null default 0,
  protein numeric not null default 0,
  carbs numeric not null default 0,
  fat numeric not null default 0,
  source text,
  created_at text
);
create index if not exists meals_date_idx on meals (date);

create table if not exists meal_templates (
  id text primary key,
  name text not null,
  kcal numeric not null default 0,
  protein numeric not null default 0,
  carbs numeric not null default 0,
  fat numeric not null default 0,
  sort numeric default 0
);

create table if not exists sets (
  id text primary key,
  date text not null,
  day_key text,
  exercise text not null,
  set_no integer not null,
  weight numeric,
  reps numeric,
  rir numeric
);
create index if not exists sets_date_idx on sets (date);

create table if not exists settings (
  key text primary key,
  value jsonb
);

-- Zugriff nur ueber den Service-Role-Key der App. Ohne Policies ist alles andere gesperrt.
alter table weights enable row level security;
alter table recovery enable row level security;
alter table measurements enable row level security;
alter table meals enable row level security;
alter table meal_templates enable row level security;
alter table sets enable row level security;
alter table settings enable row level security;
