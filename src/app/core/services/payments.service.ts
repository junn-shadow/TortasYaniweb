import { Injectable, signal, computed } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, of, tap } from 'rxjs';
import { PaymentTransaction } from '../models/models';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class PaymentsService {
  private readonly baseUrl = 'https://tortasyaniapiweb-production.up.railway.app/api/payments';
  private readonly STORAGE_KEY = 'yani_admin_payments_v1';

  payments = signal<PaymentTransaction[]>([]);
  isLoading = signal<boolean>(false);

  private readonly initialPayments: PaymentTransaction[] = [
    {
      id: 'PAY-8801',
      orderId: 'ORD-1082',
      cliente: 'Carla Mendoza',
      monto: 72.50,
      metodo: 'Yape',
      tipo: 'Adelanto (50%)',
      estado: 'En revisión',
      fecha: '2026-08-21 14:32',
      voucherUrl: 'https://res.cloudinary.com/ddfzttgyr/image/upload/v1774234891/Torta_Matrimonial_qhxegx.png'
    },
    {
      id: 'PAY-8802',
      orderId: 'ORD-1083',
      cliente: 'Roberto Gómez',
      monto: 44.00,
      metodo: 'Plin',
      tipo: 'Adelanto (50%)',
      estado: 'Aprobado',
      fecha: '2026-08-21 13:10',
      voucherUrl: 'https://res.cloudinary.com/ddfzttgyr/image/upload/v1774234891/Torta_Matrimonial_qhxegx.png'
    },
    {
      id: 'PAY-8803',
      orderId: 'ORD-1084',
      cliente: 'Sofía Castro',
      monto: 145.00,
      metodo: 'Tarjeta',
      tipo: 'Pago Total',
      estado: 'Aprobado',
      fecha: '2026-08-20 18:45'
    },
    {
      id: 'PAY-8804',
      orderId: 'ORD-1085',
      cliente: 'Daniela Rivas',
      monto: 95.00,
      metodo: 'Efectivo',
      tipo: 'Saldo Final (50%)',
      estado: 'Aprobado',
      fecha: '2026-08-19 11:20'
    }
  ];

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
    this.initPayments();
  }

  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    });
  }

  public initPayments(): void {
    this.isLoading.set(true);
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved) {
      try {
        this.payments.set(JSON.parse(saved));
      } catch (e) {
        this.payments.set(this.initialPayments);
      }
    } else {
      this.payments.set(this.initialPayments);
      this.saveToStorage();
    }

    // Connect to Railway Cloud BD
    this.http.get<PaymentTransaction[]>(this.baseUrl, { headers: this.getAuthHeaders() }).pipe(
      tap(remote => {
        if (remote && remote.length > 0) {
          this.payments.set(remote);
          this.saveToStorage();
        }
        this.isLoading.set(false);
      }),
      catchError(err => {
        console.warn('Railway API connection fallback for payments.', err?.message);
        this.isLoading.set(false);
        return of(null);
      })
    ).subscribe();
  }

  public approvePayment(payId: string): void {
    const updated = this.payments().map(p => {
      if (p.id === payId) return { ...p, estado: 'Aprobado' as const };
      return p;
    });
    this.payments.set(updated);
    this.saveToStorage();
  }

  public rejectPayment(payId: string): void {
    const updated = this.payments().map(p => {
      if (p.id === payId) return { ...p, estado: 'Rechazado' as const };
      return p;
    });
    this.payments.set(updated);
    this.saveToStorage();
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.payments()));
    } catch (e) {
      console.error('Error saving payments', e);
    }
  }
}
