import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';

export interface MercadoPagoPreferenceItem {
  title: string;
  quantity: number;
  currency_id: string;
  unit_price: number;
}

export interface MercadoPagoPayer {
  name: string;
  email: string;
  phone?: {
    number: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class MercadoPagoService {
  readonly publicKey = 'APP_USR-e7261003-1449-42c5-93eb-9812e462a049';
  readonly accessToken = 'APP_USR-4971588647309567-082119-420e42538660e53c604a145e36e67945-3630907665';

  private apiUrl = 'https://api.mercadopago.com/checkout/preferences';

  constructor(private http: HttpClient) {}

  /**
   * Genera una preferencia de pago en Mercado Pago Checkout Pro
   */
  createPreference(
    items: MercadoPagoPreferenceItem[],
    payer: MercadoPagoPayer,
    externalReference: string
  ): Observable<{ id: string; init_point: string; sandbox_init_point: string } | null> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.accessToken}`
    });

    const body = {
      items: items.map(item => ({
        title: item.title,
        quantity: item.quantity,
        currency_id: 'PEN',
        unit_price: item.unit_price
      })),
      payer: {
        name: payer.name,
        email: payer.email || 'cliente@tortasyani.com'
      },
      external_reference: externalReference,
      back_urls: {
        success: window.location.origin + '/checkout?status=success&order=' + externalReference,
        failure: window.location.origin + '/checkout?status=failure',
        pending: window.location.origin + '/checkout?status=pending'
      },
      auto_return: 'approved'
    };

    return this.http.post<any>(this.apiUrl, body, { headers }).pipe(
      map(res => ({
        id: res.id,
        init_point: res.init_point,
        sandbox_init_point: res.sandbox_init_point || res.init_point
      })),
      catchError(err => {
        console.error('Error creando preferencia Mercado Pago:', err);
        return of(null);
      })
    );
  }

  /**
   * Procesa el pago tokenizado desde Payment Bricks llamando a /v1/payments
   */
  processPayment(formData: any): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.accessToken}`
    });

    return this.http.post<any>('https://api.mercadopago.com/v1/payments', formData, { headers }).pipe(
      catchError(err => {
        console.error('Error procesando el pago en Mercado Pago:', err);
        return of({ status: 'rejected', status_detail: 'cc_rejected_other_reason' });
      })
    );
  }
}
