"use client";

import { useState, useTransition } from "react";
import { logWorkout } from "@/app/(user)/home/actions";
import { WORKOUT_LIMITS, validateWorkoutInput } from "@/lib/workout-limits";

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

const CIRCLED_NUMBERS = "①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳";

function circledNumber(index: number): string {
  return CIRCLED_NUMBERS[index] ?? `${index + 1}`;
}

function toNumberOrNull(value: string): number | null {
  if (value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** ラベル＋入力欄＋単位の1フィールド（例：「セット： [3] セット」） */
function NumberField({
  label,
  unit,
  value,
  onChange,
  min,
  max,
  step,
  inputMode,
}: {
  label: string;
  unit: string;
  value: number | null;
  onChange: (value: number | null) => void;
  min: number;
  max: number;
  step: number;
  inputMode: "numeric" | "decimal";
}) {
  return (
    <label className="flex items-center gap-1.5">
      <span className="w-11 shrink-0 text-xs text-navy-500">{label}：</span>
      <input
        type="number"
        inputMode={inputMode}
        min={min}
        max={max}
        step={step}
        value={value ?? ""}
        onChange={(e) => onChange(toNumberOrNull(e.target.value))}
        className="w-full min-w-0 rounded-lg border border-navy-200 px-2 py-1.5 text-center text-sm text-navy-800 focus:border-navy-500 focus:outline-none"
      />
      <span className="w-9 shrink-0 text-xs text-navy-500">{unit}</span>
    </label>
  );
}

function ExerciseCard({
  exercise,
  index,
  performedOn,
}: {
  exercise: TodayExercise;
  index: number;
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

    const input = { setsDone, repsDone, weightKg, durationMin };
    const validationError = validateWorkoutInput(input);
    if (validationError) {
      setError(validationError);
      return;
    }

    startTransition(async () => {
      try {
        await logWorkout({
          planItemId: exercise.planItemId,
          performedOn,
          ...input,
        });
        setIsLogged(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "記録に失敗しました。");
      }
    });
  }

  const plannedParts = [
    exercise.plannedSets ? `${exercise.plannedSets}セット` : null,
    exercise.plannedReps ? `${exercise.plannedReps}回` : null,
    exercise.plannedWeightKg ? `${exercise.plannedWeightKg}kg` : null,
  ].filter(Boolean);
  const plannedText =
    plannedParts.join(" × ") +
    (exercise.plannedDurationMin ? ` ${exercise.plannedDurationMin}分` : "");

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-navy-800">
          トレーニング{circledNumber(index)}：{exercise.exerciseName}
        </p>
        {isLogged && (
          <span className="shrink-0 rounded-full bg-accent-teal/10 px-2 py-0.5 text-xs font-medium text-accent-teal">
            記録済み
          </span>
        )}
      </div>
      {plannedText && (
        <p className="mt-1 text-xs text-navy-400">本来の予定：{plannedText}</p>
      )}

      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
        <NumberField
          label="セット"
          unit="セット"
          value={setsDone}
          onChange={setSetsDone}
          min={WORKOUT_LIMITS.sets.min}
          max={WORKOUT_LIMITS.sets.max}
          step={1}
          inputMode="numeric"
        />
        <NumberField
          label="回数"
          unit="回"
          value={repsDone}
          onChange={setRepsDone}
          min={WORKOUT_LIMITS.reps.min}
          max={WORKOUT_LIMITS.reps.max}
          step={1}
          inputMode="numeric"
        />
        <NumberField
          label="重量"
          unit="kg"
          value={weightKg}
          onChange={setWeightKg}
          min={WORKOUT_LIMITS.weightKg.min}
          max={WORKOUT_LIMITS.weightKg.max}
          step={0.5}
          inputMode="decimal"
        />
        <NumberField
          label="時間"
          unit="分"
          value={durationMin}
          onChange={setDurationMin}
          min={WORKOUT_LIMITS.durationMin.min}
          max={WORKOUT_LIMITS.durationMin.max}
          step={1}
          inputMode="numeric"
        />
      </div>

      {error && <p className="mt-2 text-xs text-accent-coral">{error}</p>}
      <button
        type="button"
        onClick={handleSave}
        disabled={isPending}
        className="mt-3 w-full rounded-lg bg-navy-700 px-3 py-2 text-xs font-medium text-white hover:bg-navy-600 disabled:opacity-60"
      >
        {isPending ? "保存中..." : isLogged ? "更新する" : "保存する"}
      </button>
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
      {exercises.map((exercise, index) => (
        <ExerciseCard
          key={exercise.planItemId}
          exercise={exercise}
          index={index}
          performedOn={performedOn}
        />
      ))}
    </div>
  );
}
