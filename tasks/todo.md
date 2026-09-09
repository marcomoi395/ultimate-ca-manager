# Certificates API v3 Write Phase

## Phase 1: Capability and Contract Gates
- [x] Task 1A: Verify runtime image and digest
- [x] Task 1B: Verify issue and revoke operations
- [x] Task 1C: Verify unhold operation
- [x] Task 2: Lock v2 parity, permissions, and policies
- [x] Task 3A: Implement certificate identity normalization
- [x] Task 3B: Wire audit and idempotency infrastructure

## Checkpoint: Capability and Contract Gate
- [ ] Runtime and all operation contracts approved
- [ ] Permissions, audit, idempotency, retry policies fixed
- [ ] Identity and infrastructure tests pass
- [ ] Failed hard gate blocks Phase 2

## Phase 2: Independent Vertical Write Slices
- [x] Task 4: Implement certificate issue flow
- [x] Task 5: Implement certificate revoke flow
- [x] Task 6: Implement certificate unhold flow

## Checkpoint: Write Flows
- [ ] All three required routes pass focused tests
- [ ] Permission/error/envelope/audit/idempotency/retry/no-v2 checks pass
- [ ] No raw EJBCA/private-key/secret leakage

## Phase 3: Deferred Routes and Integration
- [ ] Task 7: Keep exactly nine routes at 501
- [ ] Task 8: Full gateway and runtime verification

## Checkpoint: Complete
- [ ] All applicable SPEC.md criteria pass
- [ ] Failed hard gate remains blocked, not complete
- [ ] Final diff matches plan
- [ ] Ready for implementation review
