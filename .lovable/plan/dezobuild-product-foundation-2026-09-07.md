# DEZOBUILD Product Foundation

## Goal
Create a polished, construction-specific SaaS experience that feels dependable, efficient, and credible for owners and site teams. Begin with the design system, navigation, and an interactive owner dashboard as the first complete screen.

## What will be built
- A responsive application shell with a compact desktop sidebar, clear top navigation, project context, notifications, and profile controls.
- A professional visual system using a restrained charcoal, safety-amber, off-white, green, and red palette; Source Sans 3 for interface text and IBM Plex Mono for financial and operational figures.
- An action-first owner dashboard showing project health, cash position, delayed work, material risks, approvals, and traceable recent alerts.
- Working interactions for navigation groups, dashboard filters, project selection, alert acknowledgement, metric drill-down, and a persistent Quick Add menu.
- Mobile layouts optimized for outdoor use and one-handed actions, with bottom navigation and large touch targets rather than a compressed desktop sidebar.
- Accessible focus states, semantic status labels, keyboard-friendly controls, and reduced-motion support.

## Content approach
All displayed values will be clearly labeled as sample data for visual prototyping. The interface will use authentic construction terminology and realistic operational examples without implementing business calculations or backend behavior.

## Technical details
- Build the first experience at `/` using the existing TanStack Start structure.
- Define all colors, typography, shadows, and layout roles as reusable semantic tokens in the global design system.
- Use small reusable React components for navigation, status chips, health rows, alerts, and quick actions.
- Keep interactions in presentation state only; no database, authentication, APIs, or permissions will be added in this phase.
- Add complete page metadata and verify the result at desktop and mobile sizes.
