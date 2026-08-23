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
      tamanios: ['Pequeña', 'Mediana', 'Grande', 'Familiar']
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
      tamanios: ['Pequeña', 'Mediana', 'Grande', 'Familiar']
    }
  ];

  constructor(private http: HttpClient, private authService: AuthService) {
    this.loadProducts();
  }

  public optimizeCloudinaryUrl(url: string): string {
    if (!url) return '';
    // If it's a Cloudinary image, inject auto-format, auto-quality, and max width of 600px
    if (url.includes('cloudinary.com') && url.includes('/upload/')) {
      if (!url.includes('f_auto') && !url.includes('q_auto')) {
        return url.replace('/upload/', '/upload/f_auto,q_auto,w_600/');
      }
    }
    return url;
  }

  loadProducts(): void {
    this.isLoading.set(true);
    this.http.get<any[]>(this.baseUrl).pipe(
      map(data => data.map(item => ({
        id: item.id.toString(),
        nombre: item.nombre || '',
        precio: parseFloat(item.precio) || 0,
        stock: item.stock || 0,
        imagen: this.optimizeCloudinaryUrl(item.imagen || ''),
        categoria: item.categoria || '',
        descripcion: item.descripcion || '',
        badge: item.badge || '',
        rating: parseFloat(item.rating) || 5.0,
        resenas: parseInt(item.resenas) || 0,
        ingredientes: item.ingredientes || [],
        tamanios: item.tamanios || ['Pequeña', 'Mediana', 'Grande', 'Familiar']
      }))),
      catchError(err => {
        console.warn('=== API FALLBACK: USANDO CATÁLOGO ESTÁTICO ===');
        const optimizedMock = this.mockCatalog.map(m => ({
          ...m,
          imagen: this.optimizeCloudinaryUrl(m.imagen)
        }));
        return of(optimizedMock);
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
          imagen: this.optimizeCloudinaryUrl(item.imagen || ''),
          categoria: item.categoria || '',
          descripcion: item.descripcion || '',
          badge: item.badge || '',
          rating: parseFloat(item.rating) || 5.0,
          resenas: parseInt(item.resenas) || 0,
          ingredientes: item.ingredientes || [],
          tamanios: item.tamanios || ['Pequeña', 'Mediana', 'Grande', 'Familiar']
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
          imagen: this.optimizeCloudinaryUrl(item.imagen || ''),
          categoria: item.categoria || '',
          descripcion: item.descripcion || '',
          badge: item.badge || '',
          rating: parseFloat(item.rating) || 5.0,
          resenas: parseInt(item.resenas) || 0,
          ingredientes: item.ingredientes || [],
          tamanios: item.tamanios || ['Pequeña', 'Mediana', 'Grande', 'Familiar']
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
      case 'PEQUEÑA': return base * 0.75;
      case 'GRANDE': return base * 1.35;
      case 'FAMILIAR': return base * 1.75;
      default: return base; // 'MEDIANA' or fallback
    }
  }
}
