-- 性別（AI提案の精度向上に利用。未回答を許容するためnullable）
create type gender_type as enum ('male', 'female', 'other');

alter table profiles
  add column gender gender_type;
