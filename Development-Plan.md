# Sporive 開発プラン

作成日：2026-07-07
対象：[Requirements](Requirements) に基づく開発フェーズ分割とタスク分解

開発プランは以下のページに分割しています。

- [Development Plan Overview](Development-Plan-Overview) — 全体方針・技術スタック詳細(§1, §2)
- [Development Plan Structure](Development-Plan-Structure) — ディレクトリ構成・データベース設計(§3, §4)
- [Development Plan Phases Demo](Development-Plan-Phases-Demo) — Phase 0〜6（7月デモ版）
- [Development Plan Phases Trial](Development-Plan-Phases-Trial) — Phase 7〜9（8月試験運用）
- [Development Plan Phases Additional](Development-Plan-Phases-Additional) — Phase 10〜12（追加計画フェーズ）
- [Development Plan Schedule Notes](Development-Plan-Schedule-Notes) — スケジュール目安・実装時の判断メモ(§6, §7)

> 各フェーズは「動く状態で完結」させ、フェーズ末ごとにVercelへデプロイして確認する方針で進めた。外部サービス（Supabase / Gemini / Google Cloud / Vercel）のセットアップはユーザー（Shoki）側の作業が必要な箇所があり、各フェーズのページに「ユーザー作業」として明記している。
