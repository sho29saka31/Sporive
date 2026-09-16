"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { parseUA } from "@/lib/browserInfo";

/**
 * この端末をauth_app.sessionsに登録・監視するためのlocalStorageキー。
 * authアプリ自身の登録（auth.saka2931.jpのlocalStorage）とはオリジンが異なり
 * 共有されないため、Sporive自身でも同じ仕組みを持つ必要がある
 * （authの`account/devices`でSporive経由のこの端末を個別に確認・強制ログアウトできるようにする）。
 */
const SESSION_KEY = "sporive-auth-session-id";
const POLL_INTERVAL_MS = 60_000;

async function registerSession(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<void> {
  try {
    let sid = localStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = crypto.randomUUID();
      localStorage.setItem(SESSION_KEY, sid);
    }
    const ua = parseUA();
    const { error } = await supabase.schema("auth_app").from("sessions").upsert({
      id: sid,
      user_id: userId,
      app: "sporive",
      browser: ua.browser,
      os: ua.os,
      device: ua.device,
      last_active: new Date().toISOString(),
    });
    if (error) console.error("Failed to register session", error);
  } catch (error) {
    console.error("Failed to register session", error);
  }
}

/**
 * 強制ログアウト検知時、この端末のPush購読を先に解除してからサインアウトする
 * （そうしないと、セッションを切ってもプッシュ通知だけは端末に届き続けてしまう）。
 * 旧`signOutEverywhere`が担っていた役割を、個別端末の強制ログアウトに合わせて移植したもの。
 */
async function cleanupAndSignOut(
  supabase: ReturnType<typeof createClient>,
  sid: string
): Promise<void> {
  localStorage.removeItem(SESSION_KEY);
  try {
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/notifications/subscribe", {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        }).catch(() => {});
        await subscription.unsubscribe().catch(() => {});
      }
    }
  } finally {
    await supabase.schema("auth_app").from("sessions").delete().eq("id", sid);
    await supabase.auth.signOut();
    window.location.replace("https://auth.saka2931.jp/login");
  }
}

// 他端末の「デバイス管理」からログアウトさせると、該当セッションのshould_logoutが
// trueになるので、それをSupabase Realtimeで監視して自動的にサインアウトする
// （authアプリのSessionWatcher.tsxと同じパターン）。
//
// RealtimeのWebSocketは切断されうるため、Realtimeを主経路としつつ、一定間隔で
// should_logoutを直接ポーリングするフォールバックを保険として併用する。
export default function PushCleanupWatcher() {
  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      channel?.unsubscribe();
      channel = null;
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }

      const user = session?.user;
      if (!user) return;

      void registerSession(supabase, user.id);
      const sid = localStorage.getItem(SESSION_KEY);
      if (!sid) return;

      pollTimer = setInterval(async () => {
        const { data } = await supabase
          .schema("auth_app")
          .from("sessions")
          .select("should_logout")
          .eq("id", sid)
          .maybeSingle();
        if (!cancelled && data?.should_logout === true) cleanupAndSignOut(supabase, sid);
      }, POLL_INTERVAL_MS);

      channel = supabase
        .channel(`sporive-session-watch-${sid}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "auth_app", table: "sessions", filter: `id=eq.${sid}` },
          (payload) => {
            if (payload.new.should_logout === true) cleanupAndSignOut(supabase, sid);
          }
        )
        .subscribe();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      channel?.unsubscribe();
      if (pollTimer) clearInterval(pollTimer);
    };
  }, []);

  return null;
}
