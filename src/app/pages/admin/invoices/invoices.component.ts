import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InvoiceDoc } from '../../../core/models/models';
import { ExcelExportService } from '../../../core/services/excel-export.service';
import { InvoicesService } from '../../../core/services/invoices.service';
import { NubefactService } from '../../../core/services/nubefact.service';
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

  // Modal properties for invoice simulation
  showInvoiceModal = signal<boolean>(false);
  invoiceForm = {
    tipoDocumento: 'DNI',
    numeroDocumento: '',
    nombreCliente: '',
    montoTotal: 50.00
  };

  constructor(
    private excelExportService: ExcelExportService,
    public invoicesService: InvoicesService
  ) {}

  totalEmitted = computed(() => this.invoicesService.invoices().length);

  totalInvoiced = computed(() => {
    return this.invoicesService.invoices()
      .filter(i => i.estadoSunat === 'Aceptado')
      .reduce((acc, i) => acc + i.montoTotal, 0);
  });

  totalCanceled = computed(() => {
    return this.invoicesService.invoices().filter(i => i.estadoSunat === 'Anulado').length;
  });

  filteredInvoices = computed(() => {
    let list = this.invoicesService.invoices();
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

  printTicket(inv: InvoiceDoc): void {
    if (inv.estadoSunat === 'Rechazado') {
      this.showToast('⚠️ No se puede imprimir: El comprobante fue rechazado por SUNAT/NubeFact.');
      return;
    }
    
    if (inv.pdfUrl && inv.pdfUrl.includes('api.nubefact.com/c/sample')) {
      this.showToast(`🖨️ Mostrando plantilla de prueba para ${inv.numeroComprobante}...`);
      window.open('https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', '_blank');
    } else if (inv.pdfUrl) {
      this.showToast(`🖨️ Abriendo comprobante ${inv.numeroComprobante}...`);
      window.open(inv.pdfUrl, '_blank');
    } else {
      this.showToast(`⚠️ No hay un enlace PDF disponible para este comprobante.`);
    }
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

  openInvoiceModal(): void {
    this.invoiceForm = {
      tipoDocumento: 'DNI',
      numeroDocumento: '',
      nombreCliente: '',
      montoTotal: 50.00
    };
    this.showInvoiceModal.set(true);
  }

  closeInvoiceModal(): void {
    this.showInvoiceModal.set(false);
  }

  confirmEmitir(): void {
    if (!this.invoiceForm.numeroDocumento || !this.invoiceForm.nombreCliente || this.invoiceForm.montoTotal <= 0) {
      this.showToast('⚠️ Por favor completa todos los campos correctamente.');
      return;
    }

    this.showInvoiceModal.set(false);
    this.showToast('🚀 Generando comprobante...');

    this.invoicesService.emitirBoletaNubeFact({
      dniCliente: this.invoiceForm.numeroDocumento,
      nombreCliente: this.invoiceForm.nombreCliente,
      totalVenta: this.invoiceForm.montoTotal,
      descripcionProducto: 'Torta Especial Yani (Demo)'
    }).subscribe({
      next: (res) => {
        if (res && res.enlace_del_pdf) {
          this.showToast(`✅ ¡Comprobante emitido exitosamente!`);
          window.open(res.enlace_del_pdf, '_blank');
        } else if (res && res.errors) {
          this.showToast(`❌ Error simulado de SUNAT/NubeFact`);
        } else {
          this.showToast('✅ Comprobante simulado con éxito.');
        }
      },
      error: () => {
        this.showToast('✅ Comprobante simulado localmente.');
      }
    });
  }

  showToast(msg: string): void {
    this.toastMessage.set(msg);
    setTimeout(() => this.toastMessage.set(null), 3500);
  }
}
