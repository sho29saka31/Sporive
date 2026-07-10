/**
 * 運動強度の妥当性検証の閾値定義（Phase 8）。
 *
 * ルールベースの上限値を年齢層別に定義する。値を調整したい場合はこのファイルのみを
 * 変更すればよい（判定ロジックは src/lib/intensity.ts）。
 * 将来のAIダブルチェック追加を見据え、判定基準はコードから分離して管理する。
 */

export type AgeBandThreshold = {
  /** この年齢層の下限（歳、この値を含む） */
  minAge: number;
  /** この年齢層の上限（歳、この値を含む）。上限なしは Infinity */
  maxAge: number;
  /** 表示用の層名 */
  label: string;
  /** 1種目あたりの重量上限（kg） */
  maxWeightKg: number;
  /** 1種目あたりのセット数上限 */
  maxSets: number;
  /** 1セットあたりの回数上限 */
  maxReps: number;
  /** 1日の合計運動時間の上限（分） */
  maxDailyDurationMin: number;
  /** 週あたりの負荷増加率の上限（前週比。1.10 = +10%まで） */
  maxWeeklyIncreaseRate: number;
};

export const INTENSITY_THRESHOLDS: AgeBandThreshold[] = [
  {
    minAge: 0,
    maxAge: 17,
    label: "ジュニア（〜17歳）",
    maxWeightKg: 60,
    maxSets: 5,
    maxReps: 20,
    maxDailyDurationMin: 120,
    maxWeeklyIncreaseRate: 1.05,
  },
  {
    minAge: 18,
    maxAge: 39,
    label: "一般（18〜39歳）",
    maxWeightKg: 200,
    maxSets: 8,
    maxReps: 30,
    maxDailyDurationMin: 180,
    maxWeeklyIncreaseRate: 1.1,
  },
  {
    minAge: 40,
    maxAge: 64,
    label: "ミドル（40〜64歳）",
    maxWeightKg: 140,
    maxSets: 6,
    maxReps: 25,
    maxDailyDurationMin: 150,
    maxWeeklyIncreaseRate: 1.08,
  },
  {
    minAge: 65,
    maxAge: Infinity,
    label: "シニア（65歳〜）",
    maxWeightKg: 60,
    maxSets: 4,
    maxReps: 20,
    maxDailyDurationMin: 90,
    maxWeeklyIncreaseRate: 1.05,
  },
];
