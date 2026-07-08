-- Phase 2: 残りのテーブル（トレーニング計画・進捗記録・通知・負債管理・ストリーク・AI提案ログ）
-- 詳細な全体スキーマは docs/development-plan.md §4 を参照

-- 週間トレーニング計画（AI提案 or 手動）
create table training_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  week_start_date date not null,
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  source text not null check (source in ('ai', 'manual')),
  created_at timestamptz not null default now()
);

alter table training_plans enable row level security;

create policy "本人の計画のみ参照可能" on training_plans for select using (auth.uid() = user_id);
create policy "本人の計画のみ作成可能" on training_plans for insert with check (auth.uid() = user_id);
create policy "本人の計画のみ更新可能" on training_plans for update using (auth.uid() = user_id);
create policy "本人の計画のみ削除可能" on training_plans for delete using (auth.uid() = user_id);

-- 計画内の各トレーニング項目（user_idを持たず、training_plans経由でアクセス制御する）
create table plan_items (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references training_plans (id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  exercise_name text not null,
  category text,
  sets integer,
  reps integer,
  weight_kg numeric,
  duration_min integer,
  sort_order integer not null default 0
);

alter table plan_items enable row level security;

create policy "本人の計画項目のみ参照可能" on plan_items for select
  using (exists (
    select 1 from training_plans
    where training_plans.id = plan_items.plan_id and training_plans.user_id = auth.uid()
  ));
create policy "本人の計画項目のみ作成可能" on plan_items for insert
  with check (exists (
    select 1 from training_plans
    where training_plans.id = plan_items.plan_id and training_plans.user_id = auth.uid()
  ));
create policy "本人の計画項目のみ更新可能" on plan_items for update
  using (exists (
    select 1 from training_plans
    where training_plans.id = plan_items.plan_id and training_plans.user_id = auth.uid()
  ));
create policy "本人の計画項目のみ削除可能" on plan_items for delete
  using (exists (
    select 1 from training_plans
    where training_plans.id = plan_items.plan_id and training_plans.user_id = auth.uid()
  ));

-- 実績ログ（進捗記録：セット数・重量・回数・時間）
create table workout_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_item_id uuid references plan_items (id) on delete set null,
  performed_on date not null,
  sets_done integer,
  reps_done integer,
  weight_kg numeric,
  duration_min integer,
  note text,
  created_at timestamptz not null default now()
);

alter table workout_logs enable row level security;

create policy "本人の記録のみ参照可能" on workout_logs for select using (auth.uid() = user_id);
create policy "本人の記録のみ作成可能" on workout_logs for insert with check (auth.uid() = user_id);
create policy "本人の記録のみ更新可能" on workout_logs for update using (auth.uid() = user_id);
create policy "本人の記録のみ削除可能" on workout_logs for delete using (auth.uid() = user_id);

-- Web Push 購読情報
create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table push_subscriptions enable row level security;

create policy "本人の購読のみ参照可能" on push_subscriptions for select using (auth.uid() = user_id);
create policy "本人の購読のみ作成可能" on push_subscriptions for insert with check (auth.uid() = user_id);
create policy "本人の購読のみ削除可能" on push_subscriptions for delete using (auth.uid() = user_id);

-- 通知設定
create table notification_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  daily_reminder_enabled boolean not null default true,
  debt_reminder_enabled boolean not null default false,
  notify_time time not null default '08:00',
  timezone text not null default 'Asia/Tokyo'
);

alter table notification_settings enable row level security;

create policy "本人の通知設定のみ参照可能" on notification_settings for select using (auth.uid() = user_id);
create policy "本人の通知設定のみ作成可能" on notification_settings for insert with check (auth.uid() = user_id);
create policy "本人の通知設定のみ更新可能" on notification_settings for update using (auth.uid() = user_id);

-- 負債（未達成分の記録。8月 Phase 7 で本格運用。作成はサーバー側のバッチ処理（service_role）で行う）
create table debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_item_id uuid references plan_items (id) on delete set null,
  missed_on date not null,
  sets_remaining integer not null default 0,
  reps_remaining integer not null default 0,
  resolved_at timestamptz
);

alter table debts enable row level security;

create policy "本人の負債のみ参照可能" on debts for select using (auth.uid() = user_id);
create policy "本人の負債のみ更新可能" on debts for update using (auth.uid() = user_id);

-- 連続達成記録（8月 Phase 7 で本格運用。更新はサーバー側のバッチ処理（service_role）で行う）
create table streaks (
  user_id uuid primary key references auth.users (id) on delete cascade,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_achieved_on date
);

alter table streaks enable row level security;

create policy "本人のストリークのみ参照可能" on streaks for select using (auth.uid() = user_id);

-- AI提案の分析用ログ（管理画面 Phase 9 で集計に使用）
create table ai_proposal_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  goal text not null,
  proposal_json jsonb not null,
  accepted boolean,
  created_at timestamptz not null default now()
);

alter table ai_proposal_logs enable row level security;

create policy "本人のAI提案ログのみ参照可能" on ai_proposal_logs for select using (auth.uid() = user_id);
create policy "本人のAI提案ログのみ作成可能" on ai_proposal_logs for insert with check (auth.uid() = user_id);
