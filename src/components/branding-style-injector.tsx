"use client";

import { useEffect } from "react";

/**
 * Componente que injeta estilos de branding do localStorage
 * ANTES de qualquer renderização para evitar flash
 * Também popula window.__BRANDING__ para uso do BrandingContext
 */
export function BrandingStyleInjector() {
  useEffect(() => {
    // Este código só roda uma vez no mount
    // Mas o style tag já foi injetado pelo script inline
  }, []);

  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            try {
              var hexRe = /^#[0-9a-fA-F]{3,8}$/;
              function safeColor(c) { return (typeof c === 'string' && hexRe.test(c)) ? c : null; }

              var cached = localStorage.getItem('branding_settings');
              if (cached) {
                var settings = JSON.parse(cached);
                window.__BRANDING__ = settings;
                var color = safeColor(settings.primaryColor);
                if (color) {
                  var style = document.createElement('style');
                  style.id = 'branding-override';
                  style.textContent = ':root { --primary: ' + color + ' !important; --ring: ' + color + ' !important; }';
                  document.head.insertBefore(style, document.head.firstChild);
                }
              } else {
                var savedColor = safeColor(localStorage.getItem('branding_primary_color'));
                if (savedColor) {
                  var style = document.createElement('style');
                  style.id = 'branding-override';
                  style.textContent = ':root { --primary: ' + savedColor + ' !important; --ring: ' + savedColor + ' !important; }';
                  document.head.insertBefore(style, document.head.firstChild);
                }
              }
            } catch (e) {}
          })();
        `,
      }}
    />
  );
}
