"use client";

import { useState, useTransition } from "react";
import { logWorkout } from "@/app/(user)/home/actions";

export interface TodayExercise {
  planItemId: string;
  exerciseName: string;
  plannedSets: number | null;
  plannedReps: number | null;
  plannedWeightKg: number | null;
  plannedDurationMin: number | null;
  loggedSetsDone: number | null;
  loggedRepsDone: number | null;
  loggedWeightKg: number | null;
  loggedDurationMin: number | null;
  isLogged: boolean;
}

function toNumberOrNull(value: string): number | null {
  if (value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function ExerciseCard({
  exercise,
  performedOn,
}: {
  exercise: TodayExercise;
  performedOn: string;
}) {
  const [isLogged, setIsLogged] = useState(exercise.isLogged);
  const [setsDone, setSetsDone] = useState(
    exercise.loggedSetsDone ?? exercise.plannedSets
  );
  const [repsDone, setRepsDone] = useState(
    exercise.loggedRepsDone ?? exercise.plannedReps
  );
  const [weightKg, setWeightKg] = useState(
    exercise.loggedWeightKg ?? exercise.plannedWeightKg
  );
  const [durationMin, setDurationMin] = useState(
    exercise.loggedDurationMin ?? exercise.plannedDurationMin
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setError(null);
    startTransition(async () => {
      try {
        await logWorkout({
          planItemId: exercise.planItemId,
          performedOn,
          setsDone,
          repsDone,
          weightKg,
          durationMin,
        });
        setIsLogged(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "記録に失敗しました。");
      }
    });
  }

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-navy-800">
          {exercise.exerciseName}
        </p>
        {isLogged && (
          <span className="rounded-full bg-accent-teal/10 px-2 py-0.5 text-xs font-medium text-accent-teal">
            記録済み
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-navy-400">
        予定：
        {exercise.plannedSets ? `${exercise.plannedSets}セット` : ""}
        {exercise.plannedReps ? ` × ${exercise.plannedReps}回` : ""}
        {exercise.plannedWeightKg ? ` × ${exercise.plannedWeightKg}kg` : ""}
        {exercise.plannedDurationMin ? ` ${exercise.plannedDurationMin}分` : ""}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-1">
        <input
          type="number"
          placeholder="セット"
          value={setsDone ?? ""}
          onChange={(e) => setSetsDone(toNumberOrNull(e.target.value))}
          className="w-16 rounded border border-navy-200 px-2 py-1 text-xs"
        />
        <input
          type="number"
          placeholder="回数"
          value={repsDone ?? ""}
          onChange={(e) => setRepsDone(toNumberOrNull(e.target.value))}
          className="w-16 rounded border border-navy-200 px-2 py-1 text-xs"
        />
        <input
          type="number"
          placeholder="重量kg"
          value={weightKg ?? ""}
          onChange={(e) => setWeightKg(toNumberOrNull(e.target.value))}
          className="w-16 rounded border border-navy-200 px-2 py-1 text-xs"
        />
        <input
          type="number"
          placeholder="分"
          value={durationMin ?? ""}
          onChange={(e) => setDurationMin(toNumberOrNull(e.target.value))}
          className="w-16 rounded border border-navy-200 px-2 py-1 text-xs"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="ml-auto rounded-lg bg-navy-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-navy-600 disabled:opacity-60"
        >
          {isPending ? "保存中..." : isLogged ? "更新する" : "記録する"}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-accent-coral">{error}</p>}
    </div>
  );
}

export default function WorkoutLogger({
  exercises,
  performedOn,
}: {
  exercises: TodayExercise[];
  performedOn: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      {exercises.map((exercise) => (
        <ExerciseCard
          key={exercise.planItemId}
          exercise={exercise}
          performedOn={performedOn}
        />
      ))}
    </div>
  );
}
