import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../shared/components/header/header.component';

@Component({
  selector: 'app-contactanos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HeaderComponent],
  templateUrl: './contactanos.component.html',
  styleUrl: './contactanos.component.scss',
})
export class ContactanosComponent {
  contactForm: FormGroup;
  isSubmitting = signal<boolean>(false);
  showSuccess = signal<boolean>(false);

  constructor(private fb: FormBuilder) {
    this.contactForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      asunto: ['Cotización para Evento', [Validators.required]],
      mensaje: ['', [Validators.required, Validators.minLength(10)]]
    });
  }

  onSubmit(): void {
    if (this.contactForm.invalid) {
      this.contactForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);

    // Simulate backend network delay
    setTimeout(() => {
      // Save to localStorage
      const prevMessages = JSON.parse(localStorage.getItem('yani_contact_messages') || '[]');
      const newMessage = {
        ...this.contactForm.value,
        id: 'MSG-' + Math.floor(1000 + Math.random() * 9000),
        fecha: new Date().toISOString()
      };
      
      localStorage.setItem('yani_contact_messages', JSON.stringify([...prevMessages, newMessage]));

      this.isSubmitting.set(false);
      this.showSuccess.set(true);
      this.contactForm.reset({ asunto: 'Cotización para Evento' });

      // Hide success message after 5 seconds
      setTimeout(() => {
        this.showSuccess.set(false);
      }, 5000);
    }, 1500);
  }
}

