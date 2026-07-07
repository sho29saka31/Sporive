import type { Metadata } from "next";

export const metadata: Metadata = { title: "利用規約" };

const UPDATED_AT = "2026年7月7日";
const CONTACT_EMAIL = "shokisakamoto@gmail.com";

/**
 * 利用規約。ログイン不要で誰でも閲覧できる（Google OAuth同意画面のリンク先要件）。
 */
export default function TermsOfServicePage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-12 text-sm leading-relaxed text-navy-800">
      <h1 className="text-2xl font-bold text-navy-900">利用規約</h1>
      <p className="mt-2 text-navy-400">最終更新日：{UPDATED_AT}</p>

      <p className="mt-6">
        本規約は、開発者が個人で開発・運営するAIパーソナライズトレーニング計画提案アプリ「Sporive」（以下「本サービス」）の利用条件を定めるものです。利用者は、本サービスを利用することで本規約に同意したものとみなされます。
      </p>

      <h2 className="mt-8 text-lg font-bold text-navy-900">
        第1条（本サービスの内容）
      </h2>
      <p className="mt-2">
        本サービスは、AI（Google Gemini
        API）を用いてトレーニング計画を提案するものであり、医療行為・医学的アドバイスを提供するものではありません。持病、既往症、ケガその他の健康上の懸念がある方は、トレーニングを開始する前に医師等の専門家にご相談ください。
      </p>

      <h2 className="mt-8 text-lg font-bold text-navy-900">
        第2条（アカウント）
      </h2>
      <p className="mt-2">
        利用者は、正確な情報でアカウントを登録するものとします。アカウント情報の管理は利用者の責任で行うものとし、第三者による不正利用について開発者は責任を負いません。
      </p>

      <h2 className="mt-8 text-lg font-bold text-navy-900">
        第3条（禁止事項）
      </h2>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>法令または公序良俗に違反する行為</li>
        <li>本サービスの運営を妨害する行為</li>
        <li>不正アクセスその他不正な方法によるサービス利用</li>
        <li>本サービスのリバースエンジニアリング、複製、改変</li>
        <li>他の利用者の情報を不正に取得・利用する行為</li>
      </ul>

      <h2 className="mt-8 text-lg font-bold text-navy-900">
        第4条（免責事項）
      </h2>
      <p className="mt-2">
        本サービスは無料プランの範囲内で提供される試験的なサービスであり、内容の正確性・完全性・可用性についていかなる保証も行いません。本サービスの利用により生じた損害について、開発者は一切の責任を負わないものとします。
      </p>

      <h2 className="mt-8 text-lg font-bold text-navy-900">
        第5条（サービスの変更・停止）
      </h2>
      <p className="mt-2">
        開発者は、利用者への事前の通知なく、本サービスの内容を変更し、または提供を停止・終了することがあります。
      </p>

      <h2 className="mt-8 text-lg font-bold text-navy-900">
        第6条（知的財産権）
      </h2>
      <p className="mt-2">
        本サービスに関する知的財産権は開発者に帰属します。利用者が入力したトレーニング記録等のデータの権利は利用者に帰属します。
      </p>

      <h2 className="mt-8 text-lg font-bold text-navy-900">
        第7条（準拠法）
      </h2>
      <p className="mt-2">本規約の解釈にあたっては、日本法を準拠法とします。</p>

      <h2 className="mt-8 text-lg font-bold text-navy-900">
        第8条（お問い合わせ）
      </h2>
      <p className="mt-2">
        本規約に関するお問い合わせは、下記までご連絡ください。
        <br />
        メールアドレス：{CONTACT_EMAIL}
      </p>
    </div>
  );
}
