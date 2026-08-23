import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  {
    path: 'auth/login',
    loadComponent: () => import('./pages/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'auth/register',
    loadComponent: () => import('./pages/auth/register/register.component').then(m => m.RegisterComponent)
  },
  {
    path: '',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/customer/home/home.component').then(m => m.HomeComponent)
      },
      {
        path: 'sobre-nosotros',
        loadComponent: () => import('./pages/customer/sobre-nosotros/sobre-nosotros.component').then(m => m.SobreNosotrosComponent)
      },
      {
        path: 'contactanos',
        loadComponent: () => import('./pages/customer/contactanos/contactanos.component').then(m => m.ContactanosComponent)
      },
      {
        path: 'ubicanos',
        loadComponent: () => import('./pages/customer/ubicanos/ubicanos.component').then(m => m.UbicanosComponent)
      },
      {
        path: 'chat',
        loadComponent: () => import('./pages/customer/chat/chat.component').then(m => m.ChatComponent)
      },
      {
        path: 'cart',
        loadComponent: () => import('./pages/customer/cart/cart.component').then(m => m.CartComponent)
      },
      {
        path: 'checkout',
        loadComponent: () => import('./pages/customer/checkout/checkout.component').then(m => m.CheckoutComponent)
      },
      {
        path: 'profile',
        loadComponent: () => import('./pages/customer/profile/profile.component').then(m => m.ProfileComponent)
      }
    ]
  },
  {
    path: 'admin',
    canActivate: [authGuard, adminGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/admin/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'site-cms',
        loadComponent: () => import('./pages/admin/site-cms/site-cms.component').then(m => m.SiteCmsComponent)
      },
      {
        path: 'products',
        loadComponent: () => import('./pages/admin/products/products.component').then(m => m.ProductsComponent)
      },
      {
        path: 'inventory',
        loadComponent: () => import('./pages/admin/inventory/inventory.component').then(m => m.InventoryComponent)
      },
      {
        path: 'orders',
        loadComponent: () => import('./pages/admin/orders/orders.component').then(m => m.OrdersComponent)
      },
      {
        path: 'payments',
        loadComponent: () => import('./pages/admin/payments/payments.component').then(m => m.PaymentsComponent)
      },
      {
        path: 'purchases',
        loadComponent: () => import('./pages/admin/purchases/purchases.component').then(m => m.PurchasesComponent)
      },
      {
        path: 'invoices',
        loadComponent: () => import('./pages/admin/invoices/invoices.component').then(m => m.InvoicesComponent)
      },
      {
        path: 'users',
        loadComponent: () => import('./pages/admin/users/users.component').then(m => m.UsersComponent)
      }

    ]
  },
  {
    path: '**',
    redirectTo: ''
  }
];
