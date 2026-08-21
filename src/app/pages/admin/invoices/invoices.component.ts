import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InvoiceDoc } from '../../../core/models/models';
import { ExcelExportService } from '../../../core/services/excel-export.service';
import { AdminSidebarComponent } from '../../../shared/components/admin-sidebar/admin-sidebar.component';

@Component({
  selector: 'app-invoices',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminSidebarComponent],
  templateUrl: './invoices.component.html',
  styleUrl: './invoices.component.scss'
})
export class InvoicesComponent {

  searchTerm = signal<string>('');
  selectedType = signal<string>('TODOS');
  startDate = signal<string>('');
  endDate = signal<string>('');
  toastMessage = signal<string | null>(null);

  // Initial mock electronic invoices
  invoices = signal<InvoiceDoc[]>([
    {
      numeroComprobante: 'B001-000452',
      orderId: 'ORD-1082',
      cliente: 'Carla Mendoza',
      documentoCliente: '74829102',
      tipo: 'Boleta',
      fechaEmision: '2026-08-21 14:32',
      montoTotal: 145.00,
      estadoSunat: 'Aceptado'
    },
    {
      numeroComprobante: 'F001-000120',
      orderId: 'ORD-1083',
      cliente: 'Inversiones Gómez S.A.C.',
      documentoCliente: '20601293841',
      tipo: 'Factura',
      fechaEmision: '2026-08-21 13:10',
      montoTotal: 88.00,
      estadoSunat: 'Aceptado'
    },
    {
      numeroComprobante: 'B001-000451',
      orderId: 'ORD-1084',
      cliente: 'Sofía Castro',
      documentoCliente: '45892103',
      tipo: 'Boleta',
      fechaEmision: '2026-08-20 18:45',
      montoTotal: 145.00,
      estadoSunat: 'Aceptado'
    },
    {
      numeroComprobante: 'NC01-000012',
      orderId: 'ORD-1070',
      cliente: 'Pedro Ramírez',
      documentoCliente: '10293847',
      tipo: 'Nota de Crédito',
      fechaEmision: '2026-08-19 09:15',
      montoTotal: 65.00,
      estadoSunat: 'Anulado'
    }
  ]);

  totalEmitted = computed(() => this.invoices().length);

  totalInvoiced = computed(() => {
    return this.invoices()
      .filter(i => i.estadoSunat === 'Aceptado')
      .reduce((acc, i) => acc + i.montoTotal, 0);
  });

  totalCanceled = computed(() => {
    return this.invoices().filter(i => i.estadoSunat === 'Anulado').length;
  });

  filteredInvoices = computed(() => {
    let list = this.invoices();
    const search = this.searchTerm().toLowerCase().trim();
    const type = this.selectedType();
    const start = this.startDate();
    const end = this.endDate();

    if (search) {
      list = list.filter(i =>
        i.numeroComprobante.toLowerCase().includes(search) ||
        i.orderId.toLowerCase().includes(search) ||
        i.cliente.toLowerCase().includes(search) ||
        i.documentoCliente.includes(search)
      );
    }

    if (type !== 'TODOS') {
      list = list.filter(i => i.tipo === type);
    }

    if (start) {
      list = list.filter(i => i.fechaEmision >= start);
    }
    if (end) {
      list = list.filter(i => i.fechaEmision <= end + ' 23:59');
    }

    return list;
  });

  constructor(private excelExportService: ExcelExportService) {}

  printTicket(inv: InvoiceDoc): void {
    this.showToast(`🖨️ Generando Ticket de Impresión para ${inv.numeroComprobante}...`);
  }

  sendWhatsApp(inv: InvoiceDoc): void {
    const text = `Hola *${inv.cliente}*, adjuntamos tu comprobante *${inv.numeroComprobante}* por el monto de S/ ${inv.montoTotal.toFixed(2)}. ¡Gracias por tu compra en Tortas Yane!`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  }

  exportExcel(): void {
    const list = this.filteredInvoices();
    if (list.length === 0) {
      this.showToast('⚠️ No hay comprobantes para exportar.');
      return;
    }
    this.excelExportService.exportToExcel(list, 'Reporte_Comprobantes_SUNAT_Yane', 'Comprobantes');
    this.showToast('📊 Reporte Excel de Comprobantes SUNAT generado');
  }

  showToast(msg: string): void {
    this.toastMessage.set(msg);
    setTimeout(() => this.toastMessage.set(null), 3500);
  }
}
