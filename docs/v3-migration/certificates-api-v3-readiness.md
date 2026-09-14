# Certificates API v3 Readiness Matrix

This document records the phase-two contract prerequisites for certificate write, import, export, and bulk operations. Except for the limited public leaf export described below, these routes remain `501 Not Implemented` in the current phase.


## Route matrix

| Route | Validation | Permission | Success body/status | Error/status | Content type | Audit | Idempotency/retry | Partial failure | EJBCA operation/version |
|---|---|---|---|---|---|---|---|---|---|
| `POST /certificates` | Define issue request DTO and certificate profile rules | Define write permission | Define v2-compatible 201 envelope | Define validation/upstream mapping | JSON | Required | Define request key and retry policy | Not applicable or define | Verify against pinned EJBCA image |
| `POST /certificates/:id/revoke` | Define reason and identity validation | Define revoke permission | Define v2-compatible success envelope | Define 404/409/upstream errors | JSON | Required | Define idempotent revoke semantics | Define multi-step behavior | Verify revoke REST operation/version |
| `POST /certificates/:id/unhold` | Define identity and hold-state validation | Define revoke permission | Define v2-compatible success envelope | Define 404/409/upstream errors | JSON | Required | Define idempotency/retry | Not applicable | Verify unhold REST operation/version |
| `POST /certificates/:id/renew` | Define renewal/profile validation | Define renew permission | Define v2-compatible success envelope | Define 404/409/upstream errors | JSON | Required | Define request key and retry policy | Define if issue succeeds but projection fails | Verify renew REST operation/version |
| `POST /certificates/:id/export` | `issuer` bắt buộc; `format` là `pem`, `der`, `pkcs7` hoặc `p7b` | `read:certificates` | Binary attachment `200`; chỉ leaf certificate | `400` invalid input, `404` not found, `409` ambiguous serial, upstream error | PEM / DER / PKCS#7 | Không áp dụng: read-only | Retry an toàn | Không áp dụng | Gateway đóng gói DER từ `/v2/certificate/search`; không export private key/CA chain |
| `POST /certificates/export` | Define selection, format, and limits | Define export permission | Define binary bundle response | Define validation/upstream errors | PEM/PKCS content type | Required | Define deterministic selection | Define per-certificate failures | Verify export REST operation/version |
| `POST /certificates/import` | Define multipart and certificate parsing rules | Define import permission | Define v2-compatible result envelope | Define validation/conflict/upstream errors | Multipart request, JSON result | Required | Define content hash/idempotency | Required per-item result contract | Gateway use case; not 1:1 passthrough |
| `POST /certificates/bulk/:operation` | Define operation allow-list and item DTO | Define operation-specific permission | Define bulk result envelope | Define validation/partial failure errors | JSON | Required | Define batch idempotency/retry | Required | Gateway orchestration; verify operation mapping |
| `POST /certificates/bulk/revoke` | Define IDs and revoke reason | Define revoke permission | Define bulk result envelope | Define per-item errors | JSON | Required | Define batch key/retry | Required | Gateway orchestration; verify revoke operation |
| `POST /certificates/bulk/renew` | Define IDs and renewal options | Define renew permission | Define bulk result envelope | Define per-item errors | JSON | Required | Define batch key/retry | Required | Gateway orchestration; verify renew operation |
| `POST /certificates/bulk/delete` | Define IDs and projection semantics | Define delete permission | Define bulk result envelope | Define per-item errors | JSON | Required | Define batch key/retry | Required | Gateway-owned; must not delete EJBCA audit records implicitly |
| `POST /certificates/bulk/export` | Define IDs and format | Define export permission | Binary bundle response | Define per-item/export errors | PEM/PKCS content type | Required | Define deterministic selection/retry | Required for missing items | Gateway orchestration; verify export operation |

## Current-phase decisions

- Ngoại trừ `POST /certificates/:id/export`, các route trong ma trận ở trên giữ HTTP `501 Not Implemented`.
- Export public leaf gọi EJBCA `/v2/certificate/search`, yêu cầu `issuer` cùng serial, và chỉ hỗ trợ PEM, DER, PKCS#7/P7B; CA chain và private key không thuộc contract.
- Import and bulk are gateway use cases and must not be implemented as 1:1 passthroughs.
- The EJBCA container currently uses `keyfactor/ejbca-ce:latest`; this is not a stable write contract. A pinned image/version and direct operation verification are release prerequisites.
- No persistent projection, new dependency, mTLS/network change, or secret change is approved by this phase.

## Frontend integration path

`CertificatesPage` sử dụng riêng `certificatesService.exportPublic()` để gọi `/api/v3` cho PEM/DER/P7B; các luồng v2 có private key vẫn giữ nguyên.

## Release blockers / open questions

- Pin and verify the EJBCA image/version before designing write operations.
- Confirm the exact EJBCA operation, request schema, response schema, and content type for issue/revoke/unhold/renew/export.
- Define gateway-owned audit, idempotency, retry, and partial-failure behavior for import and bulk operations.
- Resolve permissions for write, delete, key, and export routes.
- Identify whether any v2-only metadata requires an approved gateway projection.
