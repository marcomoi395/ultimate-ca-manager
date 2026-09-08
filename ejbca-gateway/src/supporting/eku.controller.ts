import { Controller, Get } from '@nestjs/common';
import { CatalogService } from './catalog.service';

// TODO(v3): EJBCA REST does not expose an EKU catalog; this mirrors the UCM
// backend catalog (backend/utils/cert_extensions.py EKU_NAMES). Replace with
// an upstream source when EJBCA provides one.
@Controller('eku')
export class EkuController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('known')
  known() { return this.catalog.knownEku(); }
}
