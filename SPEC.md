# Spec: Certificates API v3 độc lập với API v2 Flask

## 1. Objective

### Mục tiêu

Xây dựng/hoàn thiện `ejbca-gateway` (NestJS) để cung cấp API `/api/v3/certificates` có **public contract giống API v2 Flask**, nhưng v3 phải tự triển khai bằng EJBCA REST và domain mapping riêng.

API v2 Flask là nguồn chuẩn để xác định:

- HTTP method, route và semantics;
- query/body parameters;
- status code;
- success/error envelope;
- field names, kiểu dữ liệu và nullability;
- pagination, filter, sorting;
- response binary/content type.

API v3 **không được** gọi hoặc proxy qua API v2, không import code/model/service Flask, không đọc database UCM để giả lập response, và không dùng `UcmProxyClient` cho certificate flows.

### Phạm vi hiện tại

Các read contract và bảy endpoint `410 Gone` đã hoàn thành, giữ làm baseline parity. Phần còn lại của phase này:

1. Implement ba write endpoint:
   - `POST /certificates`
   - `POST /certificates/:id/revoke`
   - `POST /certificates/:id/unhold`
2. Giữ chín endpoint chưa đủ contract ở `501 Not Implemented`.
3. Không gọi EJBCA hoặc Flask v2 từ các endpoint vẫn ở `501`.
4. Bổ sung parity matrix, permission, validation và verification cho ba write endpoint.

- `GET /certificates`, `GET /certificates/:id`, `GET /certificates/stats` đã có implementation và focused tests; giữ làm baseline đã hoàn thành của phase trước.
- Bảy endpoint gateway-owned trả `410 Gone` đã có implementation và focused tests.
- Các field bị chặn vẫn trả null/default an toàn theo `docs/v3-migration/certificates-api-v3-blockers.md`.
- Artifact probes xác nhận read/issue/revoke contracts cụ thể; probe lỗi hoặc thiếu probe không là bằng chứng capability.
- Gateway độc lập với Flask v2; frontend chưa chuyển tự động sang `/api/v3`.

### Người dùng và consumer

- Frontend UCM hiện là consumer tham chiếu, vẫn gọi `/api/v2`.
- Consumer v3 tương lai nhận response tương thích v2 mà không phụ thuộc runtime vào Flask.
- API v3 dùng authentication/permission độc lập của gateway.


## 2. Capability Map

| `v2-contract-parity` | Khóa contract v2 cho ba write endpoint còn trong scope | — |
| `certificate-write` | Issue, revoke, unhold qua EJBCA adapter | `v2-contract-parity`, `certificate-identity` |
| `certificate-identity` | Chuẩn hóa serial/issuer cho write lookup | `v2-contract-parity` |
| `deferred-write-contracts` | Theo dõi chín route vẫn ở 501 và điều kiện gỡ 501 | `v2-contract-parity` |

Read, stats, removed-route implementation là baseline hoàn thành; không nằm trong task list hiện tại.

**Build order:** `v2-contract-parity` → `certificate-identity` → `certificate-write`. `deferred-write-contracts` được duy trì song song.

## 3. Canonical v2 Contract

### 3.1. Envelope

Nguồn chuẩn là `backend/utils/response.py` và các route v2:

  "data": {},
  "message": "Optional success message",
  "meta": { "page": 1, "per_page": 20, "total": 100 }
}
```

Các key không được tự đổi thành `response`, `pagination`, `status/msg`.

**Error**

V2 public documentation tối thiểu có:

```json
{
  "error": true,
  "code": 400,
  "message": "Error description"
}
```

Implementation parity phải đối chiếu payload RFC 7807 + legacy thực tế do `build_problem()` tạo và ghi test snapshot. V3 được phép bổ sung field tương thích, nhưng không được bỏ các field v2 consumer đang dùng.

### 3.2. `GET /certificates`

V2 reference: `backend/api/v2/certificates/cert_list.py`.

**Query contract canonical**

| Parameter | Contract |
|---|---|
| `page` | integer, mặc định 1, tối thiểu 1 |
| `per_page` | integer, mặc định 20, giới hạn tối đa 100 |
| `status` | repeated query params; hỗ trợ `valid`, `expiring`, `expired`, `revoked`; `orphan` là gateway-side compatibility filter nếu được hỗ trợ |
| `ca_id` | repeated integer params, semantics OR/IN |
| `source` | repeated string params, semantics OR/IN; NULL source được xử lý như `manual` theo v2 |
| `search` | trim; tìm trên subject, issuer, description/common name và serial theo semantics v2 |
| `template_modified` | `1`, `true`, `yes` được coi là true như v2 |
| `sort_by` | mặc định `subject`; phải allow-list đúng các field v2 hỗ trợ |
| `sort_order` | `asc` hoặc `desc`, mặc định `asc` |

`limit` là alias tương thích riêng với các consumer cũ của gateway; khi cả `limit` và `per_page` cùng xuất hiện, `per_page` thắng. `sort`/`order` là alias legacy chỉ khi đã được ghi trong migration matrix.

**Response contract**

V3 phải trả `{ data: [...], message?: string, meta: { total, page, per_page } }`, trong đó mỗi item giữ các field public v2 mà frontend đang dùng, tối thiểu:

```json
{
  "id": 42,
  "refid": "legacy-or-gateway-reference",
  "descr": "example certificate",
  "caref": "ca-refid",
  "crt": null,
  "cert_type": "server_cert",
  "subject": "CN=example.com",
  "subject_cn": "example.com",
  "issuer": "CN=Example CA",
  "issuer_name": "Example CA",
  "serial_number": "00af12",
  "valid_from": "2026-01-01T00:00:00Z",
  "valid_to": "2027-01-01T00:00:00Z",
  "key_algo": "RSA 2048",
  "key_type": "RSA 2048",
  "has_private_key": false,
  "private_key_location": "download_only",
  "revoked": false,
  "revoked_at": null,
  "revoke_reason": null,
  "archived": false,
  "imported_from": "ejbca",
  "source": "manual",
  "created_at": "2026-01-01T00:00:00Z",
  "created_by": null,
  "renewed_at": null,
  "renewed_times": 0,
  "template_id": null,
  "template_name": null,
  "template_overrides": [],
  "compliance_score": 0,
  "compliance_grade": "F",
  "days_remaining": 115
}
```

Field availability must be explicitly mapped from EJBCA or a gateway-owned source. V3 must not invent values silently. Fields unavailable from EJBCA and not backed by an approved gateway projection must be returned as the v2-compatible null/empty/default value documented in the parity matrix, or the endpoint must return a documented unsupported error.

**Acceptance criteria**

- Repeated query parameters are parsed as arrays and validated.
- EJBCA adapter receives equivalent OR/IN semantics; no filter is silently discarded.
- Sorting is allow-listed and applied before pagination.
- Response uses `data` and `meta.total/page/per_page`, matching v2.
- No implicit `STATUS=CERT_ACTIVE` when another status filter is provided.
- `GET /certificates` does not call `/api/v2` or UCM database.

### 3.3. `GET /certificates/:id`

V2 uses integer UCM IDs, but v3 has no UCM database dependency. The identity strategy is:

- `id` remains a string in v3 transport to preserve leading zero and support EJBCA serial values.
- Canonical lookup value is EJBCA `serial_number`.
- Response includes `id` and `serial_number` with the same normalized string value.
- `ca_id`/issuer is used by the adapter to disambiguate duplicate serials.
- If serial-only lookup is ambiguous, v3 returns `409 Conflict`; it must not choose the first result.
- Any future migration from numeric UCM IDs to an opaque/composite id requires a separate contract version/approval.

Success response must follow v2 envelope and expose the v2 detail fields, including extensions, chain status, compliance and CT data only when those values are actually owned/available in v3. Gateway-owned UCM-only fields must not be fabricated from EJBCA.

Not found: `404` with v2-compatible error body.

### 3.4. `GET /certificates/stats`

V2 reference: `backend/api/v2/certificates/stats.py`.

Response:

```json
{
  "data": {
    "total": 120,
    "valid": 100,
    "expiring": 8,
    "expired": 7,
    "revoked": 5,
    "sources": ["manual", "ejbca"]
  }
}
```

Rules must match v2:

- Only certificates with certificate data count toward `total`.
- `revoked` is counted independently.
- `expired` means `valid_to <= now` and not revoked.
- `expiring` means `now < valid_to <= now + 30 days` and not revoked.
- `valid` means valid and not expiring; expiring is not double-counted.
- `sources` is a sorted list of actual source values, with NULL represented as `manual`.
- `expiring_soon` may be returned only as a compatibility alias with the same value as `expiring`; it is not a replacement for `expiring`.

If v3 cannot prove a source or status from EJBCA/approved gateway data, it must document the limitation and not claim false parity.

### 3.5. Removed gateway-owned endpoints

These routes must remain registered and return `410 Gone`; they must never call EJBCA or v2:

```text
PATCH /certificates/:id
DELETE /certificates/:id
POST  /certificates/:id/key
GET   /certificates/compliance
GET   /certificates/lint/status
GET   /certificates/:id/lint
POST  /certificates/:id/submit-ct
```

Because v2 has implementations for some of these routes, the parity matrix must explicitly mark them as **intentional v3 divergence**: v3 is not implementing those UCM-owned workflows through EJBCA. The v3 error must use the established error filter shape and a stable code such as `GATEWAY_ENDPOINT_REMOVED`, with HTTP status 410.

### 3.6. Write endpoints trong phạm vi triển khai

Ba endpoint sau cần được triển khai độc lập qua gateway/EJBCA:

```text
POST /certificates
POST /certificates/:id/revoke
POST /certificates/:id/unhold
```

Mỗi route phải có parity record cho validation, permission, success/error body, status, content type, audit, idempotency, retry và operation/version EJBCA.

### 3.7. Not-yet-implemented write/import/bulk endpoints

Các route sau tiếp tục trả `501 Not Implemented`, không gọi EJBCA hoặc Flask v2:

```text
POST /certificates/:id/renew
POST /certificates/:id/export
POST /certificates/export
POST /certificates/import
POST /certificates/bulk/:operation
POST /certificates/bulk/revoke
POST /certificates/bulk/renew
POST /certificates/bulk/delete
POST /certificates/bulk/export
```

Lý do và điều kiện gỡ `501` được ghi tại `docs/v3-migration/certificates-api-v3-blockers.md`. Import/bulk là gateway use cases, không được passthrough 1:1.

## 4. Project Structure

```text
ejbca-gateway/
├── AGENTS.md
├── src/
│   ├── certificates/
│   │   ├── certificates.controller.ts
│   │   ├── certificates.service.ts
│   │   ├── certificates.module.ts
│   │   ├── dtos/certificate-list.query.ts
│   │   ├── interfaces/certificate.interface.ts
│   │   └── identity/                  # Nếu identity helper tách riêng
│   ├── integrations/ejbca/
│   │   ├── resource-adapter.ts
│   │   └── http-client.ts
│   ├── persistence/                   # Chỉ dùng nếu metadata cần projection được phê duyệt
│   └── common/
│       ├── contracts.ts
│       ├── envelope.interceptor.ts
│       ├── ejbca-error.filter.ts
│       └── guards/
└── test/
    ├── certificates-routes.test.ts
    ├── certificate-service.test.ts
    ├── contract-regression.test.ts
    └── fixtures/
```

### Quy tắc thực tế của gateway

- Bootstrap hiện tại dùng global prefix `/api/v3`, `EnvelopeInterceptor` tạo `{ data, message, meta }`.
- Gateway không có TypeORM, `nestjs-typeorm-paginate`, `AppResponseDto`, `BaseMapperDto`, `AutoMapDecorator`, `QueryFilter`, `ValidationPipe` custom stack hoặc `src/cats/` reference module như AGENTS.md hiện mô tả.
- Do đó `AGENTS.md` phải được cập nhật trước implementation để không yêu cầu dependency/convention không tồn tại.
- Không thêm dependency mới nếu chưa được phê duyệt.
- Controller bind HTTP; service/use case chứa business mapping; adapter chỉ nói chuyện với EJBCA.

## 5. Code Style

```ts
export interface CertificatePublicData {
  id: string;
  serial_number: string;
  subject: string | null;
  issuer: string | null;
  status: 'valid' | 'expiring' | 'expired' | 'revoked';
  has_private_key: boolean;
}
```

- TypeScript strict; không dùng `any` để che contract.
- Query parser phải xử lý repeated params và reject input invalid.
- Public response type không được là raw EJBCA payload.
- Giữ snake_case và field names của v2 cho các field public tương ứng.
- V3 tự tạo envelope/error; không forward response từ v2.
- Async phải được `await` hoặc return rõ ràng.
- Không log private key, token, secret hoặc full request body.
- Permission read tương ứng với v2 là `read:certificates`; write/delete permissions phải được ghi trong parity matrix.

## 6. Commands

```bash
cd ejbca-gateway
bun install
bun test test
bun run build
bun run start:dev
```

Runtime:

```text
image mặc định: `keyfactor/ejbca-ce:9.3.7`.
runtime image/digest: chưa xác nhận; `artifacts/ejbca-contract-probes/00-runtime-image.json` có `exit_code: 1`, `output: ""`.
gateway nội bộ: `https://ejbca:8443/ejbca/ejbca-rest-api`.
gateway port: `8081`.
EJBCA dev ports: HTTPS `8444`, HTTP `8082`.
mTLS mount: `secrets/ejbca`.
```

Trước write implementation phải xác minh image/digest runtime và khóa EJBCA operation contract.

## 7. Testing Strategy

### Contract parity tests

- Snapshot success/error envelope giữa v2 reference và v3 implementation.
- So sánh field names, nullability, pagination metadata và messages.
- Matrix rõ intentional divergence của bảy endpoint 410.

### Unit tests

- Repeated query params: status, ca_id, source.
- Boolean parsing cho `template_modified` và `has_key`.
- Alias precedence `per_page`/`limit`, `sort_by`/`sort`, `sort_order`/`order`.
- Status classifier boundary tại now và now+30 ngày.
- Source normalization NULL → `manual`.
- Serial leading-zero và duplicate serial/issuer ambiguity.
- Raw EJBCA payload → public DTO mapping, không rò internal fields.

### Route/integration tests
- Read routes yêu cầu authentication và `read:certificates`.
- List truyền đúng criteria/pagination/sort sang EJBCA adapter.
- Detail success/404/409.
- Stats đủ `total`, `valid`, `expiring`, `expired`, `revoked`, `sources`.
- Bảy removed routes trả 410, body ổn định và không gọi adapter/v2.
- Ba write routes trong phạm vi có validation, permission, success/error mapping và không gọi Flask v2.
- Chín route deferred trả 501, không gọi adapter/v2.
- Timeout, malformed EJBCA payload và upstream error mapping.

### Runtime verification

- Xác minh gateway health và các read routes trên EJBCA instance đang chạy.
- Kiểm tra list → detail giữ nguyên `id`/`serial_number`.
- Đối chiếu cùng dữ liệu test với v2 Flask để chứng minh parity về response shape và semantics.
- Xác minh không có network call v3 → v2 bằng mock/test instrumentation.

## 8. Boundaries

### Always do

- Lấy v2 Flask route implementation và response helper làm contract reference.
- Implement v3 độc lập trong NestJS/EJBCA adapter.
- Giữ v2 field names/envelope/status semantics khi có tương ứng.
- Ghi rõ mọi khác biệt bắt buộc do EJBCA không có dữ liệu.
- Dùng `read:certificates` cho read endpoints.
- Test success, validation, authorization, not-found, ambiguity, upstream failure và removed/501 routes.
- Cập nhật `ejbca-gateway/AGENTS.md` trước khi áp dụng convention mới.

### Ask first

- Thay đổi frontend `apiClient` từ `/api/v2` sang `/api/v3` hoặc thêm reverse proxy/routing.
- Thay đổi field/semantics v2 vì EJBCA không đáp ứng được.
- Thêm persistent projection/schema hoặc metadata store.
- Thêm dependency hoặc thay đổi Docker/mTLS/network.
- Chọn EJBCA write operation trước khi version/contract được xác minh.
- Đổi status của removed routes từ 410 hoặc not-yet-implemented routes từ 501.

### Never do

- Không gọi `/api/v2` từ v3.
- Không proxy/pass-through response/request qua Flask.
- Không import code/model/service Flask.
- Không đọc UCM database để giả lập EJBCA response.
- Không map import/bulk thành passthrough 1:1.
- Không trả raw EJBCA payload nếu làm lộ field nội bộ.
- Không bỏ qua filter hoặc đổi semantics âm thầm.
- Không dùng `keyfactor/ejbca-ce:latest` làm căn cứ ổn định cho write operations.
- Không ghi secret/private key/token vào log hoặc repository.

## 9. Success Criteria

- [x] `GET /certificates` v3 có success envelope/field/pagination tương thích v2 và frontend.
- [x] `GET /certificates/stats` v3 khớp định nghĩa v2, gồm `sources` dạng list và các count chính.
- [x] `GET /certificates/:id` tự lookup qua EJBCA, không qua v2, với 404/409 rõ ràng.
- [x] Multi-value filters và aliases được test.
- [x] Read routes có permission `read:certificates`.
- [x] Bảy endpoint gateway-owned trả 410 ổn định và không gọi EJBCA/v2.
- [ ] `POST /certificates`, `POST /certificates/:id/revoke` và `POST /certificates/:id/unhold` có contract, implementation và tests đầy đủ.
- [ ] Chín deferred write/import/bulk routes trả 501 ổn định và không gọi adapter/v2; source parity matrix cần đồng bộ từ 12 xuống 9 route.
- [x] `ejbca-gateway/AGENTS.md` không còn yêu cầu các dependency/convention không tồn tại.
- [ ] Runtime health/read evidence được xác nhận trên image đang chạy; probe `00-runtime-image.json` hiện thất bại (`exit_code: 1`, `output: ""`).
- [x] Test suite có kiểm chứng v3 không phụ thuộc v2; artifact runtime không đủ để tự đánh dấu tiêu chí triển khai.

Các blocker còn lại:

1. `unhold`: chưa có artifact probe hoặc operation/version EJBCA được xác nhận.
2. `create`: probe `09-issue.json` xác nhận `POST /v1/certificate/pkcs10enroll` trả `201` và JSON gồm certificate, serial, response format, chain; request parity, auth, lỗi và persistence semantics vẫn phải khóa.
3. `revoke`: probe `10-revoke.json` xác nhận `PUT /v1/certificate/{issuer_dn}/{serial}/revoke?reason=...` trả `200` với issuer, serial, reason, date, message, revoked; gateway parity, idempotency và audit vẫn phải khóa.
4. `04-certificate-profiles.json` trả `404`; không được xem certificate profile endpoint hiện tại là capability đã xác minh.
5. `11-ca-chain-download.json` trả `500`; chỉ được dùng như bằng chứng endpoint chain download chưa ổn định, không phải leaf export contract.
6. `00-runtime-image.json` không xác nhận được container image/digest đang chạy.
7. Các field UCM-only tiếp tục bị chặn theo `docs/v3-migration/certificates-api-v3-blockers.md`.
8. Image tag cấu hình mặc định là `keyfactor/ejbca-ce:9.3.7`, nhưng image/digest runtime vẫn phải xác minh trước write implementation.
