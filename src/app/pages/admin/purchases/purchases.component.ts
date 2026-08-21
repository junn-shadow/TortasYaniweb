import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PurchaseItem } from '../../../core/models/models';
import { PurchasesService } from '../../../core/services/purchases.service';
import { ExcelExportService } from '../../../core/services/excel-export.service';
import { AdminSidebarComponent } from '../../../shared/components/admin-sidebar/admin-sidebar.component';

@Component({
  selector: 'app-purchases',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminSidebarComponent],
  templateUrl: './purchases.component.html',
  styleUrl: './purchases.component.scss'
})
export class PurchasesComponent {

  searchTerm = signal<string>('');
  selectedStatus = signal<string>('TODOS');
  
  selectedPurchase = signal<PurchaseItem | null>(null);
  abonoMonto = signal<number>(0);
  toastMessage = signal<string | null>(null);

  // KPI Calculations
  totalPurchased = computed(() => {
    return this.purchasesService.purchases().reduce((acc, p) => acc + p.montoTotal, 0);
  });

  totalPaid = computed(() => {
    return this.purchasesService.purchases().reduce((acc, p) => acc + p.montoPagado, 0);
  });

  accountsPayable = computed(() => {
    return this.purchasesService.purchases().reduce((acc, p) => acc + p.saldoPendiente, 0);
  });

  filteredPurchases = computed(() => {
    let list = this.purchasesService.purchases();
    const search = this.searchTerm().toLowerCase().trim();
    const status = this.selectedStatus();

    if (search) {
      list = list.filter(p =>
        p.id.toLowerCase().includes(search) ||
        p.proveedor.toLowerCase().includes(search) ||
        p.insumosSummary.toLowerCase().includes(search)
      );
    }

    if (status !== 'TODOS') {
      list = list.filter(p => p.estado === status);
    }

    return list;
  });

  constructor(
    public purchasesService: PurchasesService,
    private excelExportService: ExcelExportService
  ) {}

  openPaymentModal(item: PurchaseItem): void {
    this.selectedPurchase.set(item);
    this.abonoMonto.set(item.saldoPendiente);
  }

  closePaymentModal(): void {
    this.selectedPurchase.set(null);
  }

  submitAbono(): void {
    const item = this.selectedPurchase();
    const amount = this.abonoMonto();

    if (!item || amount <= 0) {
      this.showToast('⚠️ Ingresa un monto válido para el abono.');
      return;
    }

    if (amount > item.saldoPendiente) {
      this.showToast('⚠️ El monto a abonar no puede ser mayor al saldo pendiente.');
      return;
    }

    this.purchasesService.registerPayment(item.id, amount);
    this.showToast(`✅ Abono de S/ ${amount.toFixed(2)} registrado a factura ${item.id}`);
    this.closePaymentModal();
  }

  exportExcel(): void {
    const list = this.filteredPurchases();
    if (list.length === 0) {
      this.showToast('⚠️ No hay egresos para exportar.');
      return;
    }
    this.excelExportService.exportPurchasesReport(list, this.totalPurchased(), this.accountsPayable());
    this.showToast('📊 Reporte de Compras Excel generado correctamente');
  }

  showToast(msg: string): void {
    this.toastMessage.set(msg);
    setTimeout(() => this.toastMessage.set(null), 3500);
  }
}
