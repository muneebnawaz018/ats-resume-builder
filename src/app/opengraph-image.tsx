import { ImageResponse } from "next/og";

/**
 * The social card, rendered once at build time into a real PNG.
 *
 * A link with no image is a grey box in every feed and chat client it is
 * pasted into, which costs clicks that the page has already earned.
 */
/** Static export has no server to render this on request, bake the PNG. */
export const dynamic = "force-static";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt =
  "ATS Resume Builder: see your resume the way the software does";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#FFFFFF",
          padding: 72,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/*
            The brand mark, built from positioned divs rather than an <svg>.
            Satori renders this image at build time and supports only a subset
            of SVG, so boxes are the reliable way to get the same shape.
            Geometry is icon.svg's 32 unit grid scaled by 1.375 to fill 44px.
          */}
          <div
            style={{
              display: "flex",
              position: "relative",
              width: 44,
              height: 44,
              borderRadius: 10,
              background: "#0F6FB8",
            }}
          >
            {[
              { top: 11, width: 23.4, background: "#FFFFFF", left: 8.25 },
              { top: 20.1, width: 15.1, background: "#FFFFFF", left: 8.25 },
              { top: 29.2, width: 19.3, background: "#FFFFFF", left: 8.25 },
              // The displaced line, drawn last so it sits over the second.
              { top: 20.1, width: 17.9, background: "#8ED0EC", left: 17.9 },
            ].map((bar) => (
              <div
                key={`${bar.top}-${bar.left}`}
                style={{
                  position: "absolute",
                  left: bar.left,
                  top: bar.top,
                  width: bar.width,
                  height: 4.7,
                  borderRadius: 2.35,
                  background: bar.background,
                }}
              />
            ))}
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#1A1F26" }}>
            ATS Resume Builder
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 24,
          }}
        >
          <div
            style={{
              fontSize: 68,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: -2,
              color: "#1A1F26",
              maxWidth: 900,
            }}
          >
            See your resume the way the software does.
          </div>
          <div style={{ fontSize: 30, color: "#48535F", maxWidth: 860 }}>
            Free, unlimited PDF and Word exports. Nothing leaves your browser.
          </div>
        </div>

        <div style={{ display: "flex", gap: 40, fontSize: 24, color: "#626E7B" }}>
          <div>No account</div>
          <div>No credits</div>
          <div>No paywall</div>
        </div>
      </div>
    ),
    size,
  );
}
