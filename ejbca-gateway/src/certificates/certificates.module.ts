import { Module } from '@nestjs/common';
import { CertificatesController } from '../facades.controller';

@Module({ controllers: [CertificatesController] })
export class CertificatesModule {}
