import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type SubscribeBody = {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
};

/**
 * 現在ログイン中の利用者が、指定したendpoint（ブラウザのPush購読）の
 * 所有者かどうかを確認する。家族共有端末等でアカウントを切り替えた際に、
 * ブラウザ側に前の利用者の購読が残ったまま「通知は有効です」と誤表示され、
 * 別の利用者が意図せず他人の購読状態を操作してしまう問題を避けるために使う
 * （ブラウザのPushManager.getSubscription()はオリジン単位で、ログイン中の
 * アカウントとは無関係なため）。
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const endpoint = new URL(request.url).searchParams.get("endpoint");
  if (!endpoint) {
    return NextResponse.json({ error: "invalid_subscription" }, { status: 400 });
  }

  const { data } = await supabase
    .from("push_subscriptions")
    .select("user_id")
    .eq("endpoint", endpoint)
    .maybeSingle();

  return NextResponse.json({ owned: data?.user_id === user.id });
}

/** Web Push 購読の登録（ブラウザの PushSubscription.toJSON() を受け取る） */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as SubscribeBody | null;
  const endpoint = body?.endpoint;
  const p256dh = body?.keys?.p256dh;
  const auth = body?.keys?.auth;
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "invalid_subscription" }, { status: 400 });
  }

  // 同一端末の再購読でendpointが変わることがあるため、endpoint単位でupsertする。
  // updated_atを明示的に更新することで、1年経過クリーンアップ（0024マイグレーション）が
  // 現役の購読を作成日基準で誤って削除しないようにする
  const payload = {
    user_id: user.id,
    endpoint,
    p256dh,
    auth,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(payload, { onConflict: "endpoint" });

  if (error) {
    // 家族共有端末等で、同じendpoint（ブラウザ購読）を既に別ユーザーが
    // 所有している場合、UPDATEポリシー（0021マイグレーション、
    // auth.uid() = user_id）に阻まれてここに来る。この場合、ブラウザ側の
    // endpointは端末側の事情で再取得が難しいため、拒否すると現在の利用者は
    // 通知を有効化する手段がなくなってしまう。所有者の付け替えとして、
    // service_roleで明示的に上書きする（前の所有者はこの端末を共有している
    // 別アカウントであり、以後この端末宛の通知は現在ログイン中の利用者のもの
    // として扱われる）
    const admin = createAdminClient();
    const { error: reassignError } = await admin
      .from("push_subscriptions")
      .upsert(payload, { onConflict: "endpoint" });

    if (reassignError) {
      return NextResponse.json({ error: "db_error" }, { status: 500 });
    }
  }
  return NextResponse.json({ ok: true });
}

/** Web Push 購読の解除 */
export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as SubscribeBody | null;
  const endpoint = body?.endpoint;
  if (!endpoint) {
    return NextResponse.json({ error: "invalid_subscription" }, { status: 400 });
  }

  const { count } = await supabase
    .from("push_subscriptions")
    .delete({ count: "exact" })
    .eq("user_id", user.id)
    .eq("endpoint", endpoint);

  return NextResponse.json({ ok: true, deleted: (count ?? 0) > 0 });
}
