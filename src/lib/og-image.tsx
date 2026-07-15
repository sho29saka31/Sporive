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
        <div
          style={{
            display: "flex",
            width: 96,
            height: 96,
            borderRadius: 24,
            backgroundColor: "#38bdf8",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 56,
            fontWeight: 700,
            color: "#132338",
          }}
        >
          S
        </div>
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
