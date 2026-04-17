"use client";

import { useEffect } from "react";
import { useBranding } from "@/contexts/branding-context";

export function DynamicMetadata() {
  const { settings } = useBranding();

  useEffect(() => {
    if (typeof document === 'undefined') return;

    // Update page title
    if (settings.appName) {
      document.title = settings.appName;
    }

    // Update favicon usando apenas arquivos estáticos
    const faviconUrl = '/favicon.ico';
    const favicon96Url = '/favicon-96x96.png';
    const appleTouchUrl = '/apple-touch-icon.png';
    
    if (faviconUrl && document.head) {
      // Safari precisa de múltiplos formatos e tamanhos
      
      // 1. Favicon PNG 96x96 (Safari - alta resolução)
      let favicon96 = document.querySelector("link[rel='icon'][sizes='96x96']") as HTMLLinkElement;
      if (!favicon96) {
        favicon96 = document.createElement('link');
        favicon96.rel = 'icon';
        favicon96.type = 'image/png';
        favicon96.sizes = '96x96';
        favicon96.href = favicon96Url;
        document.head.appendChild(favicon96);
      }

      // 2. Favicon ICO (fallback - todos os browsers)
      let faviconIco = document.querySelector("link[rel='icon'][type='image/x-icon']") as HTMLLinkElement;
      if (!faviconIco) {
        faviconIco = document.createElement('link');
        faviconIco.rel = 'icon';
        faviconIco.type = 'image/x-icon';
        faviconIco.href = faviconUrl;
        document.head.appendChild(faviconIco);
      }

      // 3. Shortcut icon (Safari legacy)
      let shortcutIcon = document.querySelector("link[rel='shortcut icon']") as HTMLLinkElement;
      if (!shortcutIcon) {
        shortcutIcon = document.createElement('link');
        shortcutIcon.rel = 'shortcut icon';
        shortcutIcon.type = 'image/x-icon';
        shortcutIcon.href = faviconUrl;
        document.head.appendChild(shortcutIcon);
      }

      // 5. Apple touch icon (iOS/Safari)
      let appleTouchIcon = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement;
      if (!appleTouchIcon) {
        appleTouchIcon = document.createElement('link');
        appleTouchIcon.rel = 'apple-touch-icon';
        appleTouchIcon.sizes = '180x180';
        appleTouchIcon.href = appleTouchUrl;
        document.head.appendChild(appleTouchIcon);
      }

      // 6. Apple touch icon precomposed (Safari iOS legacy)
      let applePrecomposed = document.querySelector("link[rel='apple-touch-icon-precomposed']") as HTMLLinkElement;
      if (!applePrecomposed) {
        applePrecomposed = document.createElement('link');
        applePrecomposed.rel = 'apple-touch-icon-precomposed';
        applePrecomposed.sizes = '180x180';
        applePrecomposed.href = appleTouchUrl;
        document.head.appendChild(applePrecomposed);
      }
    }

    // Update theme color
    if (document.head) {
      let metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (!metaThemeColor) {
        metaThemeColor = document.createElement('meta');
        metaThemeColor.setAttribute('name', 'theme-color');
        document.head.appendChild(metaThemeColor);
      }
      metaThemeColor.setAttribute('content', settings.primaryColor || '#22C55E');
    }

  }, [settings.appName, settings.primaryColor]);

  return null;
}
