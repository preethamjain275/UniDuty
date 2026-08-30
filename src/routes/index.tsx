// @ts-nocheck
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Building2,
  CalendarClock,
  ShieldCheck,
  Sparkles,
  Users,
  CheckCircle2,
  ArrowRight,
  ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sapthagiri NPS University — Exam Invigilation Management System" },
      {
        name: "description",
        content:
          "Official Sapthagiri NPS University Examination Cell Portal for duty allocation, seating charts, and exam operations management.",
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
    title: "Official Tenancy & Seating Sheets",
    body: "Institutional printable forms for floorwise faculty duties and student tenancy charts.",
  },
  {
    icon: ShieldCheck,
    title: "Master Seating Chart",
    body: "Complete room-wise student roll number (SRN) seating allocation matching institutional charts.",
  },
  {
    icon: CalendarClock,
    title: "Emergency Complaint Desk",
    body: "Real-time classroom issue messaging and complaint resolution directly connected to Admin Control Desk.",
  },
];

function Index() {
  return (
    <div className="min-h-dvh max-w-[100vw] overflow-x-clip bg-background">
      {/* App Header */}
      <header className="flex items-center justify-between gap-2 border-b border-border/30 px-4 py-4 sm:px-6 md:px-12" style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}>
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <img src="/snpsu-logo.png" alt="Sapthagiri NPS University Logo" className="size-9 shrink-0 object-contain sm:size-10" />
          <div className="min-w-0">
            <span className="block truncate font-display text-sm font-bold leading-tight sm:text-lg">Sapthagiri NPS University</span>
            <span className="text-[11px] font-semibold text-muted-foreground">Examination Cell Platform</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="ghost" className="hidden sm:inline-flex">
            <Link to="/auth">Faculty Access</Link>
          </Button>
          <Button asChild size="sm" className="btn-3d shrink-0">
            <Link to="/auth">Sign in</Link>
          </Button>
        </div>
      </header>

      {/* Main Grid View */}
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-16">
        <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
          
          {/* Typography Panel */}
          <div className="space-y-6 lg:col-span-6 text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-[10px] font-bold text-primary sm:px-4 sm:text-xs">
              <Sparkles className="size-3.5 text-primary animate-pulse" />
              <span className="truncate">SAPTHAGIRI NPS UNIVERSITY EXAM SYSTEM</span>
            </div>
            
            <h1 className="text-balance font-display text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl md:text-6xl">
              Next-Gen Seating & Invigilation Control
            </h1>
            
            <p className="max-w-xl text-base text-muted-foreground sm:text-lg leading-relaxed">
              Maintain institutional integrity with randomized layout matrices, auto-generated compliance forms, and immediate live-classroom emergency dispatching.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button asChild size="lg" className="btn-3d w-full sm:w-auto">
                <Link to="/auth">
                  Open Control Centre <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
                <Link to="/auth">Faculty Portal</Link>
              </Button>
            </div>

            {/* Quick Metrics display */}
            <div className="grid grid-cols-3 gap-4 border-t border-border/30 pt-6 mt-8">
              <div>
                <span className="block text-2xl font-bold font-display text-primary">100%</span>
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Gap Compliance</span>
              </div>
              <div>
                <span className="block text-2xl font-bold font-display text-primary">45+</span>
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Active Halls</span>
              </div>
              <div>
                <span className="block text-2xl font-bold font-display text-primary">1-Click</span>
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Allocation</span>
              </div>
            </div>
          </div>

          {/* Institutional Portal Access Card */}
          <div className="lg:col-span-6">
            <div className="glass-strong overflow-hidden rounded-3xl p-8 flex flex-col items-center text-center gap-6 border-primary/20 relative shadow-2xl bg-card/60 backdrop-blur-xl">
              <div className="size-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center p-3">
                <img src="/snpsu-logo.png" alt="Sapthagiri NPS University" className="size-full object-contain" />
              </div>

              <div className="space-y-2">
                <h3 className="font-display text-2xl font-bold text-foreground">Examination Cell Portal</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Authorized faculty access for invigilation duties, hall allocations, and examination schedules.
                </p>
              </div>

              <div className="w-full pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button asChild size="lg" className="btn-3d w-full sm:w-auto px-8">
                  <Link to="/auth">Sign In to Portal</Link>
                </Button>
              </div>

              <div className="pt-4 border-t border-border/20 w-full flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="size-3.5 text-emerald-500" /> Secure Institutional Access
                </span>
                <span className="font-mono text-[10px] uppercase">SNPSU Exam Cell</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Institutional Core Modules Grid */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 md:pb-24">
        <h2 className="text-center font-display text-2xl font-bold mb-10 sm:text-3xl">Official Institutional Management Modules</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="glass glass-hover rounded-2xl p-6 text-left space-y-3">
              <div className="bg-primary/10 p-2.5 rounded-xl inline-block text-primary">
                <f.icon className="size-5" />
              </div>
              <h3 className="text-lg font-bold font-display">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>
      
      {/* Footer */}
      <footer className="border-t border-border/30 py-6 text-center text-xs text-muted-foreground bg-background/40 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Sapthagiri NPS University examination duty management engine. For admin assistance contact central cell.</span>
          <span className="font-mono text-[10px]">SYSTEM STATUS: SECURE (v1.0.4)</span>
        </div>
      </footer>
    </div>
  );
}
