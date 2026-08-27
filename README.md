# 🏛️ InvigilateOS

InvigilateOS is a state-of-the-art, institution-grade **Examination Seating & Invigilation Management Platform** custom-built for universities. It simplifies exam coordination, automates room duty assignments, manages real-time classroom incidents, and generates print-ready legal exam compliance forms.

---

## 🎮 Features & Capabilities

- **🎮 3D Invigilation Simulator Game:** An interactive, retro-futuristic 3D control deck built directly on the landing page! Navigate an invigilator drone using your keyboard or mouse to scan exam rooms and resolve live room issues (student requests, medical alerts, paper discrepancies).
- **⚡ One-Click Automated Duty Allocation:** Algorithmic scheduling of faculty duties across all sessions with automated compliance checks (consecutive duties prevention, equitable distribution, and department isolation).
- **📋 Institutional Print-Ready Forms:** Seamless generation of standard university exam cell documents:
  - **A-Form:** Room-wise attendance and answer book distribution record.
  - **B-Form:** Faculty invigilation duties, sign-ins, and emergency swap records.
  - **Tenancy Form:** Room-wise occupancy, furniture layout compliance, and session schedules.
- **🗺️ Master Seating Chart:** Fully responsive seating grid allocating students by Student Roll Numbers (SRN), preventing collusion through randomized or interleaved exam arrangements.
- **🚨 Emergency Complaint Desk:** A real-time WebSocket-enabled messaging terminal that connects classroom invigilators directly to the Central Admin Command Center.

---

## 🛠️ Tech Stack & Architecture

- **Framework:** [TanStack Start](https://tanstack.com/router/v1/docs/start/overview) (Server-side rendering, client-side routing, query-driven state caching)
- **Language:** TypeScript & React 19
- **Database / Backend:** Supabase Integration
- **Styling:** Tailwind CSS 4 with custom OKLCH color palettes, fluid glassmorphic variables, and dynamic 3D dimensional depths.
- **State Management:** TanStack Query & React State hooks.
- **Visual Utilities:** Lucide React icons, customized canvas projection layers, and dynamic transition keyframes.

---

## 🚀 Getting Started (Local Development)

Ensure you have Node.js (v18+) and your preferred package manager (npm / bun) installed.

### 1. Clone & Set Up Directory
```bash
git clone <repository-url>
cd invigilateos
```

### 2. Install Dependencies
```bash
npm install
# or
bun install
```

### 3. Run Development Server
```bash
npm run dev
# or
bun dev
```
Open [http://localhost:8080](http://localhost:8080) to access the landing page and enter the interactive 3D Simulator.

### 4. Build for Production
To build a highly optimized bundle ready for hosting:
```bash
npm run build
```

---

## 📁 Directory Structure

- `/src/routes/` — File-based routing folder (TanStack Router).
  - `__root.tsx` — Main application shell, theme injection, global styles.
  - `index.tsx` — Landing page with the interactive 3D Invigilator Academy simulation.
  - `auth.tsx` — Secured access portal for Administrators and Faculty.
  - `_authenticated/` — Auth-guarded app layout including seating, roster management, duty swaps, and dashboards.
- `/src/components/` — Reusable components (e.g. imports, layout views).
- `/src/styles.css` — Global stylesheets containing OKLCH gradients, custom components (`card-3d`, `glass`, `btn-3d`), and fluid design tokens.
- `/src/lib/` — Helper utility libraries and mock/real data generators.

---

## ⚖️ License & Institution Info

Designed and developed for the **Sapthagiri NPS University Examination Cell Portal**.
Copyright © 2026 Sapthagiri NPS University. All rights reserved.
