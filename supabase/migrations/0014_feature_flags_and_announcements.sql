-- 高度な設定：機能フラグ・お知らせ機能（要件定義書 §10-3、計画：Phase 11）

create table feature_flags (
  key text primary key,
  enabled boolean not null default true,
  description text not null,
  updated_by uuid references auth.users (id),
  updated_at timestamptz not null default now()
);

alter table feature_flags enable row level security;

-- フラグの参照は全利用者に必要（各機能がフラグを見て動作を切り替えるため）
create policy "認証済み利用者は機能フラグを参照可能"
  on feature_flags for select to authenticated
  using (true);
-- 書き込みはRoute Handler側でservice_roleクライアント（super-admin判定込み）から行うため、
-- authenticatedロールへの書き込み権限は付与しない

insert into feature_flags (key, enabled, description) values
  ('ai_master', true, 'AI機能マスタースイッチ（週間AI提案・改善提案・リカバリー提案・目標要約を一括制御）'),
  ('ai_weekly_proposal', true, '週間AI提案（新規生成）'),
  ('ai_improvement_suggestion', true, 'AI改善提案（登録時）'),
  ('ai_recovery_advice', true, 'リカバリー提案（負債向け）'),
  ('ai_goal_summarize', true, '目標の自由記述要約'),
  ('intensity_check', true, '運動強度チェック（ルールベース）'),
  ('new_signup', true, '新規ユーザー登録'),
  ('notifications', true, '通知機能全体'),
  ('calendar_integration', true, 'Googleカレンダー連携'),
  ('emergency_maintenance', false, '緊急メンテナンスモード（有効時はサイト全体を即座にメンテナンス状態にする）'),
  ('debt_management', true, '負債管理機能');

create table site_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  level text not null check (level in ('info', 'notice', 'warning')),
  affected_pages text[] not null default '{}',
  blocked_pages text[] not null default '{}',
  is_active boolean not null default true,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

alter table site_announcements enable row level security;

create policy "認証済み利用者はお知らせを参照可能"
  on site_announcements for select to authenticated
  using (true);
-- 書き込みはRoute Handler側でservice_roleクライアント（super-admin判定込み）から行う

create table announcement_reads (
  user_id uuid not null references auth.users (id) on delete cascade,
  announcement_id uuid not null references site_announcements (id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (user_id, announcement_id)
);

alter table announcement_reads enable row level security;

create policy "本人の既読状態のみ参照可能"
  on announcement_reads for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "本人の既読状態のみ作成可能"
  on announcement_reads for insert to authenticated
  with check ((select auth.uid()) = user_id);
