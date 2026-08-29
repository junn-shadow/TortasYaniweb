import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap, catchError, of, map, timeout } from 'rxjs';
import { ChatMessage } from '../models/models';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private readonly apiKey = 'YOUR_GROQ_API_KEY';
  private readonly apiUrl = 'https://api.groq.com/openai/v1/chat/completions';

  private readonly systemPrompt = `Eres Yani, la asistente virtual y asesora experta de repostería de 'Tortas Yani'. Tu objetivo es guiar a los clientes de forma proactiva, inteligente y fluida para que elijan la torta ideal y concretar sus pedidos agregándolos al carrito.

NORMAS DE REDACCIÓN Y ESTILO:
1. Escribe con ortografía perfecta en español. Mantén un tono cálido, humano, amable y profesional.
2. Utiliza siempre la palabra "tamaño" (con "ñ") al hablar de porciones o dimensiones.
3. No utilices emojis bajo ninguna circunstancia.
4. Escribe únicamente en texto plano. No utilices asteriscos (**) ni negritas para resaltar palabras.
5. Al saludar o dar la bienvenida, di siempre "Bienvenido/a" (con una sola 'a'). NUNCA escribas "Bienvenido/aa".

══════════════════════════════════════════
CATÁLOGO CON PRECIOS POR TAMAÑO:
══════════════════════════════════════════
Tortas con fondant/decoración temática (se pregunta color/temática):
- Torta de Chocolate:       pequeña S/64 · mediana S/85 · grande S/115
- Torta de Zanahoria:       pequeña S/49 · mediana S/65 · grande S/88
- Torta de Vainilla:        pequeña S/45 · mediana S/60 · grande S/81
- Torta Matrimonial:        mediana S/250 · grande S/338 · familiar S/438
- Torta de Quinceañera:     mediana S/200 · grande S/270 · familiar S/350
- Red Velvet:               pequeña S/68 · mediana S/90 · grande S/122
- Tres Leches:              pequeña S/53 · mediana S/70 · grande S/95
- Torta de Frutos del Bosque: pequeña S/71 · mediana S/95 · grande S/128

Postres SIN decoración de fondant (NO preguntar color ni temática, son postres clásicos):
- Cheesecake de Maracuyá:   pequeño S/60 · mediano S/80 · grande S/108
- Pie de Limón:             pequeño S/41 · mediano S/55 · grande S/74

Tamaños internos para sistema:
pequeña/pequeño = S | mediana/mediano = M | grande = L | familiar = XL
(Habla con el cliente usando "pequeña, mediana, grande". No uses S, M, L en tu conversación).

Pisos extras: +S/30 por cada piso extra (el de base cuenta como 1 y no tiene costo extra).
Rellenos disponibles: Chocolate, Vainilla, Fresa, Maracuyá, Oreo, Manjar blanco, Lúcuma.
Colores de decoración: Rosa pastel, Celeste, Dorado, Blanco perla, Chocolate, Lila.
Mensaje especial: texto opcional escrito en la torta.

══════════════════════════════════════════
COMPORTAMIENTO DE MINI-AGENTE E INTELIGENCIA (CRÍTICO):
══════════════════════════════════════════
1. GUÍA Y ORIENTACIÓN ACTIVA: Si el cliente no sabe qué elegir, no te quedes callada ni seas pasiva. Ayúdalo proactivamente recomendando opciones según la ocasión. 
   - Pregunta por el número de invitados para sugerir el tamaño ideal: pequeña para ~10 personas, mediana para ~20 personas, grande para ~30 personas.
   - Si es para un evento elegante/bodas, sugiere la Torta Matrimonial. Para cumpleaños de niños, sugiere chocolate o vainilla decoradas. Para algo fresco de tarde, sugiere Cheesecake de Maracuyá o Pie de Limón.
2. FLEXIBILIDAD SIN TERQUEDAD (NO SEAS TERCA): Si el cliente no especifica algún detalle opcional (como relleno, color o mensaje especial) tras habérselo preguntado, o si dice "lo que sea", "no sé", "sorpréndeme" o "como venga", NO vuelvas a insistir.
   - En su lugar, asume valores por defecto lógicos de inmediato, indícaselo con amabilidad y avanza.
   - Valores por defecto: Relleno = "Manjar blanco", ColorDecoracion = "Blanco perla" (o "Sin color" si es postre clásico), Pisos = 1, Mensaje = "Sin mensaje".
   - Ejemplo: "Perfecto, le pondré nuestro delicioso relleno de manjar blanco y decoración en color blanco perla por defecto. ¿Te parece bien si la agregamos a tu carrito?"
3. INTELIGENCIA DE CONTEXTO: Si el cliente da información agrupada (ej. "Torta mediana de chocolate de Spiderman para mi hijo"), asume todo lo mencionado (Tamaño = M, Torta = Torta de Chocolate, Temática/Mensaje = Spiderman) y pregúntale directamente lo que falta (relleno) o confirma directamente sugiriendo lo que falta por defecto para no aburrirlo.
4. PISOS: Por defecto asume siempre 1 piso. No menciones ni preguntes por pisos adicionales a menos que sea una torta Matrimonial o de Quinceañera, o el cliente lo pida expresamente.
5. POSTRES CLÁSICOS: Recuerda que Cheesecake de Maracuyá y Pie de Limón NUNCA llevan pisos extras, rellenos elegibles ni colores de decoración. Asume automáticamente Relleno = "Maracuyá" o "Limón", ColorDecoracion = "Sin color" y Pisos = 1.
6. AL RECOMENDAR/SUGERIR: Si piden un sabor no disponible (ej. lúcuma sola, coco, etc.), busca el reemplazo o combinación lógica en el catálogo y sugiérela de inmediato (ej. "No tenemos torta de lúcuma, pero podemos preparar una deliciosa Torta de Vainilla rellena de lúcuma para ti. ¿Qué opinas?").
7. TONO VENDEDORA NATURAL: Evita respuestas robotizadas de sistema. No digas "procesar a agregar esta orden", "confirmar que estás listo para continuar" o "he preparado la torta". Usa frases amables y humanas como "¡Me parece excelente! ¿Te gustaría que la agregáramos al carrito?" o "¿Te parece bien si la subimos al carrito para que completes tu compra?".
8. RESPUESTAS CONCISAS: Mantén tus mensajes en un máximo de 2 a 3 párrafos sencillos y amigables.

══════════════════════════════════════════
CÁLCULO FINAL Y ETIQUETA MÁGICA:
══════════════════════════════════════════
Calcula el precio sumando los pisos adicionales (+S/30 por piso a partir del segundo) al precio base del tamaño elegido.
Una vez que el cliente tenga claro el pedido o acepte tu sugerencia, hazle un breve y amable resumen con el precio final, coméntale como dato que el delivery tiene un costo de S/ 5 adicionales que se calculará al pagar, y pregúntale si confirma agregarlo al carrito.

CUANDO EL CLIENTE CONFIRME (diga "sí", "dale", "de acuerdo", "agrega", "listo", etc.):
Debes imprimir ESTRICTAMENTE la siguiente etiqueta mágica AL FINAL de tu respuesta, en una sola línea, sin espacios alrededor de los separadores (|):
[ADD_CART:NombreTorta|TamañoLetra|Pisos|Relleno|ColorDecoracion|MensajeEspecial|PrecioFinal]

Ejemplos internos:
- [ADD_CART:Torta de Chocolate|M|1|Oreo|Rosa pastel|Feliz cumple Ana|85.0]
- [ADD_CART:Cheesecake de Maracuyá|L|1|Maracuyá|Sin color|Sin mensaje|108.0]
- [ADD_CART:Torta Matrimonial|M|2|Vainilla|Blanco perla|Sin mensaje|280.0]

MENSAJE POST-CONFIRMACIÓN:
Tras confirmar e incluir la etiqueta mágica, di: "Excelente, ya armé tu pedido. Por favor selecciona el ícono del carrito (arriba a la derecha) para elegir tu fecha, hora de entrega y concretar el pago."
`;

  // Message history using Angular Signals (visible to components)
  messages = signal<ChatMessage[]>([
    { role: 'assistant', content: '¡Hola! Soy Yani. ¿En qué te puedo ayudar hoy?' }
  ]);

  // Private raw history including the system prompt for API calls
  private rawHistory: ChatMessage[] = [];

  constructor(private http: HttpClient) {
    this.resetChat();
  }

  resetChat(): void {
    this.rawHistory = [{ role: 'system', content: this.systemPrompt }];
    this.messages.set([
      { role: 'assistant', content: '¡Hola! Soy Yani. ¿En qué te puedo ayudar hoy?' }
    ]);
  }

  sendMessage(userText: string): Observable<string> {
    const currentMsgs = this.messages();
    this.messages.set([...currentMsgs, { role: 'user', content: userText }]);
    this.rawHistory.push({ role: 'user', content: userText });

    const apiUrl = 'https://tortasyaniapiweb-production.up.railway.app/api/chat';

    const body = {
      model: 'gemini-3.6-flash',
      messages: this.rawHistory,
      temperature: 0.7,
      max_tokens: 1200
    };

    return this.http.post<any>(apiUrl, body).pipe(
      timeout(25000),
      map((res: any) => {
        if (res && res.success && res.reply && res.reply.trim().length > 10) {
          const reply = (res.reply as string).trim();

          const addCartRegex = /\[ADD_CART:[^\]]+\]/g;
          const cleanReplyForMemory = reply.replace(addCartRegex, '').trim();

          this.rawHistory.push({ role: 'assistant', content: cleanReplyForMemory });
          this.messages.set([...this.messages(), { role: 'assistant', content: reply }]);
          
          return reply;
        }
        throw new Error(res?.message || 'Respuesta incompleta');
      }),
      catchError(() => {
        console.warn('=== CHAT AI OFFLINE OR TIMEOUT: USING SMART MINI-AGENT ENGINE ===');
        const fallbackReply = this.generateSmartFallbackReply(userText);

        const addCartRegex = /\[ADD_CART:[^\]]+\]/g;
        const cleanReplyForMemory = fallbackReply.replace(addCartRegex, '').trim();

        this.rawHistory.push({ role: 'assistant', content: cleanReplyForMemory });
        this.messages.set([...this.messages(), { role: 'assistant', content: fallbackReply }]);

        return of(fallbackReply);
      })
    );
  }

  private generateSmartFallbackReply(userMessage: string): string {
    const text = userMessage.toLowerCase().trim();
    const historyText = this.rawHistory.map(m => m.content.toLowerCase()).join(' ');

    const isConfirmation = /^(sí|si|claro|dale|de acuerdo|confirmo|agrega|agregalo|listo|ok|perfecto|comprar|por favor)/i.test(text) ||
                           text.includes('agrega al carrito') || text.includes('sí agregalo') || text.includes('si por favor');

    // 1. Check for Confirmation
    if (isConfirmation) {
      let cakeName = 'Torta de Chocolate';
      let sizeChar = 'M';
      let sizeText = 'mediana';
      let price = 85.0;
      let filling = 'Manjar blanco';
      let color = 'Blanco perla';
      let message = 'Sin mensaje';

      if (historyText.includes('boda') || historyText.includes('matrimoni') || text.includes('boda')) {
        cakeName = 'Torta Matrimonial';
        price = 250.0;
        color = 'Blanco perla';
        message = '¡Feliz Matrimonio!';
      } else if (historyText.includes('quince') || text.includes('quince')) {
        cakeName = 'Torta de Quinceañera';
        price = 200.0;
        color = 'Rosa pastel';
        message = 'Mis 15 Años';
      } else if (historyText.includes('zanahoria') || text.includes('zanahoria')) {
        cakeName = 'Torta de Zanahoria';
        price = 65.0;
      } else if (historyText.includes('maracuyá') || historyText.includes('cheesecake') || text.includes('maracuyá')) {
        cakeName = 'Cheesecake de Maracuyá';
        price = 80.0;
        filling = 'Maracuyá';
        color = 'Sin color';
      } else if (historyText.includes('limón') || historyText.includes('pie') || text.includes('limón')) {
        cakeName = 'Pie de Limón';
        price = 55.0;
        filling = 'Limón';
        color = 'Sin color';
      } else if (historyText.includes('red velvet') || text.includes('red velvet')) {
        cakeName = 'Red Velvet';
        price = 90.0;
        filling = 'Queso crema';
      } else if (historyText.includes('tres leches') || text.includes('tres leches')) {
        cakeName = 'Tres Leches';
        price = 70.0;
        filling = 'Manjar blanco';
      } else if (historyText.includes('frutos del bosque') || text.includes('frutos')) {
        cakeName = 'Torta de Frutos del Bosque';
        price = 95.0;
        filling = 'Crema y frutos';
      } else if (historyText.includes('vainilla') || text.includes('vainilla')) {
        cakeName = 'Torta de Vainilla';
        price = 60.0;
      }

      if (text.includes('grande') || text.includes('l') || historyText.includes('grande')) {
        sizeChar = 'L';
        sizeText = 'grande';
        if (cakeName === 'Torta de Chocolate') price = 115.0;
        if (cakeName === 'Torta Matrimonial') price = 338.0;
      } else if (text.includes('pequeña') || text.includes('pequeño') || text.includes('s')) {
        sizeChar = 'S';
        sizeText = 'pequeña';
        if (cakeName === 'Torta de Chocolate') price = 64.0;
      }

      const magicTag = `[ADD_CART:${cakeName}|${sizeChar}|1|${filling}|${color}|${message}|${price.toFixed(1)}]`;
      return `¡Excelente! He agregado tu ${cakeName} ${sizeText} al carrito por S/ ${price.toFixed(0)}.\n\nPor favor selecciona el ícono del carrito en la esquina superior derecha para elegir tu fecha, hora de entrega y concretar el pago.\n\n${magicTag}`;
    }

    // 2. Specific Event or Cake Inquiries
    if (text.includes('boda') || text.includes('matrimoni') || text.includes('casamiento')) {
      return '¡Felicidades por este evento tan especial! En Tortas Yani nos encanta ser parte de momentos inolvidables. Para una boda te recomiendo nuestra elegante Torta Matrimonial decorada en tonos blanco perla con finas flores de azúcar. La versión mediana para 20 personas rinde excelente y está S/ 250. ¿Te gustaría que le pongamos relleno de manjar blanco o prefieres otro sabor para subirla a tu carrito?';
    }

    if (text.includes('quince') || text.includes('15 años')) {
      return '¡Qué emoción celebrar un quinceañero! Nuestra Torta de Quinceañera con decoración rosa pastel y detalles dorados deslumbrará a todos tus invitados. La versión mediana para 20 personas rinde espectacular a S/ 200. ¿Te gustaría confirmarla o prefieres agregarle un mensaje personalizado?';
    }

    if (text.includes('chocolate') || text.includes('choc')) {
      return '¡La Torta de Chocolate es una de nuestras especialidades estrella! Viene con capas bizcocho súper húmedo y ganache artesanal. La mediana rinde para 20 personas por S/ 85. ¿Te parece bien si le ponemos relleno de manjar blanco y la agregamos a tu carrito?';
    }

    if (text.includes('zanahoria')) {
      return '¡Excelente gusto! Nuestra Torta de Zanahoria con frosting suave de queso crema y nueces es súper esponjosa y deliciosa. La versión mediana sale a S/ 65. ¿Te gustaría que la agreguemos al carrito?';
    }

    if (text.includes('maracuyá') || text.includes('cheesecake')) {
      return '¡Nuestros cheesecakes son una maravilla tropical! El Cheesecake de Maracuyá mediano rinde para 20 personas por S/ 80. Viene listo con su delicioso coulis artesanal. ¿Deseas agregarlo a tu carrito?';
    }

    if (text.includes('limón') || text.includes('pie')) {
      return 'El clásico Pie de Limón con merengue dorado y base crocante es perfecto para cualquier momento. La versión mediana para 20 personas está S/ 55. ¿Te gustaría subirlo a tu carrito?';
    }

    if (text.includes('red velvet')) {
      return 'Nuestra Red Velvet es irresistible, con su aterciopelado color rojo y cremoso frosting de queso crema. La mediana está a S/ 90. ¿Te gustaría reservarla en tu carrito?';
    }

    if (text.includes('tres leches')) {
      return 'Bizcocho esponjoso empapado en nuestra secreta combinación de tres leches y canela. La versión mediana está S/ 70. ¿Te gustaría que la sumemos a tu carrito?';
    }

    // 3. Size Guidance
    if (text.includes('persona') || text.includes('invitado') || text.includes('tamaño') || text.includes('porcion')) {
      return 'Te guío con mucho gusto sobre las porciones:\n• Tamaño Pequeño: Ideal para ~10 personas.\n• Tamaño Mediano: Recomendado para ~20 personas.\n• Tamaño Grande: Perfecto para ~30 personas.\n\n¿Para cuántas personas aprox. será tu reunión o evento para recomendarte el tamaño perfecto?';
    }

    // 4. Default Sales-Driven Warm Response
    return '¡Hola! Qué gusto saludarte. En Tortas Yani preparamos las tortas más frescas y deliciosas para toda ocasión: cumpleaños, bodas, quinceañeros o simplemente un antojo dulce. Cuéntame, ¿para qué evento buscas tu torta o qué sabor te provoca hoy?';
  }
}
