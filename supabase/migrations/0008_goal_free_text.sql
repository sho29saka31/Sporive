-- 目標（goal）を4択のenumから自由記述（Gemini APIで整形した文章）に変更
-- クライアント要望：「大きくしたい部位」等の具体的な要望を文章で受け取れるようにする

alter table profiles add column goal_text text;

update profiles set goal_text = case goal
  when 'lose_weight' then '体重を減らしたい'
  when 'gain_muscle' then '筋肉を増やして体を大きくしたい'
  when 'strength' then '筋力を向上させたい'
  when 'senior_maintenance' then '無理のない範囲で筋力を維持したい（シニア向け）'
end;

alter table profiles drop column goal;
alter table profiles rename column goal_text to goal;
alter table profiles alter column goal set not null;

drop type goal_type;
