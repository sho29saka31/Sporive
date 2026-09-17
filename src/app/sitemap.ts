import type { MetadataRoute } from "next";

const BASE_URL = "https://sporive.saka2931.jp";

/** 検索エンジンへの公開対象ページ（metadata.robotsでindex:trueにしているものと一致させる） */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    { url: `${BASE_URL}/`, lastModified, changeFrequency: "monthly", priority: 1 },
  ];
}
