-- Phase 1: 認証・プロフィール・カレンダー連携用トークンの初期スキーマ
-- 詳細な全体スキーマは docs/development-plan.md §4 を参照（他テーブルは Phase 2 で追加）

create type goal_type as enum (
  'lose_weight',
  'gain_muscle',
  'strength',
  'senior_maintenance'
);

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  birth_year integer not null,
  goal goal_type not null,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "本人のプロフィールのみ参照可能"
  on profiles for select
  using (auth.uid() = id);

create policy "本人のプロフィールのみ作成可能"
  on profiles for insert
  with check (auth.uid() = id);

create policy "本人のプロフィールのみ更新可能"
  on profiles for update
  using (auth.uid() = id);

-- Google Calendar 連携用トークン（Phase 6 で使用。取得済みの同意を保存しておく）
create table calendar_tokens (
  user_id uuid primary key references auth.users (id) on delete cascade,
  refresh_token text not null,
  scope text not null,
  updated_at timestamptz not null default now()
);

alter table calendar_tokens enable row level security;

create policy "本人のトークンのみ参照可能"
  on calendar_tokens for select
  using (auth.uid() = user_id);

create policy "本人のトークンのみ書き込み可能"
  on calendar_tokens for insert
  with check (auth.uid() = user_id);

create policy "本人のトークンのみ更新可能"
  on calendar_tokens for update
  using (auth.uid() = user_id);
