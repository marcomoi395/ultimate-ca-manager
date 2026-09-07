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
}

@Controller('cas')
export class CasController {
  @Get() list() { return ok([]); }
  @Get('system/chain-repair') chainRepair() { return ok({ status: 'unverified' }); }
}

@Controller('csrs')
export class CsrsController {
  @Get() list() { return ok([]); }
}

@Controller('templates')
export class TemplatesController {
  @Get() list() { return ok([]); }
}

@Controller('supporting')
export class SupportingController {
  @Post('import/analyze') analyze() { return ok({ status: 'analyzed' }); }
  @Post('import/execute') execute() { return ok({ status: 'accepted' }); }
  @Get('eku') eku() { return ok({ enabled: false }); }
  @Get('msca') msca() { return ok({ enabled: false }); }
  @Get('hsm') hsm() { return ok({ providers: [] }); }
}
