import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { serverApiOriginInterceptor } from './core/interceptors/server-api-origin.interceptor';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    // Re-provides HttpClient with the server-only interceptor that turns the
    // relative `/api` into an absolute URL Node's fetch can actually resolve.
    provideHttpClient(withFetch(), withInterceptors([serverApiOriginInterceptor])),
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
