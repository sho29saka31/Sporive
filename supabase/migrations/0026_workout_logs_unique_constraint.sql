-- 【不具合修正】workout_logsにDBレベルの一意制約がなく、select→insert/updateが
-- 非アトミックなためのlogWorkoutの競合状態（5回目の再監査で発見）
--
-- logWorkout（src/app/(user)/home/actions.ts）は事前にselectで既存行の有無を
-- 確認してからinsert/updateを行っていた。この2ステップはトランザクションで
-- 保護されておらず、連打・オフライン復帰時の再送等で短時間に2回リクエストが
-- 飛ぶと、両方が「既存行なし」と判定してinsertし、同一利用者・同一種目・
-- 同一日のログが複数行できることがあった。daily-check.tsのログ取得
-- （plan_item_idをキーにしたMap化）はorder指定がないため、重複行がある場合に
-- どちらが採用されるかが非決定的で、誤った達成判定につながりうる状態だった。
--
-- (user_id, plan_item_id, performed_on) に一意制約を追加し、
-- logWorkoutをupsertに変更することで、DBレベルでアトミックに重複を防ぐ。
-- plan_item_idがnullの行同士は、SQL標準の挙動によりNULLは互いに
-- 等しいとみなされないため、この一意制約の対象外になる（問題ない）。

-- 制約追加前に、既に生じている可能性のある重複行を統合する
-- （同グループ内で最新のcreated_atの行を残し、古い行は削除する）
delete from workout_logs w
using (
  select id, row_number() over (
    partition by user_id, plan_item_id, performed_on
    order by created_at desc, id desc
  ) as rn
  from workout_logs
  where plan_item_id is not null
) dup
where w.id = dup.id and dup.rn > 1;

alter table workout_logs
  add constraint workout_logs_user_item_date_key unique (user_id, plan_item_id, performed_on);
