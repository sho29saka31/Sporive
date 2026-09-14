-- Googleカレンダー連携機能を廃止する。未検証アプリが制限付きスコープ
-- (.../auth/calendar)を要求していたため、Google Advanced Protection Program
-- 加入ユーザーがGoogleサインイン自体をブロックされる実障害が発生していた
-- (エラー400: policy_enforced)。カレンダー連携で提供していた「今週の予定を
-- 一覧表示する」価値は、既存の週間スケジュール画面(/schedule)で代替できるため、
-- 連携機能自体を削除する(OAuthスコープ要求もアプリコード側で削除済み)。
--
-- calendar_integration機能フラグ(saka2931-infra側)も本番では削除済み。

drop table if exists sporive.calendar_tokens;
