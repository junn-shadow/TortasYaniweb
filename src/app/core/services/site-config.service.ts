import { Injectable, signal } from '@angular/core';

export interface SiteConfig {
  storeName: string;
  heroBadge: string;
  heroTitle: string;
  heroSubtitle: string;
  heroImageUrl: string;
  catalogTitle: string;
  footerAddress: string;
  footerPhone: string;
  businessHours: string;
}

@Injectable({
  providedIn: 'root'
})
export class SiteConfigService {
  private readonly storageKey = 'web_site_config';

  private readonly defaultConfig: SiteConfig = {
    storeName: 'Tortas Yani',
    heroBadge: 'Lo mejor de la repostería artesanal',
    heroTitle: 'Personaliza tu Torta Perfecta',
    heroSubtitle: 'Diseña tu torta con los sabores, pisos y decoración que más te gusten, o habla con nuestra pastelera virtual Yani para que te recomiende la ideal.',
    heroImageUrl: 'https://res.cloudinary.com/ddfzttgyr/image/upload/v1774234891/Torta_Matrimonial_qhxegx.png',
    catalogTitle: 'Nuestras Especialidades',
    footerAddress: 'Plaza Túpac Amaru, Wanchaq, Cusco',
    footerPhone: '919 576 034',
    businessHours: '10:00 AM - 08:00 PM'
  };

  config = signal<SiteConfig>(this.defaultConfig);

  constructor() {
    this.loadConfig();
  }

  private optimizeCloudinaryUrl(url: string): string {
    if (!url) return '';
    if (url.includes('cloudinary.com') && url.includes('/upload/')) {
      if (!url.includes('f_auto') && !url.includes('q_auto')) {
        return url.replace('/upload/', '/upload/f_auto,q_auto,w_1200/');
      }
    }
    return url;
  }

  private loadConfig(): void {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const merged = { ...this.defaultConfig, ...parsed };
          merged.heroImageUrl = this.optimizeCloudinaryUrl(merged.heroImageUrl);
          this.config.set(merged);
        } catch (e) {
          const def = { ...this.defaultConfig };
          def.heroImageUrl = this.optimizeCloudinaryUrl(def.heroImageUrl);
          this.config.set(def);
        }
      } else {
        const def = { ...this.defaultConfig };
        def.heroImageUrl = this.optimizeCloudinaryUrl(def.heroImageUrl);
        this.config.set(def);
      }
    } else {
      const def = { ...this.defaultConfig };
      def.heroImageUrl = this.optimizeCloudinaryUrl(def.heroImageUrl);
      this.config.set(def);
    }
  }

  updateConfig(newConfig: Partial<SiteConfig>): void {
    const updated = { ...this.config(), ...newConfig };
    updated.heroImageUrl = this.optimizeCloudinaryUrl(updated.heroImageUrl);
    this.config.set(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.storageKey, JSON.stringify(updated));
    }
  }

  resetToDefaults(): void {
    const def = { ...this.defaultConfig };
    def.heroImageUrl = this.optimizeCloudinaryUrl(def.heroImageUrl);
    this.config.set(def);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.storageKey);
    }
  }
}
