import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, of, tap } from 'rxjs';
import { InvoiceDoc } from '../models/models';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class InvoicesService {
  private readonly baseUrl = 'https://tortasyaniapiweb-production.up.railway.app/api/invoices';
  private readonly STORAGE_KEY = 'yani_admin_invoices_v1';

  invoices = signal<InvoiceDoc[]>([]);
  isLoading = signal<boolean>(false);

  // Default seed data with 2 items for testing/offline (following redesign rules)
  private readonly initialInvoices: InvoiceDoc[] = [
    {
      numeroComprobante: 'B001-000452',
      orderId: 'ORD-1082',
      cliente: 'Carla Mendoza',
      documentoCliente: '74829102',
      tipo: 'Boleta',
      fechaEmision: '2026-08-21 14:32',
      montoTotal: 145.00,
      estadoSunat: 'Aceptado',
      pdfUrl: 'https://res.cloudinary.com/demo/image/upload/sample.pdf'
    },
    {
      numeroComprobante: 'F001-000120',
      orderId: 'ORD-1083',
      cliente: 'Inversiones Gómez S.A.C.',
      documentoCliente: '20601293841',
      tipo: 'Factura',
      fechaEmision: '2026-08-21 13:10',
      montoTotal: 88.00,
      estadoSunat: 'Aceptado',
      pdfUrl: 'https://res.cloudinary.com/demo/image/upload/sample.pdf'
    }
  ];

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
    this.initInvoices();
  }

  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    });
  }

  public initInvoices(): void {
    this.isLoading.set(true);
    // 1. Fallback local
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved) {
      try {
        this.invoices.set(JSON.parse(saved));
      } catch (e) {
        this.invoices.set(this.initialInvoices);
      }
    } else {
      this.invoices.set(this.initialInvoices);
      this.saveToStorage();
    }

    // 2. Fetch de DB Real (Railway)
    this.http.get<InvoiceDoc[]>(this.baseUrl, { headers: this.getAuthHeaders() }).pipe(
      tap(remote => {
        if (remote && remote.length > 0) {
          this.invoices.set(remote);
          this.saveToStorage();
        }
        this.isLoading.set(false);
      }),
      catchError(err => {
        console.warn('Backend API not reachable for invoices. Using local state.', err?.message);
        this.isLoading.set(false);
        return of(null);
      })
    ).subscribe();
  }

  public emitirBoletaNubeFact(reqData: { dniCliente: string; nombreCliente: string; direccionCliente?: string; totalVenta: number; descripcionProducto?: string }): Observable<any> {
    const apiUrl = 'https://tortasyaniapiweb-production.up.railway.app/api/facturacion/emitir-boleta';
    return this.http.post<any>(apiUrl, {
      dniCliente: reqData.dniCliente || '00000000',
      nombreCliente: reqData.nombreCliente || 'CLIENTE GENERAL',
      direccionCliente: reqData.direccionCliente || 'LIMA PERU',
      totalVenta: reqData.totalVenta,
      descripcionProducto: reqData.descripcionProducto || 'Pedido Tortas Yani'
    }).pipe(
      tap(res => {
        if (res && res.serie) {
          const newDoc: InvoiceDoc = {
            numeroComprobante: `${res.serie}-${res.numero}`,
            orderId: `ORD-${Math.floor(Math.random() * 9000) + 1000}`,
            cliente: reqData.nombreCliente,
            documentoCliente: reqData.dniCliente,
            tipo: 'Boleta',
            fechaEmision: new Date().toISOString().replace('T', ' ').substring(0, 16),
            montoTotal: reqData.totalVenta,
            estadoSunat: res.errors ? 'Rechazado' : 'Aceptado',
            pdfUrl: res.enlace_del_pdf || ''
          };
          this.invoices.set([newDoc, ...this.invoices()]);
          this.saveToStorage();
        }
      }),
      catchError(err => {
        console.error('Error emitiendo boleta NubeFact via API', err);
        return of(null);
      })
    );
  }

  public createInvoice(invoiceData: Omit<InvoiceDoc, 'numeroComprobante'>): Observable<InvoiceDoc | null> {
    const isFactura = invoiceData.tipo === 'Factura';
    const prefix = isFactura ? 'F001' : 'B001';
    
    // Simulate generation of correlative number
    const fakeCorrelative = Math.floor(Math.random() * 900000) + 100000;
    const numeroComprobante = `${prefix}-${fakeCorrelative}`;

    const newInvoice: InvoiceDoc = {
      ...invoiceData,
      numeroComprobante,
      estadoSunat: 'Aceptado'
    };

    // Actualizar signal inmediatamente
    const updated = [newInvoice, ...this.invoices()];
    this.invoices.set(updated);
    this.saveToStorage();

    // Guardar en Base de Datos Real (Cloud)
    return this.http.post<InvoiceDoc>(this.baseUrl, newInvoice, { headers: this.getAuthHeaders() }).pipe(
      catchError(err => {
        console.warn('Could not save invoice in Cloud DB, saved locally as fallback', err);
        return of(newInvoice);
      })
    );
  }

  public updateInvoiceStatus(numeroComprobante: string, newStatus: InvoiceDoc['estadoSunat']): void {
    const updated = this.invoices().map(i => 
      i.numeroComprobante === numeroComprobante ? { ...i, estadoSunat: newStatus } : i
    );
    this.invoices.set(updated);
    this.saveToStorage();

    this.http.put(`${this.baseUrl}/${numeroComprobante}/status`, { estadoSunat: newStatus }, { headers: this.getAuthHeaders() }).pipe(
      catchError(err => {
        console.warn(`Cloud update failed for invoice ${numeroComprobante}. Updated locally.`, err);
        return of(null);
      })
    ).subscribe();
  }

  private saveToStorage(): void {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.invoices()));
      }
    } catch (e) {
      console.error('Error saving invoices', e);
    }
  }
}
