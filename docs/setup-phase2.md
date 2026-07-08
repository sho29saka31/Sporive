# Phase 2 セットアップ手順（ユーザー作業）

Phase 2（DBスキーマ・データ層）で追加したテーブルをSupabaseに反映するための手順です。

## マイグレーションの適用

1. Supabaseダッシュボードの左メニュー **SQL Editor** を開く
2. **New query** で新しいクエリ画面を開く
3. `supabase/migrations/0002_training_and_progress.sql` の中身をすべてコピーして貼り付け、**Run** を実行

## 確認方法

以下のSQLで、8個のテーブルがすべて作成されているか確認できます。

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'training_plans', 'plan_items', 'workout_logs', 'push_subscriptions',
    'notification_settings', 'debts', 'streaks', 'ai_proposal_logs'
  );
```

8行返ってくれば成功です。

## 補足

- `debts`・`streaks`・`ai_proposal_logs` は8月試験運用フェーズ（Phase 7・9）で本格的に使用するテーブルですが、開発プラン§4の方針に従いPhase 2でまとめてスキーマを確定しています
- 各テーブルにはRLS（行レベルセキュリティ）を設定済みで、本人のデータのみ読み書きできます
