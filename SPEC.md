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

### Phạm vi giai đoạn này

1. Hoàn thiện read contracts:
   - `GET /certificates`
   - `GET /certificates/:id`
   - `GET /certificates/stats`
2. Tự map dữ liệu EJBCA sang response contract tương thích v2/frontend.
3. Trả `410 Gone` cho bảy endpoint không nên triển khai qua EJBCA REST.
4. Giữ các endpoint write/import/bulk chưa triển khai ở `501 Not Implemented`, đồng thời chuẩn bị contract và verification matrix cho giai đoạn sau.
5. Cập nhật `ejbca-gateway/AGENTS.md` để phản ánh convention thực tế và nguyên tắc độc lập v2/v3.
6. Ghi nhận integration path riêng giữa frontend và v3; không giả định frontend tự động chuyển từ `/api/v2` sang `/api/v3`.

### Người dùng và consumer

- Frontend UCM hiện là consumer tham chiếu, nhưng đang gọi `/api/v2`.
- Consumer v3 tương lai phải nhận response tương thích v2 mà không cần phụ thuộc runtime vào Flask.
- API v3 dùng authentication/permission độc lập của gateway.

## 2. Capability Map

| Module id | Trách nhiệm | Phụ thuộc |
|---|---|---|
| `v2-contract-parity` | Trích xuất và khóa contract v2 cho certificate endpoints | — |
| `certificate-identity` | Mapping id, serial, issuer/CA và lookup | `v2-contract-parity` |
| `certificate-read` | List/detail/filter/pagination/sort bằng EJBCA adapter | `certificate-identity` |
| `certificate-stats` | Stats tương thích v2, tính từ nguồn v3 được xác minh | `certificate-read` |
| `removed-endpoints` | Trả 410 cho gateway-owned endpoints | `v2-contract-parity` |
| `write-contracts` | Chuẩn bị contract issue/revoke/renew/export/import/bulk | `v2-contract-parity`, `certificate-identity` |
| `gateway-governance` | Cập nhật AGENTS.md, regression matrix và integration notes | Tất cả module trên |

**Build order:** `v2-contract-parity` → `certificate-identity` → `certificate-read` → `certificate-stats`; `removed-endpoints` có thể song song sau `v2-contract-parity`; sau đó `write-contracts` → `gateway-governance`.

## 3. Canonical v2 Contract

### 3.1. Envelope

Nguồn chuẩn là `backend/utils/response.py` và các route v2:

**Success**

```json
{
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

### 3.6. Not-yet-implemented write/import/bulk endpoints

These routes remain `501 Not Implemented` in this phase and require no EJBCA call:

```text
POST /certificates
POST /certificates/:id/revoke
POST /certificates/:id/unhold
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

Before implementation, each route needs a v2 parity record for request validation, auth permission, success body/message/meta, error status/body, content type, audit, idempotency, retry, partial failure and EJBCA REST operation/version. Import/bulk are gateway use cases, not 1:1 passthroughs.

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

```bash
docker compose --env-file .env.ejbca.example \
  -f docker-compose.yml -f docker-compose.dev.yml \
  --profile migration up --build
```

EJBCA runtime hiện lấy từ compose:

- image mặc định `keyfactor/ejbca-ce:latest`;
- gateway gọi `https://ejbca:8443/ejbca/ejbca-rest-api` trong Docker network;
- gateway expose port `8081`;
- EJBCA dev expose HTTPS `8444` và HTTP `8082` trên loopback;
- mTLS files mount từ `secrets/ejbca`.

Trước write implementation phải xác minh và khóa EJBCA image version.

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
- Mười hai write/import/bulk routes trả 501, không gọi adapter/v2.
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

- [ ] `GET /certificates` v3 có success envelope/field/pagination tương thích v2 và frontend.
- [ ] `GET /certificates/stats` v3 khớp định nghĩa v2, gồm `sources` dạng list và các count chính.
- [ ] `GET /certificates/:id` tự lookup qua EJBCA, không qua v2, với 404/409 rõ ràng.
- [ ] Multi-value filters và aliases được test.
- [ ] Read routes có permission `read:certificates`.
- [ ] Bảy endpoint gateway-owned trả 410 ổn định và không gọi EJBCA/v2.
- [ ] Mười hai write/import/bulk routes trả 501 trong phase này và có parity matrix.
- [ ] `ejbca-gateway/AGENTS.md` không còn yêu cầu các dependency/convention không tồn tại.
- [ ] Có runtime evidence trên EJBCA instance và test chứng minh v3 không phụ thuộc v2.

## 10. Open Questions

Các câu hỏi này không chặn việc lập planning nhưng phải được giải quyết trong planning/verification:

1. EJBCA payload/version đang chạy cung cấp issuer/CA, status, dates và serial ở format nào?
2. Có nguồn gateway-owned được phê duyệt cho `has_private_key`, `template_name`, compliance và `source` hay không?
3. Integration path frontend → `/api/v3` sẽ là reverse proxy hay frontend base URL/config thay đổi?
4. EJBCA image tag nào sẽ được khóa trước write implementation?
5. Những field v2 nào bắt buộc phải có giá trị thực, thay vì null/default, khi chạy production?
