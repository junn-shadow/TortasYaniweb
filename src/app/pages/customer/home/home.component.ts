import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../shared/components/header/header.component';
import { ProductsService } from '../../../core/services/products.service';
import { CartService } from '../../../core/services/cart.service';
import { Product } from '../../../core/models/models';
import { SiteConfigService } from '../../../core/services/site-config.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, HeaderComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {
  categories = ['Todas', 'Tortas Especiales', 'Tortas', 'Cheesecake y Pyes', 'Matrimoniales', 'Quinceañeros'];
  
  selectedCategory = signal<string>('Todas');
  searchQuery = signal<string>('');

  // Filtering products reactively using signals
  filteredProducts = computed(() => {
    let list = this.productsService.products();
    
    // Category filter
    const cat = this.selectedCategory();
    if (cat !== 'Todas') {
      list = list.filter(p => p.categoria.toLowerCase() === cat.toLowerCase());
    }
    
    // Search query filter
    const query = this.searchQuery().toLowerCase().trim();
    if (query) {
      list = list.filter(p => p.nombre.toLowerCase().includes(query) || p.descripcion.toLowerCase().includes(query));
    }
    
    return list;
  });

  // Modal State for Customizing/Viewing
  selectedProduct = signal<Product | null>(null);

  // Customization Form Fields
  selectedSize = signal<string>('Mediana');
  selectedPisos = signal<number>(1);
  selectedRelleno = signal<string>('Chocolate');
  selectedSabor = signal<string>('Vainilla');
  selectedColor = signal<string>('Blanco perla');
  mensajeDecoracion = signal<string>('');
  customQuantity = signal<number>(1);

  // Filling & Color lists matching Flutter app constants
  rellenosList = ['Chocolate', 'Vainilla', 'Fresa', 'Maracuyá', 'Oreo', 'Manjar blanco', 'Lúcuma'];
  coloresList = ['Rosa pastel', 'Celeste', 'Dorado', 'Blanco perla', 'Chocolate', 'Lila'];
  saboresList = ['Vainilla', 'Chocolate'];

  // Calculated Price for the current selection
  currentCalculatedPrice = computed(() => {
    const product = this.selectedProduct();
    if (!product) return 0;
    
    // Base price adjusted by size
    let price = this.productsService.calculatePrice(product, this.selectedSize());
    
    // Additional floors (+30 per floor, only for cakes)
    const isCake = product.categoria.toLowerCase() !== 'cheesecake y pyes';
    if (isCake && this.selectedPisos() > 1) {
      price += (this.selectedPisos() - 1) * 30;
    }
    
    return price;
  });

  constructor(
    public productsService: ProductsService,
    private cartService: CartService,
    public siteConfigService: SiteConfigService
  ) {}

  selectCategory(category: string): void {
    this.selectedCategory.set(category);
  }

  openCustomizer(product: Product): void {
    this.selectedProduct.set(product);
    
    // Reset Form to Defaults
    this.selectedSize.set(product.tamanios[1] || product.tamanios[0] || 'Mediana');
    this.selectedPisos.set(1);
    this.selectedRelleno.set(this.rellenosList[0]);
    this.selectedSabor.set(this.saboresList[0]);
    this.selectedColor.set(this.coloresList[3]); // Blanco perla
    this.mensajeDecoracion.set('');
    this.customQuantity.set(1);
  }

  closeCustomizer(): void {
    this.selectedProduct.set(null);
  }

  increasePisos(): void {
    if (this.selectedPisos() < 5) {
      this.selectedPisos.update(n => n + 1);
    }
  }

  decreasePisos(): void {
    if (this.selectedPisos() > 1) {
      this.selectedPisos.update(n => n - 1);
    }
  }

  increaseQty(): void {
    if (this.customQuantity() < 20) {
      this.customQuantity.update(n => n + 1);
    }
  }

  decreaseQty(): void {
    if (this.customQuantity() > 1) {
      this.customQuantity.update(n => n - 1);
    }
  }

  isCakeProduct(product: Product): boolean {
    return product.categoria.toLowerCase() !== 'cheesecake y pyes';
  }

  addToCart(): void {
    const product = this.selectedProduct();
    if (!product) return;

    const isCake = this.isCakeProduct(product);

    // Call service to add item to cart
    for (let i = 0; i < this.customQuantity(); i++) {
      this.cartService.addItem(
        { nombre: product.nombre, imagen: product.imagen },
        this.selectedSize(),
        this.currentCalculatedPrice(),
        this.selectedSabor(),
        isCake ? this.selectedPisos() : 1,
        10, // Default portions
        isCake ? this.selectedColor() : 'Sin color',
        this.mensajeDecoracion() || 'Sin mensaje'
      );
    }

    this.closeCustomizer();
  }
}
