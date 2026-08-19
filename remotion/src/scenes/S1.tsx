import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { C } from "../theme";
import { Eyebrow, useRise } from "../components/Kit";

export const S1: React.FC = () => {
  const f = useCurrentFrame();
  const title = useRise(10);
  const sub = useRise(26);
  const blur = interpolate(f, [10, 40], [16, 0], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  return (
    <AbsoluteFill style={{ padding: "0 150px", justifyContent: "center", fontFamily: "sans-serif" }}>
      <Eyebrow delay={0}>InvigilateOS · Student roster</Eyebrow>
      <div
        style={{
          ...title,
          filter: `blur(${blur}px)`,
          fontSize: 132,
          lineHeight: 1.02,
          fontWeight: 800,
          color: C.text,
          marginTop: 26,
          maxWidth: 1350,
        }}
      >
        Import an Excel sheet.
        <br />
        <span style={{ color: C.teal }}>Seats allocate themselves.</span>
      </div>
      <div style={{ ...sub, marginTop: 34, fontSize: 34, color: C.dim, maxWidth: 1100 }}>
        Validated row by row · placed serial-wise into halls · 30 seats per hall, 8 halls per floor
      </div>
    </AbsoluteFill>
  );
};
