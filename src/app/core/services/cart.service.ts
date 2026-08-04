import { Injectable, signal, computed } from '@angular/core';
import { CartItem } from '../models/models';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  // State management with Signals
  items = signal<CartItem[]>([]);

  // Computed properties
  totalItems = computed(() => 
    this.items().reduce((sum, item) => sum + item.cantidad, 0)
  );

  totalPrice = computed(() => 
    this.items().reduce((sum, item) => sum + (item.precio * item.cantidad), 0)
  );

  constructor() {
    this.loadCart();
  }

  private loadCart(): void {
    if (typeof window !== 'undefined') {
      const cartJson = localStorage.getItem('cart');
      if (cartJson) {
        try {
          this.items.set(JSON.parse(cartJson));
        } catch (e) {
          this.clearCart();
        }
      }
    }
  }

  private saveCart(updatedItems: CartItem[]): void {
    this.items.set(updatedItems);
    if (typeof window !== 'undefined') {
      localStorage.setItem('cart', JSON.stringify(updatedItems));
    }
  }

  addItem(
    torta: { nombre: string; imagen: string },
    tamanio: string,
    precioFinal: number,
    sabor: string,
    pisos: number,
    porciones: number,
    colorDecoracion: string,
    mensaje: string,
    descripcion: string = ''
  ): void {
    const current = [...this.items()];
    const index = current.findIndex(
      item => 
        item.nombre === torta.nombre &&
        item.tamanio === tamanio &&
        item.sabor === sabor &&
        item.pisos === pisos &&
        item.porciones === porciones &&
        item.colorDecoracion === colorDecoracion &&
        item.mensaje === mensaje
    );

    if (index >= 0) {
      // Increase quantity of existing identical item
      current[index] = {
        ...current[index],
        cantidad: current[index].cantidad + 1
      };
    } else {
      // Add as new item
      current.push({
        nombre: torta.nombre,
        imagen: torta.imagen,
        precio: precioFinal,
        tamanio,
        sabor,
        pisos,
        porciones,
        colorDecoracion,
        mensaje,
        descripcion,
        cantidad: 1
      });
    }

    this.saveCart(current);
  }

  removeItem(index: number): void {
    const current = [...this.items()];
    current.splice(index, 1);
    this.saveCart(current);
  }

  increaseQuantity(index: number): void {
    const current = [...this.items()];
    current[index] = {
      ...current[index],
      cantidad: current[index].cantidad + 1
    };
    this.saveCart(current);
  }

  decreaseQuantity(index: number): void {
    const current = [...this.items()];
    if (current[index].cantidad > 1) {
      current[index] = {
        ...current[index],
        cantidad: current[index].cantidad - 1
      };
    } else {
      current.splice(index, 1);
    }
    this.saveCart(current);
  }

  clearCart(): void {
    this.saveCart([]);
  }
}
