import { Injectable } from '@nestjs/common';
import { API_VERSION, APP_NAME, APP_VERSION } from './app-info.js';

@Injectable()
export class AppService {
  // GET / — pengecek server hidup sekaligus info versi app & API.
  getHello() {
    return {
      name: APP_NAME,
      version: APP_VERSION,
      apiVersion: `v${API_VERSION}`,
      status: 'ok' as const,
    };
  }
}
