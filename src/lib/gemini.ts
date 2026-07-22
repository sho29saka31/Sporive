import { GoogleGenAI, Type } from "@google/genai";
import type { GenderType } from "@/types/database";

function getModel(): string {
  const model = process.env.GEMINI_MODEL;
  if (!model) {
    throw new Error("GEMINI_MODEL が設定されていません。");
  }
  return model;
}

/** シニア判定の年齢閾値。65歳以上を「低強度中心」の対象とする */
const SENIOR_AGE_THRESHOLD = 65;

const GENDER_LABELS: Record<GenderType, string> = {
  male: "男性",
  female: "女性",
  other: "その他",
};

export interface PlanItemDraft {
  dayOfWeek: number; // 0=日曜 ... 6=土曜
  exerciseName: string;
  category: string | null;
  sets: number | null;
  reps: number | null;
  weightKg: number | null;
  durationMin: number | null;
}

export interface WeeklyPlanDraft {
  summary: string;
  items: PlanItemDraft[];
}

const planItemSchema = {
  type: Type.OBJECT,
  properties: {
    dayOfWeek: {
      type: Type.INTEGER,
      description: "0=日曜, 1=月曜, ..., 6=土曜",
    },
    exerciseName: { type: Type.STRING },
    category: { type: Type.STRING },
    sets: { type: Type.INTEGER },
    reps: { type: Type.INTEGER },
    weightKg: { type: Type.NUMBER },
    durationMin: { type: Type.INTEGER },
  },
  required: ["dayOfWeek", "exerciseName"],
};

const weeklyPlanSchema = {
  type: Type.OBJECT,
  properties: {
    summary: {
      type: Type.STRING,
      description: "計画全体の方針を1〜2文で説明する日本語の要約",
    },
    items: {
      type: Type.ARRAY,
      items: planItemSchema,
    },
  },
  required: ["summary", "items"],
};

function isSenior(birthYear: number): boolean {
  const age = new Date().getFullYear() - birthYear;
  return age >= SENIOR_AGE_THRESHOLD;
}

function buildProfileContext(params: {
  birthYear: number;
  goal: string;
  gender?: GenderType | null;
  weeklyFrequency: number;
}): string {
  const { birthYear, goal, gender, weeklyFrequency } = params;
  const age = new Date().getFullYear() - birthYear;
  const senior = isSenior(birthYear);

  const lines = [
    `年齢: ${age}歳`,
    `目標: ${goal}`,
    `希望トレーニング頻度: 週${weeklyFrequency}日`,
  ];

  if (gender) {
    lines.splice(1, 0, `性別: ${GENDER_LABELS[gender]}`);
  }

  if (senior) {
    lines.push(
      "この利用者はシニア層（65歳以上）です。関節への負担が少ない低強度の運動を中心に、" +
        "筋力維持・向上を目的とした無理のないメニューを提案してください。" +
        "急激な負荷増加や高強度なメニューは避けてください。"
    );
  }

  return lines.join("\n");
}

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY が設定されていません。");
  }
  return new GoogleGenAI({ apiKey });
}

/** プロフィール・希望頻度から週間トレーニング計画を新規生成する */
export async function generateWeeklyPlan(params: {
  birthYear: number;
  goal: string;
  gender?: GenderType | null;
  weeklyFrequency: number;
  /** Googleカレンダーの忙しい時間帯の要約（Phase 6。連携済みの場合のみ） */
  calendarContext?: string | null;
}): Promise<WeeklyPlanDraft> {
  const ai = getClient();
  const profileContext = buildProfileContext(params);

  const calendarSection = params.calendarContext
    ? "\n\n今週のGoogleカレンダーに登録されている予定（忙しい時間帯）:\n" +
      params.calendarContext +
      "\n予定が多く忙しい日はできるだけ避け、予定の少ない日にトレーニングを配置してください。"
    : "";

  const response = await ai.models.generateContent({
    model: getModel(),
    contents: [
      {
        role: "user",
        parts: [
          {
            text:
              "あなたはパーソナルトレーナーです。以下の利用者プロフィールに基づき、" +
              "1週間分（日曜〜土曜、dayOfWeekは0〜6）のトレーニング計画をJSONで提案してください。" +
              "希望頻度の日数分だけ items に運動を含む日を設定し、それ以外の日は該当する項目を含めないでください。" +
              "各運動には種目名・セット数・回数・重量(kg)・時間(分)のうち妥当なものを設定してください" +
              "（有酸素運動など重量が不要な種目は weightKg を省略してよい）。" +
              "性別の情報がある場合は、一般的な体力特性を踏まえた種目選定・強度設定の参考にしてください。\n\n" +
              profileContext +
              calendarSection,
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: weeklyPlanSchema,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Gemini APIから応答が得られませんでした。");
  }
  return JSON.parse(text) as WeeklyPlanDraft;
}

/** 未消化の負債に対するリカバリー提案（Phase 7）。短い日本語アドバイスを返す */
export async function generateRecoveryAdvice(params: {
  birthYear: number;
  goal: string;
  gender?: GenderType | null;
  debtLines: string[]; // 「スクワット：+2セット×10回（7/9未達成）」等
}): Promise<string> {
  const ai = getClient();
  const profileContext = buildProfileContext({
    ...params,
    weeklyFrequency: 3,
  });

  const response = await ai.models.generateContent({
    model: getModel(),
    contents: [
      {
        role: "user",
        parts: [
          {
            text:
              "あなたはパーソナルトレーナーです。利用者に以下の未消化のトレーニング（負債）があります。" +
              "無理なく数日以内に取り返すための現実的なリカバリー案を、日本語で3〜5文の簡潔なアドバイスとして提案してください。" +
              "1日に詰め込みすぎず、体への負担と継続しやすさを重視してください。\n\n" +
              profileContext +
              "\n\n未消化の負債:\n" +
              params.debtLines.join("\n"),
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          advice: {
            type: Type.STRING,
            description: "リカバリー案のアドバイス（日本語、3〜5文）",
          },
        },
        required: ["advice"],
      },
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Gemini APIから応答が得られませんでした。");
  }
  return (JSON.parse(text) as { advice: string }).advice;
}

/** 利用者が登録しようとしている計画に対する改善案を提示する */
export async function generateImprovementSuggestion(params: {
  birthYear: number;
  goal: string;
  gender?: GenderType | null;
  currentPlan: WeeklyPlanDraft;
}): Promise<WeeklyPlanDraft> {
  const ai = getClient();
  const profileContext = buildProfileContext({
    ...params,
    weeklyFrequency: new Set(params.currentPlan.items.map((i) => i.dayOfWeek))
      .size,
  });

  const response = await ai.models.generateContent({
    model: getModel(),
    contents: [
      {
        role: "user",
        parts: [
          {
            text:
              "あなたはパーソナルトレーナーです。利用者が以下のトレーニング計画を登録しようとしています。" +
              "この計画をレビューし、より効果的・安全になるよう改善案をJSONで提案してください。" +
              "大幅な変更は避け、妥当な範囲での調整（強度・バランス・休養日の配置など）にとどめてください。\n\n" +
              profileContext +
              "\n\n現在の計画:\n" +
              JSON.stringify(params.currentPlan),
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: weeklyPlanSchema,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Gemini APIから応答が得られませんでした。");
  }
  return JSON.parse(text) as WeeklyPlanDraft;
}

/**
 * 利用者がプロフィール画面で自由記述した目標・要望を、AI提案で使いやすい
 * 簡潔な日本語の文章に整形する。内容の追加・脚色はせず、書かれた要望
 * （大きくしたい部位など）はできるだけ保持する。
 */
export async function summarizeGoal(rawText: string): Promise<string> {
  const ai = getClient();

  const response = await ai.models.generateContent({
    model: getModel(),
    contents: [
      {
        role: "user",
        parts: [
          {
            text:
              "以下は利用者が自由に書いたトレーニングの目標・要望です。" +
              "後でパーソナルトレーナーAIがトレーニング計画を作成する際の参考情報として使えるよう、" +
              "内容を保ったまま100〜150文字程度の簡潔な日本語の文章に整えてください。" +
              "大きくしたい部位や重視したい点など、具体的な要望はできるだけ残してください。" +
              "元の文章にない情報を勝手に追加しないでください。\n\n" +
              `利用者の入力:\n${rawText}`,
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: {
            type: Type.STRING,
            description: "整形後のトレーニング目標（日本語）",
          },
        },
        required: ["summary"],
      },
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Gemini APIから応答が得られませんでした。");
  }
  return (JSON.parse(text) as { summary: string }).summary;
}
