-- 高度な設定「お知らせ」の仕様変更（ユーザー指示）の一部：
-- 発信日時（published_at）を新設。作成・編集・再有効化のたびに更新し、
-- その時点で全利用者に対して未読（再通知）として扱う起点にする。
-- 既存コードとの互換性を保つため、まず追加のみ行う（affected_pagesの削除は
-- アプリコードのデプロイ完了後に別マイグレーションで行う）。
alter table site_announcements
  add column published_at timestamptz not null default now();

update site_announcements set published_at = created_at;
