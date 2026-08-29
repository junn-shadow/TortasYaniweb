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
    direccionCliente: '',
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
    
    this.showToast(`🖨️ Generando PDF para ${inv.numeroComprobante}...`);
    this.generateProfessionalInvoicePDF(inv);
  }

  generateProfessionalInvoicePDF(inv: InvoiceDoc): void {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Por favor permite las ventanas emergentes para generar el comprobante PDF.');
      return;
    }

    const isFactura = inv.tipo.toUpperCase() === 'FACTURA';
    const subtotal = inv.montoTotal / 1.18;
    const igv = inv.montoTotal - subtotal;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>Comprobante ${inv.numeroComprobante}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
          body {
            font-family: 'Inter', sans-serif;
            color: #333;
            margin: 0;
            padding: 40px;
            background: #fff;
          }
          .invoice-container {
            max-width: 800px;
            margin: 0 auto;
            border: 1px solid #e2e8f0;
            padding: 40px;
            border-radius: 8px;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 40px;
          }
          .company-info h1 {
            color: #ec4899;
            margin: 0 0 5px 0;
            font-size: 28px;
          }
          .company-info p {
            margin: 2px 0;
            font-size: 14px;
            color: #64748b;
          }
          .sunat-box {
            border: 2px solid #333;
            padding: 20px 30px;
            text-align: center;
            border-radius: 8px;
            min-width: 250px;
          }
          .sunat-box h2 {
            margin: 0 0 10px 0;
            font-size: 18px;
          }
          .sunat-box h3 {
            margin: 10px 0 0 0;
            color: #ec4899;
            font-size: 20px;
          }
          .client-info {
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
          }
          .client-info div {
            font-size: 14px;
            line-height: 1.6;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          .items-table th {
            background: #f8fafc;
            border-bottom: 2px solid #e2e8f0;
            padding: 12px;
            text-align: left;
            font-size: 14px;
            color: #475569;
          }
          .items-table td {
            padding: 12px;
            border-bottom: 1px solid #e2e8f0;
            font-size: 14px;
          }
          .totals-container {
            display: flex;
            justify-content: flex-end;
          }
          .totals-table {
            width: 300px;
            border-collapse: collapse;
          }
          .totals-table td {
            padding: 8px 12px;
            font-size: 14px;
          }
          .totals-table tr:last-child {
            font-weight: bold;
            font-size: 16px;
            background: #f8fafc;
          }
          .footer {
            margin-top: 50px;
            text-align: center;
            font-size: 12px;
            color: #94a3b8;
          }
          @media print {
            body { padding: 0; }
            .invoice-container { border: none; padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          <div class="header">
            <div class="company-info">
              <h1>Tortas Yani</h1>
              <p>Av. Ejemplo 123, Cusco, Perú</p>
              <p>Teléfono: +51 919 576 034</p>
              <p>Email: ventas@tortasyani.com</p>
            </div>
            <div class="sunat-box">
              <h2>RUC: 20123456789</h2>
              <h2>${isFactura ? 'FACTURA ELECTRÓNICA' : 'BOLETA DE VENTA ELECTRÓNICA'}</h2>
              <h3>${inv.numeroComprobante}</h3>
            </div>
          </div>

          <div class="client-info">
            <div>
              <strong>Señor(es):</strong> ${inv.cliente}<br>
              <strong>${isFactura ? 'RUC' : 'DNI'}:</strong> ${inv.documentoCliente}<br>
              <strong>Dirección:</strong> ${inv.direccionCliente || 'Cusco, Perú'}
            </div>
            <div style="text-align: right;">
              <strong>Fecha de Emisión:</strong> ${inv.fechaEmision.split(' ')[0]}<br>
              <strong>Moneda:</strong> Soles (PEN)
            </div>
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 10%;">CANT.</th>
                <th style="width: 50%;">DESCRIPCIÓN</th>
                <th style="width: 20%; text-align: right;">P. UNIT.</th>
                <th style="width: 20%; text-align: right;">IMPORTE</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>1.00</td>
                <td>Pastel / Torta Especial (Según Orden ${inv.orderId})</td>
                <td style="text-align: right;">S/ ${subtotal.toFixed(2)}</td>
                <td style="text-align: right;">S/ ${subtotal.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          <div class="totals-container">
            <table class="totals-table">
              <tr>
                <td>Op. Gravadas:</td>
                <td style="text-align: right;">S/ ${subtotal.toFixed(2)}</td>
              </tr>
              <tr>
                <td>IGV (18%):</td>
                <td style="text-align: right;">S/ ${igv.toFixed(2)}</td>
              </tr>
              <tr>
                <td><strong>IMPORTE TOTAL:</strong></td>
                <td style="text-align: right;"><strong>S/ ${inv.montoTotal.toFixed(2)}</strong></td>
              </tr>
            </table>
          </div>

          <div class="footer">
            <p>Representación impresa de la ${isFactura ? 'Factura' : 'Boleta'} Electrónica.<br>
            Generado mediante el sistema de facturación simulado (NubeFact Demo).</p>
            <p><strong>¡Gracias por tu compra en Tortas Yani!</strong></p>
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Automatically trigger print dialog once styles are loaded
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 250);
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
      direccionCliente: '',
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
    this.showToast('🚀 Generando comprobante simulado...');

    const isFactura = this.invoiceForm.tipoDocumento === 'RUC';
    
    this.invoicesService.createInvoice({
      orderId: `ORD-${Math.floor(Math.random() * 9000) + 1000}`,
      cliente: this.invoiceForm.nombreCliente,
      documentoCliente: this.invoiceForm.numeroDocumento,
      direccionCliente: this.invoiceForm.direccionCliente || 'Cusco, Perú',
      tipo: isFactura ? 'Factura' : 'Boleta',
      fechaEmision: new Date().toISOString().replace('T', ' ').substring(0, 16),
      montoTotal: this.invoiceForm.montoTotal,
      estadoSunat: 'Aceptado'
    }).subscribe(() => {
      this.showToast('✅ Comprobante simulado localmente con éxito.');
    });
  }

  showToast(msg: string): void {
    this.toastMessage.set(msg);
    setTimeout(() => this.toastMessage.set(null), 3500);
  }
}
