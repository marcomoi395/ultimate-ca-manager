import { Controller, Get, Param } from "@nestjs/common";
import { CatalogService } from "./catalog.service";

@Controller("microsoft-cas")
export class MscaController {
  constructor(private readonly catalog: CatalogService) {}

  @Get("enabled")
  enabled() {
    return this.catalog.microsoftCas();
  }

  @Get("requests/pending")
  pending() {
    return this.catalog.mscaPendingRequests();
  }

  @Get(":id/templates")
  templates(@Param("id") id: string) {
    return this.catalog.mscaTemplates(id);
  }

  @Get(":id/requests/:requestId")
  request(@Param("requestId") requestId: string) {
    return this.catalog.mscaRequestStatus(requestId);
  }
}
