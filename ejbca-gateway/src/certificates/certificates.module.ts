import { Module } from '@nestjs/common';
import { CertificatesController } from '../facades.controller';
import { CertificatesService } from './certificates.service';

@Module({ controllers: [CertificatesController], providers: [CertificatesService] })
export class CertificatesModule {}
