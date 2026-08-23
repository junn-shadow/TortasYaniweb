export interface User {
  id: string;
  nombre: string;
  email: string;
  rol: 'admin' | 'client';
  activo: boolean;
  descripcion?: string;
  password?: string;
  telefono?: string;
  direccion?: string;
  fotoPerfil?: string;
  token?: string;
}

export interface Product {
  id: string;
  nombre: string;
  precio: number;
  stock: number;
  imagen: string;
  categoria: string;
  descripcion: string;
  badge?: string;
  rating?: number;
  resenas?: number;
  ingredientes: string[];
  tamanios: string[];
}

export interface CartItem {
  nombre: string;
  imagen: string;
  precio: number;
  tamanio: string;
  sabor: string;
  pisos: number;
  porciones: number;
  colorDecoracion: string;
  mensaje: string;
  descripcion?: string;
  cantidad: number;
}

export interface OrderItem {
  nombre: string;
  cantidad: number;
  precio: number;
  tamanio?: string;
  sabor?: string;
  pisos?: number;
}

export interface Order {
  id: string;
  fecha: string;
  fechaRaw?: string;
  cliente: string;
  dniCliente?: string;
  telefono: string;
  direccion: string;
  referenciaDireccion?: string;
  estado: 'Pendiente' | 'Pagado' | 'En Preparación' | 'Entregado' | 'Cancelado';
  estadoPago?: 'Aprobado' | 'En revisión' | 'Pendiente' | 'Rechazado';
  metodoPago?: 'Yape' | 'Plin' | 'Tarjeta' | 'Efectivo';
  montoAdelanto?: number; // 50% Adelanto
  saldoPendiente?: number; // 50% Restante al entregar
  voucherUrl?: string;
  items: OrderItem[];
  productosSummary?: string;
  total: number;
  comprobanteEmitido?: boolean;
}

export interface PaymentTransaction {
  id: string;
  orderId: string;
  cliente: string;
  monto: number;
  metodo: 'Yape' | 'Plin' | 'Tarjeta' | 'Efectivo';
  tipo: 'Adelanto (50%)' | 'Pago Total' | 'Saldo Final (50%)';
  estado: 'Aprobado' | 'En revisión' | 'Rechazado';
  fecha: string;
  voucherUrl?: string;
}

export interface PurchaseItem {
  id: string;
  proveedor: string;
  fecha: string;
  insumosSummary: string;
  montoTotal: number;
  montoPagado: number;
  saldoPendiente: number;
  estado: 'Pagado' | 'Pendiente';
  observaciones?: string;
}

export interface InvoiceDoc {
  numeroComprobante: string; // ej. B001-000452 o F001-000120
  orderId: string;
  cliente: string;
  documentoCliente: string; // RUC o DNI
  tipo: 'Boleta' | 'Factura' | 'Ticket' | 'Nota de Crédito';
  fechaEmision: string;
  montoTotal: number;
  estadoSunat: 'Aceptado' | 'Pendiente' | 'Anulado';
  pdfUrl?: string; // Link to the stored PDF in Cloudinary/S3
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export * from './inventory.model';

