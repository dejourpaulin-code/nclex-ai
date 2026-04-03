import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: "linear-gradient(135deg, #1e3a5f 0%, #f97316 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontSize: 20,
          fontWeight: 900,
          fontFamily: "sans-serif",
        }}
      >
        N
      </div>
    ),
    { ...size }
  );
}
