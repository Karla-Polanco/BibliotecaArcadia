# ESPECIFICACIÓN TÉCNICA Y ARQUITECTURA DE SOFTWARE
## PROYECTO: BIBLIOTECA VIRTUAL EPUB (BIBLIOTECA ARCADIA)
### FASE 0: DISEÑO, ARQUITECTURA Y ESPECIFICACIÓN TÉCNICA

---

## 1. RESUMEN DEL PROYECTO

### 1.1 Visión del Producto
**Biblioteca Arcadia** es una aplicación web progresiva (PWA) de biblioteca virtual personal y lector de libros en formato EPUB, orientada a la privacidad («Local-First») y diseñada con estándares visuales y de interacción comparables a aplicaciones de lectura premium de escritorio y dispositivos dedicados (como Kindle Oasis/Paperwhite o Apple Books).

La aplicación opera 100% en el entorno cliente (navegador web y PWA instalable), almacenando tanto los archivos binarios EPUB como el grafo relacional de lectura (progreso, notas, resaltados CFI, marcadores, colecciones y vocabulario) en el motor de base de datos transaccional local **IndexedDB**. No existe dependencia obligatoria de servidores remotos ni telemetría que exponga la biblioteca del usuario, garantizando portabilidad, velocidad instantánea y funcionamiento autónomo sin conexión (*offline-first*), lista para ser alojada como sitio estático en **GitHub Pages**.

### 1.2 Principios Rectores de Diseño e Ingeniería
1. **Local-First & Zero-Tracking:** Todos los datos, archivos e historiales residen exclusivamente en el dispositivo del usuario (`IndexedDB` + `Cache Storage`).
2. **Vanilla Modular Moderno (Zero Framework Bloat):** Ausencia total de React, Vue, Angular o Next.js en tiempo de ejecución. Arquitectura basada en componentes desacoplados mediante **ES Modules (ESM)** nativos y patrones orientados a eventos.
3. **Persistencia Basada en Estándares EPUB/CFI:** La identificación de posiciones en el texto se realiza mediante Canonical Fragment Identifiers (**EPUB CFI**, estándar IDPF), garantizando que anotaciones, marcadores y progreso sobrevivan a cambios de tamaño de fuente, interlineado, márgenes, diseño de columnas o redimensionamiento de pantalla.
4. **Ergonomía Visual & Sistema de Diseño Estricto:** Jerarquía visual basada en tokens semánticos CSS, con el tema por defecto **Nocturno Místico**, tipografía de lectura optimizada y adaptación fluida para Desktop, Laptop, Tablet y Smartphones.

---

## 2. ANÁLISIS DE LA REFERENCIA VISUAL

Examinando la interfaz gráfica provista en la referencia visual (`media_1788095534547.png`), se identifican dos núcleos de diseño esenciales:

```
+----------------------------------------------------------------------------------------------------+
|  SIDEBAR LATERAL                      | ÁREA PRINCIPAL                                             |
|  * Logo: Biblioteca Arcadia           | [ Banner Literario: Cita + Autor ]  [ Botón: Nueva frase ] |
|  * Nav: Biblioteca [24]               |------------------------------------------------------------|
|    - Lectura actual                   | Tu biblioteca                     [ + Subir libro (EPUB) ] |
|    - Favoritos                        | [ Q Buscar libro/autor ] [ Más reciente v ] [ Grid | Lista]|
|    - Notas y subrayados               |------------------------------------------------------------|
|    - Vocabulario                      | [ GRID DE LIBROS ]                                         |
|    - Ajustes                          |  +------------+  +------------+  +------------+            |
|  * Colecciones:                       |  | Portada    |  | Portada    |  | Portada    |            |
|    - Por leer [12]                    |  | Gradiente/ |  | Gradiente/ |  | Gradiente/ |            |
|    - En lectura [7]                   |  | Ilustración|  | Ilustración|  | Ilustración|            |
|    - Completados [5]                  |  | Título     |  | Título     |  | Título     |            |
|  * Almacenamiento Local:              |  | Autor      |  | Autor      |  | Autor      |            |
|    [ Progreso: 1.2 GB / 5 GB usados ] |  +------------+  +------------+  +------------+            |
|                                       |------------------------------------------------------------|
|                                       | LECTURA ACTUAL: [Miniatura | Título | %] [ Continuar Ley.] |
+----------------------------------------------------------------------------------------------------+
```

### 2.1 Desglose de Componentes Visuales
1. **Sidebar Lateral Permanente / Drawer Móvil:**
   - Identidad de marca superior con isotipo (icono de constelación/libro brillante) y texto «Biblioteca Arcadia · App de lectura».
   - Menú de navegación principal con indicadores cuantitativos (píldoras contadoras tipo badge: «Biblioteca [24]»).
   - Sección de Colecciones del sistema con conteos en tiempo real: *Por leer*, *En lectura*, *Completados*.
   - Widget inferior de **Almacenamiento Local**: Barra de progreso y cálculo dinámico de cuota (`StorageEstimate` API del navegador) que proyecta inmediatamente el consumo en disco (ej. «1.2 GB de 5 GB usados»).

2. **Banner Superior Literario (Inspiracional):**
   - Tarjeta estilizada con fondo gradiente sutil nocturno/púrpura oscuro, que exhibe una cita literaria en tipografía serifada/cursiva elegante (`«Un lector vive mil vidas antes de morir.» — George R. R. Martin`).
   - Botón interactivo con icono de refresco («Nueva frase») para rotar dinámicamente entre citas almacenadas en una estructura JSON embebida extensible.

3. **Barra de Control de Biblioteca (Action & Filter Toolbar):**
   - Título de sección («Tu biblioteca»).
   - Botón de acción primaria destacado: `Subir libro (EPUB)` con icono ascendente.
   - Buscador en vivo con icono de lupa (`Buscar un libro o autor`).
   - Selector dropdown de ordenamiento (`Más reciente`, `Título A-Z`, `Autor`, `Progreso`).
   - Conmutador de vista tipo botón toggle segmentado (`[ Grid ] [ Lista ]`).

4. **Lienzo de Tarjetas de Libros (Book Grid):**
   - Proporción estándar de libros impresos (ratio 1:1.5 / 2:3).
   - Generación de portadas dinámicas con gradientes místico-nocturnos en caso de que el EPUB carezca de imagen de portada incrustada.
   - Metadatos legibles en dos niveles: Título en negrita recortado con elipsis (`line-clamp: 2`) y Autor secundario.
   - Barra inferior sutil de progreso porcentual.

5. **Panel Flotante / Anclado de «Lectura Actual»:**
   - Card horizontal ubicada al pie o en posición prominente, mostrando la portada/icono del libro en curso, título, autor, porcentaje de lectura exacto (`Autor · 67% leído`) y el botón de acción directa `Continuar leyendo`.

6. **Selector de Temas (Visualizado en el panel de referencia):**
   - Tres tarjetas de previsualización de paletas con swatches de color reales y badges de recomendación:
     - **Nocturno místico:** Fondo negro/antracita, púrpura profundo, violeta medio y azul eléctrico.
     - **Lavanda claro:** Fondo blanco/lavanda tenue, púrpura suave y azul.
     - **Crepúsculo profundo:** Azul marino intenso con acentos púrpura y toques de ámbar/oro cálido («hora dorada»).

---

## 3. ARQUITECTURA GENERAL

La arquitectura general del sistema sigue el paradigma **Offline-First Clean Architecture**, organizada en 4 capas de responsabilidad unidireccional:

```
+-------------------------------------------------------------------+
|                        PRESENTATION LAYER                         |
|      Views (LibraryView, ReaderView, SettingsView, NotesView)     |
|      UI Components (BookCard, HeaderBanner, ContextMenu, Modal)   |
+-------------------------------------------------------------------+
                                 │  Dispatches User Events
                                 ▼
+-------------------------------------------------------------------+
|                        APPLICATION LAYER                          |
|    State Store (AppState - PubSub)   │  Orchestrators/Managers:   |
|    - currentBook                     │  - BookManager             |
|    - activeView                      │  - ReaderManager           |
|    - theme                           │  - AnnotationManager       |
|    - searchState                     │  - CollectionManager       |
+-------------------------------------------------------------------+
                                 │
                 ┌───────────────┴───────────────┐
                 ▼                               ▼
+--------------------------------+ +--------------------------------+
|          DOMAIN LAYER          | |     SERVICES / ENGINES         |
|  - Book Entity                 | |  - EPUBParser / Engine         |
|  - ReadingLocation (CFI)       | |    (epub.js wrapper)           |
|  - Annotation / Note Entity    | |  - DictionaryService           |
|  - Bookmark Entity             | |  - StorageQuotaService         |
|  - Collection Entity           | |  - QuotesService               |
+--------------------------------+ +--------------------------------+
                 │                               │
                 └───────────────┬───────────────┘
                                 ▼
+-------------------------------------------------------------------+
|                    INFRASTRUCTURE & DATA LAYER                    |
|    DatabaseManager (IndexedDB Wrapper w/ Transactions & Indexes)  |
|    CacheStorage (PWA Service Worker for static assets)            |
+-------------------------------------------------------------------+
```

### Características Fundamentales
- **Desacoplamiento Estricto:** La capa de presentación desconoce la existencia de IndexedDB; únicamente se comunica con los `Managers` a través de métodos de alto nivel y se suscribe a los cambios reactivos del `AppState`.
- **Inmutabilidad en el Estado:** El estado global no se muta directamente; se actualiza mediante acciones atómicas despachadas al `AppState`, notificando a los observadores suscritos mediante un micro-bus de eventos (Publish-Subscribe nativo).
- **Aislamiento de la Librería de Renderizado (epub.js):** `ReaderManager` actúa como un *Facade / Adapter* alrededor de `epub.js`. Si en el futuro se optimizara o sustituyera el motor EPUB por una solución ligera basada en Web Streams y DOMParser nativo, el resto de la aplicación no requerirá modificaciones.

---

## 4. ARQUITECTURA FRONTEND

### 4.1 Paradigma: Vanilla ES Modules + Web Components Ligeros
Se adopta **JavaScript Moderno (ES2022+)** nativo, estructurado en módulos ECMAScript (`import` / `export`). Se prescinde de bundlers pesados (Webpack, Vite) para el desarrollo base, permitiendo que la aplicación se sirva directamente mediante cualquier servidor HTTP estático o GitHub Pages con carga nativa del navegador (`<script type="module" src="js/app.js"></script>`).

### 4.2 Enrutamiento y Gestión de Vistas (View Router SPA)
Un micro-enrutador basado en `HashChangeEvent` (`#library`, `#reader/:id`, `#annotations`, `#vocabulary`, `#settings`, `#collections/:id`):
- Mantiene el historial de navegación del navegador (soporte completo de botón "Atrás/Adelante").
- Monta y desmonta vistas en el contenedor principal `<main id="app-view">` sin recargar la página.
- El lector EPUB se ejecuta en una vista independiente (`ReaderView`) que oculta el sidebar global para maximizar el área de concentración y lectura inmersiva.

### 4.3 Arquitectura CSS (CSS Custom Properties & Design Tokens)
La suite de estilos se divide en archivos modulares importados en cascada:
- `tokens.css`: Primitivas tipográficas, escalas de espaciado, radios de curvatura, sombras y transiciones.
- `themes.css`: Definición semántica de variables de color encapsuladas bajo atributos de datos en el elemento raíz (`[data-theme="mystic-night"]`, `[data-theme="lavender-light"]`, `[data-theme="deep-twilight"]`).
- `layout.css`: Sistema de rejilla (`CSS Grid`) para el layout general (Sidebar + Main Content) y diseño de la barra de lectura actual.
- `library.css`: Estilos para el grid de libros, vista en lista, tarjetas de libro y banner literario.
- `reader.css`: Estilos específicos del visor EPUB, menús contextuales, popover de anotaciones y barra de herramientas flotante.
- `responsive.css`: Media queries para puntos de ruptura clave (Mobile Drawer, Bottom Navigation, Tablet Sidebar colapsable).

---

## 5. ARQUITECTURA DE INDEXEDDB

### 5.1 Especificación del DatabaseManager
Se implementa una clase singleton `DatabaseManager` (`js/db.js`) que encapsula la API nativa de `window.indexedDB` mediante Promesas puras (`async/await`), eliminando los callbacks anidados y gestionando transacciones atómicas (`readonly` y `readwrite`).

```
Base de Datos: "ArcadiaEpubDB"
Versión: 1
```

### 5.2 Estructura de Object Stores e Índices

| Object Store | Clave Primaria (`keyPath`) | AutoIncrement | Índices Clave (`name`, `keyPath`, `options`) | Propósito |
| :--- | :--- | :--- | :--- | :--- |
| **`books`** | `id` (string UUIDv4) | No | - `by_title` (`title`, unique: false)<br>- `by_author` (`author`, unique: false)<br>- `by_added` (`addedAt`, unique: false)<br>- `by_lastRead` (`lastReadAt`, unique: false)<br>- `by_status` (`status`, unique: false)<br>- `by_favorite` (`favorite`, unique: false) | Almacena metadatos del libro, portada (Data URL o Blob) y el archivo binario del libro (`fileBlob`). |
| **`readingProgress`** | `bookId` (string UUIDv4) | No | - `by_percentage` (`percentage`, unique: false)<br>- `by_updatedAt` (`updatedAt`, unique: false) | Posición CFI actual, porcentaje (0-100), capítulo actual y marca temporal. |
| **`readerSettings`** | `bookId` (string UUIDv4) | No | *(Sin índices secundarios)* | Preferencias visuales personalizadas por libro (fuente, tamaño, interlineado, columnas, tema). |
| **`annotations`** | `id` (string UUIDv4) | No | - `by_bookId` (`bookId`, unique: false)<br>- `by_type` (`type`, unique: false)<br>- `by_color` (`color`, unique: false)<br>- `by_createdAt` (`createdAt`, unique: false) | Resaltados y subrayados basados en rango EPUB CFI (`cfiRange`), texto seleccionado y color. |
| **`notes`** | `id` (string UUIDv4) | No | - `by_bookId` (`bookId`, unique: false)<br>- `by_cfi` (`cfiRange`, unique: false)<br>- `by_createdAt` (`createdAt`, unique: false) | Notas asociadas a selecciones de texto o notas libres/independientes. |
| **`bookmarks`** | `id` (string UUIDv4) | No | - `by_bookId` (`bookId`, unique: false)<br>- `by_createdAt` (`createdAt`, unique: false) | Marcadores manuales con posición CFI exacta, título de capítulo y progreso. |
| **`collections`** | `id` (string) | No | - `by_name` (`name`, unique: true)<br>- `by_order` (`orderIndex`, unique: false) | Metadatos de colecciones (nombre, icono, regla dinámica o lista manual de IDs). |
| **`book_collections`** | `[bookId, collectionId]` | No | - `by_book` (`bookId`, unique: false)<br>- `by_collection` (`collectionId`, unique: false) | Tabla relacional intermedia N:M entre libros y colecciones. |
| **`words`** | `id` (string UUIDv4) | No | - `by_word` (`word`, unique: false)<br>- `by_bookId` (`bookId`, unique: false)<br>- `by_createdAt` (`createdAt`, unique: false) | Vocabulario personal: términos consultados, definición, transcripción fonética y libro de origen. |
| **`searchHistory`** | `id` (string UUIDv4) | No | - `by_query` (`query`, unique: false)<br>- `by_timestamp` (`timestamp`, unique: false) | Registro de búsquedas recientes realizadas por el usuario en la biblioteca o dentro de libros. |
| **`positionHistory`** | `id` (string UUIDv4) | No | - `by_bookId` (`bookId`, unique: false)<br>- `by_timestamp` (`timestamp`, unique: false) | Historial de puntos de lectura anteriores para permitir navegar atrás como en un navegador. |

---

## 6. MODELO DE DATOS

Definición formal de entidades en formato TypeScript/JSDoc conceptual:

```typescript
// 1. Entidad Libro (Book)
interface Book {
  id: string;                      // UUIDv4 (ej. "d3b07384-d113-4660-9c30-7e35f2358344")
  title: string;                   // Título extraído o "Título desconocido"
  author: string;                  // Autor extraído o "Autor desconocido"
  description: string;             // Sinopsis o descripción del paquete OPF
  publisher: string;               // Editorial o "Independiente"
  language: string;                // Código de idioma ISO (ej. "es", "en")
  identifier: string;              // ISBN, UUID del EPUB o identificador OPF
  publicationDate: string;         // Fecha original de publicación ISO 8601
  coverDataUrl: string | null;     // Data URL (WebP/JPEG) o Blob URL de la portada
  coverColorDominant: string;      // Color hexadecimal generado para portadas placeholder
  fileBlob: Blob;                  // Archivo binario EPUB íntegro (application/epub+zip)
  fileSize: number;                // Tamaño en bytes
  totalLocations: number;          // Total de ubicaciones calculadas por epub.js
  status: 'to_read' | 'reading' | 'completed' | 'abandoned';
  favorite: boolean;               // Indicador booleano
  addedAt: number;                 // Timestamp de incorporación a la biblioteca
  lastReadAt: number | null;       // Timestamp del último acceso de lectura
}

// 2. Progreso de Lectura (ReadingProgress)
interface ReadingProgress {
  bookId: string;                  // Relación Foreign Key -> Book.id
  currentCfi: string;              // Posición exacta EPUB Canonical Fragment Identifier
  chapterHref: string;             // Ruta relativa del archivo de contenido dentro del EPUB
  chapterTitle: string;            // Nombre amigable del capítulo/sección
  percentage: number;              // Valor numérico flotante 0.0 a 100.0
  currentPage: number;             // Página aproximada calculada
  totalPages: number;              // Total de páginas calculadas
  updatedAt: number;               // Timestamp del último registro de avance
}

// 3. Configuración Específica del Lector (ReaderSettings)
interface ReaderSettings {
  bookId: string;                  // Clave primaria (1 registro por libro)
  fontFamily: 'Literata' | 'Merriweather' | 'Roboto' | 'Inter' | 'OpenDyslexic';
  fontSize: number;                // Tamaño de fuente en píxeles (ej. 18)
  fontWeight: 'normal' | '500' | 'bold';
  lineHeight: number;              // Interlineado relativo (ej. 1.6)
  letterSpacing: number;           // Espaciado en px o em (ej. 0.02em)
  margins: 'compact' | 'normal' | 'relaxed'; // Márgenes de pantalla
  contentWidth: number;            // Ancho máximo del contenedor en % o px (ej. 800)
  columns: 1 | 2;                  // Disposición en 1 o 2 columnas (desktop)
  flowMode: 'paginated' | 'scrolled-doc'; // Paginación horizontal o scroll continuo
  theme: 'mystic-night' | 'lavender-light' | 'deep-twilight' | 'system';
}

// 4. Anotaciones (Highlights y Subrayados)
interface Annotation {
  id: string;                      // UUIDv4
  bookId: string;                  // FK -> Book.id
  cfiRange: string;                // Rango exacto de inicio y fin (epubcfi(/6/4[chap01]!/4/2/10,/1:0,/1:45))
  text: string;                    // Texto literal seleccionado
  type: 'highlight' | 'underline'; // Modalidad de marcado
  color: 'yellow' | 'green' | 'blue' | 'purple' | 'orange' | 'red' | 'pink';
  chapterTitle: string;            // Capítulo donde se realizó
  createdAt: number;               // Timestamp de creación
  updatedAt: number;               // Timestamp de modificación
}

// 5. Notas (Notes)
interface Note {
  id: string;                      // UUIDv4
  bookId: string;                  // FK -> Book.id
  cfiRange: string | null;         // null si es nota libre/independiente
  selectedText: string | null;     // Contexto citado (si aplica)
  title: string;                   // Título o resumen de la nota
  content: string;                 // Contenido de la nota en texto/markdown
  color: string;                   // Color de etiqueta asociada
  createdAt: number;
  updatedAt: number;
}

// 6. Marcadores (Bookmarks)
interface Bookmark {
  id: string;                      // UUIDv4
  bookId: string;                  // FK -> Book.id
  cfi: string;                     // Posición exacta del marcador
  chapterTitle: string;            // Nombre de la sección o capítulo
  percentage: number;              // Porcentaje al momento de marcar
  previewText: string;             // Fragmento inicial visible para identificación rápida
  createdAt: number;
}

// 7. Vocabulario (Word Entry)
interface VocabularyWord {
  id: string;                      // UUIDv4
  word: string;                    // Término buscado en infinitivo/lema
  contextSentence: string;         // Oración donde fue encontrada en el libro
  definition: string;              // Definición léxica almacenada
  pronunciationIpa?: string;       // Alfabeto Fonético Internacional (ej. /esˈkwa.lo/)
  audioDataUrl?: string;           // Síntesis de voz en caché o URL
  bookId: string;                  // FK -> Book.id
  isSaved: boolean;                // Booleano para catálogo personal permanente
  createdAt: number;
}

// 8. Colecciones (Collection)
interface Collection {
  id: string;                      // "to_read" | "reading" | "completed" | "favorites" | UUIDv4
  name: string;                    // Nombre de la colección
  description?: string;
  isSystem: boolean;               // true si es fija (predefinida), false si es personalizada
  rule?: {                         // Para colecciones dinámicas/inteligentes
    field: 'status' | 'progress' | 'lastReadAt' | 'favorite';
    operator: 'eq' | 'gt' | 'lt' | 'between';
    value: any;
  };
  orderIndex: number;
  createdAt: number;
}
```

---

## 7. ARQUITECTURA DEL LECTOR EPUB

### 7.1 Integración y Aislamiento de `epub.js`
`epub.js` (v0.3+) opera instanciando un objeto `ePub.Book` que desempaqueta el contenedor EPUB en memoria, y un objeto `Rendition` que inyecta los capítulos dentro de un `iframe` seguro en el DOM principal.

```
+-----------------------------------------------------------------------------------+
| READER CONTAINER (#reader-viewport)                                               |
|                                                                                   |
|  [ Header Bar: Volver a Biblioteca | Título Libro | Ajustes | Marcador ]          |
|  -------------------------------------------------------------------------------  |
|  [ Flecha Prev ]                                                 [ Flecha Next ]  |
|                   +--------------------------------------------+                  |
|                   |  IFRAME GENERADO POR EPUB.JS (Rendition)   |                  |
|                   |                                            |                  |
|                   |  "El conocimiento es la única riqueza..." |                  |
|                   |  [Texto fluido adaptado a estilos de host] |                  |
|                   |                                            |                  |
|                   +--------------------------------------------+                  |
|  -------------------------------------------------------------------------------  |
|  [ Footer Bar: Menú Tabla Contenidos | Barra Progreso (%) | Tiempo restante ]     |
+-----------------------------------------------------------------------------------+
```

### 7.2 Configuración del Motor de Renderizado (`Rendition`)
El `ReaderManager` inicializa la visualización con parámetros reactivos:
```javascript
this.rendition = this.book.renderTo('reader-content', {
  method: 'continuous', // o 'default' para páginas
  flow: settings.flowMode === 'paginated' ? 'paginated' : 'scrolled-doc',
  width: '100%',
  height: '100%',
  spread: settings.columns === 2 ? 'always' : 'none',
  allowScriptedContent: false // Seguridad contra XSS en EPUBs maliciosos
});
```

### 7.3 Inyección de Estilos y Temas en el iframe del Lector
Dado que `epub.js` aísla el contenido en un `iframe`, las hojas de estilo del host no se heredan automáticamente. `ReaderManager` utiliza la API `rendition.themes` para registrar reglas dinámicas:
- Inyección de variables CSS del tema actual (`--color-background`, `--color-text`, etc.).
- Personalización de familias de fuentes locales (`Literata`, `Merriweather`, `Roboto`, `OpenDyslexic`).
- Ajuste en caliente de `font-size`, `line-height`, `letter-spacing` y márgenes laterales sin destruir el árbol DOM ni perder la posición de lectura actual.

### 7.4 Generación y Caché de Ubicaciones (`Locations API`)
Para calcular con exactitud el porcentaje de lectura (0% a 100%) y el número de páginas, se requiere invocar `book.locations.generate(1024)`. Dado que este proceso en libros pesados (más de 500 páginas) puede demorar varios segundos y bloquear el hilo principal:
1. El resultado de `book.locations.save()` se serializa y almacena en el registro del libro en **IndexedDB**.
2. Al reabrir el libro, se ejecuta `book.locations.load(savedLocations)` de forma instantánea (0 ms de espera).

---

## 8. SISTEMA DE ANOTACIONES (RESALTADOS Y SUBRAYADOS)

### 8.1 Captura Robusta mediante EPUB CFI
Cuando el usuario selecciona texto dentro del `iframe` de `epub.js`, se intercepta el evento de selección nativo del documento embebido:
```javascript
rendition.on('selected', (cfiRange, contents) => {
  const selectedText = contents.window.getSelection().toString().trim();
  if (!selectedText) return;
  // Desplegar Barra Contextual Flotante en coordenadas absolutas
  FloatingMenu.show(cfiRange, selectedText, contents);
});
```

### 8.2 Marcado Permanente Mediante SVG / CSS Annotations
`epub.js` incorpora soporte nativo para decoraciones DOM basadas en CFI:
- **Resaltado:** Aplica un fondo coloreado semitransparente (`mix-blend-mode: multiply` en modo claro, `mix-blend-mode: screen` en modo oscuro) utilizando `rendition.annotations.highlight(cfiRange, {}, callback, className, styles)`.
- **Subrayado:** Inyecta un estilo con `border-bottom: 2.5px solid [color]` o SVG wave.

### 8.3 Ciclo de Vida y Persistencia de Anotaciones
1. **Creación:** Se guarda en la tienda `annotations` de IndexedDB con su color, tipo y texto.
2. **Restauración al Abrir:** Al cargarse cualquier sección/capítulo (`rendition.on('rendered', ...)`), se consultan en IndexedDB todas las anotaciones pertenecientes al libro y se re-aplican mediante `rendition.annotations.add()`.
3. **Resiliencia:** Al estar vinculadas al estándar **EPUB CFI**, las anotaciones no se desfasan ni se rompen aunque el usuario altere el tamaño de la tipografía, la fuente o la ventana del navegador.

---

## 9. SISTEMA DE NOTAS

### 9.1 Modalidades de Notas
1. **Nota Vinculada a Selección:** Creada desde la barra contextual emergente. Se asocia al `cfiRange` del texto y genera un indicador visual (icono de nota o glifo sutil) al margen del párrafo en el lector. Al hacer clic sobre el indicador, se abre un drawer/modal lateral con el editor.
2. **Nota Libre / Cuaderno del Libro:** Notas generales o reflexiones sobre el libro que no dependen de una frase específica (`cfiRange = null`).

### 9.2 Editor de Notas y Búsqueda
- Soporte para títulos, formateo básico, marcas de tiempo automáticas (`createdAt`, `updatedAt`).
- Panel global en la sección principal: «Notas y subrayados», permitiendo filtrar por libro, buscar palabras clave en el contenido de las notas y saltar directamente al pasaje de lectura original.

---

## 10. SISTEMA DE MARCADORES (BOOKMARKS)

### 10.1 Creación y Eliminación con 1 Clic
- En la cabecera del lector reside un icono de cinta de marcador (bookmark). Si la posición actual ya tiene un marcador guardado, el icono se muestra iluminado en color acento.
- Al pulsarlo, se obtiene la posición actual mediante `rendition.currentLocation().start.cfi` y se almacena en el store `bookmarks` junto con el nombre del capítulo y un extracto de texto de los primeros 100 caracteres.

### 10.2 Navegación Rápida
- En el panel de «Tabla de Contenidos y Marcadores», se listan en orden cronológico o de lectura. Al hacer clic en un marcador, el lector ejecuta `rendition.display(bookmark.cfi)`, transportando al usuario de inmediato.

---

## 11. SISTEMA DE BÚSQUEDA

### 11.1 Niveles de Búsqueda
1. **Búsqueda Global en Biblioteca:** Filtra en tiempo real la lista de libros por título, autor y sinopsis usando indexación en memoria.
2. **Búsqueda Intra-Libro (Full-Text Search en el EPUB):**
   - Utiliza la función interna `book.spine.spineItems` iterando sobre cada sección del libro.
   - Aplica expresiones regulares de búsqueda sobre el texto plano de cada sección mediante un `Web Worker` auxiliar para no congelar la interfaz de usuario en libros voluminosos.
   - Devuelve un array de resultados estructurados: `{ cfi: string, excerpt: string, chapter: string }`.

### 11.2 Interfaz de Resultados Intra-Libro
- Panel lateral deslizable con lista de coincidencias y fragmentos con el término resaltado en negrita.
- Contador de progreso: «Resultado 4 de 28».
- Botones de navegación directa `[ < Anterior ]` y `[ Siguiente > ]` que mueven el visor a la siguiente aparición en pantalla completa.

---

## 12. SISTEMA DE VOCABULARIO

### 12.1 Flujo de Consulta Léxica
1. Selección de una palabra en el lector -> Botón `Definir palabra` en el menú flotante.
2. Despliegue de una tarjeta flotante (*Vocabulary Popover*) con la palabra en cabecera.
3. Consulta al servicio `DictionaryService`:
   - **Modo Primario (Conectado):** Consulta asíncrona a API pública abierta (Free Dictionary API: `https://api.dictionaryapi.dev/api/v2/entries/es/[palabra]`).
   - **Modo Secundario (Sin Conexión / Offline):** Detección de ausencia de red (`navigator.onLine === false`). La interfaz muestra claramente: *«Modo sin conexión. Definición no disponible actualmente en caché local. Puedes guardar la palabra en tu vocabulario para consultarla más tarde.»* (No se inventan definiciones).
4. **Pronunciación Sonora:** Uso de la API nativa del navegador `window.speechSynthesis` (`SpeechSynthesisUtterance`), permitiendo escuchar la pronunciación en español de forma 100% offline y sin necesidad de descargar archivos pesados de audio.
5. **Guardado en Catálogo:** Botón de un toque para añadir al store `words`.

### 12.2 Sección Dedicada «Vocabulario»
Ubicada en el sidebar principal bajo «Notas y subrayados»:
- Tarjetas de términos aprendidos organizadas alfabéticamente o por fecha.
- Cada tarjeta exhibe la palabra, fonética, definición, la oración exacta donde se leyó en el libro y un botón para repasar o eliminar.

---

## 13. SISTEMA DE COLECCIONES

### 13.1 Colecciones Predeterminadas (Sistémicas)
- **Por leer:** Libros con progreso = 0%.
- **En lectura:** Libros con progreso > 0% y < 100%.
- **Completados:** Libros con progreso = 100%.
- **Favoritos:** Libros con `favorite === true`.

### 13.2 Colecciones Personalizadas y Dinámicas (Smart Collections)
El usuario puede crear carpetas o etiquetas personalizadas (ej. *«Filosofía»*, *«Ciencia Ficción»*, *«Pendientes 2026»*).
- **Manuales:** Inserción directa de libros mediante la relación en `book_collections`.
- **Inteligentes:** Evaluadas por el `CollectionManager` mediante predicados funcionales en tiempo de ejecución:
  - *«Abandonados»*: `lastReadAt < (Date.now() - 30 días) && progress > 0 && progress < 100`.
  - *«Lecturas Recientes»*: `lastReadAt > (Date.now() - 7 días)`.

---

## 14. SISTEMA DE TEMAS (CSS CUSTOM PROPERTIES ENGINE)

### 14.1 Arquitectura de Tokens y Variables CSS
Se definen variables semánticas en `:root` que mutan de acuerdo al atributo `data-theme` en la etiqueta `<html>`.

```css
/* Variables Semánticas Base */
:root {
  --font-family-ui: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
  --font-family-serif: 'Literata', 'Merriweather', Georgia, serif;
  --radius-sm: 6px;
  --radius-md: 12px;
  --radius-lg: 18px;
  --shadow-card: 0 4px 20px rgba(0, 0, 0, 0.25);
  --transition-fast: 0.15s ease-out;
  --transition-normal: 0.25s ease-in-out;
}

/* 1. TEMA POR DEFECTO: NOCTURNO MÍSTICO */
[data-theme="mystic-night"] {
  --color-background: #111111;
  --color-surface: #181818;
  --color-surface-secondary: #1D1D1D;
  --color-surface-elevated: #242424;
  --color-primary-dark: #17113D;
  --color-primary: #30256F;
  --color-primary-accent: #5B4CC4;
  --color-secondary-accent: #368EDC;
  --color-text-primary: #F2F0F7;
  --color-text-secondary: #AAA7B2;
  --color-text-muted: #6E6B7B;
  --color-border: #303030;
  --color-border-subtle: #242424;
  --reader-bg: #131217;
  --reader-text: #E4E2EB;
}

/* 2. TEMA: LAVANDA CLARO */
[data-theme="lavender-light"] {
  --color-background: #F8F7FC;
  --color-surface: #FFFFFF;
  --color-surface-secondary: #F0EDF9;
  --color-surface-elevated: #FFFFFF;
  --color-primary-dark: #30256F;
  --color-primary: #5B4CC4;
  --color-primary-accent: #6C5CE7;
  --color-secondary-accent: #2980B9;
  --color-text-primary: #1A162B;
  --color-text-secondary: #5E5873;
  --color-text-muted: #8E88A8;
  --color-border: #E2DEEE;
  --color-border-subtle: #ECE8F5;
  --reader-bg: #FAF9FD;
  --reader-text: #232033;
}

/* 3. TEMA: CREPÚSCULO PROFUNDO */
[data-theme="deep-twilight"] {
  --color-background: #0B111E;
  --color-surface: #111B2C;
  --color-surface-secondary: #162238;
  --color-surface-elevated: #1C2B47;
  --color-primary-dark: #0F1A30;
  --color-primary: #253358;
  --color-primary-accent: #4A5FA5;
  --color-secondary-accent: #D99B26; /* Acento ámbar/hora dorada */
  --color-text-primary: #F0F4FC;
  --color-text-secondary: #97A8C8;
  --color-text-muted: #617394;
  --color-border: #223455;
  --color-border-subtle: #192740;
  --reader-bg: #0D1424;
  --reader-text: #E2E8F5;
}
```

### 14.2 Soporte de «Tema del Sistema»
Un listener sobre `window.matchMedia('(prefers-color-scheme: dark)')` actualiza reactivamente el tema activo si el usuario seleccionó la opción «Sistema»:
- Modo claro detectado -> aplica tokens de `lavender-light`.
- Modo oscuro detectado -> aplica tokens de `mystic-night`.

---

## 15. SISTEMA DE CONFIGURACIÓN

El `SettingsManager` gestiona dos niveles de preferencias:

```
CONFIGURACIÓN GLOBAL (Almacenada en localStorage / AppSettings Store)
├── Apariencia: Tema seleccionado (Nocturno Místico, Lavanda Claro, Crepúsculo Profundo, Sistema)
├── Biblioteca: Vista predeterminada (Grid vs. Lista), Criterio de orden (Reciente, Título, Autor)
└── Lector Global por Defecto: Valores base para libros nuevos

CONFIGURACIÓN POR LIBRO (Almacenada en IndexedDB: `readerSettings`)
├── Tipografía: Literata, Merriweather, Roboto, Inter, OpenDyslexic
├── Tamaño de fuente: 12px a 32px
├── Grosor de fuente: Normal, Medio, Negrita
├── Interlineado: 1.2 a 2.2
├── Espaciado entre párrafos y letras
├── Márgenes laterales: Compacto (12px), Normal (32px), Relajado (64px)
├── Columnas: 1 columna (por defecto en móvil/tablet) o 2 columnas (desktop amplio)
├── Modo de flujo: Paginado (Kindle horizontal) vs. Scroll continuo
└── Tema de lectura anulable (permite leer en Lavanda Claro un libro específico mientras la biblioteca está en Nocturno Místico)
```

---

## 16. ARQUITECTURA PWA (PROGRESSIVE WEB APP)

### 16.1 Manifiesto Web (`manifest.json`)
- `name`: "Biblioteca Arcadia"
- `short_name`: "Arcadia"
- `start_url`: "./index.html"
- `display`: "standalone"
- `background_color`: "#111111"
- `theme_color`: "#17113D"
- Iconos vectoriales y rasterizados (192x192, 512x512, máscara adaptativa `maskable`).

### 16.2 Estrategia de Service Worker (`sw.js`)
Para compatibilidad con **GitHub Pages** (donde el subdirectorio de despliegue puede ser `/BibliotecaArcadia/`), el Service Worker utiliza rutas relativas estrictas y dos estrategias de caché según el tipo de recurso:
1. **Cache-First (Recursos Estáticos del Shell):**
   - HTML base (`index.html`).
   - Hojas de estilo (`css/*.css`).
   - Módulos JavaScript (`js/**/*.js`).
   - Tipografías locales (`assets/fonts/*`) e iconos SVG.
   - Librería `epub.js` y dependencias fijas.
2. **Network-First con Fallback a Caché (Diccionario):** Si hay conexión busca la definición fresca; si falla o está offline, retorna la respuesta cacheada o delega en el estado sin conexión.
3. **No-Intercept para EPUBs:** Los archivos EPUB residen en IndexedDB, no en la caché del Service Worker, evitando saturar innecesariamente los límites de `CacheStorage`.

---

## 17. ESTRUCTURA DE CARPETAS DEL PROYECTO

La estructura de carpetas ha sido organizada por dominio y responsabilidad funcional:

```
BibliotecaArcadia/
├── index.html                  # Shell de la aplicación (SPA entrypoint)
├── manifest.json               # Configuración PWA
├── sw.js                       # Service Worker (Caché & Offline engine)
│
├── css/
│   ├── main.css                # Reset, utilidades y fuentes globales
│   ├── tokens.css              # Variables de diseño (espaciado, radios, tipografías)
│   ├── themes.css              # Definición de temas (Nocturno Místico, Lavanda, etc.)
│   ├── layout.css              # Estructura de la aplicación (Sidebar, Top Banner, Main Area)
│   ├── library.css             # Grid de libros, vistas de lista, tarjetas y badges
│   ├── reader.css              # Visor EPUB, barra contextual flotante y popovers
│   └── responsive.css          # Media queries específicas y navegación móvil
│
├── js/
│   ├── app.js                  # Punto de entrada principal y bootstrap
│   ├── db.js                   # DatabaseManager (Capa unificada IndexedDB)
│   ├── state.js                # AppState (Store reactivo Pub/Sub)
│   ├── router.js               # Enrutador cliente SPA basado en hash
│   │
│   ├── library/                # Dominio de Biblioteca
│   │   ├── BookManager.js      # CRUD de libros, estados de lectura y cuota
│   │   ├── LibraryView.js      # Renderizado de Grid/Lista, filtros y ordenación
│   │   └── StorageWidget.js    # Medidor dinámico de espacio en disco (Storage API)
│   │
│   ├── epub/                   # Capa de Procesamiento de Archivos EPUB
│   │   ├── EPUBParser.js       # Extracción de metadatos OPF, portadas e ID
│   │   └── EPUBValidator.js    # Validación de formato MIME y estructura ZIP/EPUB
│   │
│   ├── reader/                 # Dominio del Lector
│   │   ├── ReaderManager.js    # Orquestador del ciclo de vida de lectura (epub.js facade)
│   │   ├── ReaderView.js       # UI del visor, cabeceras, pie de página y controles
│   │   ├── ReaderSettings.js   # Gestión de ajustes de lectura por libro
│   │   └── LocationsManager.js # Generación, carga y cálculo de progreso CFI
│   │
│   ├── annotations/            # Dominio de Anotaciones y Marcadores
│   │   ├── AnnotationManager.js# Lógica de resaltados y subrayados (CFI)
│   │   ├── NoteManager.js      # CRUD de notas asociadas e independientes
│   │   ├── BookmarkManager.js  # Gestión de marcadores de posición rápida
│   │   └── AnnotationsView.js  # Vista unificada de notas, citas y marcadores
│   │
│   ├── vocabulary/             # Dominio de Vocabulario
│   │   ├── VocabularyManager.js# Almacenamiento y gestión de palabras aprendidas
│   │   ├── DictionaryService.js# Abstracción de API léxica y fallback offline
│   │   └── VocabularyView.js   # Vista de tarjetas de vocabulario personal
│   │
│   ├── collections/            # Dominio de Colecciones
│   │   ├── CollectionManager.js# Gestión de colecciones estándar e inteligentes
│   │   └── CollectionsView.js  # Vistas de colecciones y filtrado
│   │
│   ├── search/                 # Dominio de Búsqueda
│   │   ├── SearchManager.js    # Búsqueda global en biblioteca y full-text en EPUB
│   │   └── search.worker.js    # Web Worker para escaneo de texto en segundo plano
│   │
│   ├── quotes/                 # Servicio de Citas Literarias
│   │   └── QuotesService.js    # Colección de frases y selección aleatoria/rotativa
│   │
│   └── ui/                     # Utilidades y Componentes de Interfaz
│       ├── ThemeManager.js     # Conmutador dinámico de temas y detección de sistema
│       ├── FloatingMenu.js     # Menú contextual de selección de texto en el lector
│       ├── Toast.js            # Notificaciones emergentes accesibles
│       └── Modal.js            # Diálogos modales accesibles (ARIA)
│
├── assets/
│   ├── icons/                  # Iconografía SVG optimizada
│   │   ├── book.svg
│   │   ├── bookmark.svg
│   │   ├── search.svg
│   │   ├── settings.svg
│   │   ├── quote.svg
│   │   └── upload.svg
│   └── fonts/                  # Tipografías offline (Literata, OpenDyslexic)
└── docs/                       # Documentación técnica del proyecto
    └── FASE_0_ESPECIFICACION_TECNICA.md
```

---

## 18. COMPONENTES JAVASCRIPT Y RESPONSABILIDADES

```
+-------------------+      +-------------------+      +-------------------+
|    BookManager    |      |   ReaderManager   |      | AnnotationManager |
+-------------------+      +-------------------+      +-------------------+
| - importEpub()    |      | - openBook(id)    |      | - addHighlight()  |
| - deleteBook(id)  |      | - next() / prev() |      | - addUnderline()  |
| - updateBook()    |      | - goToCfi(cfi)    |      | - removeAnnot()   |
| - getBooks()      |      | - applyTheme()    |      | - loadForBook()   |
+-------------------+      +-------------------+      +-------------------+
          │                          │                          │
          └──────────────────────────┼──────────────────────────┘
                                     ▼
                          +---------------------+
                          |   DatabaseManager   |
                          +---------------------+
                          | - get(store, key)   |
                          | - put(store, data)  |
                          | - delete(store, key)|
                          | - queryIndex(...)   |
                          +---------------------+
```

1. **`DatabaseManager`:** Único módulo autorizado para comunicarse directamente con la API de `IndexedDB`. Provee métodos atómicos tipados basados en Promesas (`get`, `getAll`, `put`, `delete`, `getByIndex`).
2. **`AppState`:** Tienda central reactiva que notifica cambios a través de eventos personalizados del DOM o suscripciones `PubSub`.
3. **`BookManager`:** Coordina la carga de archivos, invoca al validador y parser, gestiona el borrado de libros y actualiza la cuota de disco disponible.
4. **`EPUBParser`:** Desempaqueta metadatos y portada usando `JSZip` / `epub.js` sin renderizar el libro completo.
5. **`ReaderManager`:** Fachada que controla el ciclo de vida de `epub.js`, maneja el redimensionamiento, sincroniza la posición actual con el store y aplica estilos al `iframe`.
6. **`ThemeManager`:** Cambia el atributo `data-theme` en el elemento raíz del DOM y sincroniza los estilos del lector si está abierto.
7. **`DictionaryService`:** Resuelve definiciones léxicas con soporte resiliente de fallas sin conexión y síntesis de voz (`SpeechSynthesis`).

---

## 19. FLUJO DE DATOS (DATA FLOW)

El flujo de información en la aplicación es estrictamente **unidireccional**:

```
[Acción del Usuario / UI Event]
           │
           ▼
[Manager de Dominio Correspondiente]  ──(Actualiza)──► [DatabaseManager -> IndexedDB]
           │
           ▼
[Notifica Cambio a AppState]
           │
           ▼
[AppState emite evento de estado actualizado]
           │
           ▼
[Vistas y Componentes suscritos re-renderizan su UI de forma reactiva]
```

---

## 20. FLUJO DE SUBIDA DE EPUB

```
[Usuario suelta archivo EPUB o hace clic en "Subir libro"]
                      │
                      ▼
            [EPUBValidator.validate()]
        ¿Extensión .epub y MIME válido?
           ├── NO ──► Notificación Toast: "Archivo inválido" -> Abortar
           └── SÍ
                      ▼
             [EPUBParser.parse()]
      - Desempaqueta metadatos OPF
      - Extrae título, autor, idioma, descripción
      - Extrae o genera portada WebP/JPEG
      - Genera UUIDv4 único
                      ▼
       [DatabaseManager.put('books', newBook)]
                      ▼
[AppState.dispatch('BOOK_ADDED', newBook)] ──► Re-renderiza LibraryView al instante
                      ▼
     [StorageWidget.updateStorageEstimate()]
```

---

## 21. FLUJO DE LECTURA

```
[Clic en "Continuar leyendo" o en tarjeta de libro]
                      │
                      ▼
     [Router navega a "#reader/:bookId"]
                      │
                      ▼
[ReaderView monta contenedor y llama a ReaderManager.openBook(bookId)]
                      │
                      ├─► Recupera 'fileBlob' desde 'books' en IndexedDB
                      ├─► Recupera 'readingProgress' (último CFI guardado)
                      └─► Recupera 'readerSettings' del libro
                      │
                      ▼
         [Inicializa ePub.Book(arrayBuffer)]
                      ▼
          [rendition = book.renderTo()]
                      ▼
       [Aplica ReaderSettings + Theme actual]
                      ▼
     [rendition.display(lastCfi || primerCapítulo)]
                      ▼
      [Carga y renderiza Anotaciones existentes]
                      ▼
[Al avanzar de página: guarda de forma asíncrona (debounce 500ms) el nuevo CFI en IndexedDB]
```

---

## 22. FLUJO DE ANOTACIÓN

```
[Usuario selecciona texto en el lector]
                      │
                      ▼
[Evento 'selected' de epub.js captura cfiRange y texto]
                      │
                      ▼
[FloatingMenu se posiciona junto a la selección con opciones:
 Resaltar (colores) | Subrayar | Nota | Marcador | Definir]
                      │
     ┌────────────────┴────────────────┐
     ▼                                 ▼
[Elige Resaltar / Subrayar]       [Elige Nota]
     │                                 │
     ▼                                 ▼
[Crea entidad Annotation]         [Abre mini-modal, usuario escribe]
     │                                 │
     ▼                                 ▼
[Guarda en store 'annotations']   [Guarda en store 'notes']
     │                                 │
     └────────────────┬────────────────┘
                      ▼
  [rendition.annotations.add(cfiRange, ...)]
                      ▼
[El texto queda permanentemente coloreado/subrayado en el lector]
```

---

## 23. FLUJO DE BÚSQUEDA

1. **Búsqueda en Biblioteca:**
   - Usuario ingresa texto en el input de la barra superior.
   - Con un retardo (*debounce* de 200 ms), `LibraryView` filtra el array de libros cargados en memoria sobre los campos `title` y `author`.
   - Se actualiza el DOM del grid con transiciones suaves.
2. **Búsqueda Intra-Libro:**
   - Usuario abre panel de búsqueda en el lector e ingresa término.
   - `SearchManager` lanza tarea al `search.worker.js` pasando el término y el índice de secciones del EPUB.
   - El Worker ejecuta regex de coincidencia y devuelve posiciones CFI y fragmentos contextuales.
   - La interfaz lista los resultados con indicadores numéricos y permite saltar al CFI seleccionado.

---

## 24. FLUJO DE VOCABULARIO

```
[Selección de palabra en lector -> "Definir palabra"]
                      │
                      ▼
  [DictionaryService.lookup(word)]
                      │
          ¿Hay conexión a Internet?
           ├── SÍ ──► Consulta API -> Retorna definición estructurada
           └── NO ──► Muestra mensaje offline informativo (sin inventar datos)
                      │
                      ▼
[Popover muestra: Palabra + Fonética + Botón de Audio (TTS) + Definición]
                      │
                      ▼
          [Botón: "Guardar palabra"]
                      │
                      ▼
[Guarda en store 'words' en IndexedDB con la cita contextual del libro]
                      ▼
    [Disponible permanentemente en la vista de Vocabulario]
```

---

## 25. RESPONSIVE DESIGN

La aplicación no se reduce simplemente de tamaño; reorganiza radicalmente su jerarquía según el dispositivo:

```
DESKTOP (> 1024px)
+-------------------------------------------------------------------------+
| [Sidebar Fijo 260px] | [Top Banner Literario]                           |
|                      | [Toolbar: Búsqueda | Filtro | Vista Grid/Lista]   |
|                      | [Grid de libros fluido: 4-6 columnas]            |
|                      | [Barra Lectura Actual anclada inferior]          |
+-------------------------------------------------------------------------+

TABLET (768px - 1024px)
+-------------------------------------------------------------------------+
| [Sidebar Colapsado] | [Top Banner Literario Compacto]                   |
| (Iconos 72px)       | [Grid de libros: 3-4 columnas]                    |
|                     | [Barra Lectura Actual flotante]                   |
+-------------------------------------------------------------------------+

MÓVIL (< 768px)
+-------------------------------------------------------------------------+
| [Top Bar: Logo + Hamburguesa + Botón Subir]                            |
| [Banner Cita colapsable]                                               |
| [Grid de libros: 2 columnas / Lista de 1 columna]                      |
| [Card Lectura Actual en formato compacto]                              |
|-------------------------------------------------------------------------|
| [BOTTOM NAVIGATION BAR FIJA]: [Biblioteca] [Lectura] [Notas] [Ajustes]  |
+-------------------------------------------------------------------------+
```

### Comportamiento del Lector en Móvil
- Ocultamiento automático de barras de herramientas al iniciar la lectura (modo inmersivo total).
- Un toque en el tercio central de la pantalla revela suavemente los controles superiores e inferiores.
- Toque en tercio izquierdo -> Página anterior; Toque en tercio derecho -> Página siguiente.
- Soporte para gestos táctiles de deslizamiento (*swipe left / swipe right*).
- Menú flotante de selección adaptado a la parte inferior de la pantalla para no ser tapado por los dedos ni el teclado virtual.

---

## 26. ACCESIBILIDAD (A11Y)

1. **Ratios de Contraste:** Todos los temas cumplen la norma **WCAG 2.1 Nivel AA** (ratio mínimo de 4.5:1 para texto normal y 3:1 para elementos de interfaz y texto grande). En el modo *Nocturno Místico*, el texto `#F2F0F7` sobre fondo `#111111` alcanza un ratio superior a 14:1.
2. **Navegación por Teclado:**
   - Atajos estándar en el lector: `Flecha Derecha` / `Espacio` (página siguiente), `Flecha Izquierda` (página anterior), `Esc` (cerrar lector / cerrar modales).
   - Indicadores de foco (`:focus-visible`) claramente delimitados con anillos de acento (`2px solid var(--color-primary-accent)`).
3. **Semántica HTML y ARIA:**
   - Botones sin texto explícito provistos de `aria-label` descriptivos (ej. `aria-label="Añadir a favoritos"`, `aria-label="Cerrar lector"`).
   - Regiones estructurales nativas (`<nav>`, `<main>`, `<aside>`, `<header>`).
   - Alertas dinámicas gestionadas con `role="status"` o `aria-live="polite"`.
4. **Soporte para Dislexia:** Inclusión de la fuente especializada `OpenDyslexic` entre las opciones tipográficas disponibles en el lector.

---

## 27. RENDIMIENTO

### 27.1 Manejo Eficiente de Libros EPUB Voluminosos
- **No Desempaquetar Todo el EPUB en Memoria:** `epub.js` procesa los libros fragmentando los archivos por secciones (`spine items`). Solo el capítulo visible y el inmediatamente contiguo se mantienen en el DOM.
- **Portadas Optimizadas:** Al importar el EPUB, la imagen de portada original se escala y comprime a WebP o JPEG de calidad controlada (ancho máximo 400px), reduciendo su tamaño de varios megabytes a menos de 50 KB para que el renderizado de la biblioteca permanezca a 60 FPS sin tirones de memoria.
- **Virtualización / Lazy Rendering en Biblioteca:** Carga diferida de portadas (`loading="lazy"` nativo) y reciclaje de nodos en caso de bibliotecas con más de 200 libros.

---

## 28. COMPATIBILIDAD ENTRE NAVEGADORES

| Característica | Chrome / Edge (Chromium) | Safari (macOS / iOS) | Firefox | Comportamiento / Solución de Compatibilidad |
| :--- | :--- | :--- | :--- | :--- |
| **IndexedDB Blob Storage** | Soporte completo nativo | Soporte completo nativo | Soporte completo nativo | En versiones antiguas de Safari se convertía a ArrayBuffer. En Safari moderno (iOS 14+) los Blobs se almacenan de forma totalmente nativa. |
| **Pantalla Completa (Fullscreen API)** | `element.requestFullscreen()` | Limitado en iPhone (solo iPad/Mac) | `element.requestFullscreen()` | En iPhone (iOS Safari), donde `requestFullscreen` no está habilitado en elementos arbitrarios, se aplica una clase CSS `.fullscreen-fallback` que oculta el scroll y expande la vista al 100vw/100vh usando viewport units seguras (`dvh`). |
| **PWA & Service Worker** | Instalación completa con prompt nativo | "Añadir a pantalla de inicio" manual | Instalación nativa en Android | Detección de plataforma para guiar al usuario de iOS mediante tooltip amigable ("Pulsa Compartir y Añadir a inicio"). |
| **SpeechSynthesis (TTS)** | Soporte completo offline | Soporte nativo de alta calidad | Soporte nativo | Si la voz en español no está instalada en el sistema, se degrada a la voz por defecto sin lanzar excepción. |

---

## 29. SEGURIDAD Y PRIVACIDAD

1. **Local-First & Privacidad Absoluta:**
   - Cero telemetría, cero analíticas invasivas y cero envío de archivos a la nube.
   - Los libros son propiedad exclusiva del usuario y nunca abandonan el almacenamiento del navegador.
2. **Sanitización contra XSS en EPUBs:**
   - Los archivos EPUB son esencialmente archivos ZIP con HTML/XHTML, los cuales podrían contener scripts maliciosos (`<script>` embebidos en el libro).
   - El renderizador de `epub.js` se configura estrictamente con `allowScriptedContent: false` y el `iframe` se ejecuta con directivas de sandbox para impedir acceso al `localStorage`, `IndexedDB` o cookies del dominio principal.
3. **Sin Fugas de Memoria en Objetos URL:**
   - Todo `URL.createObjectURL()` generado temporalmente para visualizar portadas o recursos se libera explícitamente mediante `URL.revokeObjectURL()` cuando el componente se desmonta.

---

## 30. RIESGOS TÉCNICOS Y SOLUCIONES PROPUESTAS

| # | Riesgo Técnico Identificado | Impacto | Solución Técnica Propuesta |
| :--- | :--- | :--- | :--- |
| 1 | **Evicción de Almacenamiento por el Navegador (Storage Eviction):** En situaciones de poco espacio en disco, navegadores móviles (especialmente Safari en iOS tras 7 días sin uso) pueden purgar datos de IndexedDB no marcados como persistentes. | Pérdida de la biblioteca del usuario. | Invocar de forma temprana la API de persistencia del navegador: `if (navigator.storage && navigator.storage.persist) { await navigator.storage.persist(); }`. Informar al usuario en el widget de almacenamiento el estado: "Almacenamiento Persistente: Activo". Proporcionar un botón de exportar copia de seguridad (backup JSON + EPUBs). |
| 2 | **Cálculo de Ubicaciones Lento en Libros Grandes:** Generar `locations` en libros de más de 800 páginas puede demorar más de 5 segundos y congelar la interfaz. | Experiencia de usuario deficiente al abrir un libro por primera vez. | Generar las ubicaciones en segundo plano mientras el usuario ya está leyendo el primer capítulo. Guardar el resultado en IndexedDB para que solo se calcule una única vez en la vida del libro. |
| 3 | **CORS en Descargas de Recursos Externos (Diccionario):** Intentar consultar APIs que bloqueen peticiones desde `localhost` o `github.io`. | Error en la obtención de definiciones. | Utilizar exclusivamente APIs públicas abiertas con cabeceras `Access-Control-Allow-Origin: *` verificadas (como Free Dictionary API) y manejar elegantemente cualquier fallo mediante un bloque `try/catch` que active la interfaz de aviso offline. |
| 4 | **Incompatibilidad de Fuentes en el iframe del Lector:** Fuentes personalizadas que no se aplican dentro del contenido del libro debido al aislamiento del iframe. | Los ajustes de fuente del lector no surtirían efecto. | Utilizar la API oficial `rendition.themes.font(fontName, fontUrl)` para registrar fuentes directamente en el documento interno del libro antes de renderizar. |

---

## 31. DECISIONES TÉCNICAS RECOMENDADAS

1. **Evitar Frameworks Reactivos Pesados:** Mantenerse en Vanilla JavaScript con ES Modules permite un bundle de carga instantáneo (< 100 KB de código propio), cero vulnerabilidades por dependencias obsoletas y despliegue directo en GitHub Pages sin pasos intermedios de compilación ni Docker.
2. **Uso de Blobs en IndexedDB:** Guardar el EPUB como un `Blob` nativo directamente en IndexedDB en lugar de cadenas codificadas en Base64 (las cuales incrementan el consumo de memoria y tamaño en disco en un 33%).
3. **Adopción Estricta de EPUB CFI:** Todas las posiciones relativas, anotaciones, marcadores y progreso deben expresarse y almacenarse en sintaxis Canonical Fragment Identifier de EPUB. Nunca guardar números de página fijos o coordenadas X/Y de píxeles, ya que estos varían con la resolución de pantalla.
4. **Sistema de Temas Centralizado por Atributo `data-theme`:** Gestionar los colores mediante variables semánticas en CSS permite cambiar el tema global o por componente con una sola línea de JavaScript (`document.documentElement.setAttribute('data-theme', themeName)`), con rendimiento de GPU a 60 FPS y cero repintado estructural.

---

## 32. ROADMAP DE DESARROLLO POR FASES

A continuación se define el desglose sistemático de las fases de desarrollo del proyecto:

```
[FASE 0] Arquitectura y Especificación Técnica (ACTUAL)
   │
   ▼
[FASE 1] Interfaz Base, Sistema Visual y Maquetación Responsiva
   │
   ▼
[FASE 2] Capa de Persistencia IndexedDB y Gestión de Libros EPUB
   │
   ▼
[FASE 3] Integración del Motor de Lectura EPUB (epub.js)
   │
   ▼
[FASE 4] Personalización Avanzada y Ajustes del Lector
   │
   ▼
[FASE 5] Motor de Selección, Resaltados, Subrayados y Notas
   │
   ▼
[FASE 6] Sistema de Marcadores y Búsqueda Intra-Libro
   │
   ▼
[FASE 7] Sistema de Colecciones y Biblioteca Inteligente
   │
   ▼
[FASE 8] Sistema de Vocabulario Personal y Fonética
   │
   ▼
[FASE 9] PWA, Service Worker y Funcionamiento Offline
   │
   ▼
[FASE 10] Pruebas Integrales, Optimización y Publicación en GitHub Pages
```

### Detalle de Fases:

#### FASE 1: Interfaz Base, Sistema Visual y Maquetación Responsiva
- **Objetivo:** Construir el esqueleto visual completo de la aplicación (Shell SPA), sidebar, top banner de citas con botón interactivo, barra de herramientas, grid/lista de libros con datos simulados y panel inferior de lectura actual. Implementar el motor de temas CSS (Nocturno Místico, Lavanda Claro, Crepúsculo Profundo, Sistema).
- **Archivos a crear/modificar:** `index.html`, `css/tokens.css`, `css/themes.css`, `css/layout.css`, `css/library.css`, `css/responsive.css`, `js/app.js`, `js/state.js`, `js/ui/ThemeManager.js`, `js/quotes/QuotesService.js`.
- **Dependencias:** Ninguna (Vanilla HTML/CSS/JS).
- **Criterios de Aceptación:**
  - Sidebar interactivo con navegación funcional y badges contadores.
  - Conmutación fluida e instantánea entre los 4 temas visuales.
  - Banner de citas literarias que cambia dinámicamente al pulsar "Nueva frase".
  - Grid de libros responsivo que se adapta limpiamente desde monitores 4K hasta pantallas de 360px.
  - Menú drawer y navegación inferior para dispositivos móviles.

#### FASE 2: Capa de Persistencia IndexedDB y Gestión de Libros EPUB
- **Objetivo:** Implementar la base de datos `DatabaseManager` con todos sus object stores. Habilitar la subida y validación de archivos EPUB reales, extracción de metadatos (título, autor, portada) y almacenamiento persistente en el dispositivo.
- **Archivos a crear/modificar:** `js/db.js`, `js/epub/EPUBValidator.js`, `js/epub/EPUBParser.js`, `js/library/BookManager.js`, `js/library/LibraryView.js`, `js/library/StorageWidget.js`.
- **Dependencias:** `jszip` (o parser liviano para descompresión de metadatos OPF).
- **Criterios de Aceptación:**
  - El usuario puede arrastrar o seleccionar un archivo `.epub`.
  - Se valida el formato y se extraen título, autor y portada original.
  - El libro se guarda en IndexedDB y aparece de inmediato en la biblioteca.
  - El widget de almacenamiento refleja en tiempo real los megabytes consumidos.
  - Se permite editar título/autor o eliminar el libro con limpieza en base de datos.

#### FASE 3: Integración del Motor de Lectura EPUB (epub.js)
- **Objetivo:** Integrar `epub.js` en una vista dedicada (`ReaderView`). Cargar libros directamente desde los Blobs de IndexedDB, navegación fluida de páginas y capítulos, tabla de contenidos y guardado automático de la última posición de lectura (CFI).
- **Archivos a crear/modificar:** `js/reader/ReaderManager.js`, `js/reader/ReaderView.js`, `js/reader/LocationsManager.js`, `css/reader.css`.
- **Dependencias:** `epub.js`.
- **Criterios de Aceptación:**
  - Al pulsar "Abrir" o "Continuar leyendo", se abre el visor en pantalla completa.
  - Navegación precisa con botones en pantalla, gestos y teclas de flechas.
  - Al cerrar y volver a abrir el libro, se restaura exactamente en el último párrafo leído.
  - Cálculo de porcentaje de lectura actualizado en tiempo real.

#### FASE 4: Personalización Avanzada y Ajustes del Lector
- **Objetivo:** Panel de configuración dentro del lector que permite alterar fuente, tamaño, grosor, interlineado, márgenes, número de columnas (1 o 2) y modo de flujo (paginado vs. scroll continuo), persistiendo los cambios individualmente por libro.
- **Archivos a crear/modificar:** `js/reader/ReaderSettings.js`, `css/reader.css`.
- **Criterios de Aceptación:**
  - Cambiar ajustes en un libro no afecta a otros libros si tienen configuración específica.
  - Los temas visuales se reflejan con fidelidad dentro del `iframe` del libro.

#### FASE 5: Motor de Selección, Resaltados, Subrayados y Notas
- **Objetivo:** Interceptar selecciones de texto en el EPUB, desplegar barra contextual flotante y permitir crear resaltados multicolor, subrayados y notas vinculadas que persistan sobre el texto mediante CFIs.
- **Archivos a crear/modificar:** `js/ui/FloatingMenu.js`, `js/annotations/AnnotationManager.js`, `js/annotations/NoteManager.js`, `js/annotations/AnnotationsView.js`.
- **Criterios de Aceptación:**
  - Los resaltados sobreviven a cambios de tamaño de fuente o ventana.
  - Sección "Notas y subrayados" que lista todas las anotaciones y permite saltar directamente a la posición exacta en el libro.

#### FASE 6: Sistema de Marcadores y Búsqueda Intra-Libro
- **Objetivo:** Añadir marcadores rápidos con un clic en la cabecera del lector. Implementar búsqueda de palabras/frases dentro del texto del libro con navegación de resultados.
- **Archivos a crear/modificar:** `js/annotations/BookmarkManager.js`, `js/search/SearchManager.js`, `js/search/search.worker.js`.
- **Criterios de Aceptación:**
  - Marcadores listados en la tabla de contenidos con salto inmediato.
  - Búsqueda veloz que resalta resultados y muestra contador ("3 de 17").

#### FASE 7: Sistema de Colecciones y Biblioteca Inteligente
- **Objetivo:** Organización por colecciones fijas e inteligentes (*Por leer*, *En lectura*, *Completados*, *Favoritos*, *Abandonados*) y soporte para crear colecciones personalizadas por el usuario.
- **Archivos a crear/modificar:** `js/collections/CollectionManager.js`, `js/collections/CollectionsView.js`.
- **Criterios de Aceptación:**
  - Los libros cambian automáticamente de colección según su porcentaje de progreso.
  - Creación, edición y eliminación fluida de carpetas personalizadas.

#### FASE 8: Sistema de Vocabulario Personal y Fonética
- **Objetivo:** Búsqueda léxica al seleccionar palabras, pronunciación mediante síntesis de voz (`SpeechSynthesis`), guardado en vocabulario personal y manejo resiliente sin conexión.
- **Archivos a crear/modificar:** `js/vocabulary/VocabularyManager.js`, `js/vocabulary/DictionaryService.js`, `js/vocabulary/VocabularyView.js`.
- **Criterios de Aceptación:**
  - Muestra definición y fonética cuando hay internet.
  - Muestra estado informativo limpio si está offline.
  - Reproduce pronunciación audible clara sin requerir conexión externa.

#### FASE 9: PWA, Service Worker y Funcionamiento Offline
- **Objetivo:** Registro de Service Worker con pre-caché de recursos estáticos, manifiesto de instalación PWA e icono de pantalla de inicio.
- **Archivos a crear/modificar:** `manifest.json`, `sw.js`, registro en `js/app.js`.
- **Criterios de Aceptación:**
  - La aplicación es 100% instalable en Chrome/Android/iOS/Desktop.
  - Funciona con el modo avión activado, permitiendo leer todos los libros previamente cargados.

#### FASE 10: Pruebas Integrales, Optimización y Publicación en GitHub Pages
- **Objetivo:** Auditoría Lighthouse (rendimiento, accesibilidad, PWA), optimización de assets, verificación de compatibilidad entre navegadores y preparación para despliegue estático en GitHub Pages.
- **Archivos a crear/modificar:** `README.md`, ajustes finales de rutas relativas.
- **Criterios de Aceptación:**
  - Puntuación > 95 en Lighthouse en Accesibilidad, Mejores Prácticas y PWA.
  - Despliegue funcional en repositorio GitHub sin errores 404 de rutas relativas.

---

## 33. QUÉ DEBE HACERSE EN LA FASE 1

En la inmediata **FASE 1 (Interfaz y Sistema Visual)** se implementará la capa visual y estructural de la aplicación, dejando el cascarón frontend interactivo listo para conectar los datos en la Fase 2:

1. **Maquetación Estructural Completa (Shell SPA):**
   - Creación de `index.html` con estructura semántica: `<aside id="app-sidebar">`, `<header id="app-header">`, `<main id="app-view">`, `<nav id="mobile-nav">` y contenedor de lectura actual.
2. **Motor de Tokens y Temas CSS:**
   - Creación de `css/tokens.css` y `css/themes.css`.
   - Implementación exhaustiva de las 4 paletas de color con variables CSS: **Nocturno Místico** (por defecto), **Lavanda Claro**, **Crepúsculo Profundo** y **Tema del Sistema**.
   - Conmutación dinámica de temas mediante la clase `ThemeManager.js` con persistencia en `localStorage`.
3. **Sidebar Lateral y Navegación Responsive:**
   - Encabezado con logotipo "Biblioteca Arcadia" y subtítulo "App de lectura".
   - Botones de navegación con badges contadores: *Biblioteca*, *Lectura actual*, *Favoritos*, *Notas y subrayados*, *Vocabulario*, *Ajustes*.
   - Sección de colecciones del sistema (*Por leer*, *En lectura*, *Completados*).
   - Widget de almacenamiento local con barra visual de progreso simulada.
   - En pantallas móviles: Menú hamburguesa lateral (drawer deslizante) y barra de navegación inferior fija (Bottom Nav).
4. **Banner Literario Superior:**
   - Card estilizada con gradiente oscuro místico para citas de autores célebres.
   - Implementación de `QuotesService.js` con una colección inicial de frases literarias y botón interactivo "Nueva frase" que rota citas con transiciones suaves.
5. **Barra de Herramientas y Vistas de Biblioteca:**
   - Input de búsqueda con icono de lupa, selector de orden ("Más reciente", "Título A-Z", etc.) y botón conmutador de vista segmentado `[ Grid ]` y `[ Lista ]`.
   - Botón primario de acción destacada: `+ Subir libro (EPUB)` (preparado con input file oculto).
6. **Lienzo de Tarjetas de Libros (Mock Data):**
   - Tarjetas de libros con portadas proporcionales, títulos, autores y barras de progreso visual en modo Grid y modo Lista para validar la ergonomía visual antes de la integración con IndexedDB.
7. **Card Flotante/Anclada de Lectura Actual:**
   - Barra con portada del libro en curso, título, autor, indicador "67% leído" y botón interactivo "Continuar leyendo".

---
*Fin de la Especificación Técnica de la Fase 0.*
