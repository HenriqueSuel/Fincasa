import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0B0D10",
          fontFamily: "system-ui, sans-serif",
          fontSize: 110,
          fontWeight: 700,
          color: "#10B981",
        }}
      >
        F
      </div>
    ),
    size,
  );
}
