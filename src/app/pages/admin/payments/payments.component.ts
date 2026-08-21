import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaymentTransaction } from '../../../core/models/models';
import { PaymentsService } from '../../../core/services/payments.service';
import { OrdersService } from '../../../core/services/orders.service';
import { ExcelExportService } from '../../../core/services/excel-export.service';
import { AdminSidebarComponent } from '../../../shared/components/admin-sidebar/admin-sidebar.component';

@Component({
  selector: 'app-payments',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminSidebarComponent],
  templateUrl: './payments.component.html',
  styleUrl: './payments.component.scss'
})
export class PaymentsComponent {

  // Filters
  searchTerm = signal<string>('');
  selectedMethod = signal<string>('TODOS');
  selectedStatus = signal<string>('TODOS');
  startDate = signal<string>('');
  endDate = signal<string>('');

  // Selected Voucher Modal
  selectedPayment = signal<PaymentTransaction | null>(null);
  toastMessage = signal<string | null>(null);

  // Computed KPI Metrics
  totalCollected = computed(() => {
    return this.paymentsService.payments()
      .filter(p => p.estado === 'Aprobado')
      .reduce((acc, p) => acc + p.monto, 0);
  });

  pendingValidationCount = computed(() => {
    return this.paymentsService.payments().filter(p => p.estado === 'En revisión').length;
  });

  pendingReceivables = computed(() => {
    return this.ordersService.orders().reduce((acc, o) => acc + (o.saldoPendiente || 0), 0);
  });

  // Filtered Table
  filteredPayments = computed(() => {
    let list = this.paymentsService.payments();
    const search = this.searchTerm().toLowerCase().trim();
    const method = this.selectedMethod();
    const status = this.selectedStatus();
    const start = this.startDate();
    const end = this.endDate();

    if (search) {
      list = list.filter(p =>
        p.id.toLowerCase().includes(search) ||
        p.orderId.toLowerCase().includes(search) ||
        p.cliente.toLowerCase().includes(search)
      );
    }

    if (method !== 'TODOS') {
      list = list.filter(p => p.metodo === method);
    }

    if (status !== 'TODOS') {
      list = list.filter(p => p.estado === status);
    }

    if (start) {
      list = list.filter(p => p.fecha >= start);
    }
    if (end) {
      list = list.filter(p => p.fecha <= end + ' 23:59');
    }

    return list;
  });

  constructor(
    public paymentsService: PaymentsService,
    public ordersService: OrdersService,
    private excelExportService: ExcelExportService
  ) {}

  openVoucherModal(pay: PaymentTransaction): void {
    this.selectedPayment.set(pay);
  }

  closeVoucherModal(): void {
    this.selectedPayment.set(null);
  }

  approve(payId: string): void {
    this.paymentsService.approvePayment(payId);
    if (this.selectedPayment()?.id === payId) {
      this.selectedPayment.set({ ...this.selectedPayment()!, estado: 'Aprobado' });
    }
    this.showToast(`✅ Pago ${payId} Aprobado exitosamente`);
  }

  reject(payId: string): void {
    this.paymentsService.rejectPayment(payId);
    if (this.selectedPayment()?.id === payId) {
      this.selectedPayment.set({ ...this.selectedPayment()!, estado: 'Rechazado' });
    }
    this.showToast(`❌ Pago ${payId} Rechazado`);
  }

  exportExcel(): void {
    const list = this.filteredPayments();
    if (list.length === 0) {
      this.showToast('⚠️ No hay pagos para exportar.');
      return;
    }
    this.excelExportService.exportToExcel(list, 'Reporte_Pagos_Tortas_Yane', 'Pagos');
    this.showToast('📊 Reporte de Pagos Excel generado correctamente');
  }

  showToast(msg: string): void {
    this.toastMessage.set(msg);
    setTimeout(() => this.toastMessage.set(null), 3500);
  }
}
