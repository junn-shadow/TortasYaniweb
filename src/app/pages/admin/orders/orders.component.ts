import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Order } from '../../../core/models/models';
import { OrdersService } from '../../../core/services/orders.service';
import { ExcelExportService } from '../../../core/services/excel-export.service';
import { AuthService } from '../../../core/services/auth.service';
import { InvoicesService } from '../../../core/services/invoices.service';
import { AdminSidebarComponent } from '../../../shared/components/admin-sidebar/admin-sidebar.component';

@Component({
  selector: 'app-admin-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AdminSidebarComponent],
  templateUrl: './orders.component.html',
  styleUrl: './orders.component.scss'
})
export class OrdersComponent {

  // Search & Filters State
  searchTerm = signal<string>('');
  selectedStatus = signal<string>('TODOS');
  startDate = signal<string>('');
  endDate = signal<string>('');

  // Selected Order for Details Modal
  selectedOrder = signal<Order | null>(null);
  toastMessage = signal<string | null>(null);

  // Status options for Order workflow
  statusOptions: Order['estado'][] = ['Pendiente', 'Pagado', 'En Preparación', 'Entregado', 'Cancelado'];

  // Filtered Orders Computation
  filteredOrders = computed(() => {
    let list = this.ordersService.orders();
    const search = this.searchTerm().toLowerCase().trim();
    const status = this.selectedStatus();
    const start = this.startDate();
    const end = this.endDate();

    if (search) {
      list = list.filter(o =>
        o.id.toLowerCase().includes(search) ||
        o.cliente.toLowerCase().includes(search) ||
        (o.dniCliente && o.dniCliente.includes(search)) ||
        o.direccion.toLowerCase().includes(search)
      );
    }

    if (status !== 'TODOS') {
      list = list.filter(o => o.estado === status);
    }

    if (start) {
      list = list.filter(o => o.fecha >= start);
    }
    if (end) {
      list = list.filter(o => o.fecha <= end + ' 23:59');
    }

    return list;
  });

  // KPI Metrics Computed
  totalSalesSum = computed(() => {
    return this.filteredOrders().reduce((acc, o) => acc + o.total, 0);
  });

  totalCollectedSum = computed(() => {
    return this.filteredOrders().reduce((acc, o) => acc + (o.montoAdelanto || o.total), 0);
  });

  totalPendingSum = computed(() => {
    return this.filteredOrders().reduce((acc, o) => acc + (o.saldoPendiente || 0), 0);
  });

  constructor(
    public ordersService: OrdersService,
    private excelExportService: ExcelExportService,
    public authService: AuthService,
    private invoicesService: InvoicesService
  ) {}

  openDetails(order: Order): void {
    this.selectedOrder.set(order);
  }

  closeDetails(): void {
    this.selectedOrder.set(null);
  }

  updateStatus(orderId: string, newStatus: any): void {
    this.ordersService.updateOrderStatus(orderId, newStatus);
    if (this.selectedOrder()?.id === orderId) {
      this.selectedOrder.set({ ...this.selectedOrder()!, estado: newStatus });
    }
    this.showToast(`✅ Estado de orden ${orderId} actualizado a "${newStatus}"`);
  }

  exportExcelReport(): void {
    const list = this.filteredOrders();
    if (list.length === 0) {
      this.showToast('⚠️ No hay órdenes en el filtro actual para exportar.');
      return;
    }
    const total = this.totalSalesSum();
    this.excelExportService.exportSalesReport(list, total, `Reporte_Ventas_Yane_${this.selectedStatus()}`);
    this.showToast('📊 Reporte de Ventas Excel generado correctamente');
  }

  sendWhatsAppReceipt(order: Order): void {
    const number = order.telefono.replace(/\D/g, '');
    const isDelivery = order.direccion && order.direccion.toLowerCase() !== 'recojo en local';
    let text = `Hola ${order.cliente},\n\nTe enviamos el comprobante de tu pedido *${order.id}* en Tortas Yani.\n\n`;
    text += `*Total:* S/ ${order.total.toFixed(2)}\n`;
    text += `*Adelanto Pagado:* S/ ${(order.montoAdelanto || order.total / 2).toFixed(2)}\n`;
    text += `*Saldo Pendiente:* S/ ${(order.saldoPendiente || 0).toFixed(2)}\n\n`;
    if (isDelivery) {
      text += `*Dirección de Entrega:* ${order.direccion}\n\n`;
    }
    text += `¡Gracias por tu compra!`;

    const encodedText = encodeURIComponent(text);
    const url = `https://wa.me/51${number}?text=${encodedText}`;
    window.open(url, '_blank');
  }

  deleteOrder(orderId: string): void {
    if (confirm(`¿Estás seguro de eliminar permanentemente la orden ${orderId}?`)) {
      this.ordersService.deleteOrder(orderId);
      if (this.selectedOrder()?.id === orderId) {
        this.closeDetails();
      }
      this.showToast(`🗑️ Orden ${orderId} eliminada`);
    }
  }

  showToast(msg: string): void {
    this.toastMessage.set(msg);
    setTimeout(() => this.toastMessage.set(null), 3500);
  }

  onLogout(): void {
    this.authService.logout();
  }

  generateInvoice(order: Order, type: 'Boleta' | 'Factura'): void {
    if (order.comprobanteEmitido) {
      this.showToast(`⚠️ La orden ${order.id} ya tiene un comprobante emitido.`);
      return;
    }

    this.invoicesService.createInvoice({
      orderId: order.id,
      cliente: order.cliente,
      documentoCliente: order.dniCliente || '00000000',
      tipo: type,
      fechaEmision: new Date().toISOString().split('T')[0], // yyyy-mm-dd
      montoTotal: order.total,
      estadoSunat: 'Aceptado',
      pdfUrl: 'https://res.cloudinary.com/demo/image/upload/sample.pdf' // Placeholder for PDF url
    }).subscribe(inv => {
      if (inv) {
        this.showToast(`✅ ${type} ${inv.numeroComprobante} generada exitosamente y guardada en BD.`);
        // Mark order as emitted
        this.ordersService.updateOrderStatus(order.id, order.estado); // Just a dummy update to refresh if needed, ideally a new field
        order.comprobanteEmitido = true;
      }
    });
  }
}
