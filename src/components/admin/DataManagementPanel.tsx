"use client";

import { useState, useTransition } from "react";
import {
  deleteAiProposalLogsData,
  deleteDebtsData,
  deleteNotificationLogsData,
  deleteTrainingData,
} from "@/app/admin/settings/actions";

type DataUser = { id: string; displayName: string };

type DataCategory = {
  key: string;
  label: string;
  description: string;
  action: (userId: string | null) => Promise<void>;
};

const CATEGORIES: DataCategory[] = [
  {
    key: "training",
    label: "トレーニング計画・実績",
    description:
      "週間トレーニング計画・実績記録（training_plans / plan_items / workout_logs）を削除します。",
    action: deleteTrainingData,
  },
  {
    key: "debts",
    label: "負債データ",
    description: "未消化・消化済みの負債記録（debts）を削除します。",
    action: deleteDebtsData,
  },
  {
    key: "ai_logs",
    label: "AI提案ログ",
    description:
      "AIによるプラン提案・改善提案の生成ログ（ai_proposal_logs）を削除します。",
    action: deleteAiProposalLogsData,
  },
  {
    key: "notification_logs",
    label: "通知履歴",
    description: "送信済みプッシュ通知の履歴（notification_logs）を削除します。",
    action: deleteNotificationLogsData,
  },
];

function CategoryCard({
  category,
  users,
}: {
  category: DataCategory;
  users: DataUser[];
}) {
  const [selectedUserId, setSelectedUserId] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function handleDeleteForUser() {
    if (!selectedUserId) return;
    const user = users.find((u) => u.id === selectedUserId);
    if (
      !window.confirm(
        `「${user?.displayName ?? "選択した利用者"}」の${category.label}をすべて削除します。この操作は取り消せません。よろしいですか？`
      )
    )
      return;
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      try {
        await category.action(selectedUserId);
        setSuccess("削除しました。");
      } catch {
        setError("削除に失敗しました。");
      }
    });
  }

  function handleDeleteAll() {
    if (
      !window.confirm(
        `全利用者の${category.label}をすべて削除します。この操作は取り消せません。よろしいですか？`
      )
    )
      return;
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      try {
        await category.action(null);
        setSuccess("削除しました。");
      } catch {
        setError("削除に失敗しました。");
      }
    });
  }

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <h3 className="text-sm font-bold text-navy-800">{category.label}</h3>
      <p className="mt-1 text-xs text-navy-400">{category.description}</p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <select
          value={selectedUserId}
          onChange={(e) => setSelectedUserId(e.target.value)}
          disabled={isPending}
          className="rounded-lg border border-navy-200 px-3 py-2 text-xs focus:border-navy-500 focus:outline-none"
        >
          <option value="">利用者を選択...</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.displayName}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleDeleteForUser}
          disabled={isPending || !selectedUserId}
          className="rounded-lg border border-accent-coral px-3 py-2 text-xs font-medium text-accent-coral hover:bg-accent-coral/10 disabled:opacity-50"
        >
          選択した利用者のデータを削除
        </button>
      </div>

      <div className="mt-3">
        <button
          type="button"
          onClick={handleDeleteAll}
          disabled={isPending}
          className="rounded-lg bg-accent-coral px-3 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? "削除中..." : "全利用者分をすべて削除"}
        </button>
      </div>

      {error && <p className="mt-2 text-[10px] text-accent-coral">{error}</p>}
      {success && (
        <p className="mt-2 text-[10px] text-accent-teal">{success}</p>
      )}
    </div>
  );
}

/**
 * データ管理タブ：カテゴリごとにトレーニング・負債・AI提案ログ・通知履歴を
 * 利用者単位／全利用者一括で削除する（ユーザー指示。高度な設定＝super-adminのみ表示）。
 * 削除は取り消せないため、実行前に必ず確認ダイアログを挟む。
 */
export default function DataManagementPanel({ users }: { users: DataUser[] }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs leading-relaxed text-navy-500">
        以下のデータは削除すると復元できません。テスト・デモ環境のリセットなど、目的を確認したうえで実行してください。
      </p>
      {CATEGORIES.map((c) => (
        <CategoryCard key={c.key} category={c} users={users} />
      ))}
    </div>
  );
}
