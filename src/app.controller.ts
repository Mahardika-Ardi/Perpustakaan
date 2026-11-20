import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { AppService } from './app.service.js';

// VERSION_NEUTRAL: GET / sengaja tanpa prefix /api & tanpa segmen versi /v1
// agar tetap jadi pengecek server hidup (dikecualikan di main.ts).
@Controller({ version: VERSION_NEUTRAL })
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello() {
    return this.appService.getHello();
  }
}
