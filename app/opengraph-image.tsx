import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt =
  "PraxisVet — Software de gestión veterinaria para clínicas chilenas";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function loadFont(weight: 500 | 800): Promise<ArrayBuffer | null> {
  try {
    const cssRes = await fetch(
      `https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@${weight}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        },
      }
    );
    const css = await cssRes.text();
    const url = css.match(/src:\s*url\((.+?)\)\s*format/)?.[1];
    if (!url) return null;
    const fontRes = await fetch(url);
    return await fontRes.arrayBuffer();
  } catch {
    return null;
  }
}

export default async function OpenGraphImage() {
  const [medium, bold] = await Promise.all([loadFont(500), loadFont(800)]);

  const fonts = [
    medium && {
      name: "Plus Jakarta Sans",
      data: medium,
      style: "normal" as const,
      weight: 500 as const,
    },
    bold && {
      name: "Plus Jakarta Sans",
      data: bold,
      style: "normal" as const,
      weight: 800 as const,
    },
  ].filter(Boolean) as Array<{
    name: string;
    data: ArrayBuffer;
    style: "normal";
    weight: 500 | 800;
  }>;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background:
            "linear-gradient(135deg, #061a10 0%, #0b2a1c 55%, #0f3a26 100%)",
          fontFamily: "Plus Jakarta Sans, sans-serif",
          color: "#f0fdf4",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "#4ade80",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 34,
              fontWeight: 800,
              color: "#062013",
            }}
          >
            P
          </div>
          <div
            style={{
              fontSize: 38,
              fontWeight: 800,
              letterSpacing: "-0.02em",
            }}
          >
            PraxisVet
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              fontSize: 72,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
              color: "#f0fdf4",
              maxWidth: 900,
            }}
          >
            Software veterinario para clínicas chilenas
          </div>
          <div
            style={{
              fontSize: 30,
              fontWeight: 500,
              color: "#a7f3d0",
              letterSpacing: "-0.01em",
            }}
          >
            Agenda · Ficha clínica · Peluquería · SII · Inventario
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 22,
            color: "#86efac",
            fontWeight: 500,
          }}
        >
          <div>praxisvet.cl</div>
          <div>Hecho en Chile</div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts,
    }
  );
}
