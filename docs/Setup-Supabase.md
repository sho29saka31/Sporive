# Setup: Supabase（Sporive）

[Setup](Setup.md) の一部。Supabaseプロジェクトの作成・マイグレーション適用(§1, §2)。**設定済み**（新規環境構築時の手順として記録）。

> **現行（2026-10-04）**：このページの手順のうち **Authentication の設定（URL Configuration・Providers・Email等）はauthアプリのための設定** で、`saka2931-service` 共有のため Sporive 単独では変更しない（正は authリポジトリの `docs/Setup.md`）。Sporive固有で必要なのは、`sporive` スキーマの作成・公開、マイグレーション適用、Custom Access Token Hook、Vault（`cron_secret`）。

## 1. Supabase プロジェクトの作成

1. https://supabase.com でプロジェクトを作成（Region は Tokyo 推奨）
   - プロジェクト作成時の詳細設定（データAPIを有効にする／新しいテーブルを自動的に公開する／自動RLSを有効にする）は**すべてデフォルト（ON）のまま**でよい
   - PostgreSQLタイプは **「PostgreSQL」（デフォルト）** を選択する（OrioleDBはアルファ版のため選ばない。作成後に変更不可）
2. プロジェクト作成後、左メニュー **Project Settings → API Keys** から以下を控える
   - **Project URL**：`Project Settings → General`、またはダッシュボードのURL（`https://supabase.com/dashboard/project/<プロジェクトID>/...`）の `<プロジェクトID>` から `https://<プロジェクトID>.supabase.co` の形式で特定できる
   - **anon public key**（新しいダッシュボードでは **publishable key**：`sb_publishable_...` という表記の場合もある）→ `.env.local` の `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key**（新しいダッシュボードでは **secret key**：`sb_secret_...`）→ `SUPABASE_SERVICE_ROLE_KEY`（**取得だけ済ませ、共有・チャットへの貼り付けはしない**。RLSを無視する強い権限のため慎重に扱う）

> 実運用では`saka2931-service`プロジェクトをlegal-lifeと共有している（`sporive`スキーマで分離）。カスタムスキーマは`public`と異なり`anon`/`authenticated`ロールへのGRANTが自動付与されないため、テーブル作成後に明示的なGRANTが必要（[Runbook](RUNBOOK.md) 参照）。

> **重要（新規環境構築時のみ）**：`supabase/migrations/`配下のSQLファイルは、当初`public`スキーマ向けに書かれたまま（テーブル名にスキーマ修飾がない）だが、`0029_grant_schema_privileges.sql`以降は`sporive`スキーマが既に存在する前提のSQL（`grant usage on schema sporive ...`等）になっている。アプリ側のSupabaseクライアント（`src/lib/supabase/client.ts`・`server.ts`・`middleware.ts`・`admin.ts`）は全て`db: { schema: "sporive" }`を固定指定しているため、`public`にテーブルを作ってしまうとアプリはどのテーブルにもアクセスできない。**新規環境ではマイグレーション適用前に`sporive`スキーマを作成しておくこと**（下記手順1-a）。

## 1-a. `sporive`スキーマの作成（新規環境構築時のみ）

1. SQL Editorで `create schema if not exists sporive;` を実行する
2. Project Settings → **Data API** → **Exposed schemas** に `sporive` を追加する（`public`と併記でよい）

## 2. マイグレーションの適用

1. Supabaseダッシュボードの左メニュー **SQL Editor** を開く
2. 新規環境構築時は、各SQLファイルの先頭に `set search_path to sporive, public;` を追加してから貼り付ける（既存の`saka2931-service`プロジェクトに追記していく場合はこの一文は不要。セッションの`search_path`が既に`sporive`を含んでいる前提のため）
3. `supabase/migrations/` 配下のSQLファイルを、**ファイル名の番号順**にすべて貼り付けて **Run** を実行する
4. 以降、Claudeが新しいマイグレーションファイル（`00XX_....sql`）を追加した際は、その都度同じ手順で番号順に適用する
5. すでに実行済みのSQLを誤って再実行すると `type already exists` 等のエラーが出るが、これは無害（テーブルが既に存在する場合のエラーなので、`select * from sporive.<テーブル名>;` で中身を確認すれば実害がないことが分かる）
5. `Authentication → Sign In / Providers → Email` で以下を確認
   - **「Allow new users to sign up」**：ON
   - **Password Requirements（パスワード要件）**：デフォルトで「半角英大文字・小文字・数字・記号をそれぞれ1文字以上必須」になっている場合がある。アプリ側（authアプリの `/signup/set-password`）のバリデーションもこの要件に合わせて実装済みのため、**変更不要**（変更する場合はアプリ側のバリデーションも合わせて修正が必要）
6. `Authentication → URL Configuration` を設定する（**重要・忘れると本番でログイン後にlocalhostへ飛ばされる不具合が起きる**）
   - **Site URL**：本番ドメインを設定する。例：`https://sporive.saka2931.jp`
   - **Redirect URLs**（許可リスト。複数追加可）：
     ```
     https://sporive.saka2931.jp/auth/callback
     http://localhost:3000/auth/callback
     ```
     プレビュー環境（PRごとのVercel URL）でも試す場合は、そのURLも追加するか、`https://sporive-git-*-<チーム名>.vercel.app/**` のようなワイルドカードを追加する
7. `Authentication → Hooks` で **Customize Access Token (JWT) Claims** を有効化し、`0013_custom_access_token_hook.sql`で作成される関数を選択する（**重要・これを忘れると管理者判定に使うJWTクレームが付与されず、管理者機能全体が動作しない**）
