import { Injectable, isDevMode } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LoggerService {
  log(message: unknown, ...optionalParams: unknown[]) {
    if (isDevMode()) {
      console.log(message, ...optionalParams);
    }
  }

  error(message: unknown, ...optionalParams: unknown[]) {
    if (isDevMode()) {
      console.error(message, ...optionalParams);
    }
  }

  warn(message: unknown, ...optionalParams: unknown[]) {
    if (isDevMode()) {
      console.warn(message, ...optionalParams);
    }
  }

  info(message: unknown, ...optionalParams: unknown[]) {
    if (isDevMode()) {
      console.info(message, ...optionalParams);
    }
  }
}
