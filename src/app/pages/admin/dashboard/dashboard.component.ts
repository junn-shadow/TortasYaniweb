import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ProductsService } from '../../../core/services/products.service';
import { AdminSidebarComponent } from '../../../shared/components/admin-sidebar/admin-sidebar.component';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, AdminSidebarComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {
  
  // Simulated stats computed from products cache
  stats = computed(() => ({
    ventasHoy: 1240.0,
    pedidosActivosCount: 5,
    productosCount: this.productsService.products().length,
    usuariosCount: 18
  }));

  // Recent transactions list
  recentOrders = signal([
    { id: 'TK-1082', cliente: 'Carla Mendoza', total: 145.0, estado: 'Pendiente', fecha: 'Hoy, 14:32' },
    { id: 'TK-1083', cliente: 'Roberto Gómez', total: 87.75, estado: 'En Horno', fecha: 'Hoy, 13:10' },
    { id: 'TK-1084', cliente: 'Sofía Castro', total: 145.0, estado: 'En Camino', fecha: 'Hoy, 12:45' }
  ]);

  constructor(
    public authService: AuthService,
    private productsService: ProductsService,
    private router: Router
  ) {}

  onLogout(): void {
    this.authService.logout();
  }
}
