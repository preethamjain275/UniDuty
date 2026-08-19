import { AbsoluteFill } from "remotion";
import { C } from "../theme";
import { Eyebrow, Panel, Row, useRise } from "../components/Kit";

export const S3: React.FC = () => {
  const head = useRise(4);
  return (
    <AbsoluteFill style={{ padding: "110px 150px", fontFamily: "sans-serif" }}>
      <Eyebrow delay={0}>Step 02 · Validate</Eyebrow>
      <div style={{ ...head, fontSize: 74, fontWeight: 800, color: C.text, marginTop: 16 }}>
        Every bad row, named exactly
      </div>
      <Panel delay={18} style={{ marginTop: 44, display: "flex", flexDirection: "column", gap: 14 }}>
        <Row delay={26} left="Row 14" mid="Register No is empty" right="skipped" tone={C.rose} />
        <Row delay={36} left="Row 27" mid={'Semester "third" must be a whole number 1-12'} right="skipped" tone={C.rose} />
        <Row delay={46} left="Row 42" mid={'Register No "24CS0031" duplicates row 12'} right="skipped" tone={C.amber} />
        <Row delay={56} left="Row 43" mid="Name is empty" right="skipped" tone={C.rose} />
        <Row delay={66} left="1,196 rows" mid="Register No · Name · Department · Semester verified" right="ready" tone={C.teal} />
      </Panel>
      <div style={{ ...useRise(80), marginTop: 32, fontSize: 30, color: C.dim }}>
        Missing required columns stop the import before anything is written
      </div>
    </AbsoluteFill>
  );
};
