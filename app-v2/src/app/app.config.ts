import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { PreloadAllModules, RouteReuseStrategy, provideRouter, withComponentInputBinding, withPreloading } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    // one look everywhere: iOS transitions, swipe-back, large titles
    provideIonicAngular({ mode: 'ios', swipeBackEnabled: true, backButtonText: '', animated: true, innerHTMLTemplatesEnabled: false }),
    provideRouter(routes, withComponentInputBinding(), withPreloading(PreloadAllModules)),
  ],
};
