-- 【不具合修正】週間計画保存の競合状態・計画編集のたびに実績ログ/負債の
-- 紐付けが失われる問題（5回目の再監査で発見）
--
-- 従来のsaveTrainingPlan（アプリ側）は
--   1. 新しいtraining_plans行をinsert
--   2. 新しいplan_itemsを（変更のない項目も含めて）全件insert
--   3. 既存のtraining_plans行をdelete（plan_itemsはON DELETE CASCADE）
-- という3ステップを別々のクエリで行っており、トランザクションで
-- 保護されていなかった。これにより：
--
-- 1. 同じ利用者が同じ週にほぼ同時に2回保存すると（連打・再送・複数タブ）、
--    両方が同じ「既存行」を読み取ってしまい、status='active'の計画が
--    重複して残ることがあった。(user_id, week_start_date)に一意制約が
--    なかったため防げず、重複が生じると .maybeSingle() を使う画面
--    （ホーム・スケジュール・編集）がPostgRESTのエラーで例外落ちしていた。
-- 2. 編集のたびにplan_itemsが（同一種目でも）新規UUIDで作り直されるため、
--    その週に既に記録済みのworkout_logs・未消化のdebtsのplan_item_idが
--    ON DELETE SET NULLでNULL化され、紐付けが失われていた
--    （当日記録済みの表示が編集後に消える、達成済みなのに翌朝のdaily-checkが
--    誤って負債を作成する、等の副作用があった）。
--
-- この関数は、保存処理全体を単一のPostgres関数（＝単一トランザクション）に
-- まとめることで（1）を解決し、あわせて既存のplan_itemsを
-- (day_of_week, exercise_name) で新しい項目と突き合わせてIDを再利用する
-- ことで（2）を解決する。

-- 一意インデックス作成前に、過去の不具合で既に生じている可能性のある
-- 重複active計画を解消しておく（そうしないと、このマイグレーション自身が
-- 「同じ週に複数の重複値がある」ことを理由に作成失敗する）。
-- 各(user_id, week_start_date)グループで最新のcreated_atの1件だけをactiveに残し、
-- それ以外はarchivedにする（deleteはplan_items等の関連データを失うため避ける）
update training_plans t set status = 'archived'
from (
  select id, row_number() over (
    partition by user_id, week_start_date
    order by created_at desc, id desc
  ) as rn
  from training_plans
  where status = 'active'
) dup
where t.id = dup.id and dup.rn > 1;

-- 同じ利用者・同じ週にstatus='active'の計画が2件以上同時に存在しないことを
-- DBレベルで保証する（関数内の一時的な重複防止だけでなく、想定外の
-- 経路からの直接insertに対する最終防衛線としても機能する）
create unique index if not exists training_plans_active_user_week_uidx
  on training_plans (user_id, week_start_date) where status = 'active';

-- upsert_training_plan関数はauthenticatedロールから直接RPC実行可能なため、
-- アプリ側（validateWorkoutValue、src/lib/workout-limits.ts）のバリデーションを
-- 経由しない直接呼び出しに対する防御多層化として、DBレベルにも数値範囲の
-- CHECK制約を追加する。既存データに範囲外の値が万一残っていた場合に
-- 制約追加自体が失敗しないよう、先にnullへ丸めておく（値の水増しはできないため、
-- 不正確な推測値で埋めるより「未入力」扱いにする方が安全）
update plan_items set sets = null where sets is not null and sets not between 1 and 30;
update plan_items set reps = null where reps is not null and reps not between 1 and 200;
update plan_items set weight_kg = null where weight_kg is not null and weight_kg not between 0 and 500;
update plan_items set duration_min = null where duration_min is not null and duration_min not between 1 and 480;

alter table plan_items
  add constraint plan_items_sets_range check (sets is null or sets between 1 and 30),
  add constraint plan_items_reps_range check (reps is null or reps between 1 and 200),
  add constraint plan_items_weight_kg_range check (weight_kg is null or weight_kg between 0 and 500),
  add constraint plan_items_duration_min_range check (duration_min is null or duration_min between 1 and 480);

create or replace function upsert_training_plan(
  p_week_start_date date,
  p_status text,
  p_source text,
  p_summary text,
  p_items jsonb
)
returns table (plan_id uuid, conflict boolean)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_old_plan_id uuid;
  v_new_plan_id uuid;
  v_item jsonb;
  v_matched_id uuid;
  v_matched_ids uuid[] := '{}';
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  -- この関数はauthenticatedロールから直接RPC実行可能で、呼び出し元
  -- （saveTrainingPlan）は常にp_status='active'しか渡さない。ここでの
  -- 検証がないと、ブラウザから直接p_status='draft'等でRPCを繰り返し呼び出す
  -- ことで、既存行検索（status='active'限定）にも一意インデックス
  -- （status='active'部分インデックス）にも引っかからない重複行を
  -- 同じ(user_id, week_start_date)に何件でも作成でき、/schedule系画面の
  -- .maybeSingle()クエリが複数行ヒットで壊れる（自己DoS）ため、
  -- 現状アプリが使う値のみを許可する
  if p_status <> 'active' then
    raise exception 'invalid status: %', p_status;
  end if;

  select id into v_old_plan_id
  from training_plans
  where user_id = v_user_id
    and week_start_date = p_week_start_date
    and status = 'active'
  limit 1;

  begin
    insert into training_plans (user_id, week_start_date, status, source, summary)
    values (v_user_id, p_week_start_date, p_status, p_source, p_summary)
    returning id into v_new_plan_id;
  exception when unique_violation then
    -- 同じ週へほぼ同時に別の保存が先に成功した（競合状態）。
    -- このトランザクションはここで何も変更せずに終了し、呼び出し元に
    -- 再試行を促す
    return query select null::uuid, true;
    return;
  end;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_matched_id := null;
    if v_old_plan_id is not null then
      -- 曜日・種目名が一致する未マッチの旧項目があればIDを再利用し、
      -- その項目に紐づく既存のworkout_logs/debtsとの関連を維持する。
      -- 同じ曜日に同名の種目が複数ある場合にどれとマッチするかが
      -- 非決定的にならないよう、並び順（sort_order, id）で決定的に選ぶ
      select id into v_matched_id
      from plan_items
      where plan_id = v_old_plan_id
        and day_of_week = (v_item->>'day_of_week')::int
        and exercise_name = (v_item->>'exercise_name')
        and not (id = any(v_matched_ids))
      order by sort_order, id
      limit 1;
    end if;

    if v_matched_id is not null then
      v_matched_ids := array_append(v_matched_ids, v_matched_id);
      update plan_items set
        plan_id = v_new_plan_id,
        category = v_item->>'category',
        sets = (v_item->>'sets')::int,
        reps = (v_item->>'reps')::int,
        weight_kg = (v_item->>'weight_kg')::numeric,
        duration_min = (v_item->>'duration_min')::int,
        sort_order = (v_item->>'sort_order')::int
      where id = v_matched_id;
    else
      insert into plan_items (
        plan_id, day_of_week, exercise_name, category, sets, reps, weight_kg, duration_min, sort_order
      ) values (
        v_new_plan_id,
        (v_item->>'day_of_week')::int,
        v_item->>'exercise_name',
        v_item->>'category',
        (v_item->>'sets')::int,
        (v_item->>'reps')::int,
        (v_item->>'weight_kg')::numeric,
        (v_item->>'duration_min')::int,
        (v_item->>'sort_order')::int
      );
    end if;
  end loop;

  if v_old_plan_id is not null then
    -- マッチした旧項目は既に新しい計画へ移し替え済みのため、cascadeで
    -- 削除されるのは「新しい計画にもう存在しない」未マッチの旧項目のみ
    delete from training_plans where id = v_old_plan_id;
  end if;

  return query select v_new_plan_id, false;
end;
$$;

revoke execute on function upsert_training_plan(date, text, text, text, jsonb) from public, anon;
grant execute on function upsert_training_plan(date, text, text, text, jsonb) to authenticated;
