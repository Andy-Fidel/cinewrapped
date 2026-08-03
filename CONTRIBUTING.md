# Contributing to CineWrapped

## Workflow

1. Work from an issue or a clearly defined phase checklist item.
2. Keep module ownership and package dependency direction aligned with the architecture document.
3. Add or update tests for business-critical behavior.
4. Run `pnpm check` before requesting review.
5. Use conventional commit messages such as `feat(auth): add session bootstrap`.

## Standards

- Strict TypeScript; do not introduce `any`.
- Controllers coordinate; application services own business rules; repositories own persistence.
- Validate all input at trust boundaries.
- Derive ownership from the authenticated actor, never a client-supplied owner ID.
- TanStack Query owns remote state; Zustand is limited to transient interface state.
- Use semantic design tokens instead of feature-level raw values.
- Do not add provider SDK types to domain interfaces.
- Record non-obvious or cross-cutting decisions in the decision log.

## Database changes

- Update the Prisma schema and database documentation together.
- Use reviewed migrations; never use `prisma db push` against shared environments.
- Follow expand/migrate/contract for incompatible changes.
- Add PostgreSQL checks and partial indexes to migration SQL when Prisma cannot express them.

## Security and privacy

- Never log tokens, credentials, review bodies, private notes, precise locations, or raw provider payloads.
- Add object-level authorization tests for every owned/private resource.
- New analytics properties require a privacy review and typed event-map update.
- Report suspected secrets or privacy leaks privately; do not open a public issue containing sensitive data.
