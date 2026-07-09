"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";

type Status = "idle" | "processing" | "error";

const INVALID_LINK_MESSAGE =
  "リンクの有効期限が切れているか、無効なリンクです。もう一度メールの送信をお試しください。";

/**
 * Supabaseのパスワードリセット・マジックリンクメールは、リンククリック後に
 * `/login#access_token=...&refresh_token=...&type=recovery` のようなURLの
 * ハッシュフラグメントにトークンを付与してリダイレクトしてくる（implicit flow）。
 * ハッシュフラグメントはサーバーに送信されないため、middleware・Server Componentでは
 * 検知できず、クライアント側でこのコンポーネントが処理する必要がある。
 *
 * - type=recovery：パスワード再設定画面へ
 * - type=email_change：メールアドレス変更完了メッセージ付きでアカウント設定画面へ
 * - それ以外（magiclink等）：セッション確立のみ行いホームへ
 */
export default function AuthRecoveryHandler({
  children,
}: {
  children: ReactNode;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash || !hash.includes("access_token")) return;

    const params = new URLSearchParams(hash.slice(1));
    history.replaceState(null, "", window.location.pathname);

    async function processTokens() {
      const errorDescription = params.get("error_description");
      if (errorDescription) {
        setStatus("error");
        setErrorMessage(INVALID_LINK_MESSAGE);
        return;
      }

      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      if (!accessToken || !refreshToken) return;

      setStatus("processing");
      const supabase = createClient();
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (error) {
        setStatus("error");
        setErrorMessage(INVALID_LINK_MESSAGE);
        return;
      }

      const type = params.get("type");
      let destination = "/home";
      if (type === "recovery") {
        destination = "/signup/set-password?reason=reset";
      } else if (type === "email_change") {
        destination = "/settings/account?email_changed=1";
      }
      window.location.href = destination;
    }

    void processTokens();
  }, []);

  if (status === "processing") {
    return (
      <p className="text-center text-sm text-navy-400">
        認証情報を確認しています...
      </p>
    );
  }

  if (status === "error") {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-xs text-accent-coral">{errorMessage}</p>
        {children}
      </div>
    );
  }

  return <>{children}</>;
}
