import type { MetadataRoute } from "next";

/**
 * 公開ページ（/, /terms, /privacy）以外はログイン必須のアプリ内画面のため、
 * クロールバジェットの節約と念のための二重対策としてrobots.txtでも除外する
 * （実際のインデックス制御は各ページのmetadata.robotsで行う）。
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/terms", "/privacy"],
      disallow: [
        "/home",
        "/schedule",
        "/progress",
        "/menu",
        "/debts",
        "/settings",
        "/admin",
        "/api",
        "/onboarding",
        "/login",
        "/signup",
        "/reset-password",
        "/auth",
      ],
    },
    host: "https://sporive.vercel.app",
  };
}
