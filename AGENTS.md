# Agent instructions

## Before implementation

- Inspect the relevant code, tests and documentation. Establish acceptance
  criteria and agree on any relevant API contracts, including payloads, errors
  and authentication. Clarify material open questions before implementing;
  escalate unresolved product or technical decisions rather than guessing.
- Identify and update the documentation affected by the requested change before
  implementing code, including expected behavior and contracts where relevant.
  Reconcile it with the final implementation before handoff. If no documentation
  change applies, explain why.
- For each behavior change, first add or adapt focused tests (or use existing
  tests) that express the agreed expected behavior. Run them before changing
  production code and confirm they fail because that behavior is missing or
  incorrect, not because of setup, compilation, or an unrelated failure.
  Record the command and relevant failure. Do not claim a red test if it did not
  fail for the expected reason.
- If a meaningful red test cannot be written or run, stop dependent
  implementation and report the blocker or request a decision. For work with no
  behavior change, explain why test-first is not applicable and run the relevant
  checks instead.

## Implementation and verification

- Implement the smallest change that satisfies the agreed behavior, then run
  the targeted tests and iterate until they pass. Run other relevant checks,
  including broader tests or the build when appropriate. Report exact failures,
  blockers and checks not run; never claim an unverified check passed.
- Follow existing Angular standalone component, service, route and guard
  patterns, maintain strict TypeScript and template checks, and reuse existing
  helpers. Keep changes scoped, readable and type-safe; handle errors explicitly.
- Preserve existing UX and contracts unless the task changes them. For UI work,
  maintain accessibility, responsive layouts, Spanish customer-facing copy and
  honest loading, error and empty states.
- Write deterministic tests for meaningful behavior and edge cases, not
  implementation details. Use existing tooling and avoid unrelated changes or
  unnecessary dependencies.

## Coordination

- Assign parallel work isolated ownership of files or changes. Coordinate shared
  files and contract changes before editing them. Review-only agents must not
  edit; they should assess documentation and red/green evidence and report
  missing or unverified evidence instead.
- Obtain human approval before merging, deploying or taking destructive actions.
  An agent handoff is not approval.
- Keep handoffs concise: scope, contract, changed files, documentation, red and
  green checks/results, and blockers or non-applicable cases.

The project uses `npm test` for Jest and `npm run build` for the production
Angular build. Tests are adjacent `*.spec.ts` files under `src`;
`jest.config.js` and `setup-jest.ts` configure the runner. Install locked
dependencies with `npm ci` when needed. There is currently no lint script or
configured end-to-end framework.
