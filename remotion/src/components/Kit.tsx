import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { C, glass } from "../theme";

export const useRise = (delay: number) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 22, stiffness: 140 } });
  return { opacity: s, transform: `translateY(${interpolate(s, [0, 1], [34, 0])}px)` };
};

export const Eyebrow: React.FC<{ children: React.ReactNode; delay?: number }> = ({ children, delay = 0 }) => (
  <div
    style={{
      ...useRise(delay),
      color: C.teal,
      letterSpacing: 6,
      fontSize: 22,
      fontWeight: 700,
      textTransform: "uppercase",
    }}
  >
    {children}
  </div>
);

export const Panel: React.FC<{ children: React.ReactNode; delay?: number; style?: React.CSSProperties }> = ({
  children,
  delay = 0,
  style,
}) => (
  <div style={{ ...glass, padding: 34, ...useRise(delay), ...style }}>{children}</div>
);

export const Row: React.FC<{
  delay: number;
  left: string;
  mid: string;
  right: string;
  tone?: string;
}> = ({ delay, left, mid, right, tone = C.text }) => (
  <div
    style={{
      ...useRise(delay),
      display: "flex",
      alignItems: "center",
      gap: 24,
      padding: "16px 22px",
      borderRadius: 16,
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.07)",
      fontSize: 30,
      color: C.text,
    }}
  >
    <span style={{ color: C.dim, width: 130 }}>{left}</span>
    <span style={{ flex: 1 }}>{mid}</span>
    <span style={{ color: tone, fontWeight: 700 }}>{right}</span>
  </div>
);
