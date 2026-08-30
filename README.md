# ✦ Biblioteca Arcadia

> **Biblioteca virtual personal y lector de libros electrónicos EPUB local-first, inspirado en la experiencia de lectura inmersiva de Kindle.**

![Licencia](https://img.shields.io/badge/licencia-MIT-blue.svg)
![PWA](https://img.shields.io/badge/PWA-Ready-10B981.svg)
![Vanilla JS](https://img.shields.io/badge/Vanilla-ES%20Modules-F59E0B.svg)
![IndexedDB](https://img.shields.io/badge/Storage-IndexedDB-6366F1.svg)
![GitHub Pages](https://img.shields.io/badge/Deploy-GitHub%20Pages-22C55E.svg)

---

## 📖 Descripción General

**Biblioteca Arcadia** es una aplicación web progresiva (PWA) de alto rendimiento diseñada para lectores apasionados. Permite gestionar una colección digital de libros EPUB, leerlos en una interfaz elegante y libre de distracciones con tipografía personalizable, marcar pasajes favoritos, tomar notas al margen, consultar definiciones léxicas con pronunciación por voz y organizar libros en estanterías temáticas.

### 🛡️ Principio de Privacidad Local-First
- **Tus libros son solo tuyos:** Los archivos `.epub` se almacenan directamente en el navegador del usuario utilizando **IndexedDB** (`ArcadiaEpubDB`).
- **Cero servidores intermedios:** Ningún libro, nota o dato personal se sube a la nube ni a servidores externos.
- **GitHub Pages:** Solo aloja y distribuye el código estático de la aplicación web.

---

## ✨ Características Principales

### 1. 📚 Gestión de Biblioteca y Catálogo Inteligente
- **Importación sencilla:** Arrastra y suelta (*Drag & Drop*) archivos `.epub` directamente en la ventana o usa el botón de subida.
- **Libro de muestra incluido:** Libro inicial (*«El Renacer de Arcadia»*) preinstalado automáticamente.
- **Metadatos y portadas:** Extracción automática de portada, título, autor, descripción y fecha desde el paquete OPF del EPUB.
- **Monitor de almacenamiento:** Widget en tiempo real que calcula el espacio ocupado y disponible mediante la API `navigator.storage.estimate()`.
- **Organización ágil:** Conmutador de vista en **Cuadrícula (Grid)** o **Lista compacta**, filtros por estado (*Todos, Favoritos, Por leer, En lectura, Completados*) y buscador instantáneo.

### 2. 📖 Motor de Lectura EPUB Avanzado (epub.js)
- **Renderizado limpio y fluido:** Basado en `epub.js` con paginación precisa y soporte para una o dos columnas (`spread: always`).
- **Navegación intuitiva:** Botones laterales, barra de progreso interactiva con porcentaje clicable y cajón lateral (*Drawer*) con la Tabla de Contenidos (TOC).
- **Atajos de teclado:** `Flecha Derecha / AvPág` (siguiente), `Flecha Izquierda / RePág` (anterior), `Escape` (cerrar paneles/volver).
- **Gestos táctiles:** Soporte para deslizamiento lateral (*swipe*) y toque en el centro para alternar el modo inmersivo sin distracciones.

### 3. 🎨 Tipografía y Ajustes Personalizados
- **Fuentes literarias optimizadas:** Literata, Merriweather, Roboto, Inter y OpenDyslexic (para accesibilidad en dislexia).
- **Control granular:** Tamaño de letra (12px a 36px), peso tipográfico (Normal / Medio / Negrita), interlineado (1.2, 1.4, 1.6, 1.8) y márgenes (estrecho, normal, amplio).
- **Persistencia por libro:** Cada ejemplar recuerda su propia configuración y su posición exacta mediante identificadores canónicos de fragmento (**CFI**).
- **Sistema de 4 temas cromáticos:**
  - *Nocturno Místico* (por defecto, oscuro y profundo)
  - *Lavanda Claro* (luminoso y suave)
  - *Crepúsculo Profundo* (tonos azulados nocturnos)
  - *Tema del Sistema* (sincronizado con las preferencias del SO)

### 4. ✍️ Motor de Selección, Resaltados, Subrayados y Notas
- **Barra flotante contextual:** Se despliega automáticamente al seleccionar texto en las páginas.
- **6 colores de resaltado:** Púrpura, Amarillo, Verde, Azul, Rosa y Naranja con modo de mezcla `multiply` para preservar la legibilidad.
- **Subrayado estilizado y notas vinculadas:** Posibilidad de adjuntar reflexiones a citas del texto.
- **Catálogo centralizado de notas:** Vista dedicada accesible desde el menú lateral con filtros por libro y tipo, búsqueda en vivo y salto instantáneo a la posición de la cita en el libro.

### 5. 🔖 Marcadores y Búsqueda Intra-Libro
- **Marcador con un clic:** Botón de cinta en la cabecera del lector que detecta automáticamente si la página actual está marcada.
- **Doble pestaña en el Drawer:** Alterna entre *Capítulos* y *Marcadores* guardados con porcentaje de lectura y fecha.
- **Búsqueda de texto completo:** Escaneo rápido del *spine* del EPUB con extracción de fragmentos (*snippets*) contextuales, resaltado de coincidencias y navegación inmediata al pasaje encontrado.

### 6. 🗂️ Colecciones Personalizadas y Estanterías
- **Colecciones dinámicas:** Creación de estanterías con nombres, descripciones y paleta cromática distintiva.
- **Asignación N:M:** Asocia fácilmente cualquier libro a múltiples colecciones mediante selectores visuales (*checkboxes*).
- **Integración en el Sidebar:** Lista reactiva con badges numéricos, acceso directo y opciones de edición.

### 7. 🗣️ Cuaderno de Vocabulario y Pronunciación Fonética
- **Acción «Definir»:** Consulta inmediata de palabras seleccionadas en el lector.
- **Diccionario híbrido:** Diccionario offline integrado con fallback continuo a API externa.
- **Síntesis de voz fonética:** Escucha la pronunciación correcta en español mediante la Web Speech API nativa (`window.speechSynthesis`).
- **Vista de Flashcards:** Tarjetas léxicas para repasar términos descubiertos, alternar estado *Dominada / Por aprender* y enriquecer el léxico.

### 8. 📱 Progressive Web App (PWA) y Modo Offline
- **Instalable:** Añade Biblioteca Arcadia como aplicación nativa en Windows, macOS, Linux, Android e iOS.
- **Service Worker (`sw.js`):** Estrategia Cache-First para el App Shell que permite cargar la app sin conexión a internet.
- **Detector de red:** Notificaciones informativas al pasar a modo offline o reconectar.

---

## 🏗️ Arquitectura Técnica

```
BibliotecaArcadia/
├── index.html                  # Estructura semántica principal y vistas SPA
├── manifest.json               # Web App Manifest para PWA
├── sw.js                       # Service Worker con caché offline (Cache-First)
├── css/
│   ├── tokens.css              # Variables de diseño (colores, fuentes, sombras)
│   ├── themes.css              # 4 temas visuales (Nocturno, Lavanda, etc.)
│   ├── main.css                # Estilos globales y reset moderno
│   ├── layout.css              # Sidebar, topbars y grillas responsivas
│   ├── library.css             # Tarjetas de libros, storage widget y banners
│   ├── reader.css              # Visor EPUB, floating menu, cajón TOC y búsqueda
│   └── responsive.css          # Media queries para móviles, tablets y escritorio
├── js/
│   ├── app.js                  # Punto de entrada y orquestador de componentes
│   ├── db.js                   # DatabaseManager con 11 object stores en IndexedDB
│   ├── state.js                # Gestor de estado reactivo observable (Pub/Sub)
│   ├── epub/
│   │   ├── EPUBParser.js       # Extractor de metadatos OPF y portadas
│   │   └── EPUBValidator.js    # Validador de estructura de paquetes EPUB
│   ├── library/
│   │   ├── BookManager.js      # CRUD de libros en IndexedDB
│   │   ├── CollectionManager.js# Gestión de colecciones y relaciones N:M
│   │   ├── LibraryView.js      # Renderizador del catálogo (Grid/Lista) y filtros
│   │   ├── mockBooks.js        # Libros iniciales y generadores de portada
│   │   └── StorageWidget.js    # Monitor de espacio local
│   ├── reader/
│   │   ├── LocationsManager.js # Generación y mapeo de ubicaciones CFI
│   │   ├── ReaderManager.js    # Integración central con epub.js
│   │   ├── ReaderSettings.js   # Configuraciones de lectura por libro
│   │   ├── ReaderView.js       # UI del visor, atajos, pantalla completa y drawer
│   │   ├── BookmarkManager.js  # CRUD de marcadores de página
│   │   └── SearchManager.js    # Buscador de texto completo intra-libro
│   ├── annotations/
│   │   ├── AnnotationManager.js# Gestor de resaltados y subrayados CFI
│   │   ├── NoteManager.js      # Gestor de notas de lectura
│   │   └── AnnotationsView.js  # Vista centralizada de citas y notas
│   ├── vocabulary/
│   │   ├── VocabularyManager.js# Diccionario y síntesis de voz Web Speech
│   │   └── VocabularyView.js   # Vista de flashcards léxicas
│   ├── ui/
│   │   ├── ThemeManager.js     # Selector y persistencia de temas visuales
│   │   ├── Toast.js            # Sistema de notificaciones emergentes
│   │   ├── FloatingMenu.js     # Barra de acciones contextual sobre selecciones
│   │   └── CollectionModal.js  # Modales para colecciones
│   └── pwa/
│       └── PWAManager.js       # Ciclo de vida PWA, offline y prompt install
└── assets/
    ├── icons/                  # Iconos SVG y PNG (192px, 512px, maskable)
    ├── libs/                   # epub.min.js y jszip.min.js empaquetados
    └── sample/                 # Libro EPUB de muestra local
```

---

## ⌨️ Atajos de Teclado en el Lector

| Tecla | Acción |
| :--- | :--- |
| `→` o `AvPág` | Pasar a la página siguiente |
| `←` o `RePág` | Volver a la página anterior |
| `Esc` | Cerrar panel de ajustes, drawer lateral o volver a la biblioteca |
| `F` o Icono en cabecera | Alternar modo pantalla completa |

---

## 🚀 Despliegue en GitHub Pages

Para publicar tu propia instancia de **Biblioteca Arcadia** en GitHub Pages:

1. **Sube los cambios a tu repositorio en GitHub:**
   ```bash
   git add .
   git commit -m "feat: Biblioteca Arcadia v1.0 completa"
   git push origin main
   ```
2. **Activa GitHub Pages:**
   - Ve a la pestaña **Settings** (Configuración) de tu repositorio en GitHub.
   - En la barra lateral izquierda, selecciona **Pages**.
   - En la sección **Build and deployment**:
     - **Source:** `Deploy from a branch`
     - **Branch:** `main` / `(root)`
   - Haz clic en **Save** (Guardar).
3. **¡Listo!** En unos minutos, tu biblioteca estará disponible en:
   `https://<tu-usuario>.github.io/<tu-repositorio>/`

---

## 💻 Ejecución Local

Para probar o desarrollar localmente:

1. Clona el repositorio:
   ```bash
   git clone https://github.com/Karla-Polanco/BibliotecaArcadia.git
   cd BibliotecaArcadia
   ```
2. Inicia cualquier servidor web estático (requerido por las políticas CORS de ES Modules y Service Worker):
   ```bash
   # Con Python 3:
   python -m http.server 8000
   ```
3. Abre tu navegador en `http://localhost:8000/index.html`.

---

## 📄 Licencia

Este proyecto se distribuye bajo la Licencia MIT. Consulta el archivo `LICENSE` para más detalles.