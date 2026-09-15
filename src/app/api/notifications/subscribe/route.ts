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
    // auth.uid() = user_id）に阻まれてここに来る。
    //
    // endpointはリクエストボディ由来で完全にクライアント制御下にあるため、
    // ここで無条件にservice_role（RLS完全バイパス）で上書きすると、他人の
    // endpointを知り得た攻撃者がPOSTするだけでその購読の所有権を奪える
    // (コード監査で発見)。対象行の現在の所有者を確認し、「行が存在しない」
    // か「既に自分自身が所有者」の場合のみ付け替えを許可する。
    const admin = createAdminClient();
    const { data: existing } = await admin
      .from("push_subscriptions")
      .select("user_id")
      .eq("endpoint", endpoint)
      .maybeSingle();

    if (existing && existing.user_id !== user.id) {
      return NextResponse.json({ error: "endpoint_owned_by_other_user" }, { status: 409 });
    }

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
