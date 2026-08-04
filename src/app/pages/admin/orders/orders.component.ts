import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Order } from '../../../core/models/models';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-admin-orders',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './orders.component.html',
  styleUrl: './orders.component.scss'
})
export class OrdersComponent {
  
  orders = signal<Order[]>([]);

  // Selection for details view
  selectedOrder = signal<Order | null>(null);

  // Status options matching Flutter app
  statusOptions = ['Pendiente', 'En Horno', 'En Camino', 'Entregado'];

  constructor(private authService: AuthService) {
    this.loadOrders();
  }

  loadOrders(): void {
    if (typeof window !== 'undefined') {
      const savedOrders = localStorage.getItem('admin_orders');
      if (savedOrders) {
        try {
          this.orders.set(JSON.parse(savedOrders));
        } catch (e) {
          this.orders.set([]);
        }
      } else {
        // Seed mock orders matching Flutter provider if completely empty
        const mockOrders: Order[] = [
          {
            id: 'TK-1082',
            fecha: 'Hoy, 14:32',
            cliente: 'Carla Mendoza',
            telefono: '987-654-321',
            direccion: 'Av. Larco 456, Miraflores',
            estado: 'Pendiente',
            items: [
              { nombre: 'Torta de Chocolate (M)', cantidad: 1, precio: 85.0 },
              { nombre: 'Cheesecake de Maracuyá (S)', cantidad: 1, precio: 60.0 }
            ],
            total: 145.0
          },
          {
            id: 'TK-1083',
            fecha: 'Hoy, 13:10',
            cliente: 'Roberto Gómez',
            telefono: '942-881-209',
            direccion: 'Calle Los Pinos 789, San Isidro',
            estado: 'En Horno',
            items: [
              { nombre: 'Torta de Zanahoria (L)', cantidad: 1, precio: 87.75 }
            ],
            total: 87.75
          },
          {
            id: 'TK-1084',
            fecha: 'Hoy, 12:45',
            cliente: 'Sofía Castro',
            telefono: '915-234-567',
            direccion: 'Jirón Huallaga 120, Centro de Lima',
            estado: 'En Camino',
            items: [
              { nombre: 'Red Velvet (M)', cantidad: 1, precio: 90.0 },
              { nombre: 'Pie de Limón (M)', cantidad: 1, precio: 55.0 }
            ],
            total: 145.0
          },
          {
            id: 'TK-1085',
            fecha: 'Ayer, 18:20',
            cliente: 'Daniela Rivas',
            telefono: '956-789-012',
            direccion: 'Av. Primavera 1030, Surco',
            estado: 'Entregado',
            items: [
              { nombre: 'Tres Leches (L)', cantidad: 2, precio: 94.5 }
            ],
            total: 189.0
          }
        ];

        localStorage.setItem('admin_orders', JSON.stringify(mockOrders));
        this.orders.set(mockOrders);
      }
    }
  }

  updateStatus(orderId: string, newStatus: any): void {
    const updated = this.orders().map(order => {
      if (order.id === orderId) {
        const o = { ...order, estado: newStatus as any };
        if (this.selectedOrder()?.id === orderId) {
          this.selectedOrder.set(o);
        }
        return o;
      }
      return order;
    });

    this.orders.set(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('admin_orders', JSON.stringify(updated));
    }
  }

  openDetails(order: Order): void {
    this.selectedOrder.set(order);
  }

  closeDetails(): void {
    this.selectedOrder.set(null);
  }

  onLogout(): void {
    this.authService.logout();
  }
}
