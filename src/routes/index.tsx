// @ts-nocheck
import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, CalendarClock, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sapthagiri NPS University — Exam Invigilation Management System" },
      {
        name: "description",
        content:
          "Official Sapthagiri NPS University Examination Cell Portal for duty allocation, seating charts, A/B/Tenancy forms, and emergency complaint desk.",
      },
      { property: "og:title", content: "Sapthagiri NPS University — Exam Invigilation System" },
      {
        property: "og:description",
        content: "Institutional examination management, seating charts, and faculty duty allocation.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Index,
});

const FEATURES = [
  {
    icon: Sparkles,
    title: "One-click allocation",
    body: "Assign every hall in seconds with rotating room duty and gap compliance checks.",
  },
  {
    icon: Building2,
    title: "Official A, B & Tenancy Forms",
    body: "Institutional printable forms for floorwise faculty duties, room student attendance, and August 2026 tenancy.",
  },
  {
    icon: ShieldCheck,
    title: "Master Seating Chart",
    body: "Complete room-wise student roll number (SRN) seating allocation matching institutional PDF charts.",
  },
  {
    icon: CalendarClock,
    title: "Emergency Complaint Desk",
    body: "Real-time classroom issue messaging and complaint resolution directly connected to Admin Control Desk.",
  },
];

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between px-6 py-5 md:px-12 border-b border-border/30">
        <div className="flex items-center gap-3">
          <img src="/snpsu-logo.png" alt="Sapthagiri NPS University Logo" className="size-10 object-contain" />
          <div>
            <span className="font-display text-lg font-bold leading-tight block">Sapthagiri NPS University</span>
            <span className="text-[11px] text-muted-foreground font-semibold">Examination Cell Platform</span>
          </div>
        </div>
        <Button asChild size="sm" className="btn-3d">
          <Link to="/auth">Sign in</Link>
        </Button>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-16 text-center md:py-24">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-bold text-primary mb-4">
          <img src="/snpsu-logo.png" alt="SNPSU" className="size-4 object-contain" />
          SAPTHAGIRI NPS UNIVERSITY EXAM CELL
        </div>
        <h1 className="text-4xl font-bold text-balance md:text-6xl font-display">
          Examination Seating & Invigilation Management
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
          Plan internal and semester examinations across every hall. Generate official A-Form, B-Form, Tenancy Form, Master Seating Charts, and manage live classroom complaints.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button asChild size="lg" className="btn-3d">
            <Link to="/auth">Open Control Centre</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/auth">Faculty Login</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-6 pb-24 md:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((f) => (
          <div key={f.title} className="glass glass-hover rounded-2xl p-5 text-left space-y-2">
            <f.icon className="size-5 text-primary" />
            <h2 className="text-base font-semibold">{f.title}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{f.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
