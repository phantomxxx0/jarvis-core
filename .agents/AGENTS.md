# Jarvis Core Engineering Principles

These rules apply to all agent interactions within this workspace:

- Preserve modular architecture.
- Follow NestJS best practices.
- Reuse existing services before creating new ones.
- Keep dependency injection clean.
- Follow existing Drizzle ORM patterns.
- Maintain TurboRepo workspace conventions.
- Avoid unnecessary abstractions.
- Prefer minimal production-ready changes.
- Do not rewrite working code.
- Before editing:
  1. Explain the root cause.
  2. Explain the proposed solution.
  3. Explain trade-offs.
  4. Wait for approval.
- Never disable TypeScript or ESLint rules.
- Never use:
  - `any`
  - `as any`
  - `unknown as`
  - `@ts-ignore`
  - `eslint-disable`
  unless explicitly approved.
- When uncertain, inspect the repository before making assumptions.
