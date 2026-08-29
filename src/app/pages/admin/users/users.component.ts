import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { User } from '../../../core/models/models';
import { AuthService } from '../../../core/services/auth.service';
import { UsersService } from '../../../core/services/users.service';
import { AdminSidebarComponent } from '../../../shared/components/admin-sidebar/admin-sidebar.component';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AdminSidebarComponent],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss'
})
export class UsersComponent implements OnInit {

  ngOnInit(): void {
    this.usersService.loadUsers();
  }

  showFormModal = signal<boolean>(false);
  isEditing = signal<boolean>(false);
  selectedUserId = signal<string>('');

  userForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    public usersService: UsersService
  ) {
    this.userForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      rol: ['client', [Validators.required]],
      activo: [true],
      password: ['', [Validators.minLength(6)]] // Optional on edit, required on add
    });
  }

  openAddModal(): void {
    this.isEditing.set(false);
    this.selectedUserId.set('');
    this.userForm.reset({
      rol: 'client',
      activo: true,
      password: ''
    });
    this.userForm.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
    this.userForm.get('password')?.updateValueAndValidity();
    this.showFormModal.set(true);
  }

  openEditModal(user: User): void {
    this.isEditing.set(true);
    this.selectedUserId.set(user.id);
    
    this.userForm.reset({
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
      activo: user.activo,
      password: ''
    });
    this.userForm.get('password')?.clearValidators();
    this.userForm.get('password')?.updateValueAndValidity();
    this.showFormModal.set(true);
  }

  closeModal(): void {
    this.showFormModal.set(false);
  }

  toggleActive(user: User): void {
    const updatedPayload: Partial<User> = {
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
      activo: !user.activo
    };
    
    this.usersService.updateUser(user.id, updatedPayload).subscribe(res => {
      if (!res) {
        alert('Error al cambiar el estado del usuario.');
      }
    });
  }

  onSubmit(): void {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    const values = this.userForm.value;

    const userPayload: Partial<User> & { password?: string } = {
      nombre: values.nombre,
      email: values.email,
      rol: values.rol,
      activo: values.activo
    };

    if (values.password) {
      userPayload.password = values.password;
    }

    if (this.isEditing()) {
      this.usersService.updateUser(this.selectedUserId(), userPayload).subscribe(res => {
        if (res) {
          this.closeModal();
        } else {
          alert('Error al actualizar el usuario.');
        }
      });
    } else {
      this.usersService.createUser(userPayload).subscribe(res => {
        if (res) {
          this.closeModal();
        } else {
          alert('Error al crear el usuario.');
        }
      });
    }
  }

  onDelete(id: string): void {
    if (confirm('¿Estás seguro de que deseas eliminar este usuario del sistema?')) {
      this.usersService.deleteUser(id).subscribe(success => {
        if (!success) {
          alert('Error al eliminar el usuario.');
        }
      });
    }
  }

  onLogout(): void {
    this.authService.logout();
  }
}
