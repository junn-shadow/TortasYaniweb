import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent {
  registerForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.registerForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      telefono: ['', [Validators.required, Validators.pattern(/^[0-9+ -]{7,15}$/)]],
      direccion: ['', [Validators.required, Validators.minLength(5)]],
      terms: [false, Validators.requiredTrue]
    });
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService.register(this.registerForm.value).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res.success) {
          this.successMessage = '¡Registro exitoso! Redirigiendo al inicio de sesión...';
          setTimeout(() => {
            this.router.navigate(['/auth/login']);
          }, 2000);
        } else {
          this.errorMessage = res.message || 'Error al registrar el usuario. Revisa tus datos.';
        }
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage = 'Hubo un problema de conexión. Intenta más tarde.';
      }
    });
  }
}
