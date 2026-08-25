-- 高度な設定「お知らせ」の仕様変更（ユーザー指示）の残り：
-- ページを開けなくする機能は警告レベルのみとし、affected_pages（お知らせ/注意の
-- 影響範囲表示）は廃止する。
-- 注意：0017（published_at追加）に対応するアプリコードのVercel本番デプロイが
-- 完了してから適用すること（先に適用すると旧コードがaffected_pagesを
-- 参照してエラーになる）。
alter table site_announcements
  drop column affected_pages;
