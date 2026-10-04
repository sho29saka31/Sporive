-- 表示名は全サービス共通データとして auth アプリ(auth_app.user_profiles)が所有する
-- ため、Sporive の profiles.display_name は不要になった。
--
-- 適用順序(重要):
--   1. 先に NOT NULL を外す(本ファイル 1)。コードのデプロイ前後で、表示名を
--      書き込まない新規登録が NOT NULL 違反で失敗する時間帯を作らないため。
--   2. 表示名を参照しないコード(admin/settings・admin/layout・admin/export・
--      onboarding)をデプロイする。
--   3. 既存の表示名を auth_app.user_profiles へ移行(未設定の利用者のみ)してから、
--      列を削除する(本ファイル 2)。
-- 実行: Supabase Dashboard の SQL Editor(各ステップを順に実行)。

-- 1. NOT NULL を外す(デプロイ前に実行)
alter table sporive.profiles alter column display_name drop not null;

-- 2. 列を削除する(コードのデプロイ・データ移行後に実行)
-- insert into auth_app.user_profiles (id, display_name)
--   select id, display_name from sporive.profiles
--   where id not in (select id from auth_app.user_profiles)
--   on conflict (id) do nothing;
-- alter table sporive.profiles drop column display_name;
