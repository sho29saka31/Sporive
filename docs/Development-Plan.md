# Sporive 開発プラン

作成日：2026-07-07
対象：[Requirements](Requirements.md) に基づく開発フェーズ分割とタスク分解

> **位置づけ（2026-10-04）**：本書は策定時の計画と、各フェーズの実装時の判断メモの記録。実装済みの現在の姿は [Architecture](ARCHITECTURE.md)、以降の変更は [CHANGELOG](CHANGELOG.md) を参照。Phase 12（認証セキュリティ強化）の認証部分は authアプリへ移管された（[ADR](ADR.md) ADR-009）。

開発プランは以下のページに分割しています。

- [Development Plan Overview](Development-Plan-Overview.md) — 全体方針・技術スタック詳細(§1, §2)
- [Development Plan Structure](Development-Plan-Structure.md) — ディレクトリ構成・データベース設計(§3, §4)
- [Development Plan Phases Demo](Development-Plan-Phases-Demo.md) — Phase 0〜6（7月デモ版）
- [Development Plan Phases Trial](Development-Plan-Phases-Trial.md) — Phase 7〜9（8月試験運用）
- [Development Plan Phases Additional](Development-Plan-Phases-Additional.md) — Phase 10〜12（追加計画フェーズ）
- [Development Plan Schedule Notes](Development-Plan-Schedule-Notes.md) — スケジュール目安・実装時の判断メモ(§6, §7)

> 各フェーズは「動く状態で完結」させ、フェーズ末ごとにVercelへデプロイして確認する方針で進めた。外部サービス（Supabase / Gemini / Google Cloud / Vercel）のセットアップはユーザー（Shoki）側の作業が必要な箇所があり、各フェーズのページに「ユーザー作業」として明記している。
