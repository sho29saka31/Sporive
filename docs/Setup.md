# Sporive セットアップ手順（ユーザー作業）

Sporiveの開発・運用に必要な、外部サービス側の設定手順をまとめたページです。
コード側の実装が必要な項目はClaudeが対応するため、ここに記載しているのはダッシュボード操作など**ユーザー側の作業のみ**です。

セットアップ手順は以下のページに分割しています。

- [Setup Supabase](Setup-Supabase.md) — Supabaseプロジェクトの作成・マイグレーション適用(§1, §2)
- [Setup Google OAuth](Setup-Google-OAuth.md) — Google Cloud Console設定・Supabase連携(§3, §4)
- [Setup Verification](Setup-Verification.md) — アプリ側の環境変数・動作確認・トラブルシューティング(§5, §6)
- [Setup Security Hardening](Setup-Security-Hardening.md) — 認証セキュリティ強化の追加セットアップ(§7)
- [Setup Vercel](Setup-Vercel.md) — Vercelプロジェクトの作成・環境変数・ドメイン接続
- [Setup Google AI Studio](Setup-Google-AI-Studio.md) — Gemini APIキーの取得
- [Setup Analytics Search Console](Setup-Analytics-Search-Console.md) — GTM/GA4計測・Search Console登録

> **認証関連（Supabase Authの設定・Google OAuth・Turnstile）はauthアプリ側で管理している**（authリポジトリの `docs/Setup.md`）。Sporiveの環境を新しく作る場合も、auth側の設定が済んでいることが前提。

> [Setup Supabase](Setup-Supabase.md)・[Setup Google OAuth](Setup-Google-OAuth.md)・[Setup Vercel](Setup-Vercel.md)・[Setup Google AI Studio](Setup-Google-AI-Studio.md)・[Setup Analytics Search Console](Setup-Analytics-Search-Console.md) は初期セットアップ（Phase 0〜3、§13）で**設定済み**です。新しく環境を作り直す場合の手順として残しています。[Setup Security Hardening](Setup-Security-Hardening.md) はPhase 12の一部で、認証部分はauth側に移管済み、Dashboard設定の実施状況は要確認です。[Setup Google OAuth](Setup-Google-OAuth.md) は現在authアプリ専用のクライアントを使うため、履歴としての記録です。
