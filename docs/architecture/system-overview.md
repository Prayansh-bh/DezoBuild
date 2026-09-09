# DEZOBUILD — System Architecture Overview

## 1. Executive Summary

**DEZOBUILD** is an integrated Construction Operating System designed for modern general contractors, developers, and project management consultancies. It provides single-pane-of-glass operations spanning project delivery, site telemetry, commercial governance, material inventory, and workforce tracking.

---

## 2. Core Architectural Tenets

1. **Single Direct-Access Operations Shell**:
   - Zero-friction navigation across 10 operational modules (`Dashboard`, `Projects`, `Materials`, `Finance`, `People`, `Equipment`, `Alerts`, `Reports`, `Documents`, `Settings`).
   - Unified real-time command center interface with global command search (`Cmd/Ctrl + K`) and fast-action creation dialogs.

2. **Strict Module Independence & Separation of Concerns (SRP)**:
   - Frontend UI modules encapsulate presentation, responsive tabular/card layouts, filter bars, and modal forms.
   - Mock Store & State layer handles reactive updates via `useSyncExternalStore`, preserving fast client-side state transitions.
   - Backend service layer defines domain contracts, data models (Prisma), and DTO structures ready for enterprise scaling.

3. **High-Fidelity Design System**:
   - Palette tailored with modern OKLCH color variables for optimal contrast in high-ambient sunlight and dark field environments.
   - Modular Radix / Shadcn primitives with accessible semantics and responsive breakpoints.

---

## 3. High-Level Monorepo Topology

```text
Dezobuild/
├── frontend/                 # High-performance single-portal client application
│   ├── src/
│   │   ├── app/              # Entrypoints and server wrappers (router, server, start)
│   │   ├── components/       # Layout, modals, shared widgets, and 46 UI primitives
│   │   ├── hooks/            # Reactive hooks (theme, telemetry)
│   │   ├── lib/              # Formatting, error capture, and data utilities
│   │   ├── mock/             # In-memory mock datasets and store implementations
│   │   ├── stores/           # Re-exported store interface layer
│   │   ├── types/            # Domain TypeScript type definitions
│   │   └── routes/           # TanStack Start file-based route definitions
│   ├── public/               # Static assets, icons, robots.txt
│   ├── package.json          # Frontend package manifest
│   ├── tsconfig.json         # TypeScript configuration
│   └── vite.config.ts        # Vite + TanStack Start configuration
│
├── backend/                  # Backend service layer & domain contracts
│   ├── src/
│   │   ├── config/           # Application configuration
│   │   ├── common/           # DTOs, response wrappers, exception filters
│   │   ├── database/         # Prisma schema and connection abstractions
│   │   ├── modules/          # 10 domain module contracts
│   │   └── main.ts           # Server bootstrap
│   ├── package.json          # Backend package manifest
│   └── tsconfig.json         # Backend TypeScript configuration
│
├── docs/                     # Construction OS technical documentation & audits
│   ├── architecture/         # System architecture & 29-subsystem Construction OS matrix
│   ├── api/                  # API contracts and specifications
│   ├── database/             # Entity-Relationship schema documentation
│   ├── workflows/            # Standard operating procedures & workflows
│   └── audits/               # Forensic baseline audits and regression logs
│
├── tests/                    # Automated testing suites
│   ├── unit/                 # Unit tests
│   ├── integration/          # Integration tests
│   └── e2e/                  # End-to-end user journey tests
│
├── .env.example              # Environment variables template
├── .gitignore                # Workspace git ignore configuration
├── README.md                 # Project README and getting started guide
└── package.json              # Monorepo root workspace manifest
```
