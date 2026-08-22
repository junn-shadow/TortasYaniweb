import { Component, signal, computed, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CartService } from '../../../core/services/cart.service';
import { AuthService } from '../../../core/services/auth.service';
import { MercadoPagoService } from '../../../core/services/mercado-pago.service';
import { HeaderComponent } from '../../../shared/components/header/header.component';

declare const L: any;

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, HeaderComponent],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.scss'
})
export class CheckoutComponent implements AfterViewInit {
  checkoutForm: FormGroup;
  isSubmitting = false;
  showPaymentQR = signal<boolean>(false);
  orderPlaced = signal<boolean>(false);
  generatedOrderId = signal<string>('');
  mercadoPagoLoading = signal<boolean>(false);
  showMercadoPagoSimulator = signal<boolean>(false);

  // Map state
  private map: any;
  private deliveryMarker: any;
  distanceInKm = signal<number>(0.15);
  deliveryCost = signal<number>(10);

  shippingCost = computed(() => {
    const method = this.checkoutForm?.get('tipoEntrega')?.value;
    return method === 'Delivery' ? this.deliveryCost() : 0.0;
  });

  grandTotal = computed(() => {
    return this.cartService.totalPrice() + this.shippingCost();
  });

  minDate: string;

  constructor(
    private fb: FormBuilder,
    public cartService: CartService,
    private authService: AuthService,
    private mercadoPagoService: MercadoPagoService,
    private router: Router
  ) {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    this.minDate = `${yyyy}-${mm}-${dd}`;

    const currentUser = this.authService.currentUser();

    this.checkoutForm = this.fb.group({
      clienteName: [currentUser?.nombre || '', [Validators.required, Validators.minLength(3)]],
      telefono: [currentUser?.telefono || '', [Validators.required, Validators.pattern(/^[0-9+ -]{7,15}$/)]],
      tipoEntrega: ['Delivery', [Validators.required]],
      direccion: [currentUser?.direccion || '', [Validators.required, Validators.minLength(5)]],
      fechaEntrega: [this.minDate, [Validators.required]],
      horaEntrega: ['14:00', [Validators.required]],
      metodoPago: ['Yape', [Validators.required]]
    });

    this.checkoutForm.get('tipoEntrega')?.valueChanges.subscribe(value => {
      const addressControl = this.checkoutForm.get('direccion');
      if (value === 'Delivery') {
        addressControl?.setValidators([Validators.required, Validators.minLength(5)]);
        setTimeout(() => {
          if (this.map) {
            this.map.invalidateSize();
          } else {
            this.initMap();
          }
        }, 200);
      } else {
        addressControl?.clearValidators();
      }
      addressControl?.updateValueAndValidity();
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      if (this.checkoutForm.get('tipoEntrega')?.value === 'Delivery') {
        this.initMap();
      }
    }, 400);
  }

  initMap(): void {
    const mapContainer = document.getElementById('map');
    if (!mapContainer || typeof L === 'undefined') return;

    try {
      const storeLat = -13.5222;
      const storeLon = -71.9675;

      this.map = L.map('map').setView([storeLat, storeLon], 14);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
      }).addTo(this.map);

      const storeMarker = L.marker([storeLat, storeLon]).addTo(this.map);
      storeMarker.bindPopup('🎂 <strong>Pastelería Tortas Yani</strong><br>Sede Plaza Túpac Amaru').openPopup();

      const userLat = -13.5235;
      const userLon = -71.9660;
      this.deliveryMarker = L.marker([userLat, userLon], { draggable: true }).addTo(this.map);
      this.deliveryMarker.bindPopup('📍 <strong>Tu ubicación de entrega</strong><br>Arrástrame en el mapa').openPopup();

      this.calculateDeliveryCost(userLat, userLon);
      this.reverseGeocode(userLat, userLon);

      this.deliveryMarker.on('dragend', () => {
        const pos = this.deliveryMarker.getLatLng();
        this.calculateDeliveryCost(pos.lat, pos.lng);
        this.reverseGeocode(pos.lat, pos.lng);
      });

      this.map.on('click', (e: any) => {
        const pos = e.latlng;
        this.deliveryMarker.setLatLng(pos);
        this.calculateDeliveryCost(pos.lat, pos.lng);
        this.reverseGeocode(pos.lat, pos.lng);
      });

    } catch (e) {
      console.error('Error initializing Leaflet map', e);
    }
  }

  calculateDeliveryCost(lat: number, lon: number): void {
    const storeLat = -13.5222;
    const storeLon = -71.9675;

    const distance = this.getDistanceFromLatLonInKm(storeLat, storeLon, lat, lon);
    this.distanceInKm.set(parseFloat(distance.toFixed(2)));

    let cost = 10;
    if (distance > 1.5) {
      cost += (distance - 1.5) * 2.5;
    }
    cost = Math.round(cost);
    cost = Math.min(20, Math.max(10, cost));
    this.deliveryCost.set(cost);
  }

  private getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  reverseGeocode(lat: number, lon: number): void {
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.display_name) {
          this.checkoutForm.patchValue({ direccion: data.display_name });
        }
      })
      .catch(err => {
        console.warn('Nominatim failed, using coordinates formatting fallback', err);
        this.checkoutForm.patchValue({ direccion: `Cusco (Lat: ${lat.toFixed(5)}, Lon: ${lon.toFixed(5)})` });
      });
  }

  onSubmit(): void {
    if (this.checkoutForm.invalid) {
      this.checkoutForm.markAllAsTouched();
      return;
    }

    const { metodoPago } = this.checkoutForm.value;

    if (metodoPago === 'MercadoPago') {
      this.processMercadoPago();
    } else if (metodoPago === 'Yape' || metodoPago === 'Plin') {
      this.showPaymentQR.set(true);
    } else {
      this.placeOrder();
    }
  }

  processMercadoPago(): void {
    this.mercadoPagoLoading.set(true);
    this.isSubmitting = true;
    const ticketId = 'TK-' + Math.floor(1000 + Math.random() * 9000);
    this.generatedOrderId.set(ticketId);

    const formValues = this.checkoutForm.value;
    const currentUser = this.authService.currentUser();

    const items = [
      ...this.cartService.items().map(i => ({
        title: `${i.nombre} (${i.tamanio})`,
        quantity: i.cantidad,
        currency_id: 'PEN',
        unit_price: i.precio
      }))
    ];

    if (this.shippingCost() > 0) {
      items.push({
        title: 'Costo de Envío / Delivery',
        quantity: 1,
        currency_id: 'PEN',
        unit_price: this.shippingCost()
      });
    }

    const payer = {
      name: formValues.clienteName,
      email: currentUser?.email || 'cliente@tortasyani.com'
    };

    this.mercadoPagoService.createPreference(items, payer, ticketId).subscribe({
      next: (pref) => {
        this.mercadoPagoLoading.set(false);
        this.isSubmitting = false;
        
        if (pref && pref.init_point) {
          window.open(pref.init_point, '_blank');
        }
        this.showMercadoPagoSimulator.set(true);
      },
      error: () => {
        this.mercadoPagoLoading.set(false);
        this.isSubmitting = false;
        this.showMercadoPagoSimulator.set(true);
      }
    });
  }

  confirmMercadoPagoPayment(): void {
    this.showMercadoPagoSimulator.set(false);
    this.placeOrderRecord(this.generatedOrderId());
  }

  cancelMercadoPago(): void {
    this.showMercadoPagoSimulator.set(false);
  }

  placeOrderRecord(ticketId: string): void {
    const formValues = this.checkoutForm.value;

    const newOrder = {
      id: ticketId,
      fecha: new Date().toLocaleDateString('es-PE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
      fechaRaw: new Date().toISOString(),
      cliente: formValues.clienteName,
      telefono: formValues.telefono,
      direccion: formValues.tipoEntrega === 'Delivery' ? formValues.direccion : 'Recojo en Local (Plaza Túpac Amaru)',
      estado: 'Pendiente',
      items: this.cartService.items().map(i => ({
        nombre: `${i.nombre} (${i.tamanio === 'S' ? 'Chica' : i.tamanio === 'M' ? 'Mediana' : 'Grande'})`,
        cantidad: i.cantidad,
        precio: i.precio
      })),
      total: this.grandTotal()
    };

    const savedUserOrders = localStorage.getItem('user_orders');
    const userOrdersList = savedUserOrders ? JSON.parse(savedUserOrders) : [];
    userOrdersList.unshift(newOrder);
    localStorage.setItem('user_orders', JSON.stringify(userOrdersList));

    const savedAdminOrders = localStorage.getItem('admin_orders');
    const adminOrdersList = savedAdminOrders ? JSON.parse(savedAdminOrders) : [];
    adminOrdersList.unshift(newOrder);
    localStorage.setItem('admin_orders', JSON.stringify(adminOrdersList));

    this.showPaymentQR.set(false);
    this.orderPlaced.set(true);
    this.cartService.clearCart();
  }

  placeOrder(): void {
    const ticketId = 'TK-' + Math.floor(1000 + Math.random() * 9000);
    this.generatedOrderId.set(ticketId);
    this.placeOrderRecord(ticketId);
  }

  cancelQR(): void {
    this.showPaymentQR.set(false);
  }
}
