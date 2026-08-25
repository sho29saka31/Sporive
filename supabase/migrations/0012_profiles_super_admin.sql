-- 管理者権限を is_admin / is_super_admin の2段階に分離する（要件定義書 §10-2、計画：Phase 11）
-- is_super_admin は「高度な設定」（§10-3）へのアクセス権を持つ上位権限。

alter table profiles
  add column is_super_admin boolean not null default false;

comment on column profiles.is_super_admin is
  '高度な設定（機能フラグ・お知らせ管理）へのアクセス権。is_adminとは独立したフラグで、開発者が手動で付与する想定';
