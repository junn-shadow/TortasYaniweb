export type InventoryCategory = 'Ingredientes' | 'Empaques' | 'Decoración' | 'Utensilios';
export type UnitOfMeasure = 'kg' | 'g' | 'litros' | 'ml' | 'unidades' | 'cajas' | 'paquetes';
export type MovementType = 'ENTRADA' | 'SALIDA' | 'MERMA';

export interface InventoryItem {
  id: string;
  nombre: string;
  categoria: InventoryCategory;
  stockActual: number;
  stockMinimo: number;
  unidadMedida: UnitOfMeasure;
  costoUnitario: number; // en Soles (S/)
  proveedor?: string;
  ultimaActualizacion: string; // ISO String o Formato fecha
}

export interface StockMovement {
  id: string;
  itemId: string;
  itemName: string;
  tipo: MovementType;
  cantidad: number;
  unidadMedida: UnitOfMeasure;
  motivo: string; // Ej: "Compra de insumos", "Uso en producción de Torta de Chocolate", "Merma por vencimiento"
  fecha: string;
  usuario: string;
}

export interface InventorySummary {
  totalItems: number;
  valorTotalInventario: number;
  itemsStockBajo: number;
  movimientosHoyCount: number;
}
