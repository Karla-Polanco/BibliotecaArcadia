/**
 * ============================================================================
 * QUOTES SERVICE - BANCO DE CITAS LITERARIAS
 * ============================================================================
 * Gestiona la selección y rotación interactiva de frases literarias célebres.
 */

export class QuotesService {
  constructor() {
    this.quotes = [
      {
        text: "«Un lector vive mil vidas antes de morir. El que nunca lee solo vive una.»",
        author: "George R. R. Martin"
      },
      {
        text: "«De los diversos instrumentos inventados por el hombre, el más asombroso es el libro; todos los demás son extensiones de su cuerpo... Sólo el libro es una extensión de la imaginación y la memoria.»",
        author: "Jorge Luis Borges"
      },
      {
        text: "«El que lee mucho y anda mucho, ve mucho y sabe mucho.»",
        author: "Miguel de Cervantes"
      },
      {
        text: "«Leemos para saber que no estamos solos.»",
        author: "C. S. Lewis"
      },
      {
        text: "«No hay amigo tan leal como un libro.»",
        author: "Ernest Hemingway"
      },
      {
        text: "«Las palabras pueden ser como rayos X si se usan apropiadamente: lo atraviesan todo.»",
        author: "Aldous Huxley"
      },
      {
        text: "«Un libro debe ser el hacha que rompa el mar helado dentro de nosotros.»",
        author: "Franz Kafka"
      },
      {
        text: "«No todos los que vagan están perdidos.»",
        author: "J. R. R. Tolkien"
      },
      {
        text: "«La lectura de todos los buenos libros es como una conversación con las personas más selectas de los siglos pasados.»",
        author: "René Descartes"
      },
      {
        text: "«Para viajar lejos no hay mejor nave que un libro.»",
        author: "Emily Dickinson"
      }
    ];

    this.currentIndex = 0;
  }

  /**
   * Obtiene la cita actual.
   */
  getCurrentQuote() {
    return this.quotes[this.currentIndex];
  }

  /**
   * Obtiene la siguiente cita de forma secuencial o aleatoria diferente a la actual.
   */
  getNextQuote() {
    let nextIndex;
    do {
      nextIndex = Math.floor(Math.random() * this.quotes.length);
    } while (nextIndex === this.currentIndex && this.quotes.length > 1);

    this.currentIndex = nextIndex;
    return this.quotes[this.currentIndex];
  }

  /**
   * Permite agregar nuevas citas dinámicamente.
   */
  addQuote(text, author) {
    if (text && author) {
      this.quotes.push({ text, author });
    }
  }
}
