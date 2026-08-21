import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';

@Injectable({
  providedIn: 'root'
})
export class ExcelExportService {

  /**
   * Genera y descarga un archivo Excel (.xlsx) a partir de una lista de objetos JSON.
   * @param data Lista de objetos con los datos de las filas
   * @param filename Nombre con el que se descargará el archivo (sin extensión)
   * @param sheetName Nombre de la hoja de cálculo
   */
  exportToExcel(data: any[], filename: string, sheetName: string = 'Reporte'): void {
    if (!data || data.length === 0) {
      console.warn('No hay datos para exportar a Excel.');
      return;
    }

    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
    const workbook: XLSX.WorkBook = { Sheets: { [sheetName]: worksheet }, SheetNames: [sheetName] };
    XLSX.writeFile(workbook, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  /**
   * Genera un reporte de ventas en Excel con encabezado y fila de suma total al final.
   */
  exportSalesReport(orders: any[], totalSum: number, filename: string = 'Reporte_Ventas_Tortas_Yane'): void {
    const formattedData = orders.map(order => ({
      'ID Orden': order.id,
      'Cliente': order.cliente,
      'Documento/DNI': order.dniCliente || 'Sin DNI',
      'Fecha': order.fecha,
      'Productos / Tortas': order.productosSummary || order.productos?.map((p: any) => p.nombre).join(', ') || 'Torta Personalizada',
      'Estado Orden': order.estado,
      'Estado Pago': order.estadoPago || 'Pagado',
      'Monto Adelanto (50%)': order.montoAdelanto ? `S/ ${order.montoAdelanto.toFixed(2)}` : 'N/A',
      'Saldo Pendiente': order.saldoPendiente ? `S/ ${order.saldoPendiente.toFixed(2)}` : 'S/ 0.00',
      'Monto Total (S/)': order.total
    }));

    // Fila de Totalización al final
    formattedData.push({
      'ID Orden': '',
      'Cliente': '',
      'Documento/DNI': '',
      'Fecha': '',
      'Productos / Tortas': '',
      'Estado Orden': '',
      'Estado Pago': '',
      'Monto Adelanto (50%)': '',
      'Saldo Pendiente': 'TOTAL COBRADO:',
      'Monto Total (S/)': totalSum
    });

    this.exportToExcel(formattedData, filename, 'Ventas');
  }

  /**
   * Genera un reporte de compras a proveedores en Excel.
   */
  exportPurchasesReport(purchases: any[], totalSum: number, pendingSum: number, filename: string = 'Reporte_Compras_Insumos'): void {
    const formattedData = purchases.map(p => ({
      'ID Compra': p.id,
      'Proveedor': p.proveedor,
      'Fecha': p.fecha,
      'Insumos': p.insumosSummary || p.insumos?.map((i: any) => i.nombre).join(', '),
      'Monto Total (S/)': p.montoTotal,
      'Monto Pagado (S/)': p.montoPagado,
      'Saldo Pendiente (S/)': p.saldoPendiente,
      'Estado': p.estado
    }));

    formattedData.push({
      'ID Compra': '',
      'Proveedor': '',
      'Fecha': '',
      'Insumos': 'SUMATORIAS TOTALES:',
      'Monto Total (S/)': totalSum,
      'Monto Pagado (S/)': totalSum - pendingSum,
      'Saldo Pendiente (S/)': pendingSum,
      'Estado': ''
    });

    this.exportToExcel(formattedData, filename, 'Compras_Egresos');
  }
}
