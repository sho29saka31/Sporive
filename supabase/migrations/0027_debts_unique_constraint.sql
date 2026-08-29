-- 【不具合修正】debtsのcheck-then-insertがDBレベルでは重複防止されていない
-- （6回目の再監査で発見）
--
-- daily-check.tsの冪等性ガードは「plan_item_idごとに既存debtsをSELECTしてから
-- 無ければinsert」というアプリケーション側の非アトミックなチェックで、
-- (user_id, plan_item_id, missed_on)にDBレベルの一意制約がなかった。
-- cronの同時実行（pg_netのリトライやVercel関数の遅延重複実行）が万一発生した
-- 場合、理論上は同一種目・同一日の負債が重複して記録されうる状態だった。

-- 制約追加前に、既に生じている可能性のある重複行を統合する
delete from debts d
using (
  select id, row_number() over (
    partition by user_id, plan_item_id, missed_on
    order by id
  ) as rn
  from debts
  where plan_item_id is not null
) dup
where d.id = dup.id and dup.rn > 1;

alter table debts
  add constraint debts_user_item_missed_on_key unique (user_id, plan_item_id, missed_on);
