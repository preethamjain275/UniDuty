import { AbsoluteFill } from "remotion";
import { C, glass } from "../theme";
import { useRise } from "../components/Kit";

const STATS = [
  ["1,200", "students seated"],
  ["40", "halls · 5 floors"],
  ["2", "staff per hall"],
  ["0", "manual seat edits"],
];

export const S5: React.FC = () => {
  const head = useRise(6);
  return (
    <AbsoluteFill style={{ padding: "0 150px", justifyContent: "center", fontFamily: "sans-serif" }}>
      <div style={{ ...head, fontSize: 96, fontWeight: 800, color: C.text, maxWidth: 1300, lineHeight: 1.06 }}>
        Upload the sheet. <span style={{ color: C.teal }}>The hall plan is done.</span>
      </div>
      <div style={{ display: "flex", gap: 26, marginTop: 60 }}>
        {STATS.map(([v, l], i) => (
          <div key={l} style={{ ...glass, ...useRise(20 + i * 8), flex: 1, padding: 30 }}>
            <div style={{ fontSize: 62, fontWeight: 800, color: C.sky }}>{v}</div>
            <div style={{ fontSize: 26, color: C.dim, marginTop: 8 }}>{l}</div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
