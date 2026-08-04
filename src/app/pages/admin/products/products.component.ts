import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ProductsService } from '../../../core/services/products.service';
import { CloudinaryService } from '../../../core/services/cloudinary.service';
import { AuthService } from '../../../core/services/auth.service';
import { Product } from '../../../core/models/models';

@Component({
  selector: 'app-admin-products',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './products.component.html',
  styleUrl: './products.component.scss'
})
export class ProductsComponent {
  
  // Modal states
  showFormModal = signal<boolean>(false);
  isEditing = signal<boolean>(false);
  selectedProductId = signal<string>('');
  
  // Image Upload state
  imageUploading = signal<boolean>(false);
  uploadedImageUrl = signal<string>('');

  productForm: FormGroup;
  categoriesList = ['Tortas Especiales', 'Cheesecake y Pyes', 'Tortas', 'Matrimoniales', 'Quinceañeros'];

  constructor(
    private fb: FormBuilder,
    public productsService: ProductsService,
    private cloudinaryService: CloudinaryService,
    private authService: AuthService
  ) {
    this.productForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      categoria: ['Tortas', [Validators.required]],
      precio: [60.0, [Validators.required, Validators.min(1)]],
      stock: [10, [Validators.required, Validators.min(0)]],
      imagen: ['', [Validators.required]],
      descripcion: ['', [Validators.required, Validators.minLength(5)]],
      badge: [''],
      ingredientesInput: [''], // Helper field to input tags separated by commas
      tamaniosInput: ['S, M, L'] // Helper field
    });
  }

  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (file) {
      this.imageUploading.set(true);
      this.cloudinaryService.uploadImage(file).subscribe({
        next: (url) => {
          this.imageUploading.set(false);
          if (url) {
            this.uploadedImageUrl.set(url);
            this.productForm.patchValue({ imagen: url });
          } else {
            alert('Error al subir imagen a Cloudinary. Intenta nuevamente.');
          }
        },
        error: () => {
          this.imageUploading.set(false);
          alert('Hubo un error de red al subir la imagen.');
        }
      });
    }
  }

  openAddModal(): void {
    this.isEditing.set(false);
    this.selectedProductId.set('');
    this.uploadedImageUrl.set('');
    this.productForm.reset({
      categoria: 'Tortas',
      precio: 60.0,
      stock: 10,
      tamaniosInput: 'S, M, L'
    });
    this.showFormModal.set(true);
  }

  openEditModal(product: Product): void {
    this.isEditing.set(true);
    this.selectedProductId.set(product.id);
    this.uploadedImageUrl.set(product.imagen);
    
    this.productForm.patchValue({
      nombre: product.nombre,
      categoria: product.categoria,
      precio: product.precio,
      stock: product.stock,
      imagen: product.imagen,
      descripcion: product.descripcion,
      badge: product.badge || '',
      ingredientesInput: product.ingredientes.join(', '),
      tamaniosInput: product.tamanios.join(', ')
    });
    
    this.showFormModal.set(true);
  }

  closeModal(): void {
    this.showFormModal.set(false);
  }

  onSubmit(): void {
    if (this.productForm.invalid || this.imageUploading()) {
      this.productForm.markAllAsTouched();
      return;
    }

    const values = this.productForm.value;
    
    // Parse helper inputs
    const ingredientes = values.ingredientesInput
      ? values.ingredientesInput.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag !== '')
      : [];
    
    const tamanios = values.tamaniosInput
      ? values.tamaniosInput.split(',').map((tag: string) => tag.trim().toUpperCase()).filter((tag: string) => tag !== '')
      : ['S', 'M', 'L'];

    const productPayload: Partial<Product> = {
      nombre: values.nombre,
      categoria: values.categoria,
      precio: values.precio,
      stock: values.stock,
      imagen: values.imagen,
      descripcion: values.descripcion,
      badge: values.badge,
      ingredientes,
      tamanios
    };

    if (this.isEditing()) {
      this.productsService.updateProduct(this.selectedProductId(), productPayload).subscribe(res => {
        if (res) {
          this.closeModal();
        } else {
          alert('Error al actualizar el producto.');
        }
      });
    } else {
      this.productsService.createProduct(productPayload).subscribe(res => {
        if (res) {
          this.closeModal();
        } else {
          alert('Error al crear el producto.');
        }
      });
    }
  }

  onDelete(id: string): void {
    if (confirm('¿Estás seguro de que deseas eliminar este producto de la tienda?')) {
      this.productsService.deleteProduct(id).subscribe(success => {
        if (!success) {
          alert('Error al eliminar el producto.');
        }
      });
    }
  }

  onLogout(): void {
    this.authService.logout();
  }
}
