import { Controller, Get, Post } from '@nestjs/common';
import { V3SuccessEnvelope } from './common/contracts';

function ok<T>(data: T): V3SuccessEnvelope<T> {
  return { data, message: 'ok', meta: {} };
}

@Controller('certificates')
export class CertificatesController {
  @Get() list() { return ok([]); }
  @Get('stats') stats() { return ok({ total: 0 }); }
  @Get('compliance') compliance() { return ok({ status: 'unverified' }); }
  @Get('lint/status') lintStatus() { return ok({ status: 'unverified' }); }
  @Get(':id') detail() { return ok({}); }
  @Get(':id/lint') lint() { return ok({ status: 'unverified' }); }
}

@Controller('cas')
export class CasController {
  @Get() list() { return ok([]); }
  @Get(':id/certificates') certificates() { return ok([]); }
  @Get(':id') detail() { return ok({}); }
}

@Controller('system')
export class SystemController {
  @Get('chain-repair') chainRepair() { return ok({ status: 'unverified' }); }
  @Get('hsm-status') hsmStatus() { return ok({ status: 'unverified' }); }
}

@Controller('csrs')
export class CsrsController {
  @Get() list() { return ok([]); }
  @Get('history') history() { return ok([]); }
  @Get(':id') detail() { return ok({}); }
}

@Controller('templates')
export class TemplatesController {
  @Get() list() { return ok([]); }
  @Get(':id') detail() { return ok({ usageCount: 0 }); }
}

@Controller('cas/:caId/templates')
export class CaTemplatesController {
  @Get() list() { return ok([]); }
}

@Controller('import')
export class ImportController {
  @Post('analyze') analyze() { return ok({ status: 'analyzed' }); }
  @Post('execute') execute() { return ok({ status: 'blocked' }); }
}

@Controller('eku')
export class EkuController {
  @Get('known') known() { return ok([]); }
}

@Controller('microsoft-cas')
export class MscaController {
  @Get('enabled') enabled() { return ok({ enabled: false }); }
  @Get('requests/pending') pending() { return ok([]); }
  @Get(':id/templates') templates() { return ok([]); }
  @Get(':id/requests/:requestId') request() { return ok({ status: 'unavailable' }); }
}

@Controller('hsm')
export class HsmController {
  @Get('providers') providers() { return ok([]); }
  @Get('keys') keys() { return ok([]); }
}
