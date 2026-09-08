# NestJS Gateway Development Rules

This document describes the conventions that match the current `ejbca-gateway` implementation.

## 1. Workflow

1. Read the relevant module, common infrastructure, adapter, and focused tests before editing.
2. Define the endpoint contract first: method, path, parameters, response, status codes, permissions, and errors.
3. Keep changes scoped to the requested module and add focused tests for every behavior change.
4. Run the focused tests, the gateway test suite, and `bun run build` before completion.
5. Do not add dependencies or change Docker, mTLS, network, or frontend routing without explicit approval.

## 2. Architecture

- `main.ts` sets the global `/api/v3` prefix and installs `EnvelopeInterceptor` and `EjbcaErrorFilter`.
- Controllers bind HTTP routes and delegate business behavior; they do not call EJBCA clients directly.
- Services/use cases own validation-independent business rules, identity handling, classification, and public response mapping.
- `src/integrations/ejbca/` is the only layer that calls EJBCA REST.
- Public responses use explicit interfaces/DTOs; raw EJBCA payloads must never be returned.
- `src/common/` contains shared auth, permission, envelope, error, and configuration infrastructure.
- This gateway is independent from Flask v2 certificate flows: do not import Flask code/models/services, call `/api/v2`, use `UcmProxyClient` for certificate flows, or read the UCM database.

## 3. Endpoint and contract rules

- Preserve v2-compatible snake_case field names and `{ data, message?, meta? }` success keys where the specification requires parity.
- Preserve leading zeroes and use string transport IDs for EJBCA serial identities.
- Use `@RequirePermission('read:certificates')` on certificate read routes.
- Gateway-owned unsupported routes return their specified stable status (`410 Gone` or `501 Not Implemented`) and must not call an upstream adapter.
- Errors go through `EjbcaErrorFilter`; do not send ad hoc controller responses.
- Repeated query parameters must be represented as arrays and validated at the request boundary.
- Allow-list sort fields and apply sorting before pagination.

## 4. EJBCA and security rules

- Treat EJBCA responses as untrusted external input; validate shape before mapping.
- Map only approved public fields. If EJBCA cannot provide a v2 field and no approved gateway-owned source exists, return the documented null/empty/default or an explicit unsupported error.
- Never log private keys, tokens, secrets, complete request bodies, or raw sensitive upstream payloads.
- All asynchronous work must be awaited or explicitly returned.
- Do not use `any` to hide a contract mismatch; use interfaces, type guards, or `unknown` narrowing.

## 5. Testing

- Unit-test query parsing, identity, classification, mapping, and error shaping.
- Route tests must cover authentication, permission checks, success, validation, 404, 409, upstream failures, and intentional 410/501 outcomes.
- Contract regression tests must verify envelope keys, public field names, pagination metadata, and no forbidden v3 → v2 calls.
- Use the repository commands:

```bash
bun test test
bun run build
```

## 6. Scope boundaries

- Do not switch the frontend from `/api/v2` to `/api/v3` in this phase.
- Do not implement write/import/bulk EJBCA operations until the EJBCA image/version and operation contracts are verified.
- Do not add a persistence projection or new dependency without approval.
