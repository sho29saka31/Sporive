import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // next/imageの最適化APIを経由するとwebpに変換され、右クリック/長押しの
    // 「画像を保存」「新しいタブで画像を開く」がwebpになってしまう（png/jpgとして
    // 開けない）。ロゴ等はすべて元から軽量な静的画像のため、最適化を無効化して
    // 元ファイルをそのまま配信する
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
