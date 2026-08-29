import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { SiteConfigService, SiteConfig } from '../../../core/services/site-config.service';
import { CloudinaryService } from '../../../core/services/cloudinary.service';
import { AuthService } from '../../../core/services/auth.service';
import { AdminSidebarComponent } from '../../../shared/components/admin-sidebar/admin-sidebar.component';

@Component({
  selector: 'app-site-cms',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AdminSidebarComponent],
  templateUrl: './site-cms.component.html',
  styleUrl: './site-cms.component.scss'
})
export class SiteCmsComponent {
  cmsForm: FormGroup;
  isSaving = signal<boolean>(false);
  isUploadingImage = signal<boolean>(false);
  successMessage = signal<string>('');

  constructor(
    private fb: FormBuilder,
    public siteConfigService: SiteConfigService,
    private cloudinaryService: CloudinaryService,
    public authService: AuthService
  ) {
    const current = this.siteConfigService.config();

    this.cmsForm = this.fb.group({
      storeName: [current.storeName, [Validators.required]],
      heroBadge: [current.heroBadge, [Validators.required]],
      heroTitle: [current.heroTitle, [Validators.required]],
      heroSubtitle: [current.heroSubtitle, [Validators.required]],
      heroImageUrl: [current.heroImageUrl, [Validators.required]],
      catalogTitle: [current.catalogTitle, [Validators.required]],
      footerAddress: [current.footerAddress, [Validators.required]],
      footerPhone: [current.footerPhone, [Validators.required]],
      businessHours: [current.businessHours, [Validators.required]]
    });
  }

  onImageSelected(event: any): void {
    const file: File = event.target.files[0];
    if (file) {
      this.isUploadingImage.set(true);
      this.successMessage.set('');
      this.cloudinaryService.uploadImage(file).subscribe({
        next: (url) => {
          this.isUploadingImage.set(false);
          if (url) {
            this.cmsForm.patchValue({ heroImageUrl: url });
            this.successMessage.set('Cambios guardados');
            this.autoClearSuccess();
          } else {
            alert('Error al subir la imagen.');
          }
        },
        error: () => {
          this.isUploadingImage.set(false);
          alert('Error de conexión al subir la imagen.');
        }
      });
    }
  }

  onSubmit(): void {
    if (this.cmsForm.invalid) {
      this.cmsForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    const updatedValues: SiteConfig = this.cmsForm.value;

    this.siteConfigService.updateConfig(updatedValues);

    setTimeout(() => {
      this.isSaving.set(false);
      this.successMessage.set('Cambios guardados');
      this.autoClearSuccess();
    }, 400);
  }

  private autoClearSuccess(): void {
    setTimeout(() => {
      this.successMessage.set('');
    }, 4000);
  }

  resetDefaults(): void {
    if (confirm('¿Deseas restablecer todos los textos e imágenes a los valores predeterminados?')) {
      this.siteConfigService.resetToDefaults();
      const defaults = this.siteConfigService.config();
      this.cmsForm.patchValue(defaults);
      this.successMessage.set('Cambios guardados');
      this.autoClearSuccess();
    }
  }

  onLogout(): void {
    this.authService.logout();
  }
}
