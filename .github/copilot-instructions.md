# Ladara frontend

- This repository is an Angular 20 and TypeScript application. Follow existing
  standalone component, service, route and guard patterns; keep TypeScript and
  Angular template checks strict.
- Follow `design_rules.md` for UI changes, including Spanish customer-facing
  copy, accessibility, responsive layouts and honest loading, error and empty
  states.
- Before dependent implementation, establish acceptance criteria and agree on
  relevant API contracts, including payloads, errors and authentication.
  Clarify material open questions; escalate unresolved decisions through the
  coordinator to the user rather than guessing.
- Assign parallel work isolated ownership of files or changes. Coordinate
  shared files and contract changes before editing them.
- Add focused tests for changed behavior. Run relevant checks and report exact
  failures and unverified checks; never present a blocked check as passing.
- Obtain human approval before merging, deploying or taking destructive
  actions. Do not treat an agent handoff as approval.
- Keep handoffs concise: `scope | contract | changed files | checks/results | blockers`.

The project scripts are `npm test` for Jest and `npm run build` for the
production Angular build. Tests are adjacent `*.spec.ts` files under `src`;
`jest.config.js` and `setup-jest.ts` configure the runner. Install locked
dependencies with `npm ci` when needed. There is currently no lint script or
configured end-to-end framework.
