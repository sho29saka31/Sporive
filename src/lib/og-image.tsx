import { readFileSync } from "fs";
import { join } from "path";

const ICON_DATA_URL = `data:image/png;base64,${readFileSync(
  join(process.cwd(), "public/icons/icon-512.png")
).toString("base64")}`;

/** OGP画像（opengraph-image.tsx）で共有するJSX生成ヘルパー */
export function renderOgImageContent(subtitle: string) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#132338",
        color: "#ffffff",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse(satori)はnext/imageを使えないため通常のimgが必要 */}
        <img
          src={ICON_DATA_URL}
          width={96}
          height={96}
          style={{ borderRadius: 24 }}
          alt=""
        />
        <div style={{ display: "flex", fontSize: 88, fontWeight: 700 }}>
          Sporive
        </div>
      </div>
      <div style={{ display: "flex", marginTop: 32, fontSize: 32, color: "#bae6fd" }}>
        {subtitle}
      </div>
    </div>
  );
}

export const OG_IMAGE_SIZE = { width: 1200, height: 630 };
export const OG_IMAGE_CONTENT_TYPE = "image/png";
