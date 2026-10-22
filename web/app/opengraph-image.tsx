import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Provenant. Get paid when models train on you.";

export default async function OpenGraphImage() {
  const font = await readFile(join(process.cwd(), "public/fonts/InstrumentSerif-Regular.ttf"));
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          background: "#F6F3EE",
          color: "#0E1116",
          padding: "72px",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", fontSize: 22, letterSpacing: 3 }}>PROVENANT · PORTALDOT</div>
        <div style={{ display: "flex", fontFamily: "Instrument Serif", fontSize: 78, lineHeight: 1.02, maxWidth: 980 }}>
          Get paid when models train on you.
        </div>
        <div style={{ display: "flex", fontSize: 28, color: "#5C564E" }}>
          A sentence goes into a model. A proof comes back as a royalty.
        </div>
      </div>
    ),
    { fonts: [{ name: "Instrument Serif", data: font, style: "normal", weight: 400 }] },
  );
}
