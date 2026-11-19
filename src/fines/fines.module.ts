import { Module } from '@nestjs/common';
import { FinesController } from './fines.controller.js';
import { FinesService } from './fines.service.js';

@Module({
  controllers: [FinesController],
  providers: [FinesService],
  exports: [FinesService],
})
export class FinesModule {}
