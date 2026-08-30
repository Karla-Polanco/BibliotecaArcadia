/**
 * ============================================================================
 * MOCK BOOKS - DATOS DE DEMOSTRACIÓN PARA FASE 1
 * ============================================================================
 * Proporciona 24 libros con estados consistentes con la referencia visual:
 * Total: 24 libros | Por leer: 12 | En lectura: 7 | Completados: 5
 */

export const mockBooks = [
  // --- EN LECTURA (7 libros) ---
  {
    id: 'book-1',
    title: 'El Nombre del Viento',
    author: 'Patrick Rothfuss',
    progress: 67,
    status: 'reading',
    favorite: true,
    addedAt: Date.now() - 1000 * 60 * 60 * 24 * 2,
    lastReadAt: Date.now() - 1000 * 60 * 30,
    coverGradient: 'linear-gradient(135deg, #17113D 0%, #30256F 50%, #368EDC 100%)',
    currentChapter: 'Capítulo 42: El camino de los árboles'
  },
  {
    id: 'book-2',
    title: 'Dune',
    author: 'Frank Herbert',
    progress: 45,
    status: 'reading',
    favorite: true,
    addedAt: Date.now() - 1000 * 60 * 60 * 24 * 5,
    lastReadAt: Date.now() - 1000 * 60 * 60 * 3,
    coverGradient: 'linear-gradient(135deg, #30256F 0%, #5B4CC4 60%, #E5A93C 100%)',
    currentChapter: 'Capítulo 18: Arrakis'
  },
  {
    id: 'book-3',
    title: 'Cien Años de Soledad',
    author: 'Gabriel García Márquez',
    progress: 23,
    status: 'reading',
    favorite: false,
    addedAt: Date.now() - 1000 * 60 * 60 * 24 * 10,
    lastReadAt: Date.now() - 1000 * 60 * 60 * 24,
    coverGradient: 'linear-gradient(135deg, #0F1A30 0%, #253358 60%, #4A5FA5 100%)',
    currentChapter: 'Sección IV'
  },
  {
    id: 'book-4',
    title: 'Fundación',
    author: 'Isaac Asimov',
    progress: 81,
    status: 'reading',
    favorite: true,
    addedAt: Date.now() - 1000 * 60 * 60 * 24 * 12,
    lastReadAt: Date.now() - 1000 * 60 * 60 * 12,
    coverGradient: 'linear-gradient(135deg, #181818 0%, #30256F 50%, #5B4CC4 100%)',
    currentChapter: 'Parte V: Los Príncipes Comerciantes'
  },
  {
    id: 'book-5',
    title: 'Neuromante',
    author: 'William Gibson',
    progress: 54,
    status: 'reading',
    favorite: false,
    addedAt: Date.now() - 1000 * 60 * 60 * 24 * 15,
    lastReadAt: Date.now() - 1000 * 60 * 60 * 48,
    coverGradient: 'linear-gradient(135deg, #111111 0%, #17113D 60%, #368EDC 100%)',
    currentChapter: 'Capítulo 9'
  },
  {
    id: 'book-6',
    title: 'Fahrenheit 451',
    author: 'Ray Bradbury',
    progress: 35,
    status: 'reading',
    favorite: false,
    addedAt: Date.now() - 1000 * 60 * 60 * 24 * 20,
    lastReadAt: Date.now() - 1000 * 60 * 60 * 50,
    coverGradient: 'linear-gradient(135deg, #253358 0%, #5B4CC4 60%, #F5A623 100%)',
    currentChapter: 'El hogar y la salamandra'
  },
  {
    id: 'book-7',
    title: 'Solaris',
    author: 'Stanislaw Lem',
    progress: 15,
    status: 'reading',
    favorite: false,
    addedAt: Date.now() - 1000 * 60 * 60 * 24 * 22,
    lastReadAt: Date.now() - 1000 * 60 * 60 * 72,
    coverGradient: 'linear-gradient(135deg, #0B111E 0%, #162238 60%, #368EDC 100%)',
    currentChapter: 'Capítulo 2: Los visitantes'
  },

  // --- COMPLETADOS (5 libros) ---
  {
    id: 'book-8',
    title: 'El Aleph',
    author: 'Jorge Luis Borges',
    progress: 100,
    status: 'completed',
    favorite: true,
    addedAt: Date.now() - 1000 * 60 * 60 * 24 * 40,
    lastReadAt: Date.now() - 1000 * 60 * 60 * 24 * 5,
    coverGradient: 'linear-gradient(135deg, #17113D 0%, #5B4CC4 100%)',
    currentChapter: 'Completado'
  },
  {
    id: 'book-9',
    title: '1984',
    author: 'George Orwell',
    progress: 100,
    status: 'completed',
    favorite: true,
    addedAt: Date.now() - 1000 * 60 * 60 * 24 * 60,
    lastReadAt: Date.now() - 1000 * 60 * 60 * 24 * 15,
    coverGradient: 'linear-gradient(135deg, #181818 0%, #253358 100%)',
    currentChapter: 'Completado'
  },
  {
    id: 'book-10',
    title: 'Un Mundo Feliz',
    author: 'Aldous Huxley',
    progress: 100,
    status: 'completed',
    favorite: false,
    addedAt: Date.now() - 1000 * 60 * 60 * 24 * 80,
    lastReadAt: Date.now() - 1000 * 60 * 60 * 24 * 30,
    coverGradient: 'linear-gradient(135deg, #30256F 0%, #368EDC 100%)',
    currentChapter: 'Completado'
  },
  {
    id: 'book-11',
    title: 'Crónicas Marcianas',
    author: 'Ray Bradbury',
    progress: 100,
    status: 'completed',
    favorite: true,
    addedAt: Date.now() - 1000 * 60 * 60 * 24 * 90,
    lastReadAt: Date.now() - 1000 * 60 * 60 * 24 * 45,
    coverGradient: 'linear-gradient(135deg, #162238 0%, #D99B26 100%)',
    currentChapter: 'Completado'
  },
  {
    id: 'book-12',
    title: 'El Fin de la Infancia',
    author: 'Arthur C. Clarke',
    progress: 100,
    status: 'completed',
    favorite: false,
    addedAt: Date.now() - 1000 * 60 * 60 * 24 * 100,
    lastReadAt: Date.now() - 1000 * 60 * 60 * 24 * 50,
    coverGradient: 'linear-gradient(135deg, #111111 0%, #5B4CC4 100%)',
    currentChapter: 'Completado'
  },

  // --- POR LEER (12 libros) ---
  {
    id: 'book-13',
    title: 'El Temor de un Hombre Sabio',
    author: 'Patrick Rothfuss',
    progress: 0,
    status: 'to_read',
    favorite: true,
    addedAt: Date.now() - 1000 * 60 * 60 * 24 * 1,
    lastReadAt: null,
    coverGradient: 'linear-gradient(135deg, #17113D 0%, #30256F 100%)',
    currentChapter: 'Sin comenzar'
  },
  {
    id: 'book-14',
    title: 'Los Desposeídos',
    author: 'Ursula K. Le Guin',
    progress: 0,
    status: 'to_read',
    favorite: false,
    addedAt: Date.now() - 1000 * 60 * 60 * 24 * 3,
    lastReadAt: null,
    coverGradient: 'linear-gradient(135deg, #253358 0%, #4A5FA5 100%)',
    currentChapter: 'Sin comenzar'
  },
  {
    id: 'book-15',
    title: 'La Mano Izquierda de la Oscuridad',
    author: 'Ursula K. Le Guin',
    progress: 0,
    status: 'to_read',
    favorite: true,
    addedAt: Date.now() - 1000 * 60 * 60 * 24 * 4,
    lastReadAt: null,
    coverGradient: 'linear-gradient(135deg, #181818 0%, #368EDC 100%)',
    currentChapter: 'Sin comenzar'
  },
  {
    id: 'book-16',
    title: 'Hyperion',
    author: 'Dan Simmons',
    progress: 0,
    status: 'to_read',
    favorite: false,
    addedAt: Date.now() - 1000 * 60 * 60 * 24 * 6,
    lastReadAt: null,
    coverGradient: 'linear-gradient(135deg, #30256F 0%, #5B4CC4 100%)',
    currentChapter: 'Sin comenzar'
  },
  {
    id: 'book-17',
    title: 'El Problema de los Tres Cuerpos',
    author: 'Cixin Liu',
    progress: 0,
    status: 'to_read',
    favorite: true,
    addedAt: Date.now() - 1000 * 60 * 60 * 24 * 7,
    lastReadAt: null,
    coverGradient: 'linear-gradient(135deg, #0B111E 0%, #17113D 100%)',
    currentChapter: 'Sin comenzar'
  },
  {
    id: 'book-18',
    title: 'Criptonomicón',
    author: 'Neal Stephenson',
    progress: 0,
    status: 'to_read',
    favorite: false,
    addedAt: Date.now() - 1000 * 60 * 60 * 24 * 8,
    lastReadAt: null,
    coverGradient: 'linear-gradient(135deg, #111111 0%, #253358 100%)',
    currentChapter: 'Sin comenzar'
  },
  {
    id: 'book-19',
    title: 'Ubik',
    author: 'Philip K. Dick',
    progress: 0,
    status: 'to_read',
    favorite: false,
    addedAt: Date.now() - 1000 * 60 * 60 * 24 * 9,
    lastReadAt: null,
    coverGradient: 'linear-gradient(135deg, #17113D 0%, #E5A93C 100%)',
    currentChapter: 'Sin comenzar'
  },
  {
    id: 'book-20',
    title: '¿Sueñan los Androides con Ovejas Eléctricas?',
    author: 'Philip K. Dick',
    progress: 0,
    status: 'to_read',
    favorite: false,
    addedAt: Date.now() - 1000 * 60 * 60 * 24 * 11,
    lastReadAt: null,
    coverGradient: 'linear-gradient(135deg, #181818 0%, #5B4CC4 100%)',
    currentChapter: 'Sin comenzar'
  },
  {
    id: 'book-21',
    title: 'Snow Crash',
    author: 'Neal Stephenson',
    progress: 0,
    status: 'to_read',
    favorite: false,
    addedAt: Date.now() - 1000 * 60 * 60 * 24 * 13,
    lastReadAt: null,
    coverGradient: 'linear-gradient(135deg, #253358 0%, #368EDC 100%)',
    currentChapter: 'Sin comenzar'
  },
  {
    id: 'book-22',
    title: 'La Guía del Autoestopista Galáctico',
    author: 'Douglas Adams',
    progress: 0,
    status: 'to_read',
    favorite: true,
    addedAt: Date.now() - 1000 * 60 * 60 * 24 * 14,
    lastReadAt: null,
    coverGradient: 'linear-gradient(135deg, #30256F 0%, #368EDC 100%)',
    currentChapter: 'Sin comenzar'
  },
  {
    id: 'book-23',
    title: 'Flores para Algernon',
    author: 'Daniel Keyes',
    progress: 0,
    status: 'to_read',
    favorite: false,
    addedAt: Date.now() - 1000 * 60 * 60 * 24 * 16,
    lastReadAt: null,
    coverGradient: 'linear-gradient(135deg, #0F1A30 0%, #5B4CC4 100%)',
    currentChapter: 'Sin comenzar'
  },
  {
    id: 'book-24',
    title: 'La Ciudad y la Ciudad',
    author: 'China Miéville',
    progress: 0,
    status: 'to_read',
    favorite: false,
    addedAt: Date.now() - 1000 * 60 * 60 * 24 * 18,
    lastReadAt: null,
    coverGradient: 'linear-gradient(135deg, #111111 0%, #162238 100%)',
    currentChapter: 'Sin comenzar'
  }
];
