-- 0029_grant_schema_privileges.sqlでanon/authenticatedへのテーブル権限付与漏れを
-- 修正した際、service_roleへの付与を見落としていた。service_roleはRLSをバイパス
-- する権限を持つが、それとは別にテーブルレベルのGRANT自体が必要であるため、
-- 管理者ダッシュボード(createAdminClient()経由の全クエリ)がPostgRESTから
-- 「permission denied for table」相当(403)で全滅していた(コード監査で発見)。
--
-- RLSは既存ポリシーのまま各テーブルで有効化されているが、service_roleは
-- バイパスするため実害はない。

grant usage on schema sporive to service_role;
grant select, insert, update, delete on all tables in schema sporive to service_role;

-- 今後このスキーマに新しいテーブルが追加された際にも
-- 同じ付与漏れが再発しないよう、デフォルト権限として設定しておく
alter default privileges in schema sporive grant select, insert, update, delete on tables to service_role;
