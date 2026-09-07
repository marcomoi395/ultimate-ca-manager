import { Module } from '@nestjs/common';
import { TemplatesController } from '../facades.controller';
import { TemplatesService } from './templates.service';

@Module({ controllers: [TemplatesController], providers: [TemplatesService] })
export class TemplatesModule {}
