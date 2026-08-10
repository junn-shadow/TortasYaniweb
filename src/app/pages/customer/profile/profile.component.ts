import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { CloudinaryService } from '../../../core/services/cloudinary.service';
import { HeaderComponent } from '../../../shared/components/header/header.component';
import { User, Order } from '../../../core/models/models';

const maleAvatars = [
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=250&q=80'
];

const femaleAvatars = [
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=250&q=80'
];

export function getSmartAvatarUrl(name?: string, customFoto?: string): string {
  if (customFoto && customFoto.length > 5 && !customFoto.includes('torta_de_vainilla')) {
    return customFoto;
  }

  const cleanName = (name || 'Usuario').trim();
  const firstName = cleanName.split(' ')[0].toLowerCase();

  let hash = 0;
  for (let i = 0; i < cleanName.length; i++) {
    hash = (hash << 5) - hash + cleanName.charCodeAt(i);
    hash |= 0;
  }
  const positiveHash = Math.abs(hash);

  const femaleSuffixes = ['a', 'ía', 'eth', 'is', 'en', 'y'];
  const femaleExceptions = ['carmen', 'isabel', 'luz', 'mercedes', 'pilar', 'rosario', 'raquel', 'ruth', 'beatriz', 'inez', 'ines', 'monica', 'veronica', 'sonia'];
  const maleExceptions = ['luca', 'sasha', 'elias', 'nicolas', 'nicolás', 'matias', 'matías', 'tomas', 'tomás', 'josue', 'josué'];

  const isFemale = (femaleExceptions.includes(firstName) || femaleSuffixes.some(s => firstName.endsWith(s))) && !maleExceptions.includes(firstName);

  const pool = isFemale ? femaleAvatars : maleAvatars;
  return pool[positiveHash % pool.length];
}

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

  getAvatarUrl(): string {
    const user = this.authService.currentUser();
    return getSmartAvatarUrl(user?.nombre, user?.fotoPerfil);
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
            this.authService.updateProfile({ fotoPerfil: url }).subscribe({
              next: () => {
                this.successMessage.set('Foto de perfil subida a la nube y guardada en la base de datos correctamente.');
              }
            });
          } else {
            alert('Error al subir la foto a la nube.');
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

    this.authService.updateProfile({
      nombre: values.nombre,
      telefono: values.telefono,
      direccion: values.direccion
    }).subscribe({
      next: (res) => {
        this.isSaving.set(false);
        this.isEditing.set(false);
        this.successMessage.set(res.message || 'Perfil actualizado correctamente.');
      },
      error: () => {
        this.isSaving.set(false);
        this.isEditing.set(false);
        this.successMessage.set('Perfil actualizado localmente.');
      }
    });
  }
}
