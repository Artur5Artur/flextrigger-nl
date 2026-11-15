-- FlexTrigger NL
-- Run this script once in the Supabase SQL editor (or via the Supabase CLI).
-- The service role used by the app bypasses row level security.
-- The anon key cannot read or write these tables until you add policies.

begin;

create extension if not exists pgcrypto;

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(trim(name)) > 1),
  website text,
  city text,
  created_at timestamptz not null default now()
);

create table if not exists public.vacancies (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  title text not null check (char_length(trim(title)) > 1),
  source_url text not null unique check (char_length(trim(source_url)) > 4),
  location text,
  raw_description text,
  status text not null default 'new' check (status in ('new', 'demo', 'archived')),
  created_at timestamptz not null default now()
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  vacancy_id uuid not null references public.vacancies (id) on delete cascade,
  contact_person text,
  contact_email text,
  ai_pitch text,
  status text not null default 'pending' check (status in ('pending', 'sent', 'pitch_failed')),
  created_at timestamptz not null default now()
);

create table if not exists public.pilot_requests (
  id uuid primary key default gen_random_uuid(),
  agency_name text not null check (char_length(trim(agency_name)) > 1),
  contact_name text not null check (char_length(trim(contact_name)) > 1),
  email text not null check (position('@' in email) > 1),
  city text,
  created_at timestamptz not null default now()
);

create index if not exists companies_city_idx on public.companies (city);
create index if not exists vacancies_company_id_idx on public.vacancies (company_id);
create index if not exists vacancies_status_idx on public.vacancies (status);
create index if not exists vacancies_created_at_idx on public.vacancies (created_at desc);
create unique index if not exists leads_vacancy_id_unique on public.leads (vacancy_id);
create index if not exists leads_status_idx on public.leads (status);
create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists pilot_requests_created_at_idx on public.pilot_requests (created_at desc);

alter table public.leads add column if not exists email_status text;
alter table public.leads add column if not exists resend_email_id text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'leads_email_status_check'
  ) then
    alter table public.leads
      add constraint leads_email_status_check
      check (email_status is null or email_status in ('sent', 'delivered', 'opened'));
  end if;
end $$;

create unique index if not exists leads_resend_email_id_unique
  on public.leads (resend_email_id)
  where resend_email_id is not null;

alter table public.companies enable row level security;
alter table public.vacancies enable row level security;
alter table public.leads enable row level security;
alter table public.pilot_requests enable row level security;

comment on table public.companies is 'Werkgevers uit vacaturetriggers en uitzendbureaus in de salespijplijn.';
comment on table public.vacancies is 'Publieke logistieke vacatures van Indeed.nl en StepStone.nl.';
comment on table public.leads is 'Concept-acquisitiemail per vacature. Versturen gebeurt door de recruiter.';
comment on column public.leads.email_status is 'Resend-status van de verstuurde pitch: sent, delivered of opened.';
comment on table public.pilot_requests is 'Aanvragen voor de gratis FlexTrigger-pilot.';

commit;
