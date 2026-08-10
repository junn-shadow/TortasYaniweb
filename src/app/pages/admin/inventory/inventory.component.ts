import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { InventoryService } from '../../../core/services/inventory.service';
import { ProductsService } from '../../../core/services/products.service';
import { AuthService } from '../../../core/services/auth.service';
import { InventoryItem, InventoryCategory, UnitOfMeasure, MovementType, Product } from '../../../core/models/models';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './inventory.component.html',
  styleUrl: './inventory.component.scss'
})
export class InventoryComponent implements OnInit {
  // Navigation tabs: 'supplies' | 'products' | 'kardex'
  activeTab = signal<'supplies' | 'products' | 'kardex'>('supplies');

  // Filters & Search
  searchTerm = signal<string>('');
  selectedCategory = signal<string>('TODAS');
  stockStatusFilter = signal<'ALL' | 'LOW' | 'OUT'>('ALL');

  // Modal States
  showItemModal = signal<boolean>(false);
  showAdjustModal = signal<boolean>(false);
  showProductStockModal = signal<boolean>(false);

  // Active item for Edit or Stock Adjustment
  isEditing = signal<boolean>(false);
  currentItem = signal<Partial<InventoryItem>>({
    nombre: '',
    categoria: 'Ingredientes',
    stockActual: 0,
    stockMinimo: 5,
    unidadMedida: 'kg',
    costoUnitario: 0,
    proveedor: ''
  });

  // Active adjustment form
  adjustData = signal<{
    itemId: string;
    itemName: string;
    tipo: MovementType;
    cantidad: number;
    motivo: string;
  }>({
    itemId: '',
    itemName: '',
    tipo: 'ENTRADA',
    cantidad: 1,
    motivo: ''
  });

  // Active Product Stock edit form
  selectedProduct = signal<Product | null>(null);
  newProductStock = signal<number>(0);

  // Toast alert message
  toastMessage = signal<string | null>(null);

  // Computed filtered supplies list
  filteredSupplies = computed(() => {
    let list = this.inventoryService.inventoryItems();
    const search = this.searchTerm().toLowerCase().trim();
    const category = this.selectedCategory();
    const status = this.stockStatusFilter();

    if (search) {
      list = list.filter(item =>
        item.nombre.toLowerCase().includes(search) ||
        (item.proveedor && item.proveedor.toLowerCase().includes(search)) ||
        item.id.toLowerCase().includes(search)
      );
    }

    if (category !== 'TODAS') {
      list = list.filter(item => item.categoria === category);
    }

    if (status === 'LOW') {
      list = list.filter(item => item.stockActual > 0 && item.stockActual <= item.stockMinimo);
    } else if (status === 'OUT') {
      list = list.filter(item => item.stockActual === 0);
    }

    return list;
  });

  constructor(
    public inventoryService: InventoryService,
    public productsService: ProductsService,
    public authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.productsService.getProducts().subscribe();
  }

  // --- Modal Openers ---

  openNewItemModal(): void {
    this.isEditing.set(false);
    this.currentItem.set({
      nombre: '',
      categoria: 'Ingredientes',
      stockActual: 10,
      stockMinimo: 5,
      unidadMedida: 'kg',
      costoUnitario: 0.0,
      proveedor: ''
    });
    this.showItemModal.set(true);
  }

  openEditItemModal(item: InventoryItem): void {
    this.isEditing.set(true);
    this.currentItem.set({ ...item });
    this.showItemModal.set(true);
  }

  closeItemModal(): void {
    this.showItemModal.set(false);
  }

  openAdjustModal(item: InventoryItem, defaultType: MovementType = 'ENTRADA'): void {
    this.adjustData.set({
      itemId: item.id,
      itemName: item.nombre,
      tipo: defaultType,
      cantidad: 1,
      motivo: defaultType === 'ENTRADA' ? 'Reabastecimiento de insumos' : 'Uso en producción de pastelería'
    });
    this.showAdjustModal.set(true);
  }

  closeAdjustModal(): void {
    this.showAdjustModal.set(false);
  }

  openProductStockModal(product: Product): void {
    this.selectedProduct.set(product);
    this.newProductStock.set(product.stock);
    this.showProductStockModal.set(true);
  }

  closeProductStockModal(): void {
    this.showProductStockModal.set(false);
    this.selectedProduct.set(null);
  }

  // --- Actions & CRUD ---

  saveItem(): void {
    const data = this.currentItem();

    if (!data.nombre || data.nombre.trim() === '') {
      this.showToast('⚠️ Por favor ingresa el nombre del insumo');
      return;
    }

    if (this.isEditing() && data.id) {
      this.inventoryService.updateInventoryItem(data.id, data).subscribe(() => {
        this.showToast('✅ Insumo actualizado correctamente');
        this.closeItemModal();
      });
    } else {
      this.inventoryService.addInventoryItem(data as any).subscribe(() => {
        this.showToast('🎉 Nuevo insumo registrado exitosamente');
        this.closeItemModal();
      });
    }
  }

  submitAdjustment(): void {
    const data = this.adjustData();

    if (!data.motivo || data.motivo.trim() === '') {
      this.showToast('⚠️ Debes ingresar un motivo para el movimiento');
      return;
    }

    if (data.cantidad <= 0) {
      this.showToast('⚠️ La cantidad debe ser mayor a 0');
      return;
    }

    this.inventoryService.adjustStock(data.itemId, data.tipo, data.cantidad, data.motivo).subscribe(() => {
      const icon = data.tipo === 'ENTRADA' ? '📥' : (data.tipo === 'SALIDA' ? '📤' : '⚠️');
      this.showToast(`${icon} Movimiento de stock registrado (${data.tipo})`);
      this.closeAdjustModal();
    });
  }

  confirmDeleteItem(item: InventoryItem): void {
    if (confirm(`¿Estás seguro de eliminar el insumo "${item.nombre}"?`)) {
      this.inventoryService.deleteInventoryItem(item.id).subscribe(() => {
        this.showToast('🗑️ Insumo eliminado del inventario');
      });
    }
  }

  saveProductStock(): void {
    const prod = this.selectedProduct();
    if (!prod) return;

    const newStock = Math.max(0, this.newProductStock());
    this.productsService.updateProductStock(prod.id, newStock).subscribe(() => {
      this.showToast(`🍰 Stock de "${prod.nombre}" actualizado a ${newStock} unidades`);
      this.closeProductStockModal();
    });
  }

  // --- Utilities ---

  getStockStatusBadge(item: InventoryItem): { label: string; class: string } {
    if (item.stockActual === 0) {
      return { label: 'Agotado', class: 'status-out' };
    } else if (item.stockActual <= item.stockMinimo) {
      return { label: 'Poco Stock', class: 'status-low' };
    }
    return { label: 'En Stock', class: 'status-ok' };
  }

  showToast(msg: string): void {
    this.toastMessage.set(msg);
    setTimeout(() => {
      this.toastMessage.set(null);
    }, 3500);
  }

  onLogout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}
