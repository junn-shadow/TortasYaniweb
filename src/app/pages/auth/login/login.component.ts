import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  loginForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  showPassword = false;

  // Social Auth Modal States & Bindings
  showGoogleModal = false;
  showFacebookModal = false;
  showGoogleCustomAuth = false;
  socialEmail = '';
  socialPassword = '';
  socialName = '';
  socialObscure = true;

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleSocialObscure(): void {
    this.socialObscure = !this.socialObscure;
  }

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    const { email, password } = this.loginForm.value;

    this.authService.login(email, password).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res.success) {
          if (this.authService.isAdmin()) {
            this.router.navigate(['/admin/dashboard']);
          } else {
            this.router.navigate(['/']);
          }
        } else {
          this.errorMessage = res.message || 'Credenciales incorrectas. Intenta nuevamente.';
        }
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage = 'Hubo un problema de conexión. Intenta más tarde.';
      }
    });
  }

  onGoogleLogin(): void {
    this.showGoogleModal = true;
  }

  onFacebookLogin(): void {
    this.showFacebookModal = true;
  }

  closeSocialModals(): void {
    this.showGoogleModal = false;
    this.showFacebookModal = false;
    this.showGoogleCustomAuth = false;
    this.socialEmail = '';
    this.socialPassword = '';
    this.socialName = '';
    this.socialObscure = true;
  }

  selectGoogleAccount(name: string, email: string): void {
    this.closeSocialModals();
    this.handleSocialRealAuth(name, email, 'google123', 'Google');
  }

  openGoogleCustomAuth(): void {
    this.showGoogleModal = false;
    this.showGoogleCustomAuth = true;
  }

  submitGoogleCustomAuth(): void {
    if (!this.socialEmail || !this.socialPassword) {
      alert('Por favor ingresa tus datos');
      return;
    }
    const name = this.socialEmail.split('@')[0];
    const email = this.socialEmail;
    const pass = this.socialPassword;
    this.closeSocialModals();
    this.handleSocialRealAuth(name, email, pass, 'Google');
  }

  submitFacebookAuth(): void {
    if (!this.socialEmail || !this.socialPassword) {
      alert('Por favor ingresa tu correo/celular y contraseña');
      return;
    }
    const name = this.socialEmail.split('@')[0];
    const email = this.socialEmail;
    const pass = this.socialPassword;
    this.closeSocialModals();
    this.handleSocialRealAuth(name, email, pass, 'Facebook');
  }

  private handleSocialRealAuth(name: string, email: string, pass: string, provider: 'Google' | 'Facebook'): void {
    this.isLoading = true;
    this.errorMessage = '';

    // 1. Try to login
    this.authService.login(email, pass).subscribe({
      next: (loginRes) => {
        if (loginRes.success) {
          this.isLoading = false;
          if (this.authService.isAdmin()) {
            this.router.navigate(['/admin/dashboard']);
          } else {
            this.router.navigate(['/']);
          }
        } else {
          // 2. User doesn't exist, auto register
          const registerData = {
            nombre: name,
            email: email,
            password: pass,
            telefono: provider === 'Google' ? '+51 987 654 321' : '+51 912 345 678',
            direccion: provider === 'Google' ? 'Dirección de Google' : 'Av. Larco 456, Miraflores'
          };
          this.authService.register(registerData).subscribe({
            next: (regRes) => {
              if (regRes.success) {
                // Login again after registration
                this.authService.login(email, pass).subscribe({
                  next: (loginRetryRes) => {
                    this.isLoading = false;
                    if (loginRetryRes.success) {
                      if (this.authService.isAdmin()) {
                        this.router.navigate(['/admin/dashboard']);
                      } else {
                        this.router.navigate(['/']);
                      }
                    } else {
                      this.errorMessage = `Error al iniciar sesión tras registrar cuenta de ${provider}`;
                    }
                  },
                  error: () => {
                    this.isLoading = false;
                    this.errorMessage = `Error de conexión tras registrar cuenta de ${provider}`;
                  }
                });
              } else {
                this.isLoading = false;
                this.errorMessage = regRes.message || `Error al registrar cuenta de ${provider}`;
              }
            },
            error: () => {
              this.isLoading = false;
              this.errorMessage = `Error de conexión al registrar cuenta de ${provider}`;
            }
          });
        }
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage = `Error al autenticar con ${provider}`;
      }
    });
  }
}
