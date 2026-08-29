import { Injectable, signal, computed } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, of, tap } from 'rxjs';
import { Order } from '../models/models';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class OrdersService {
  private readonly baseUrl = 'https://tortasyaniapiweb-production.up.railway.app/api/orders';
  private readonly STORAGE_KEY = 'yani_admin_orders_v2';

  orders = signal<Order[]>([]);
  isLoading = signal<boolean>(false);

  // Initial seed orders matching user request with 50% partial payment structure
  private readonly initialOrders: Order[] = [
    {
      id: 'ORD-1082',
      fecha: '2026-08-21 14:32',
      cliente: 'Carla Mendoza',
      dniCliente: '74829102',
      telefono: '987-654-321',
      direccion: 'Av. Larco 456, Miraflores',
      referenciaDireccion: 'Frente al parque Kennedy',
      estado: 'Pendiente',
      estadoPago: 'En revisión',
      metodoPago: 'Yape',
      montoAdelanto: 72.50,
      saldoPendiente: 72.50,
      voucherUrl: 'https://res.cloudinary.com/ddfzttgyr/image/upload/v1774234891/Torta_Matrimonial_qhxegx.png',
      items: [
        { nombre: 'Torta de Chocolate Artesanal (M)', cantidad: 1, precio: 85.0, sabor: 'Chocolate Fudge', pisos: 2 },
        { nombre: 'Cheesecake de Maracuyá (S)', cantidad: 1, precio: 60.0, sabor: 'Maracuyá' }
      ],
      productosSummary: 'Torta de Chocolate (M), Cheesecake Maracuyá (S)',
      total: 145.0,
      comprobanteEmitido: true
    },
    {
      id: 'ORD-1083',
      fecha: '2026-08-21 13:10',
      cliente: 'Roberto Gómez',
      dniCliente: '10928374',
      telefono: '942-881-209',
      direccion: 'Calle Los Pinos 789, San Isidro',
      estado: 'En Preparación',
      estadoPago: 'Aprobado',
      metodoPago: 'Plin',
      montoAdelanto: 44.00,
      saldoPendiente: 44.00,
      voucherUrl: 'https://res.cloudinary.com/ddfzttgyr/image/upload/v1774234891/Torta_Matrimonial_qhxegx.png',
      items: [
        { nombre: 'Torta de Zanahoria & Nueces (L)', cantidad: 1, precio: 88.0 }
      ],
      productosSummary: 'Torta de Zanahoria & Nueces (L)',
      total: 88.0,
      comprobanteEmitido: false
    }
  ];

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
    this.initOrders();
  }

  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    });
  }

  public initOrders(): void {
    this.isLoading.set(true);
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved) {
      try {
        this.orders.set(JSON.parse(saved));
      } catch (e) {
        this.orders.set(this.initialOrders);
      }
    } else {
      this.orders.set(this.initialOrders);
      this.saveToStorage();
    }

    // Connect to Cloud API on Railway
    this.http.get<Order[]>(this.baseUrl, { headers: this.getAuthHeaders() }).pipe(
      tap(remote => {
        if (remote && remote.length > 0) {
          this.orders.set(remote);
          this.saveToStorage();
        } else {
          this.orders.set(this.initialOrders);
          this.saveToStorage();
        }
        this.isLoading.set(false);
      }),
      catchError(err => {
        console.warn('Backend API on Railway not reachable for orders. Using synchronized state.', err?.message);
        this.isLoading.set(false);
        return of(null);
      })
    ).subscribe();
  }

  public updateOrderStatus(orderId: string, newStatus: Order['estado']): void {
    const updated = this.orders().map(o => {
      if (o.id === orderId) {
        return { ...o, estado: newStatus };
      }
      return o;
    });
    this.orders.set(updated);
    this.saveToStorage();

    this.http.put(`${this.baseUrl}/${orderId}/status`, { estado: newStatus }, { headers: this.getAuthHeaders() }).pipe(
      catchError(err => {
        console.warn(`Cloud API update for order ${orderId} saved locally.`, err);
        return of(null);
      })
    ).subscribe();
  }

  public updatePaymentStatus(orderId: string, newPaymentStatus: Order['estadoPago']): void {
    const updated = this.orders().map(o => {
      if (o.id === orderId) {
        const saldo = newPaymentStatus === 'Aprobado' ? 0 : o.saldoPendiente;
        return { ...o, estadoPago: newPaymentStatus, saldoPendiente: saldo };
      }
      return o;
    });
    this.orders.set(updated);
    this.saveToStorage();
  }

  public deleteOrder(orderId: string): void {
    const updated = this.orders().filter(o => o.id !== orderId);
    this.orders.set(updated);
    this.saveToStorage();
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.orders()));
    } catch (e) {
      console.error('Error saving orders', e);
    }
  }
}
