-- コード監査で発見：/api/ai/propose-plan・improve-plan・recoveryのいずれにも
-- 呼び出し頻度の制限が一切なく、認証済みユーザーが連続呼び出しでGemini APIコストを
-- 際限なく増大させられる（「すべて無料プラン内で運用する」という制約と衝突する）。
-- ユーザー単位・全AIエンドポイント共有のスライディングウィンドウ制限を追加する。

create table sporive.ai_request_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null,
  created_at timestamptz not null default now()
);

create index ai_request_log_user_created_idx on sporive.ai_request_log (user_id, created_at);

alter table sporive.ai_request_log enable row level security;
-- anon/authenticatedへの直接ポリシーは作成しない。login_verification_codes（adac側）と
-- 同じ「RLS有効・ポリシー0件」パターンで、check_and_log_ai_request経由のみで操作する。

-- チェックと記録を1つの関数内でアトミックに行う（呼び出し側で「件数確認→挿入」の
-- 2ステップに分けると、その間に別リクエストが割り込むレースコンディションで
-- 制限をすり抜けられるため）。
create or replace function sporive.check_and_log_ai_request(
  p_endpoint text,
  p_max_requests int default 15,
  p_window_minutes int default 60
)
returns boolean
language plpgsql
security definer
set search_path = sporive
as $$
declare
  v_user_id uuid := auth.uid();
  v_count int;
begin
  if v_user_id is null then
    return false;
  end if;

  select count(*) into v_count
  from ai_request_log
  where user_id = v_user_id
    and created_at > now() - (p_window_minutes || ' minutes')::interval;

  if v_count >= p_max_requests then
    return false;
  end if;

  insert into ai_request_log (user_id, endpoint) values (v_user_id, p_endpoint);
  return true;
end;
$$;

-- 各Route Handlerがユーザーセッションのクライアント（authenticatedロール）から
-- 直接RPC呼び出しする想定のため、service_roleだけでなくauthenticatedにも許可する。
grant execute on function sporive.check_and_log_ai_request(text, int, int) to authenticated;
revoke execute on function sporive.check_and_log_ai_request(text, int, int) from anon, public;

-- 直近1時間しか参照しないテーブルのため、日次で1日以上前の行を削除する専用ジョブを
-- 別途スケジュールする（既存のsporive-notification-cleanupジョブとは独立させ、
-- 既存の通知クリーンアップ関数の定義には手を加えない）。
create or replace function sporive.cleanup_old_ai_request_log()
returns void
language plpgsql
security definer
set search_path = sporive
as $$
begin
  delete from ai_request_log where created_at < now() - interval '1 day';
end;
$$;

select cron.schedule(
  'sporive-ai-request-log-cleanup',
  -- JST 3:10 = UTC 18:10（前日）。既存のsporive-notification-cleanup（18:00）と
  -- 時間帯をずらし、同時実行による競合を避ける。
  '10 18 * * *',
  $$ select sporive.cleanup_old_ai_request_log(); $$
);

revoke execute on function sporive.cleanup_old_ai_request_log() from anon, authenticated, public;
