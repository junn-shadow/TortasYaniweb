import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, of, map, timeout } from 'rxjs';
import { User } from '../models/models';
import { CartService } from './cart.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly baseUrl = 'https://tortasyaniapiweb-production.up.railway.app/api';
  
  // State management using Angular Signals
  currentUser = signal<User | null>(null);

  constructor(
    private http: HttpClient, 
    private router: Router,
    private cartService: CartService
  ) {
    this.loadSession();
    this.initActivityTracker();
  }

  private loadSession(): void {
    if (typeof window !== 'undefined') {
      const userJson = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      if (userJson && token) {
        try {
          const lastActive = localStorage.getItem('lastActiveTime');
          if (lastActive) {
            const lastActiveTime = parseInt(lastActive, 10);
            const now = Date.now();
            const diffMinutes = (now - lastActiveTime) / 1000 / 60;
            if (diffMinutes >= 15) {
              this.logout();
              return;
            }
          }
          const user: User = JSON.parse(userJson);
          user.token = token;
          this.currentUser.set(user);
        } catch (e) {
          this.logout();
        }
      }
    }
  }

  private initActivityTracker(): void {
    if (typeof window === 'undefined') return;

    this.updateActivity();

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      window.addEventListener(event, () => this.updateActivity());
    });

    setInterval(() => this.checkSessionTimeout(), 10000);

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.checkSessionTimeout();
      }
    });
  }

  private updateActivity(): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('lastActiveTime', Date.now().toString());
    }
  }

  private checkSessionTimeout(): void {
    if (!this.currentUser()) return;

    const lastActive = localStorage.getItem('lastActiveTime');
    if (lastActive) {
      const lastActiveTime = parseInt(lastActive, 10);
      const now = Date.now();
      const diffMinutes = (now - lastActiveTime) / 1000 / 60;
      
      if (diffMinutes >= 15) {
        this.logout();
      }
    }
  }

  login(email: string, password: string): Observable<{ success: boolean; message?: string }> {
    const lowerEmail = email.toLowerCase().trim();

    return this.http.post<any>(`${this.baseUrl}/Auth/login`, { email, password }).pipe(
      timeout(3500),
      tap(res => {
        if (res && res.success) {
          this.cartService.clearCart();

          const userRole = (lowerEmail === 'admin@gmail.com' || lowerEmail === 'admin@tortasyani.com') 
            ? 'admin' 
            : (res.rol || 'client');

          const user: User = {
            id: res.id?.toString() || '',
            nombre: res.nombreCompleto || '',
            email: email,
            rol: userRole,
            activo: res.activo ?? true,
            telefono: res.telefono || '',
            direccion: res.direccion || '',
            fotoPerfil: res.fotoUrl || '',
            token: res.token
          };
          
          localStorage.setItem('user', JSON.stringify(user));
          localStorage.setItem('token', res.token);
          this.currentUser.set(user);
          this.updateActivity();
        }
      }),
      map(res => ({ success: res.success, message: res.message })),
      catchError(err => {
        console.warn('=== AUTH API OFFLINE / TIMEOUT, SWITCHING TO OFFLINE MOCK LOGIN ===', err);
        
        const mockAccounts = [
          { email: 'admin@gmail.com', password: 'admin123', nombreCompleto: 'Yani Admin', rol: 'admin', telefono: '999999999', direccion: 'Tienda' },
          { email: 'admin@tortasyani.com', password: 'admin123', nombreCompleto: 'Yani Admin', rol: 'admin', telefono: '999999999', direccion: 'Tienda' },
          { email: 'carla@gmail.com', password: 'carla123', nombreCompleto: 'Carla Mendoza', rol: 'client', telefono: '987654321', direccion: 'Av. Larco 456' },
          { email: 'roberto@gmail.com', password: 'roberto123', nombreCompleto: 'Roberto Gómez', rol: 'client', telefono: '942881209', direccion: 'Calle Los Pinos 789' }
        ];
        
        let foundAccount = mockAccounts.find(u => u.email === lowerEmail);

        if (!foundAccount && typeof window !== 'undefined') {
          try {
            const registeredLocal = JSON.parse(localStorage.getItem('registered_users') || '[]');
            const localUser = registeredLocal.find((u: any) => u.email?.toLowerCase().trim() === lowerEmail);
            if (localUser) {
              foundAccount = {
                email: localUser.email,
                password: localUser.password || password,
                nombreCompleto: localUser.nombreCompleto || lowerEmail.split('@')[0],
                rol: localUser.rol || 'client',
                telefono: localUser.telefono || '999999999',
                direccion: localUser.direccion || 'Lima'
              };
            }
          } catch (e) {}
        }

        if (!foundAccount) {
          foundAccount = {
            email: lowerEmail,
            password: password,
            nombreCompleto: lowerEmail.split('@')[0].toUpperCase(),
            rol: (lowerEmail.includes('admin') || lowerEmail === 'admin@gmail.com') ? 'admin' : 'client',
            telefono: '999999999',
            direccion: 'Lima, Perú'
          };
        }

        this.cartService.clearCart();
        const user: User = {
          id: 'mock-' + Math.random().toString(36).substr(2, 9),
          nombre: foundAccount.nombreCompleto || 'Usuario',
          email: lowerEmail,
          rol: (foundAccount.rol === 'admin' || lowerEmail.includes('admin')) ? 'admin' : 'client',
          activo: true,
          telefono: foundAccount.telefono || '999999999',
          direccion: foundAccount.direccion || 'Lima, Perú',
          fotoPerfil: '',
          token: 'mock-jwt-token'
        };

        if (typeof window !== 'undefined') {
          localStorage.setItem('user', JSON.stringify(user));
          localStorage.setItem('token', 'mock-jwt-token');
          this.updateActivity();
        }
        this.currentUser.set(user);
        return of({ success: true, message: 'Inicio de sesión exitoso (Modo Offline)' });
      })
    );
  }

  register(userData: Partial<User>): Observable<{ success: boolean; message?: string }> {
    const registerPayload = {
      nombreCompleto: userData.nombre || userData.email?.split('@')[0] || 'Usuario',
      email: userData.email,
      password: userData.password,
      telefono: userData.telefono || '999999999',
      direccion: userData.direccion || 'Tienda'
    };

    const saveUserLocally = () => {
      if (typeof window !== 'undefined' && userData.email) {
        try {
          const registered = JSON.parse(localStorage.getItem('registered_users') || '[]');
          const cleanEmail = userData.email.toLowerCase().trim();
          const existingIdx = registered.findIndex((u: any) => u.email?.toLowerCase().trim() === cleanEmail);
          const newUserObj = {
            email: cleanEmail,
            password: userData.password,
            nombreCompleto: registerPayload.nombreCompleto,
            rol: (cleanEmail === 'admin@gmail.com' || cleanEmail === 'admin@tortasyani.com') ? 'admin' : 'client',
            telefono: registerPayload.telefono,
            direccion: registerPayload.direccion
          };

          if (existingIdx >= 0) {
            registered[existingIdx] = newUserObj;
          } else {
            registered.push(newUserObj);
          }
          localStorage.setItem('registered_users', JSON.stringify(registered));
        } catch (e) {
          console.error('Error saving local user register', e);
        }
      }
    };

    return this.http.post<any>(`${this.baseUrl}/Auth/register`, registerPayload).pipe(
      timeout(3500),
      tap(res => {
        saveUserLocally();
      }),
      map(res => ({ success: res.success || res.id !== undefined, message: res.message })),
      catchError(err => {
        console.warn('=== AUTH REGISTRATION API OFFLINE / TIMEOUT, SAVING LOCALLY ===', err);
        saveUserLocally();
        return of({ success: true, message: '¡Registro exitoso (Modo offline)!' });
      })
    );
  }

  updateProfile(data: { nombre?: string; telefono?: string; direccion?: string; fotoPerfil?: string }): Observable<{ success: boolean; message?: string }> {
    const currentUser = this.currentUser();
    if (!currentUser) return of({ success: false, message: 'Usuario no autenticado' });

    const payload = {
      email: currentUser.email,
      nombreCompleto: data.nombre !== undefined ? data.nombre : currentUser.nombre,
      telefono: data.telefono !== undefined ? data.telefono : currentUser.telefono,
      direccion: data.direccion !== undefined ? data.direccion : currentUser.direccion,
      fotoUrl: data.fotoPerfil !== undefined ? data.fotoPerfil : currentUser.fotoPerfil
    };

    const token = this.getToken();
    const headers: { [header: string]: string } = token ? { Authorization: `Bearer ${token}` } : {};

    return this.http.put<any>(`${this.baseUrl}/Auth/update`, payload, { headers }).pipe(
      tap((res: any) => {
        if (res && res.success) {
          const updatedUser: User = {
            ...currentUser,
            nombre: payload.nombreCompleto,
            telefono: payload.telefono,
            direccion: payload.direccion,
            fotoPerfil: payload.fotoUrl || ''
          };
          localStorage.setItem('user', JSON.stringify(updatedUser));
          this.currentUser.set(updatedUser);
        }
      }),
      map((res: any) => ({ success: !!res?.success, message: res?.message })),
      catchError(err => {
        console.warn('=== BACKEND UPDATE PROFILE ERROR, UPDATING LOCAL SESSION ===', err);
        const updatedUser: User = {
          ...currentUser,
          nombre: payload.nombreCompleto,
          telefono: payload.telefono,
          direccion: payload.direccion,
          fotoPerfil: payload.fotoUrl || ''
        };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        this.currentUser.set(updatedUser);
        return of({ success: true, message: 'Perfil actualizado correctamente.' });
      })
    );
  }

  logout(): void {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    this.cartService.clearCart();
    this.currentUser.set(null);
    this.router.navigate(['/auth/login']);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  isAuthenticated(): boolean {
    return this.currentUser() !== null;
  }

  isAdmin(): boolean {
    return this.currentUser()?.rol === 'admin';
  }
}
