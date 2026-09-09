import { Module } from '@nestjs/common';
import { CertificatesController } from './certificates.controller';
import { CertificatesService } from './certificates.service';
import { CertificateWriteInfrastructure } from './write-infrastructure';

@Module({
  controllers: [CertificatesController],
  providers: [CertificateWriteInfrastructure, CertificatesService],
})
export class CertificatesModule {}
