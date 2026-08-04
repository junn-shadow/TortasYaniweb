import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { CloudinaryService } from '../../../core/services/cloudinary.service';
import { HeaderComponent } from '../../../shared/components/header/header.component';
import { User, Order } from '../../../core/models/models';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, HeaderComponent],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent {
  profileForm: FormGroup;
  isEditing = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  successMessage = signal<string>('');
  
  avatarUploading = signal<boolean>(false);
  userOrders = signal<Order[]>([]);

  constructor(
    private fb: FormBuilder,
    public authService: AuthService,
    private cloudinaryService: CloudinaryService
  ) {
    const user = this.authService.currentUser();
    
    this.profileForm = this.fb.group({
      nombre: [user?.nombre || '', [Validators.required, Validators.minLength(3)]],
      telefono: [user?.telefono || '', [Validators.required, Validators.pattern(/^[0-9+ -]{7,15}$/)]],
      direccion: [user?.direccion || '', [Validators.required, Validators.minLength(5)]]
    });

    this.loadOrders();
  }

  onAvatarSelected(event: any): void {
    const file: File = event.target.files[0];
    if (file) {
      this.avatarUploading.set(true);
      this.successMessage.set('');
      this.cloudinaryService.uploadImage(file).subscribe({
        next: (url) => {
          this.avatarUploading.set(false);
          if (url) {
            const currentUser = this.authService.currentUser();
            if (currentUser) {
              const updatedUser: User = {
                ...currentUser,
                fotoPerfil: url
              };
              localStorage.setItem('user', JSON.stringify(updatedUser));
              this.authService.currentUser.set(updatedUser);
              this.successMessage.set('📸 Foto de perfil actualizada correctamente.');
            }
          } else {
            alert('Error al subir la foto a Cloudinary.');
          }
        },
        error: () => {
          this.avatarUploading.set(false);
          alert('Error de conexión al subir la imagen.');
        }
      });
    }
  }

  loadOrders(): void {
    if (typeof window !== 'undefined') {
      const savedOrders = localStorage.getItem('user_orders');
      if (savedOrders) {
        try {
          this.userOrders.set(JSON.parse(savedOrders));
        } catch (e) {
          this.userOrders.set([]);
        }
      }
    }
  }

  toggleEdit(): void {
    const editState = this.isEditing();
    if (!editState) {
      // Load current user details to form
      const user = this.authService.currentUser();
      this.profileForm.patchValue({
        nombre: user?.nombre || '',
        telefono: user?.telefono || '',
        direccion: user?.direccion || ''
      });
    }
    this.isEditing.set(!editState);
    this.successMessage.set('');
  }

  onSubmit(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    const values = this.profileForm.value;
    const currentUser = this.authService.currentUser();

    if (currentUser) {
      const updatedUser: User = {
        ...currentUser,
        nombre: values.nombre,
        telefono: values.telefono,
        direccion: values.direccion
      };

      // Save updated details to localStorage
      localStorage.setItem('user', JSON.stringify(updatedUser));
      this.authService.currentUser.set(updatedUser);

      setTimeout(() => {
        this.isSaving.set(false);
        this.isEditing.set(false);
        this.successMessage.set('✨ Perfil actualizado correctamente.');
      }, 1000);
    }
  }
}
