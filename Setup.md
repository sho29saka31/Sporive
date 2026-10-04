# Sporive セットアップ手順（ユーザー作業）

Sporiveの開発・運用に必要な、外部サービス側の設定手順をまとめたページです。
コード側の実装が必要な項目はClaudeが対応するため、ここに記載しているのはダッシュボード操作など**ユーザー側の作業のみ**です。

セットアップ手順は以下のページに分割しています。

- [Setup Supabase](Setup-Supabase) — Supabaseプロジェクトの作成・マイグレーション適用(§1, §2)
- [Setup Google OAuth](Setup-Google-OAuth) — Google Cloud Console設定・Supabase連携(§3, §4)
- [Setup Verification](Setup-Verification) — アプリ側の環境変数・動作確認・トラブルシューティング(§5, §6)
- [Setup Security Hardening](Setup-Security-Hardening) — 認証セキュリティ強化の追加セットアップ(§7)
- [Setup Vercel](Setup-Vercel) — Vercelプロジェクトの作成・環境変数・ドメイン接続
- [Setup Google AI Studio](Setup-Google-AI-Studio) — Gemini APIキーの取得
- [Setup Analytics Search Console](Setup-Analytics-Search-Console) — GTM/GA4計測・Search Console登録

> [Setup Supabase](Setup-Supabase)・[Setup Google OAuth](Setup-Google-OAuth)・[Setup Vercel](Setup-Vercel)・[Setup Google AI Studio](Setup-Google-AI-Studio)・[Setup Analytics Search Console](Setup-Analytics-Search-Console) は初期セットアップ（Phase 0〜3、§13）で**設定済み**です。新しく環境を作り直す場合の手順として残しています。[Setup Security Hardening](Setup-Security-Hardening) はPhase 12の一部で、**未完了**の作業です。
