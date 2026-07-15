import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "プライバシーポリシー",
  robots: { index: true, follow: true },
};

const UPDATED_AT = "2026年7月7日";
const CONTACT_EMAIL = "deskside31@gmail.com";

/**
 * プライバシーポリシー。ログイン不要で誰でも閲覧できる（Google OAuth同意画面のリンク先要件）。
 */
export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-12 text-sm leading-relaxed text-navy-800">
      <h1 className="text-2xl font-bold text-navy-900">
        プライバシーポリシー
      </h1>
      <p className="mt-2 text-navy-400">最終更新日：{UPDATED_AT}</p>

      <p className="mt-6">
        Sporive（以下「本サービス」）は、開発者（以下「開発者」）が個人で開発・運営するAIパーソナライズトレーニング計画提案アプリです。本ポリシーは、本サービスが取得する利用者情報の取り扱いについて説明します。
      </p>

      <h2 className="mt-8 text-lg font-bold text-navy-900">
        1. 取得する情報
      </h2>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>Googleアカウント情報（メールアドレス、表示名）</li>
        <li>
          パスワード（Supabase
          Authにより安全にハッシュ化して保存され、開発者を含め平文では保存されません）
        </li>
        <li>プロフィール情報（表示名、生年、トレーニングの目標）</li>
        <li>
          トレーニング計画・実績記録（セット数、重量、回数、トレーニング時間・頻度）
        </li>
        <li>
          Googleカレンダーへのアクセス許可を得た場合のアクセストークン（空き時間の取得・予定の追加に使用）
        </li>
        <li>Web Push通知の購読情報（通知の送信に使用）</li>
      </ul>

      <h2 className="mt-8 text-lg font-bold text-navy-900">
        2. 利用目的
      </h2>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>AIによるパーソナライズされたトレーニング計画の提案</li>
        <li>進捗の記録・可視化、連続達成記録の表示</li>
        <li>Googleカレンダーとの予定連携</li>
        <li>トレーニング予定・未達成分のリマインダー通知の送信</li>
        <li>サービス改善のための統計的な利用状況分析（個人を特定しない形）</li>
      </ul>

      <h2 className="mt-8 text-lg font-bold text-navy-900">
        3. 第三者サービスの利用
      </h2>
      <p className="mt-2">
        本サービスは以下の外部サービスを利用しており、目的の達成に必要な範囲でこれらのサービスに情報が送信されます。
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>
          <strong>Supabase</strong>：アカウント認証およびデータベース（進捗・計画データ等の保存）
        </li>
        <li>
          <strong>Google Gemini API</strong>
          ：トレーニング計画提案の生成（目標・プロフィール等の情報を送信します）
        </li>
        <li>
          <strong>Google Calendar API</strong>
          ：カレンダーの空き時間取得・予定の追加（許可した場合のみ）
        </li>
        <li>
          <strong>Vercel</strong>：本サービスのホスティング
        </li>
      </ul>

      <h2 className="mt-8 text-lg font-bold text-navy-900">
        4. 第三者提供
      </h2>
      <p className="mt-2">
        法令に基づく場合を除き、取得した情報を上記以外の第三者に販売・提供することはありません。
      </p>

      <h2 className="mt-8 text-lg font-bold text-navy-900">
        5. データの保存期間・削除
      </h2>
      <p className="mt-2">
        取得した情報は、本サービスの提供に必要な期間保存します。アカウントの削除をご希望の場合は、下記の連絡先までご連絡ください。開発者が確認のうえ、関連データを削除します。
      </p>

      <h2 className="mt-8 text-lg font-bold text-navy-900">
        6. Cookie等の利用
      </h2>
      <p className="mt-2">
        本サービスは、ログイン状態を維持するための認証用Cookieのみを使用します。広告配信を目的としたトラッキングは行いません。
      </p>

      <h2 className="mt-8 text-lg font-bold text-navy-900">
        7. 本ポリシーの変更
      </h2>
      <p className="mt-2">
        本ポリシーの内容は、法令の変更やサービス内容の変更に応じて改定される場合があります。重要な変更がある場合は、本サービス内で通知します。
      </p>

      <h2 className="mt-8 text-lg font-bold text-navy-900">
        8. お問い合わせ
      </h2>
      <p className="mt-2">
        本ポリシーに関するお問い合わせは、下記までご連絡ください。
        <br />
        メールアドレス：{CONTACT_EMAIL}
      </p>
    </div>
  );
}
