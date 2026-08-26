-- STEP 10: consultation_sessions, consultation_selections, recommendation_results,
-- chatbot_keywords, chat_sessions, chat_messages
create table public.consultation_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  session_key text not null,
  gender text,
  age_group text,
  purpose text check (purpose in ('graduation','family_photo','travel','cosplay','performance','party')),
  current_step integer not null default 1,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.consultation_selections (
  id uuid primary key default gen_random_uuid(),
  consultation_id uuid not null references public.consultation_sessions(id) on delete cascade,
  product_id uuid not null references public.products(id),
  selected_at timestamptz not null default now()
);

create table public.recommendation_results (
  id uuid primary key default gen_random_uuid(),
  consultation_id uuid not null references public.consultation_sessions(id) on delete cascade,
  product_id uuid not null references public.products(id),
  match_score numeric not null check (match_score >= 0 and match_score <= 100),
  ranking integer not null,
  reason text,
  created_at timestamptz not null default now()
);

create table public.chatbot_keywords (
  id uuid primary key default gen_random_uuid(),
  keyword text not null,
  answer text not null,
  sort_order integer not null default 0,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

create trigger chatbot_keywords_set_updated_at
before update on public.chatbot_keywords
for each row execute function public.set_updated_at();

create table public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  session_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger chat_sessions_set_updated_at
before update on public.chat_sessions
for each row execute function public.set_updated_at();

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  chat_session_id uuid not null references public.chat_sessions(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  message text not null,
  created_at timestamptz not null default now()
);

-- consultation & chatbot are low-sensitivity anonymous-friendly features (guest quiz / guest chat)
alter table public.consultation_sessions enable row level security;
create policy consultation_sessions_access on public.consultation_sessions
  for all using (user_id = auth.uid() or user_id is null)
  with check (user_id = auth.uid() or user_id is null);

alter table public.consultation_selections enable row level security;
create policy consultation_selections_access on public.consultation_selections for all using (
  exists (select 1 from public.consultation_sessions cs where cs.id = consultation_id and (cs.user_id = auth.uid() or cs.user_id is null))
) with check (
  exists (select 1 from public.consultation_sessions cs where cs.id = consultation_id and (cs.user_id = auth.uid() or cs.user_id is null))
);

alter table public.recommendation_results enable row level security;
create policy recommendation_results_access on public.recommendation_results for all using (
  exists (select 1 from public.consultation_sessions cs where cs.id = consultation_id and (cs.user_id = auth.uid() or cs.user_id is null))
) with check (
  exists (select 1 from public.consultation_sessions cs where cs.id = consultation_id and (cs.user_id = auth.uid() or cs.user_id is null))
);

alter table public.chatbot_keywords enable row level security;
create policy chatbot_keywords_select on public.chatbot_keywords for select using (active or public.is_admin());
create policy chatbot_keywords_admin_insert on public.chatbot_keywords for insert with check (public.is_admin());
create policy chatbot_keywords_admin_update on public.chatbot_keywords for update using (public.is_admin());
create policy chatbot_keywords_admin_delete on public.chatbot_keywords for delete using (public.is_admin());

alter table public.chat_sessions enable row level security;
create policy chat_sessions_access on public.chat_sessions
  for all using (user_id = auth.uid() or user_id is null)
  with check (user_id = auth.uid() or user_id is null);

alter table public.chat_messages enable row level security;
create policy chat_messages_access on public.chat_messages for all using (
  exists (select 1 from public.chat_sessions cs where cs.id = chat_session_id and (cs.user_id = auth.uid() or cs.user_id is null))
) with check (
  exists (select 1 from public.chat_sessions cs where cs.id = chat_session_id and (cs.user_id = auth.uid() or cs.user_id is null))
);
