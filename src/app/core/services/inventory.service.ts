import { Injectable, signal, computed } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, of, map, tap } from 'rxjs';

import { InventoryItem, StockMovement, InventorySummary, MovementType } from '../models/models';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class InventoryService {
  private readonly baseUrl = 'https://tortasyaniapiweb-production.up.railway.app/api/inventory';
  private readonly STORAGE_ITEMS_KEY = 'yani_inventory_items_v1';
  private readonly STORAGE_MOVEMENTS_KEY = 'yani_inventory_movements_v1';

  // Reactive State Signals
  inventoryItems = signal<InventoryItem[]>([]);
  movements = signal<StockMovement[]>([]);
  isLoading = signal<boolean>(false);

  // Computed summary statistics
  summary = computed<InventorySummary>(() => {
    const items = this.inventoryItems();
    const movs = this.movements();

    const totalItems = items.length;
    const valorTotalInventario = items.reduce((acc, item) => acc + (item.stockActual * item.costoUnitario), 0);
    const itemsStockBajo = items.filter(item => item.stockActual <= item.stockMinimo).length;

    const todayStr = new Date().toISOString().split('T')[0];
    const movimientosHoyCount = movs.filter(m => m.fecha.startsWith(todayStr)).length;

    return {
      totalItems,
      valorTotalInventario,
      itemsStockBajo,
      movimientosHoyCount
    };
  });

  // Seed Data for bakery supplies
  private readonly mockInitialItems: InventoryItem[] = [
    {
      id: '001',
      nombre: 'Harina Especial de Repostería',
      categoria: 'Ingredientes',
      stockActual: 45,
      stockMinimo: 15,
      unidadMedida: 'kg',
      costoUnitario: 4.80,
      proveedor: 'Alicorp S.A.',
      ultimaActualizacion: new Date().toISOString()
    },
    {
      id: '002',
      nombre: 'Cobertura de Chocolate Amargo 70%',
      categoria: 'Ingredientes',
      stockActual: 8,
      stockMinimo: 10,
      unidadMedida: 'kg',
      costoUnitario: 38.50,
      proveedor: 'Cacao Sol Peruanos',
      ultimaActualizacion: new Date().toISOString()
    },
    {
      id: '003',
      nombre: 'Azúcar Impalpable / Flor',
      categoria: 'Ingredientes',
      stockActual: 25,
      stockMinimo: 10,
      unidadMedida: 'kg',
      costoUnitario: 6.20,
      proveedor: 'Distribuidora San Martin',
      ultimaActualizacion: new Date().toISOString()
    },
    {
      id: '004',
      nombre: 'Mantequilla Sin Sal 82% Grasa',
      categoria: 'Ingredientes',
      stockActual: 12,
      stockMinimo: 8,
      unidadMedida: 'kg',
      costoUnitario: 26.00,
      proveedor: 'Lácteos Gloria',
      ultimaActualizacion: new Date().toISOString()
    },
    {
      id: '005',
      nombre: 'Pasta Fondant Blanco Superior',
      categoria: 'Decoración',
      stockActual: 5,
      stockMinimo: 8,
      unidadMedida: 'kg',
      costoUnitario: 22.00,
      proveedor: 'Bakery World',
      ultimaActualizacion: new Date().toISOString()
    },
    {
      id: '006',
      nombre: 'Cajas Premium para Torta de 30x30 cm',
      categoria: 'Empaques',
      stockActual: 80,
      stockMinimo: 30,
      unidadMedida: 'unidades',
      costoUnitario: 3.50,
      proveedor: 'Empaques Perú',
      ultimaActualizacion: new Date().toISOString()
    },
    {
      id: '007',
      nombre: 'Cintas de Raso Decorativas (Rollos)',
      categoria: 'Empaques',
      stockActual: 15,
      stockMinimo: 5,
      unidadMedida: 'unidades',
      costoUnitario: 8.00,
      proveedor: 'Mercería Central',
      ultimaActualizacion: new Date().toISOString()
    },
    {
      id: '008',
      nombre: 'Esencia de Vainilla Madagaskar (1L)',
      categoria: 'Ingredientes',
      stockActual: 4,
      stockMinimo: 2,
      unidadMedida: 'litros',
      costoUnitario: 45.00,
      proveedor: 'Sabores y Fragancias SA',
      ultimaActualizacion: new Date().toISOString()
    }
  ];

  private readonly mockInitialMovements: StockMovement[] = [
    {
      id: '1001',
      itemId: '001',
      itemName: 'Harina Especial de Repostería',
      tipo: 'ENTRADA',
      cantidad: 50,
      unidadMedida: 'kg',

      motivo: 'Compra mensual a proveedor Alicorp',
      fecha: new Date(Date.now() - 86400000 * 2).toISOString(),
      usuario: 'Administrador Yani'
    },
    {
      id: 'MOV-1002',
      itemId: 'INV-002',
      itemName: 'Cobertura de Chocolate Amargo 70%',
      tipo: 'SALIDA',
      cantidad: 5,
      unidadMedida: 'kg',
      motivo: 'Uso en lote de Tortas de Chocolate y Trufas',
      fecha: new Date(Date.now() - 86400000 * 1).toISOString(),
      usuario: 'Administrador Yani'
    }
  ];

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
    this.initInventory();
  }

  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    });
  }

  /**
   * Initializes state from LocalStorage or seed data, and syncs with HTTP Backend API
   */
  public initInventory(): void {
    this.isLoading.set(true);

    // Load from LocalStorage fallback first
    const savedItems = localStorage.getItem(this.STORAGE_ITEMS_KEY);
    const savedMovs = localStorage.getItem(this.STORAGE_MOVEMENTS_KEY);

    if (savedItems) {
      try {
        const parsed: InventoryItem[] = JSON.parse(savedItems);
        const cleaned = parsed.map(i => ({ ...i, id: i.id.replace(/^INV-/, '') }));
        this.inventoryItems.set(cleaned);
      } catch (e) {
        this.inventoryItems.set(this.mockInitialItems);
      }
    } else {
      this.inventoryItems.set(this.mockInitialItems);
      this.saveItemsToStorage();
    }

    if (savedMovs) {
      try {
        const parsedMovs: StockMovement[] = JSON.parse(savedMovs);
        const cleanedMovs = parsedMovs.map(m => ({
          ...m,
          id: m.id.replace(/^MOV-/, ''),
          itemId: m.itemId.replace(/^INV-/, '')
        }));
        this.movements.set(cleanedMovs);
      } catch (e) {
        this.movements.set(this.mockInitialMovements);
      }
    } else {
      this.movements.set(this.mockInitialMovements);
      this.saveMovementsToStorage();
    }

    // Attempt to fetch from Backend REST API
    this.http.get<InventoryItem[]>(this.baseUrl, { headers: this.getAuthHeaders() }).pipe(
      tap(backendItems => {
        if (backendItems && backendItems.length > 0) {
          const cleanedBackend = backendItems.map(i => ({ ...i, id: i.id.replace(/^INV-/, '') }));
          this.inventoryItems.set(cleanedBackend);
          this.saveItemsToStorage();
        }
        this.isLoading.set(false);
      }),
      catchError(err => {
        console.warn('Backend server not reachable for inventory API. Operating in local mode.', err?.message);
        this.isLoading.set(false);
        return of(null);
      })
    ).subscribe();
  }

  /**
   * Create a new inventory item
   */
  public addInventoryItem(itemData: Omit<InventoryItem, 'id' | 'ultimaActualizacion'>): Observable<InventoryItem> {
    const newItem: InventoryItem = {
      ...itemData,
      id: Date.now().toString().slice(-4),
      ultimaActualizacion: new Date().toISOString()
    };

    // Update local state immediately
    const updated = [newItem, ...this.inventoryItems()];
    this.inventoryItems.set(updated);
    this.saveItemsToStorage();

    // Register initial entry movement
    this.recordMovement({
      itemId: newItem.id,
      itemName: newItem.nombre,
      tipo: 'ENTRADA',
      cantidad: newItem.stockActual,
      unidadMedida: newItem.unidadMedida,
      motivo: 'Registro inicial de insumo'
    });

    // Try posting to Backend REST API
    return this.http.post<InventoryItem>(this.baseUrl, newItem, { headers: this.getAuthHeaders() }).pipe(
      catchError(err => {
        console.warn('Could not post new item to backend REST server. Saved locally.', err);
        return of(newItem);
      })
    );
  }

  /**
   * Update existing inventory item details
   */
  public updateInventoryItem(id: string, changes: Partial<InventoryItem>): Observable<InventoryItem | null> {
    const items = [...this.inventoryItems()];
    const index = items.findIndex(i => i.id === id);

    if (index === -1) return of(null);

    const updatedItem: InventoryItem = {
      ...items[index],
      ...changes,
      ultimaActualizacion: new Date().toISOString()
    };

    items[index] = updatedItem;
    this.inventoryItems.set(items);
    this.saveItemsToStorage();

    // Backend PUT request
    return this.http.put<InventoryItem>(`${this.baseUrl}/${id}`, updatedItem, { headers: this.getAuthHeaders() }).pipe(
      catchError(err => {
        console.warn(`Could not update item ${id} on backend API. Updated locally.`, err);
        return of(updatedItem);
      })
    );
  }

  /**
   * Adjust stock level (Entrada, Salida, Merma) and record Kardex movement
   */
  public adjustStock(id: string, tipo: MovementType, cantidad: number, motivo: string): Observable<boolean> {
    const items = [...this.inventoryItems()];
    const item = items.find(i => i.id === id);

    if (!item || cantidad <= 0) return of(false);

    let newStock = item.stockActual;
    if (tipo === 'ENTRADA') {
      newStock += cantidad;
    } else {
      newStock = Math.max(0, newStock - cantidad);
    }

    item.stockActual = newStock;
    item.ultimaActualizacion = new Date().toISOString();

    this.inventoryItems.set(items);
    this.saveItemsToStorage();

    // Record movement in Kardex
    this.recordMovement({
      itemId: item.id,
      itemName: item.nombre,
      tipo,
      cantidad,
      unidadMedida: item.unidadMedida,
      motivo
    });

    // Send adjustment to backend
    const payload = { tipo, cantidad, motivo, newStock };
    return this.http.post<boolean>(`${this.baseUrl}/${id}/adjust`, payload, { headers: this.getAuthHeaders() }).pipe(
      map(() => true),
      catchError(err => {
        console.warn(`Adjust stock for ${id} saved locally. Backend notification failed.`, err);
        return of(true);
      })
    );
  }

  /**
   * Delete an inventory item
   */
  public deleteInventoryItem(id: string): Observable<boolean> {
    const updated = this.inventoryItems().filter(i => i.id !== id);
    this.inventoryItems.set(updated);
    this.saveItemsToStorage();

    return this.http.delete<boolean>(`${this.baseUrl}/${id}`, { headers: this.getAuthHeaders() }).pipe(
      map(() => true),
      catchError(err => {
        console.warn(`Delete item ${id} executed locally.`, err);
        return of(true);
      })
    );
  }

  /**
   * Record a Kardex stock movement
   */
  private recordMovement(params: {
    itemId: string;
    itemName: string;
    tipo: MovementType;
    cantidad: number;
    unidadMedida: any;
    motivo: string;
  }): void {
    const userObj = this.authService.currentUser();
    const userName = userObj ? userObj.nombre : 'Admin Yani';

    const newMov: StockMovement = {
      id: Date.now().toString().slice(-5),
      itemId: params.itemId,
      itemName: params.itemName,
      tipo: params.tipo,
      cantidad: params.cantidad,
      unidadMedida: params.unidadMedida,
      motivo: params.motivo,
      fecha: new Date().toISOString(),
      usuario: userName
    };


    const updatedMovs = [newMov, ...this.movements()];
    this.movements.set(updatedMovs);
    this.saveMovementsToStorage();
  }

  private saveItemsToStorage(): void {
    try {
      localStorage.setItem(this.STORAGE_ITEMS_KEY, JSON.stringify(this.inventoryItems()));
    } catch (e) {
      console.error('Error writing inventory to localStorage', e);
    }
  }

  private saveMovementsToStorage(): void {
    try {
      localStorage.setItem(this.STORAGE_MOVEMENTS_KEY, JSON.stringify(this.movements()));
    } catch (e) {
      console.error('Error writing movements to localStorage', e);
    }
  }
}
