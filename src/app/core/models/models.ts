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
}

export interface Order {
  id: string;
  fecha: string;
  fechaRaw?: string;
  cliente: string;
  telefono: string;
  direccion: string;
  estado: 'Pendiente' | 'En Horno' | 'En Camino' | 'Entregado';
  items: OrderItem[];
  total: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}
