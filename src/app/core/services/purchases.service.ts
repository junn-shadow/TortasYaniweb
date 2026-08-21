import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, of, tap } from 'rxjs';
import { PurchaseItem } from '../models/models';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class PurchasesService {
  private readonly baseUrl = 'https://tortasyaniapiweb-production.up.railway.app/api/purchases';
  private readonly STORAGE_KEY = 'yani_admin_purchases_v1';

  purchases = signal<PurchaseItem[]>([]);
  isLoading = signal<boolean>(false);

  private readonly initialPurchases: PurchaseItem[] = [
    {
      id: 'COM-901',
      proveedor: 'Alicorp S.A.',
      fecha: '2026-08-20',
      insumosSummary: 'Harina Especial 50kg, Azúcar 25kg',
      montoTotal: 450.00,
      montoPagado: 450.00,
      saldoPendiente: 0.00,
      estado: 'Pagado'
    },
    {
      id: 'COM-902',
      proveedor: 'Cacao Sol Peruanos',
      fecha: '2026-08-18',
      insumosSummary: 'Cobertura de Chocolate 70% (20kg)',
      montoTotal: 770.00,
      montoPagado: 400.00,
      saldoPendiente: 370.00,
      estado: 'Pendiente',
      observaciones: 'Crédito a 15 días'
    },
    {
      id: 'COM-903',
      proveedor: 'Lácteos Gloria',
      fecha: '2026-08-15',
      insumosSummary: 'Mantequilla sin sal (15kg), Crema de Leche (10L)',
      montoTotal: 520.00,
      montoPagado: 520.00,
      saldoPendiente: 0.00,
      estado: 'Pagado'
    }
  ];

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
    this.initPurchases();
  }

  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    });
  }

  public initPurchases(): void {
    this.isLoading.set(true);
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved) {
      try {
        this.purchases.set(JSON.parse(saved));
      } catch (e) {
        this.purchases.set(this.initialPurchases);
      }
    } else {
      this.purchases.set(this.initialPurchases);
      this.saveToStorage();
    }

    this.http.get<PurchaseItem[]>(this.baseUrl, { headers: this.getAuthHeaders() }).pipe(
      tap(remote => {
        if (remote && remote.length > 0) {
          this.purchases.set(remote);
          this.saveToStorage();
        }
        this.isLoading.set(false);
      }),
      catchError(err => {
        console.warn('Railway API connection fallback for purchases.', err?.message);
        this.isLoading.set(false);
        return of(null);
      })
    ).subscribe();
  }

  public registerPayment(purchaseId: string, amountToPay: number): void {
    const updated = this.purchases().map(p => {
      if (p.id === purchaseId) {
        const newPaid = p.montoPagado + amountToPay;
        const newPending = Math.max(0, p.montoTotal - newPaid);
        const newStatus: PurchaseItem['estado'] = newPending === 0 ? 'Pagado' : 'Pendiente';
        return {
          ...p,
          montoPagado: newPaid,
          saldoPendiente: newPending,
          estado: newStatus
        };
      }
      return p;
    });
    this.purchases.set(updated);
    this.saveToStorage();
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.purchases()));
    } catch (e) {
      console.error('Error saving purchases', e);
    }
  }
}
