import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, of, map, tap } from 'rxjs';
import { Product } from '../models/models';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class ProductsService {
  private readonly baseUrl = 'https://tortasyaniapiweb-production.up.railway.app/api/products';
  
  // Cache of products
  products = signal<Product[]>([]);
  isLoading = signal<boolean>(false);

  // Static fallback catalog matching Flutter's catalog
  private readonly mockCatalog: Product[] = [
    {
      id: '1',
      nombre: 'Torta de Chocolate',
      categoria: 'Tortas Especiales',
      precio: 85.0,
      stock: 10,
      imagen: 'https://res.cloudinary.com/ddfzttgyr/image/upload/v1774234559/torta_de_chocolate_wv8mi7.png',
      rating: 4.9,
      resenas: 124,
      badge: 'Popular',
      descripcion: 'Deliciosa torta de chocolate con capas de bizcocho húmedo y ganache.',
      ingredientes: ['Chocolate', 'Harina', 'Huevos', 'Mantequilla', 'Azúcar'],
      tamanios: ['S', 'M', 'L']
    },
    {
      id: '2',
      nombre: 'Cheesecake de Maracuyá',
      categoria: 'Cheesecake y Pyes',
      precio: 80.0,
      stock: 15,
      imagen: 'https://res.cloudinary.com/ddfzttgyr/image/upload/v1774234883/Cheesecake_de_Maracuy%C3%A1_knhn3w.png',
      rating: 4.9,
      resenas: 110,
      badge: 'Popular',
      descripcion: 'Refrescante cheesecake con coulis de maracuyá tropical.',
      ingredientes: ['Maracuyá', 'Queso crema', 'Galletas', 'Crema', 'Azúcar'],
      tamanios: ['S', 'M', 'L']
    },
    {
      id: '3',
      nombre: 'Torta de Zanahoria',
      categoria: 'Tortas',
      precio: 65.0,
      stock: 8,
      imagen: 'https://res.cloudinary.com/ddfzttgyr/image/upload/v1774234868/Torta_de_Zanahoriaa_ury5wh.png',
      rating: 4.7,
      resenas: 76,
      badge: 'Favorito',
      descripcion: 'Esponjosa torta de zanahoria con frosting de queso crema y nueces.',
      ingredientes: ['Zanahoria', 'Harina', 'Huevos', 'Nueces', 'Queso crema'],
      tamanios: ['S', 'M', 'L']
    },
    {
      id: '4',
      nombre: 'Torta de Vainilla',
      categoria: 'Tortas',
      precio: 60.0,
      stock: 12,
      imagen: 'https://res.cloudinary.com/ddfzttgyr/image/upload/v1774234876/torta_de_vainilla_vgcfkf.png',
      rating: 4.6,
      resenas: 89,
      badge: '',
      descripcion: 'Clásica torta de vainilla con crema suave y decoración elegante.',
      ingredientes: ['Vainilla', 'Harina', 'Huevos', 'Mantequilla', 'Leche'],
      tamanios: ['S', 'M', 'L']
    },
    {
      id: '5',
      nombre: 'Torta Matrimonial',
      categoria: 'Matrimoniales',
      precio: 250.0,
      stock: 3,
      imagen: 'https://res.cloudinary.com/ddfzttgyr/image/upload/v1774234891/Torta_Matrimonial_qhxegx.png',
      rating: 5.0,
      resenas: 45,
      badge: 'Premium',
      descripcion: 'Elegante torta matrimonial de varios pisos decorada a medida.',
      ingredientes: ['Vainilla', 'Fondant', 'Crema', 'Flores', 'Perlas'],
      tamanios: ['M', 'L', 'XL']
    },
    {
      id: '6',
      nombre: 'Torta de Quinceañera',
      categoria: 'Quinceañeros',
      precio: 200.0,
      stock: 4,
      imagen: 'https://res.cloudinary.com/ddfzttgyr/image/upload/v1774234897/Torta_de_Quincea%C3%B1era_evxzmp.png',
      rating: 4.8,
      resenas: 62,
      badge: 'Especial',
      descripcion: 'Torta especial para quinceañeras con decoración rosa y detalles dorados.',
      ingredientes: ['Vainilla', 'Fondant rosa', 'Crema', 'Flores', 'Brillantina'],
      tamanios: ['M', 'L', 'XL']
    },
    {
      id: '7',
      nombre: 'Pie de Limón',
      categoria: 'Cheesecake y Pyes',
      precio: 55.0,
      stock: 14,
      imagen: 'https://res.cloudinary.com/ddfzttgyr/image/upload/v1774234905/Pie_de_Lim%C3%B3n_plhcyw.png',
      rating: 4.7,
      resenas: 83,
      badge: '',
      descripcion: 'Clásico pie de limón con merengue tostado y base crocante.',
      ingredientes: ['Limón', 'Huevos', 'Azúcar', 'Galletas', 'Mantequilla'],
      tamanios: ['S', 'M', 'L']
    },
    {
      id: '8',
      nombre: 'Red Velvet',
      categoria: 'Tortas Especiales',
      precio: 90.0,
      stock: 9,
      imagen: 'https://res.cloudinary.com/ddfzttgyr/image/upload/v1774234910/Red_Velvet_da5fqq.png',
      rating: 4.9,
      resenas: 137,
      badge: 'Top',
      descripcion: 'Irresistible red velvet con frosting de queso crema y color rojo intenso.',
      ingredientes: ['Cacao', 'Colorante rojo', 'Queso crema', 'Harina', 'Buttermilk'],
      tamanios: ['S', 'M', 'L']
    },
    {
      id: '9',
      nombre: 'Tres Leches',
      categoria: 'Tortas',
      precio: 70.0,
      stock: 11,
      imagen: 'https://res.cloudinary.com/ddfzttgyr/image/upload/v1774234917/Tres_Leches_d8lm11.png',
      rating: 4.8,
      resenas: 91,
      badge: 'Nuevo',
      descripcion: 'Esponjoso bizcocho empapado en tres tipos de leche con crema chantilly.',
      ingredientes: ['Leche condensada', 'Leche evaporada', 'Crema', 'Huevos', 'Harina'],
      tamanios: ['S', 'M', 'L']
    },
    {
      id: '10',
      nombre: 'Torta de Frutos del Bosque',
      categoria: 'Tortas Especiales',
      precio: 95.0,
      stock: 7,
      imagen: 'https://res.cloudinary.com/ddfzttgyr/image/upload/v1774234923/Torta_de_Frutos_del_Bosque_sfpmtk.png',
      rating: 4.8,
      resenas: 72,
      badge: 'Nuevo',
      descripcion: 'Exquisita torta con mix de frutos del bosque frescos y crema.',
      ingredientes: ['Frutos del bosque', 'Crema', 'Harina', 'Huevos', 'Azúcar'],
      tamanios: ['S', 'M', 'L']
    }
  ];

  constructor(private http: HttpClient, private authService: AuthService) {
    this.loadProducts();
  }

  loadProducts(): void {
    this.isLoading.set(true);
    this.http.get<any[]>(this.baseUrl).pipe(
      map(data => data.map(item => ({
        id: item.id.toString(),
        nombre: item.nombre || '',
        precio: parseFloat(item.precio) || 0,
        stock: item.stock || 0,
        imagen: item.imagen || '',
        categoria: item.categoria || '',
        descripcion: item.descripcion || '',
        badge: item.badge || '',
        rating: parseFloat(item.rating) || 5.0,
        resenas: parseInt(item.resenas) || 0,
        ingredientes: item.ingredientes || [],
        tamanios: item.tamanios || ['S', 'M', 'L']
      }))),
      catchError(err => {
        console.warn('=== API FALLBACK: USANDO CATÁLOGO ESTÁTICO ===');
        return of(this.mockCatalog);
      })
    ).subscribe(list => {
      this.products.set(list);
      this.isLoading.set(false);
    });
  }

  getProducts(): Observable<Product[]> {
    this.loadProducts();
    return of(this.products());
  }


  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  createProduct(product: Partial<Product>): Observable<Product | null> {
    return this.http.post<any>(this.baseUrl, product, { headers: this.getAuthHeaders() }).pipe(
      map(item => {
        const newProduct: Product = {
          id: item.id.toString(),
          nombre: item.nombre || '',
          precio: parseFloat(item.precio) || 0,
          stock: item.stock || 0,
          imagen: item.imagen || '',
          categoria: item.categoria || '',
          descripcion: item.descripcion || '',
          badge: item.badge || '',
          rating: parseFloat(item.rating) || 5.0,
          resenas: parseInt(item.resenas) || 0,
          ingredientes: item.ingredientes || [],
          tamanios: item.tamanios || ['S', 'M', 'L']
        };
        // Update local state signal
        this.products.update(prev => [newProduct, ...prev]);
        return newProduct;
      }),
      catchError(err => {
        console.error('Error creating product:', err);
        return of(null);
      })
    );
  }

  updateProduct(id: string, product: Partial<Product>): Observable<Product | null> {
    return this.http.put<any>(`${this.baseUrl}/${id}`, product, { headers: this.getAuthHeaders() }).pipe(
      map(item => {
        const updatedProduct: Product = {
          id: item.id.toString(),
          nombre: item.nombre || '',
          precio: parseFloat(item.precio) || 0,
          stock: item.stock || 0,
          imagen: item.imagen || '',
          categoria: item.categoria || '',
          descripcion: item.descripcion || '',
          badge: item.badge || '',
          rating: parseFloat(item.rating) || 5.0,
          resenas: parseInt(item.resenas) || 0,
          ingredientes: item.ingredientes || [],
          tamanios: item.tamanios || ['S', 'M', 'L']
        };
        // Update local state signal
        this.products.update(prev => prev.map(p => p.id === id ? updatedProduct : p));
        return updatedProduct;
      }),
      catchError(err => {
        console.error('Error updating product:', err);
        return of(null);
      })
    );
  }

  deleteProduct(id: string): Observable<boolean> {
    return this.http.delete<any>(`${this.baseUrl}/${id}`, { headers: this.getAuthHeaders() }).pipe(
      map(() => {
        this.products.update(prev => prev.filter(p => p.id !== id));
        return true;
      }),
      catchError(err => {
        console.error('Error deleting product:', err);
        return of(false);
      })
    );
  }

  updateProductStock(id: string, newStock: number): Observable<boolean> {
    const currentProds = this.products();
    const prod = currentProds.find(p => p.id === id);
    if (!prod) return of(false);

    const updated = { ...prod, stock: newStock };
    this.products.update(prev => prev.map(p => p.id === id ? updated : p));

    return this.http.put<any>(`${this.baseUrl}/${id}`, updated, { headers: this.getAuthHeaders() }).pipe(
      map(() => true),
      catchError(err => {
        console.warn(`Product stock update for ${id} saved locally in signal.`, err);
        return of(true);
      })
    );
  }


  calculatePrice(product: Product, size: string): number {
    const base = product.precio;
    switch (size.toUpperCase()) {
      case 'S': return base * 0.75;
      case 'L': return base * 1.35;
      case 'XL': return base * 1.75;
      default: return base; // 'M' or fallback
    }
  }
}
