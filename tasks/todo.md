# Certificates API v3 Implementation Checklist

## Phase 1: Contract foundation

- [x] Task 1: Correct gateway governance and freeze v2 parity matrix
  - Acceptance: actual gateway conventions documented; envelope/error/permission/route parity fixtures recorded.
  - Verification: focused contract/governance tests; inspect diff scope.
  - Dependencies: None
  - Complexity: Small
- [x] Task 2: Implement certificate identity and explicit public mapping
  - Acceptance: serial-string identity and explicit safe public mapping are covered by focused tests.
  - Verification: focused service/use-case tests, full gateway suite, and build.
  - Dependencies: Task 1
  - Complexity: Medium

## Checkpoint: Contract and identity foundation

- [ ] Focused parity, mapper, identity, 404, and 409 tests pass.
- [ ] No v2 proxy, Flask import, or UCM database dependency introduced.
- [ ] EJBCA field ownership decisions reviewed.

## Phase 2: Read paths

- [x] Task 3: Parse and forward complete list query semantics
  - Acceptance: repeated filters, per_page precedence, aliases, booleans, allow-listed sorting, complete adapter criteria.
  - Verification: focused DTO and adapter tests, full gateway suite, and build.
  - Dependencies: Tasks 1–2
  - Complexity: Medium
- [x] Task 4: Deliver v3 list and detail endpoints end-to-end
  - Acceptance: auth/permission metadata, mapped list/detail envelopes, pagination, 404/409, and no-v2 protections.
  - Verification: focused route/service tests, full gateway suite, and build.
  - Dependencies: Tasks 2–3
  - Complexity: Medium
## Checkpoint: Read path integration

- [ ] Focused list/detail tests and gateway build pass.
- [ ] Read routes require `read:certificates`.
- [ ] Envelope keys remain `data` and `meta` with no nesting/renaming.
- [ ] No read path invokes Flask v2 or `UcmProxyClient`.
- [x] Task 5: Implement v2-compatible certificate statistics
  - Acceptance: complete counts, exact time boundaries, normalized sources, no unsupported guessing.
  - Verification: stats service tests, full gateway suite, and build.
  - Dependencies: Task 4
  - Complexity: Medium

## Phase 3: Stats and intentional route outcomes

- [ ] Task 5: Implement v2-compatible certificate statistics
  - Acceptance: complete counts, exact time boundaries, normalized sources, no unsupported guessing.
  - Verification: classifier boundary/source/stats tests, route contract test, build, runtime fixture evidence.
  - Dependencies: Task 4
  - Complexity: Medium
- [ ] Task 6: Stabilize removed and not-yet-implemented route matrix
  - Acceptance: seven routes return stable 410; twelve routes return stable 501; neither calls upstream services.
  - Verification: exact route/error snapshot matrix, integration samples, build.
  - Dependencies: Task 1; parallel with Task 5 after foundation checkpoint
  - Complexity: Small–Medium

## Checkpoint: Complete certificate endpoint matrix

- [ ] Read, 410, and 501 focused tests pass.
- [ ] Gateway build passes.
- [ ] All 19 certificate routes are represented in the parity matrix.
- [ ] Forbidden v3 → v2/UCM DB paths are instrumented and absent.

## Phase 4: Write-contract readiness and final governance

- [ ] Task 7: Record write/import/bulk contracts and integration notes
  - Acceptance: all twelve 501 route records include validation/permission/body/content/audit/idempotency/retry/partial-failure/EJBCA-version fields; frontend remains on v2; open questions tracked.
  - Verification: matrix consistency review, available docs checks, final gateway tests and build after implementation.
  - Dependencies: Tasks 5–6
  - Complexity: Small–Medium

## Checkpoint: Ready for human review

- [ ] All acceptance criteria satisfied.
- [ ] Focused and full gateway tests pass.
- [ ] Gateway build passes.
- [ ] Runtime EJBCA health/read evidence captured when available.
- [ ] No unapproved frontend routing change.
- [ ] Unsupported fields and EJBCA version limitations documented.
