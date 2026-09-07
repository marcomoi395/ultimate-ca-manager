# NestJS Development Rules

This document defines the mandatory conventions for developing or modifying source code in this repository.

## 1. Mandatory Development Workflow

1. Review the related module, `common/`, DTOs, decorators, repositories, and tests before making changes.
2. Clearly define the endpoint contract: HTTP method, path, params, query, body, response, status codes, and errors.
3. Implement or update DTOs, filters, services, repositories, and controllers according to their respective responsibilities.
4. Add tests for new behavior or fixed bugs.
5. Run the appropriate type checks, build, tests, lint, and formatting checks before completion.
6. Do not modify code unrelated to the requested change.

## 2. Endpoint and DTO Rules

- Every endpoint must have a request DTO for its input data and a response DTO for its public output data.
- DTO filenames must explicitly identify their role using `.req.dto.ts` for request DTOs and `.res.dto.ts` for response DTOs. In the cats module, `create-cat.req.dto.ts`, `list-cats.req.dto.ts`, and `cat.res.dto.ts` are the corresponding DTOs; a list endpoint may reuse an item response DTO when the item shape is the public contract.
- Request DTOs must declare validation through the shared custom validation decorators in `src/common/decorators/custom-validator.decorator.ts` and apply necessary transformations with `class-transformer`.
- Response DTOs must extend `BaseMapperDto` from `src/common/dtos/base-mapper.dto.ts` and use `AutoMapDecorator` (or its nested variants) from `src/common/decorators/automap.decorator.ts` for mapped response properties.
- Response DTOs must describe only public data that may be returned; do not return entities directly if they may expose internal fields.
- Request DTOs for paginated endpoints must extend the shared `PaginationReqDto` and must not redeclare `page` or `limit`; pagination behavior and defaults belong to the shared DTO/decorator.
- Endpoints returning lists, paginated data, or standard response envelopes must use shared DTOs from `common/dtos` when applicable.
- Controllers must use `AppResponse(ResponseDto)` from `src/common/decorators/app-response.decorator.ts` to wrap successful responses in the standard `AppResponseDto<T>` envelope.
- `AppResponseDto<T>` must be treated as the standard success response contract: `response` contains the mapped response DTO/data, `meta` contains a `StatusCode`, and optional `pagination` and `notification` fields must follow their shared contracts.
- The `AppResponse` decorator must receive the endpoint's response DTO and be applied at controller or route level so Swagger documents the wrapped response schema correctly.
- Controllers must declare explicit return types and Swagger metadata for requests, responses, params, queries, and error codes when the endpoint is public.
- Do not use `any` when an interface, type, or specific DTO can describe the data.

### Cats module example

Use `src/cats/` as the concrete reference when applying these rules:

```text
src/cats/
├── cats.controller.ts       # HTTP binding, Swagger, response mapping
├── cats.service.ts          # business/use-case orchestration
├── cats.repository.ts       # TypeORM access and pagination
├── cats.filter.ts           # query-builder filters
├── dtos/
│   ├── create-cat.req.dto.ts
│   ├── list-cats.req.dto.ts
│   └── cat.res.dto.ts
├── entities/cat.entity.ts
└── interfaces/*.interface.ts
```

For `POST /v1/cats`:

1. `CreateCatReqDto` validates `name` with shared `IsValidText` and documents the request with Swagger.
2. `CatsController.create()` calls `CatsService.create()` and maps the returned entity to `CatResDto`.
3. `@AppResponse(CatResDto)` documents the standard `AppResponseDto<CatResDto>` envelope; the successful body is `new AppResponseDto(new CatResDto(cat))`.

For `GET /v1/cats`:

1. `ListCatsReqDto` extends `PaginationReqDto` and adds the optional `name` filter; it does not redeclare `page` or `limit`.
2. `CatsFilter.filterByName()` contains only the case-insensitive query-builder condition and is registered with `@QueryFilter({ order: 1 })`.
3. `CatsRepository.findAll()` creates the query builder, calls `applyAllFilters()`, and uses `paginate(queryBuilder, { page, limit, route: '/cats' })`.
4. `CatsService.list()` returns raw `Pagination<CatEntity>` data.
5. `CatsController.list()` maps items to `CatResDto` and returns `AppResponseDto.fromNestJsPagination(data, result.meta)`.

The corresponding endpoint contract depends on how the application is bootstrapped:

- In `test/cats.e2e-spec.ts`, the module is created directly, so the tested routes are `/cats`.
- In `src/main.ts`, URI versioning and the configured global prefix are enabled. With the default configuration shown there, the production route is `/api-v1/app/v1/cats` (the prefix may be changed by configuration).

The request and response shapes are the same in both cases:

```http
POST /cats
Content-Type: application/json

{ "name": "Milo" }
```

```json
{
  "response": {
    "id": 1,
    "name": "Milo",
    "createdAt": "2026-01-01T00:00:00.000Z"
  },
  "meta": { "status": 1000, "msg": "Success" }
}
```

```http
GET /cats?name=mil&page=1&limit=10
```

```json
{
  "response": [
    { "id": 1, "name": "Milo", "createdAt": "2026-01-01T00:00:00.000Z" }
  ],
  "meta": { "status": 1000, "msg": "Success" },
  "pagination": {
    "currentPage": 1,
    "last": true,
    "recordsPerPage": 10,
    "totalPages": 1,
    "totalRecords": 1
  }
}
```

When documenting or testing another bootstrap path, resolve the final URL from both the controller version (`version: '1'`) and the configured global prefix instead of copying a hard-coded route.

## 3. Responsibilities by Layer

### Controller

- Receives HTTP requests and returns HTTP responses.
- Binds params, queries, and bodies, calls the service, and maps raw data to response DTOs.
- Must apply `AppResponse(ResponseDto)` for successful endpoint responses instead of documenting the response DTO directly when the standard envelope is required.
- Must not contain business logic, database queries, or filter logic.
- Response serialization or mapping must be handled in the controller or through a controller-level interceptor/decorator.

### Service

- Contains business logic and coordinates repositories or integrations.
- Returns raw/domain data; it must not implement or return response DTOs.
- Must not depend on controller response DTOs.
- May accept request DTOs as input contracts, but its output must remain independent of the presentation layer.
- If the same logic is used more than twice in a service, extract it into a dedicated function. If the logic is global or shared across domains, move it to `src/common/`.
- All asynchronous operations must be awaited or explicitly returned; do not leave floating promises.

### Repository

- Responsible for data access and TypeORM queries.
- Reuse `BaseRepository` and shared repository helpers when appropriate.
- Must not contain HTTP response formatting or response DTO logic.
- Controllers must not access TypeORM repositories directly when the service is already the module boundary.

## 4. Validation and Shared Components

- DTOs must not import or use `class-validator` decorators directly.
- DTO validation must use the custom validation decorators exported from `src/common/decorators/custom-validator.decorator.ts` whenever a matching decorator exists.
- New custom validation behavior must be added to `custom-validator.decorator.ts` (or another shared validator under `src/common/`) before it is used in a DTO; do not duplicate composed `class-validator` decorators across DTOs.
- Direct `class-validator` usage is permitted only inside shared custom validator implementations in `src/common/`, not in feature/module DTOs.
- Before creating a new validator, check whether an existing custom validator can be reused.
- Validators shared by multiple modules must be placed in `src/common/`, with a clear name and contract.
- Do not duplicate the same validation logic across DTOs or services.
- Input validation must happen at the request boundary; business rules must still be checked in the service when correctness must be guaranteed independently of HTTP.
- Do not bypass `ValidationPipe` or manually parse input when an existing pipe or decorator already provides that behavior.

## 5. Pagination

- Mọi endpoint phân trang phải dùng decorator, `PaginationReqDto` và helper đã triển khai trong `src/common/`.
- Request DTO phân trang phải kế thừa `PaginationReqDto`; không tự khai báo `page`, `limit`, `offset` hoặc lặp lại validation/giá trị mặc định của phân trang.
- Việc truy vấn phân trang bắt buộc sử dụng `paginate` từ package `nestjs-typeorm-paginate` trên `queryBuilder`, theo mẫu `const { items, meta } = await paginate(queryBuilder, { page, limit })`.
- Không được tự triển khai pagination bằng `slice`, `offset`, `Math.ceil`, `Math.floor`, tự đếm tổng bản ghi hoặc tự tính tổng số trang trong module/helper riêng.
- Repository phải trả về dữ liệu raw cùng `meta` do `nestjs-typeorm-paginate` cung cấp; service không được chuyển đổi sang response DTO.
- Response phân trang phải dùng `AppResponseDto.fromNestJsPagination(items, meta)` sau khi map `items` sang response DTO tại controller.
- Không được tự gán `result.pagination` hoặc tự dựng lại response envelope trong controller.
- Valid pagination values must be constrained, with defaults provided by shared components.

## 6. Query Filters

- For endpoints that accept query parameters and require filtering, implement filters in a separate file for the relevant module or domain.
- Filters must not be merged into services or written directly in controllers.
- Filters must use the `QueryFilter` decorator from `src/common/decorators`.
- Filters must be applied through `applyAllFilters`; do not invoke individual filters manually when the shared mechanism is sufficient.
- Filters should only build query-builder conditions and must not contain response mapping or business workflows.
- Declare an explicit `order` when filter execution depends on ordering.

## 7. Common Components and Directory Structure

- Domain/module-specific interfaces must be declared in a dedicated interface file within the owning module; do not define reusable interfaces inline inside controllers, services, repositories, DTOs, or unrelated files.
- Interfaces shared across multiple modules or representing global application contracts must be placed in `src/common/interfaces/`.
- Interface files should have one clear responsibility and use a consistent naming convention, such as `*.interface.ts`.
- Do not move domain-specific interfaces into `common/` merely for import convenience.
- Place genuinely shared components in `src/common/`, including decorators, validators, pipes, helpers, base DTOs, exceptions, base repositories, constants, and pure utilities.
- Each file should have one primary responsibility; do not combine filters, DTOs, decorators, interfaces, and helpers into unnecessarily large files.
- Prefer reusing existing common interfaces and components before implementing new ones.
- Follow the existing import aliases and NestJS module structure.

## 8. Responses, Errors, and Security

- Successful responses must follow the project's standard envelope and metadata contract when required by the endpoint.
- The standard success envelope must be documented and applied through `AppResponse(ResponseDto)` from `src/common/decorators/app-response.decorator.ts`; do not replace it with a custom response schema without a documented exception.
- `AppResponseDto` must use `StatusCode.SUCCESS` for successful responses unless a different explicitly defined status contract is required.
- Notification data in `AppResponseDto.notification` must use the shared notification interface/contract; `common/` must not import a domain-specific response DTO.
- Errors must use shared exceptions and filters; do not return ad hoc errors with `res.status(...).send(...)` in controllers.
- Do not log passwords, tokens, secrets, sensitive personal data, or complete request bodies unless strictly necessary.

## 9. Testing and Code Quality

- Every new behavior or bug fix must have appropriate tests, including at least the success case and important error or boundary cases.
- Tests must verify the endpoint contract, validation, pagination/filter behavior, and response mapping when those areas are affected.
- Before completion, run the checks relevant to the change: tests, build, lint, and formatting scripts defined in `package.json`.
- Do not disable or weaken lint/test rules to hide failures.
- [ ] Each endpoint has request and response DTOs.
- [ ] Successful controller responses use `AppResponse(ResponseDto)` from `src/common/decorators/app-response.decorator.ts`.
- [ ] Swagger describes the wrapped `AppResponseDto` response schema.
- [ ] `AppResponseDto` uses the shared `StatusCode` contract, with pagination and notification fields mapped through common contracts.
- [ ] Response DTOs extend `BaseMapperDto` and use `AutoMapDecorator` or nested mapping decorators.
- [ ] Validation uses shared components from `src/common/`.
- [ ] Services return raw/domain data and do not depend on response DTOs.
- [ ] DTO không import trực tiếp `class-validator`; validation dùng custom decorators trong `src/common/decorators/custom-validator.decorator.ts`.
- [ ] Pagination endpoints use shared pagination decorators, DTOs, helpers, and the `AppPaginationDto` contract.
- [ ] Pagination queries use `paginate(queryBuilder, { page, limit })` from `nestjs-typeorm-paginate`.
- [ ] No module/helper manually calculates pagination with `slice`, offsets, `Math.ceil`, `Math.floor`, or duplicated totals.
- [ ] Paginated responses use `AppResponseDto.fromNestJsPagination(items, meta)`.
- [ ] Query filters are independent files using `QueryFilter` and `applyAllFilters`.
- [ ] Repeated logic is extracted, and global logic is placed in `src/common/`.
- [ ] Appropriate tests and quality checks have been run.
- [ ] DTO filenames clearly distinguish request (`.req.dto.ts`) and response (`.res.dto.ts`) roles.
- [ ] Module-specific interfaces are in dedicated `*.interface.ts` files.
- [ ] Interfaces shared globally are placed in `src/common/interfaces/`.
- [ ] The diff contains only changes relevant to the request.
