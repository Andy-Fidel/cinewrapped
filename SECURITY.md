# Security Policy

## Reporting

Do not disclose a suspected vulnerability in a public issue. Share the affected component, reproduction steps, impact, and any known mitigation privately with the project maintainers. Do not include real credentials, tokens, or personal data.

## Repository controls

- Runtime secrets are server-only and validated before startup.
- `EXPO_PUBLIC_*` and `NEXT_PUBLIC_*` values are treated as public bundle content.
- Dependency versions and compatible security overrides are locked with pnpm.
- Third-party package build scripts are explicitly approved or denied in `pnpm-workspace.yaml`.
- Admin response headers disable framing and MIME sniffing and use a strict referrer policy.
- Next.js image optimization is disabled and the optional Sharp/libvips dependency is excluded until a stable patched Sharp 0.35 release is available.

## Dependency audit status

Run the production audit with:

```bash
pnpm audit --prod --audit-level high
```

As of 2026-08-01, the high-severity production audit passes. One moderate `uuid` advisory remains through Expo's Node-based Apple project tooling (`xcode`). That tooling is used during native builds and is not bundled into the mobile runtime. Avoid passing attacker-controlled buffers to build tooling, and upgrade the Expo toolchain when it adopts `uuid >=11.1.1`.

Security overrides must be removed once direct framework dependencies include the patched versions; do not let overrides become permanent invisible forks.
