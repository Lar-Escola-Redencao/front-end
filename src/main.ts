import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

if (document.fonts) {
  for (const [familia, classe] of [
    ['Material Icons', 'material-icons-prontos'],
    ['Material Symbols Outlined', 'material-symbols-prontos'],
  ]) {
    document.fonts.load(`24px "${familia}"`).then(fontes => {
      if (fontes.length) document.documentElement.classList.add(classe);
    }).catch(() => console.warn(`Não foi possível carregar os ícones ${familia}.`));
  }
}

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
