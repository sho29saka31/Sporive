-- お知らせ詳細をURLで直接開けるようにするための8桁の公開ID（ユーザー指示）。
-- 本来のid（uuid）をそのままURLクエリに出すのではなく、短い数字IDで管理する。
-- 生成はDB側で行い一意性をループ判定で保証する（アプリ側での採番だと衝突時に
-- 再試行ロジックが分散し、同じ数字が複数のお知らせに割り当たる不整合が起きうるため）。

create or replace function generate_notice_code()
returns text
language plpgsql
set search_path = public
as $$
declare
  candidate text;
  already_used boolean;
begin
  loop
    candidate := lpad(floor(random() * 100000000)::text, 8, '0');
    select exists(
      select 1 from site_announcements where notice_code = candidate
    ) into already_used;
    exit when not already_used;
  end loop;
  return candidate;
end;
$$;

create or replace function set_notice_code_on_insert()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.notice_code is null then
    new.notice_code := generate_notice_code();
  end if;
  return new;
end;
$$;

alter table site_announcements
  add column notice_code text;

update site_announcements
  set notice_code = generate_notice_code()
  where notice_code is null;

alter table site_announcements
  alter column notice_code set not null,
  add constraint site_announcements_notice_code_unique unique (notice_code);

create trigger site_announcements_set_notice_code
  before insert on site_announcements
  for each row
  execute function set_notice_code_on_insert();
