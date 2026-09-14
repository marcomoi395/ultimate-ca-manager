import { Controller } from '@nestjs/common';

@Controller('templates')
export class TemplatesController {}
// Disabled because this deployment reports EJBCA REST End Entity Management as unavailable.
// Direct routes previously mapped to /v1/endentity:
// GET /templates
// GET /templates/:id
