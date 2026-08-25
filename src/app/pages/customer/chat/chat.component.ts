import { Component, signal, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { HeaderComponent } from '../../../shared/components/header/header.component';
import { ChatService } from '../../../core/services/chat.service';
import { CartService } from '../../../core/services/cart.service';
import { ProductsService } from '../../../core/services/products.service';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, HeaderComponent],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss'
})
export class ChatComponent implements AfterViewChecked {
  @ViewChild('chatScrollContainer') private chatScrollContainer!: ElementRef;

  userInput = '';
  isLoading = false;
  isSending = false;
  
  // Guard to prevent double processing of identical cart items in the same session
  private processedCartKeys = new Set<string>();

  quickSuggestions = [
    '¿Qué me recomiendas para un cumpleaños?',
    'Necesito una torta para una boda',
    '¿Cuál es la más vendida?'
  ];

  // Success overlay banner when a cake gets auto-added by the chatbot
  successNotification = signal<{ nombre: string; precio: number; mensaje: string } | null>(null);

  constructor(
    public chatService: ChatService,
    private cartService: CartService,
    private productsService: ProductsService,
    private sanitizer: DomSanitizer
  ) {}

  formatMessageContent(content: string): SafeHtml {
    // 1. Remove the [ADD_CART:...] magic command
    const addCartRegex = /\[ADD_CART:[^\]]+\]/g;
    let cleanText = content.replace(addCartRegex, '').trim();

    // 2. Escape HTML characters to protect against XSS
    cleanText = cleanText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

    // 3. Remove markdown bold **text** without bolding it
    cleanText = cleanText.replace(/\*\*([^*]+)\*\*/g, '$1');

    // 4. Convert newlines to HTML line breaks
    cleanText = cleanText.replace(/\n/g, '<br>');

    // 5. Replace 'Bienvenido/aa' or similar typo if any
    cleanText = cleanText.replace(/Bienvenido\/aa/gi, 'Bienvenido/a');

    return this.sanitizer.bypassSecurityTrustHtml(cleanText);
  }

  private lastMessagesLength = 0;

  ngAfterViewChecked() {
    const currentLength = this.chatService.messages().length;
    if (currentLength !== this.lastMessagesLength) {
      this.lastMessagesLength = currentLength;
      this.scrollToBottom();
    }
  }

  private scrollToBottom(): void {
    try {
      this.chatScrollContainer.nativeElement.scrollTop = this.chatScrollContainer.nativeElement.scrollHeight;
    } catch (err) {}
  }

  sendQuickSuggestion(suggestion: string): void {
    this.userInput = suggestion;
    this.onSubmit();
  }

  startNewConversation(): void {
    this.chatService.resetChat();
    this.processedCartKeys.clear();
    this.showFlashMessage('Nueva conversación iniciada');
  }

  onSubmit(): void {
    const text = this.userInput.trim();
    if (!text || this.isSending) return;

    this.userInput = '';
    this.isSending = true;
    this.isLoading = true;

    this.chatService.sendMessage(text).subscribe({
      next: (reply) => {
        this.isLoading = false;
        this.isSending = false;
        this.processResponse(reply);
      },
      error: (err) => {
        this.isLoading = false;
        this.isSending = false;
        console.error('Error in chatbot communication:', err);
      }
    });
  }

  private processResponse(rawReply: string): void {
    // Magic command format: [ADD_CART:nombre|tamanio|pisos|relleno|colorDeco|mensaje|precio]
    const regex = /\[ADD_CART:([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\|([^\]]+)\]/;
    const match = rawReply.match(regex);

    if (match) {
      const nombreTorta = match[1].trim();
      const tamanio = match[2].trim();
      const pisos = parseInt(match[3].trim()) || 1;
      const relleno = match[4].trim();
      const colorDeco = match[5].trim();
      const mensaje = match[6].trim();
      const precio = parseFloat(match[7].trim()) || 0.0;

      // Unique guard key to prevent duplicate adds
      const key = `${nombreTorta}_${tamanio}_${pisos}_${relleno}_${precio}_${Math.floor(Date.now() / 5000)}`;
      if (this.processedCartKeys.has(key)) {
        return;
      }
      this.processedCartKeys.add(key);

      // Find the cake image in our catalog service
      const product = this.productsService.products().find(
        p => p.nombre.toLowerCase().includes(nombreTorta.toLowerCase())
      );
      const imagen = product?.imagen || 'https://res.cloudinary.com/ddfzttgyr/image/upload/v1774234876/torta_de_vainilla_vgcfkf.png';

      // Add to cart service
      this.cartService.addItem(
        { nombre: nombreTorta, imagen },
        tamanio,
        precio,
        relleno,
        pisos,
        10, // Portions
        colorDeco,
        mensaje
      );

      // Show success notification overlay
      this.successNotification.set({
        nombre: nombreTorta,
        precio,
        mensaje: `¡Agregado! ${nombreTorta} (${tamanio === 'S' ? 'Chica' : tamanio === 'M' ? 'Mediana' : 'Grande'}), ${pisos} piso(s), relleno de ${relleno}.`
      });

      setTimeout(() => {
        this.successNotification.set(null);
      }, 5000);
    }
  }

  private showFlashMessage(msg: string): void {
    // Simple temporary log alert
    alert(msg);
  }
}
