import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { C, glass } from "../theme";
import { Eyebrow, useRise } from "../components/Kit";

const PLACED = [
  ["#1201", "Aarthi R", "A-101", "Seat 1"],
  ["#1202", "Bharath S", "A-101", "Seat 2"],
  ["#1203", "Charu M", "A-101", "Seat 3"],
  ["#1231", "Divya K", "A-102", "Seat 1"],
  ["#1232", "Elango P", "A-102", "Seat 2"],
];

export const S4: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const head = useRise(4);
  return (
    <AbsoluteFill style={{ padding: "100px 150px", fontFamily: "sans-serif" }}>
      <Eyebrow delay={0}>Step 03 · Auto allocation</Eyebrow>
      <div style={{ ...head, fontSize: 74, fontWeight: 800, color: C.text, marginTop: 16 }}>
        Serial order, hall, seat — instantly
      </div>
      <div style={{ display: "flex", gap: 40, marginTop: 46 }}>
        <div style={{ ...glass, ...useRise(18), flex: 1.2, padding: 32 }}>
          {PLACED.map(([sn, name, hall, seat], i) => {
            const s = spring({ frame: frame - 30 - i * 8, fps, config: { damping: 18, stiffness: 150 } });
            return (
              <div
                key={sn}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 22,
                  fontSize: 32,
                  padding: "15px 0",
                  opacity: s,
                  transform: `translateX(${interpolate(s, [0, 1], [-40, 0])}px)`,
                  color: C.text,
                }}
              >
                <span style={{ color: C.sky, fontWeight: 700, width: 110 }}>{sn}</span>
                <span style={{ flex: 1 }}>{name}</span>
                <span style={{ color: C.teal, fontWeight: 700 }}>{hall}</span>
                <span style={{ color: C.dim, width: 130, textAlign: "right" }}>{seat}</span>
              </div>
            );
          })}
        </div>
        <div style={{ ...glass, ...useRise(26), flex: 1, padding: 32 }}>
          <div style={{ color: C.dim, fontSize: 26, letterSpacing: 3, textTransform: "uppercase" }}>Floor 5 · halls</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginTop: 24 }}>
            {Array.from({ length: 8 }).map((_, i) => {
              const s = spring({ frame: frame - 34 - i * 5, fps, config: { damping: 16, stiffness: 170 } });
              return (
                <div
                  key={i}
                  style={{
                    height: 108,
                    borderRadius: 18,
                    background: `rgba(45,212,191,${0.12 + 0.16 * s})`,
                    border: `1px solid rgba(45,212,191,${0.25 + 0.4 * s})`,
                    transform: `scale(${interpolate(s, [0, 1], [0.85, 1])})`,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    color: C.text,
                    fontSize: 26,
                    fontWeight: 700,
                  }}
                >
                  E-50{i + 1}
                  <span style={{ color: C.dim, fontSize: 22, fontWeight: 500 }}>30/30</span>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 26, fontSize: 28, color: C.dim }}>
            Serials re-sequenced 1…N · no gaps, no duplicates
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
