import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap, catchError, of, map } from 'rxjs';
import { User } from '../models/models';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class UsersService {
  private readonly baseUrl = 'https://tortasyaniapiweb-production.up.railway.app/api/users';
  
  users = signal<User[]>([]);
  isLoading = signal<boolean>(false);

  constructor(private http: HttpClient, private authService: AuthService) {
    this.loadUsers();
  }

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  loadUsers(): void {
    this.isLoading.set(true);
    this.http.get<any[]>(this.baseUrl, { headers: this.getHeaders() }).pipe(
      map(apiUsers => {
        return apiUsers.map(u => ({
          id: u.id.toString(),
          nombre: u.nombre,
          email: u.email,
          rol: u.rol || 'client',
          activo: u.activo ?? true
        }));
      }),
      tap(mappedUsers => {
        if (mappedUsers && mappedUsers.length > 0) {
          this.users.set(mappedUsers);
          if (typeof window !== 'undefined') {
            localStorage.setItem('admin_users', JSON.stringify(mappedUsers));
          }
        } else {
          const defaultUsers: User[] = [
            { id: '1', nombre: 'Yani Admin', email: 'admin@gmail.com', rol: 'admin', activo: true },
            { id: '2', nombre: 'Carla Mendoza', email: 'carla@gmail.com', rol: 'client', activo: true }
          ];
          this.users.set(defaultUsers);
          if (typeof window !== 'undefined') {
            localStorage.setItem('admin_users', JSON.stringify(defaultUsers));
          }
        }
        this.isLoading.set(false);
      }),
      catchError(err => {
        console.warn('=== USERS API OFFLINE, USING LOCALSTORAGE FALLBACK ===', err);
        if (typeof window !== 'undefined') {
          let currentList: User[] = [];
          const savedUsers = localStorage.getItem('admin_users');
          if (savedUsers) {
            try {
              currentList = JSON.parse(savedUsers);
            } catch (e) {}
          }
          
          const defaultUsers: User[] = [
            { id: '1', nombre: 'Yani Admin', email: 'admin@gmail.com', rol: 'admin', activo: true },
            { id: '2', nombre: 'Carla Mendoza', email: 'carla@gmail.com', rol: 'client', activo: true },
            { id: '3', nombre: 'Roberto Gómez', email: 'roberto@gmail.com', rol: 'client', activo: true },
            { id: '4', nombre: 'Yani Admin Alt', email: 'admin@tortasyani.com', rol: 'admin', activo: true }
          ];

          for (const du of defaultUsers) {
            if (!currentList.find(u => u.email === du.email)) {
              currentList.push(du);
            }
          }
          
          const registeredLocal = JSON.parse(localStorage.getItem('registered_users') || '[]');
          for (const ru of registeredLocal) {
            if (!currentList.find(u => u.email === ru.email)) {
              currentList.push({
                id: 'reg-' + Math.random().toString(36).substr(2, 9),
                nombre: ru.nombreCompleto || ru.email,
                email: ru.email,
                rol: ru.rol || 'client',
                activo: true
              });
            }
          }

          this.users.set(currentList);
          localStorage.setItem('admin_users', JSON.stringify(currentList));
        }
        this.isLoading.set(false);
        return of([]);
      })
    ).subscribe();
  }

  createUser(userPayload: Partial<User> & { password?: string }): Observable<User | null> {
    const apiPayload = {
      nombre: userPayload.nombre,
      email: userPayload.email,
      rol: userPayload.rol,
      activo: userPayload.activo,
      descripcion: '',
      password: userPayload.password || 'cliente123'
    };

    const registerLocal = () => {
      if (typeof window !== 'undefined' && userPayload.email) {
        const registeredUsers = JSON.parse(localStorage.getItem('registered_users') || '[]');
        const existingIdx = registeredUsers.findIndex((u: any) => u.email?.toLowerCase().trim() === userPayload.email?.toLowerCase().trim());
        const userObj = {
          email: userPayload.email,
          password: userPayload.password || 'cliente123',
          nombreCompleto: userPayload.nombre,
          rol: userPayload.rol || 'client',
          telefono: '999999999',
          direccion: 'Tienda'
        };
        if (existingIdx >= 0) {
          registeredUsers[existingIdx] = userObj;
        } else {
          registeredUsers.push(userObj);
        }
        localStorage.setItem('registered_users', JSON.stringify(registeredUsers));
      }
    };

    return this.http.post<any>(this.baseUrl, apiPayload, { headers: this.getHeaders() }).pipe(
      map(res => {
        registerLocal();
        const newUser: User = {
          id: res.id.toString(),
          nombre: res.nombre,
          email: res.email,
          rol: res.rol || userPayload.rol || 'client',
          activo: res.activo ?? true
        };
        const updated = [...this.users(), newUser];
        this.users.set(updated);
        localStorage.setItem('admin_users', JSON.stringify(updated));
        return newUser;
      }),
      catchError(err => {
        console.warn('=== ERROR CREATING USER IN API, SAVING LOCALLY ===', err);
        registerLocal();
        const newUser: User = {
          id: (this.users().length + 1).toString(),
          nombre: userPayload.nombre || '',
          email: userPayload.email || '',
          rol: userPayload.rol || 'client',
          activo: userPayload.activo ?? true
        };
        const updated = [...this.users(), newUser];
        this.users.set(updated);
        localStorage.setItem('admin_users', JSON.stringify(updated));
        return of(newUser);
      })
    );
  }

  updateUser(id: string, userPayload: Partial<User>): Observable<User | null> {
    const apiPayload = {
      nombre: userPayload.nombre,
      email: userPayload.email,
      rol: userPayload.rol,
      activo: userPayload.activo,
      descripcion: ''
    };

    // If ID is numeric parse it, otherwise default to 0
    const numericId = parseInt(id, 10) || 0;

    return this.http.put<any>(`${this.baseUrl}/${numericId}`, apiPayload, { headers: this.getHeaders() }).pipe(
      map(res => {
        const updatedUser: User = {
          id: res.id.toString(),
          nombre: res.nombre,
          email: res.email,
          rol: res.rol || 'client',
          activo: res.activo ?? true
        };
        const updatedList = this.users().map(u => u.id === id ? updatedUser : u);
        this.users.set(updatedList);
        localStorage.setItem('admin_users', JSON.stringify(updatedList));
        return updatedUser;
      }),
      catchError(err => {
        console.warn('=== ERROR UPDATING USER IN API, SAVING LOCALLY ===', err);
        const updatedUser: User = {
          id: id,
          nombre: userPayload.nombre || '',
          email: userPayload.email || '',
          rol: userPayload.rol || 'client',
          activo: userPayload.activo ?? true
        };
        const updatedList = this.users().map(u => u.id === id ? updatedUser : u);
        this.users.set(updatedList);
        localStorage.setItem('admin_users', JSON.stringify(updatedList));
        return of(updatedUser);
      })
    );
  }

  deleteUser(id: string): Observable<boolean> {
    const numericId = parseInt(id, 10) || 0;
    const userToDelete = this.users().find(u => u.id === id);
    const emailToDelete = userToDelete?.email?.toLowerCase().trim();

    const cleanLocalRegistered = () => {
      if (emailToDelete && typeof window !== 'undefined') {
        try {
          const registered = JSON.parse(localStorage.getItem('registered_users') || '[]');
          const filteredRegistered = registered.filter((u: any) => u.email.toLowerCase().trim() !== emailToDelete);
          localStorage.setItem('registered_users', JSON.stringify(filteredRegistered));
        } catch (e) {
          console.error('Error cleaning local registered users', e);
        }
      }
    };

    return this.http.delete(`${this.baseUrl}/${numericId}`, { headers: this.getHeaders() }).pipe(
      map(() => {
        cleanLocalRegistered();
        const updated = this.users().filter(u => u.id !== id);
        this.users.set(updated);
        localStorage.setItem('admin_users', JSON.stringify(updated));
        return true;
      }),
      catchError(err => {
        console.warn('=== ERROR DELETING USER IN API, REMOVING LOCALLY ===', err);
        cleanLocalRegistered();
        const updated = this.users().filter(u => u.id !== id);
        this.users.set(updated);
        localStorage.setItem('admin_users', JSON.stringify(updated));
        return of(true);
      })
    );
  }
}
