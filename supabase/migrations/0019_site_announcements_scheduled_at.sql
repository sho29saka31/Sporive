-- お知らせの予約投稿機能（ユーザー指示）。
-- scheduled_atを指定すると、その日時になるまで利用者側には表示されない
-- （is_activeはtrueのまま。表示可否はアプリ側でscheduled_at <= nowを判定する）。
-- NULLの場合は即時公開（従来通り）。
alter table site_announcements
  add column scheduled_at timestamptz;
