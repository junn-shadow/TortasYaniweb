import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { CartService } from '../../../core/services/cart.service';

import { getSmartAvatarUrl } from '../../../pages/customer/profile/profile.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
  constructor(
    public authService: AuthService,
    public cartService: CartService
  ) {}

  getAvatarUrl(): string {
    const user = this.authService.currentUser();
    return getSmartAvatarUrl(user?.nombre, user?.fotoPerfil);
  }

  onLogout(): void {
    this.authService.logout();
  }
}
