# Sporive 要件定義書

> **現行仕様との差分（2026-10-04時点）**：本書は策定時の決定事項を章ごとに保持している。以降の変更は [CHANGELOG](CHANGELOG.md) が最新で、特に次の点は本文より優先される。
> - ログイン・サインアップ・パスワード再設定・MFA・パスキー・アカウント削除は `auth.saka2931.jp` に一元化（[Requirements Auth](Requirements-Auth.md) 参照）。マジックリンクは廃止
> - 機能フラグ・お知らせ・お問い合わせは `saka2931-infra`（adac）へ移行
> - 定期・緊急メンテナンスはトップページを含め `/maintenance` の画面をHTTP 503で返す（[Requirements Notifications](Requirements-Notifications.md) §8-3）
> - 独自の404・500・メンテナンス画面を追加

要件定義書は以下のページに分割しています。各ページが章単位に対応します。

- [Requirements Overview](Requirements-Overview.md) — プロジェクト概要・対象ユーザー(§1, §2)
- [Requirements Tech Stack](Requirements-Tech-Stack.md) — 技術構成(§3)
- [Requirements Auth](Requirements-Auth.md) — アカウント・認証機能(§4, §4-1)
- [Requirements AI Proposal](Requirements-AI-Proposal.md) — AIトレーニング計画提案機能(§5, §5-1)
- [Requirements Progress Debts](Requirements-Progress-Debts.md) — 進捗管理・負債管理(§6, §7)
- [Requirements Notifications](Requirements-Notifications.md) — 通知機能(§8)
- [Requirements UI](Requirements-UI.md) — 画面構成・UI要件(§9)
- [Requirements Admin](Requirements-Admin.md) — 管理者画面(§10)
- [Requirements Design Schedule](Requirements-Design-Schedule.md) — デザイン方針・開発スケジュール(§11, §12)
- [Requirements SEO Analytics](Requirements-SEO-Analytics.md) — SEO・アクセス解析(§13)
- [Requirements Future Work](Requirements-Future-Work.md) — 今後の検討事項(§14)

更新履歴(旧§15)は [CHANGELOG](CHANGELOG.md) に統合しました。

作成日：2026年7月5日

> **本ドキュメントについて**：この要件定義書は、開発時にClaude Codeへ渡して実装を進めるための仕様書を兼ねています。実装時は各ページの決定事項に従い、[CHANGELOG](CHANGELOG.md) が最新の変更内容です。「今後の検討事項」ページは未確定のため、実装時に判断が必要な場合はユーザー(Shoki)に確認してください。
