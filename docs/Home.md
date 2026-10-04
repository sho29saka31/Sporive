# Sporive ドキュメント

AIがパーソナライズしたトレーニング計画を提案する、スマホ専用のフィットネスPWA（`sporive.saka2931.jp`）。

リポジトリの [README](../README.md) に収まらない詳細ドキュメントをここにまとめている。リポジトリの非公開化に伴い、Wikiで管理していたページ群をそのまま `docs/` に取り込んだ（[ADR](ADR.md) ADR-012）。ページ名はWiki時代と同じ。

> **現行仕様の見方**：要件定義書・開発プランは策定時の記録で、以降の変更は [CHANGELOG](CHANGELOG.md) が最新。実装済みの現在の姿は [Architecture](ARCHITECTURE.md)。ログイン・アカウント関連は `auth.saka2931.jp`（authリポジトリ）に移管済み。

## 目的別ガイド

| 目的 | ページ |
|---|---|
| 仕様の一次情報を知りたい | [Requirements](Requirements.md) |
| 現在のシステム構成を知りたい | [Architecture](ARCHITECTURE.md) |
| なぜそうなっているか | [ADR](ADR.md) / [CHANGELOG](CHANGELOG.md) |
| 環境を作る・外部サービスを設定する | [Setup](Setup.md) → [Environment](ENVIRONMENT.md) |
| リリースする | [Deployment](DEPLOYMENT.md) |
| 障害・問い合わせに対応する | [Runbook](RUNBOOK.md) |
| エンドポイントを調べる | [API](API.md) |
| 実装の経緯・フェーズ分割を知りたい | [Development Plan](Development-Plan.md) |

## ページ一覧

### 標準ドキュメント
| ドキュメント | 内容 |
|---|---|
| [Architecture](ARCHITECTURE.md) | システム構成・middlewareの流れ・設計判断 |
| [API](API.md) | Route Handlers・公開ルート・Server Actions・認証との境界 |
| [ADR](ADR.md) | Architecture Decision Records（ADR-001〜012） |
| [Changelog](CHANGELOG.md) | 変更履歴 |
| [Deployment](DEPLOYMENT.md) | デプロイ・マイグレーション適用・ロールバック |
| [Runbook](RUNBOOK.md) | 障害・トラブル対応手順 |
| [Environment](ENVIRONMENT.md) | 環境変数・関連外部サービス |

### 要件定義書（[Requirements](Requirements.md)）
[Overview](Requirements-Overview.md) / [Tech Stack](Requirements-Tech-Stack.md) / [Auth](Requirements-Auth.md) / [AI Proposal](Requirements-AI-Proposal.md) / [Progress & Debts](Requirements-Progress-Debts.md) / [Notifications](Requirements-Notifications.md) / [UI](Requirements-UI.md) / [Admin](Requirements-Admin.md) / [Design & Schedule](Requirements-Design-Schedule.md) / [SEO & Analytics](Requirements-SEO-Analytics.md) / [Future Work](Requirements-Future-Work.md)

### 開発プラン（[Development Plan](Development-Plan.md)）
[Overview](Development-Plan-Overview.md) / [Structure](Development-Plan-Structure.md) / [Phases: Demo](Development-Plan-Phases-Demo.md) / [Phases: Trial](Development-Plan-Phases-Trial.md) / [Phases: Additional](Development-Plan-Phases-Additional.md) / [Schedule & Notes](Development-Plan-Schedule-Notes.md)

### セットアップ（[Setup](Setup.md)）
[Supabase](Setup-Supabase.md) / [Google OAuth](Setup-Google-OAuth.md)（履歴） / [Verification](Setup-Verification.md) / [Security Hardening](Setup-Security-Hardening.md) / [Vercel](Setup-Vercel.md) / [Google AI Studio](Setup-Google-AI-Studio.md) / [Analytics & Search Console](Setup-Analytics-Search-Console.md)

## 更新の作法

- 仕様を変えたら該当する Requirements ページを更新し、**必ず [CHANGELOG](CHANGELOG.md) に追記**する（旧§15の運用を引き継ぐ）
- 構成・設計判断が変わったら Architecture / ADR も更新する
- 他リポジトリ（auth / adac / legal-life）に影響する変更は、そちらの `docs/` も確認する
