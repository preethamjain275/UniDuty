import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { C } from "../theme";
import { Eyebrow, Panel, useRise } from "../components/Kit";

const COLS = [
  ["S.No", "serial_no"],
  ["Register No", "register_no"],
  ["Name", "full_name"],
  ["Department", "department"],
  ["Semester", "semester"],
];

export const S2: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const head = useRise(4);
  return (
    <AbsoluteFill style={{ padding: "110px 150px", fontFamily: "sans-serif" }}>
      <Eyebrow delay={0}>Step 01 · Upload</Eyebrow>
      <div style={{ ...head, fontSize: 74, fontWeight: 800, color: C.text, marginTop: 16 }}>
        Columns matched automatically
      </div>
      <Panel delay={16} style={{ marginTop: 46, padding: 40 }}>
        {COLS.map(([sheet, field], i) => {
          const s = spring({ frame: frame - 28 - i * 7, fps, config: { damping: 20, stiffness: 160 } });
          const w = interpolate(s, [0, 1], [0, 320]);
          return (
            <div key={sheet} style={{ display: "flex", alignItems: "center", gap: 28, padding: "14px 0", fontSize: 34 }}>
              <span style={{ width: 300, color: C.text, opacity: s }}>{sheet}</span>
              <div style={{ height: 4, width: w, borderRadius: 4, background: `linear-gradient(90deg, ${C.sky}, ${C.teal})` }} />
              <span style={{ color: C.teal, opacity: s, fontFamily: "monospace" }}>{field}</span>
            </div>
          );
        })}
      </Panel>
      <div style={{ ...useRise(78), marginTop: 34, fontSize: 32, color: C.dim }}>
        .xlsx · .xls · .csv — up to 5,000 rows per upload
      </div>
    </AbsoluteFill>
  );
};
