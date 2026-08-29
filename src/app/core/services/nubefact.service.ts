import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ProductoNubefact {
  id: string;
  nombre: string;
  cantidad: number;
  precio_unitario: number;
}

@Injectable({
  providedIn: 'root'
})
export class NubefactService {
  // URL (Ruta) proporcionada por Nubefact
  private readonly URL = 'https://api.nubefact.com/api/v1/74dcf8af-0835-4cb9-bff2-e69ec2db847b';
  
  // Token proporcionado por Nubefact
  private readonly TOKEN = '4ba047930f0a46a8b82b45cc6ae7a4c3e7c36bdf671040709ec5ac4d8cf8d916';

  constructor(private http: HttpClient) {}

  generarBoleta(
    clienteDni: string, 
    clienteNombre: string, 
    clienteDireccion: string, 
    totalPedido: number, 
    productos: ProductoNubefact[]
  ): Observable<any> {
    
    // Cálculo básico (asumiendo que los precios YA incluyen IGV 18%)
    const baseImponible = totalPedido / 1.18;
    const totalIgv = totalPedido - baseImponible;

    const items = productos.map(prod => {
      const precioTotalItem = prod.precio_unitario * prod.cantidad;
      const valorUnitario = prod.precio_unitario / 1.18;
      const subtotalItem = precioTotalItem / 1.18;
      const igvItem = precioTotalItem - subtotalItem;

      return {
        "unidad_de_medida": "NIU",
        "codigo": prod.id,
        "descripcion": prod.nombre,
        "cantidad": prod.cantidad,
        "valor_unitario": valorUnitario.toFixed(2),
        "precio_unitario": prod.precio_unitario.toFixed(2),
        "descuento": "",
        "subtotal": subtotalItem.toFixed(2),
        "tipo_de_igv": "1", // Gravado
        "igv": igvItem.toFixed(2),
        "total": precioTotalItem.toFixed(2),
        "anticipo_regularizacion": "false",
        "anticipo_documento_serie": "",
        "anticipo_documento_numero": ""
      };
    });

    const body = {
      "operacion": "generar_comprobante",
      "tipo_de_comprobante": "2", // Boleta
      "serie": "B001",
      "numero": "1", // Correlativo (idealmente debe incrementar)
      "sunat_transaction": "1",
      "cliente_tipo_de_documento": "1", // DNI
      "cliente_numero_de_documento": clienteDni,
      "cliente_denominacion": clienteNombre,
      "cliente_direccion": clienteDireccion,
      "cliente_email": "",
      "cliente_email_1": "",
      "cliente_email_2": "",
      "fecha_de_emision": new Date().toISOString().substring(0, 10),
      "fecha_de_vencimiento": "",
      "moneda": "1", // Soles
      "tipo_de_cambio": "",
      "porcentaje_de_igv": "18.00",
      "descuento_global": "",
      "total_descuento": "",
      "total_anticipo": "",
      "total_gravada": baseImponible.toFixed(2),
      "total_inafecta": "",
      "total_exonerada": "",
      "total_igv": totalIgv.toFixed(2),
      "total_gratuita": "",
      "total_otros_cargos": "",
      "total": totalPedido.toFixed(2),
      "percepcion_tipo": "",
      "percepcion_base_imponible": "",
      "total_percepcion": "",
      "total_incluido_percepcion": "",
      "detraccion": "false",
      "observaciones": "Pedido realizado desde TortasYaniApp Web",
      "documento_que_se_modifica_tipo": "",
      "documento_que_se_modifica_serie": "",
      "documento_que_se_modifica_numero": "",
      "tipo_de_nota_de_credito": "",
      "tipo_de_nota_de_debito": "",
      "enviar_automaticamente_a_la_sunat": "true",
      "enviar_automaticamente_al_cliente": "false",
      "codigo_unico": "",
      "condiciones_de_pago": "",
      "medio_de_pago": "",
      "plazo_de_pago": "",
      "medio_de_pago_detalles": "",
      "items": items
    };

    const headers = new HttpHeaders({
      'Authorization': `Token token="${this.TOKEN}"`,
      'Content-Type': 'application/json'
    });

    return this.http.post(this.URL, body, { headers });
  }
}
