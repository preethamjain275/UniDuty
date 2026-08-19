import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { C } from "../theme";

export const Background: React.FC = () => {
  const f = useCurrentFrame();
  const x = interpolate(Math.sin(f / 90), [-1, 1], [-6, 6]);
  const y = interpolate(Math.cos(f / 110), [-1, 1], [-5, 5]);
  return (
    <AbsoluteFill style={{ background: `linear-gradient(135deg, ${C.bg} 0%, ${C.bg2} 100%)` }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(60% 50% at ${52 + x}% ${28 + y}%, rgba(45,212,191,0.20), transparent 70%), radial-gradient(50% 45% at ${18 - x}% ${82 - y}%, rgba(125,211,252,0.16), transparent 70%)`,
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
          maskImage: "radial-gradient(70% 70% at 50% 45%, black, transparent)",
        }}
      />
    </AbsoluteFill>
  );
};
