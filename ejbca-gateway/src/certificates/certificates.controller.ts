import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { CertificatesService } from "./certificates.service";
import {
  parseCertificateListQuery,
  type CertificateListQueryInput,
} from "./dtos/certificate-list.query";

@Controller("certificates")
export class CertificatesController {
  constructor(private readonly service: CertificatesService) {}

  @Get("stats")
  stats() {
    return this.service.stats();
  }

  @Get("compliance")
  compliance() {
    return this.service.compliance();
  }

  @Get("lint/status")
  lintStatus() {
    return this.service.lintStatus();
  }

  @Get()
  list(@Query() query: CertificateListQueryInput) {
    return this.service.list(parseCertificateListQuery(query));
  }

  private requireObject(body: unknown): Record<string, unknown> {
    if (!body || typeof body !== "object" || Array.isArray(body))
      throw new Error("Certificate request body must be an object");
    return body as Record<string, unknown>;
  }

  private requireIds(body: unknown): Record<string, unknown> {
    const value = this.requireObject(body);
    if (
      !Array.isArray(value.ids) ||
      value.ids.length === 0 ||
      value.ids.some((id) => typeof id !== "string")
    ) {
      throw new Error(
        "Certificate bulk request requires a non-empty ids array",
      );
    }
    return value;
  }

  create(@Body() body: unknown) {
    const value = this.requireObject(body);
    if (
      typeof value.cn !== "string" ||
      !value.cn ||
      typeof value.ca_id !== "string" ||
      !value.ca_id
    )
      throw new Error("Certificate create requires cn and ca_id");
    return this.service.mutate("/v1/certificate", "POST", value);
  }

  @Patch(":id")
  rename(@Param("id") id: string, @Body() body: unknown) {
    return this.service.mutate(
      `/v1/certificate/${encodeURIComponent(id)}`,
      "PATCH",
      this.requireObject(body),
    );
  }

  @Post("import")
  import(@Body() body: unknown) {
    return this.service.mutate(
      "/v1/certificate/import",
      "POST",
      this.requireObject(body),
    );
  }

  @Post("export")
  exportAll(@Body() body: unknown) {
    return this.service.mutate(
      "/v1/certificate/export",
      "POST",
      this.requireObject(body),
    );
  }

  @Post("bulk/:operation")
  bulk(@Param("operation") operation: string, @Body() body: unknown) {
    return this.service.mutate(
      `/v1/certificate/bulk/${operation}`,
      "POST",
      this.requireIds(body),
    );
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.service.mutate(
      `/v1/certificate/${encodeURIComponent(id)}`,
      "DELETE",
    );
  }

  revoke(@Param("id") id: string, @Body() body: unknown) {
    return this.service.mutate(
      `/v1/certificate/${encodeURIComponent(id)}/revoke`,
      "POST",
      this.requireObject(body),
    );
  }

  @Post(":id/unhold")
  unhold(@Param("id") id: string) {
    return this.service.mutate(
      `/v1/certificate/${encodeURIComponent(id)}/unhold`,
      "POST",
    );
  }

  @Post(":id/renew")
  renew(@Param("id") id: string) {
    return this.service.mutate(
      `/v1/certificate/${encodeURIComponent(id)}/renew`,
      "POST",
    );
  }

  export(@Param("id") id: string, @Body() body: unknown) {
    return this.service.mutate(
      `/v1/certificate/${encodeURIComponent(id)}/export`,
      "POST",
      this.requireObject(body),
    );
  }

  uploadKey(@Param("id") id: string, @Body() body: unknown) {
    const value = this.requireObject(body);
    if (typeof value.key !== "string" || !value.key)
      throw new Error("Certificate key is required");
    return this.service.mutate(
      `/v1/certificate/${encodeURIComponent(id)}/key`,
      "POST",
      value,
    );
  }

  @Post(":id/submit-ct")
  submitToCt(@Param("id") id: string) {
    return this.service.mutate(
      `/v1/certificate/${encodeURIComponent(id)}/submit-ct`,
      "POST",
    );
  }

  @Get(":id/lint")
  lint(@Param("id") id: string, @Query("profile") profile?: string) {
    return this.service.lint(id, profile);
  }

  @Get(":id")
  detail(@Param("id") id: string) {
    return this.service.getById(id);
  }
}
