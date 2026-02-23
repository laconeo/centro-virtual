# Centro Virtual FamilySearch — Extensión Chrome

## Instalación

### 1. Configurar credenciales de Supabase

Abre `popup.js` y reemplaza las dos primeras líneas con tus credenciales reales:

```js
const SUPABASE_URL = 'https://TU_PROYECTO.supabase.co';
const SUPABASE_ANON_KEY = 'eyJ...tu_anon_key...';
```

Estas son las mismas que usas en el `.env` de la app principal:
- `VITE_SUPABASE_URL` → `SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` → `SUPABASE_ANON_KEY`

---

### 2. Copiar el ícono

Copia `public/LogoFS.png` de la app principal a la carpeta `icons/` con dos tamaños:

```
chrome-extension/
  icons/
    icon32.png   ← copia de LogoFS.png (se muestra en la barra de Chrome)
    icon64.png   ← copia de LogoFS.png (alta resolución)
```

> Puedes usar el mismo archivo para ambos o redimensionarlo con cualquier editor.

---

### 3. Cargar en Chrome

1. Abre Chrome → `chrome://extensions/`
2. Activa **"Modo de desarrollador"** (esquina superior derecha)
3. Haz clic en **"Cargar extensión sin empaquetar"**
4. Selecciona esta carpeta: `chrome-extension/`
5. ¡Listo! El ícono de FamilySearch aparecerá en la barra de Chrome.

---

## Funcionalidades

| Botón | Acción |
|-------|--------|
| 📅 Planificar Actividad | Abre `familysearch.me/DD` en una nueva pestaña |
| 💬 Chatear con un Voluntario | Abre el formulario de sala de espera |

### Flujo de chat
1. El usuario llena nombre, apellido, país y tema
2. Se crea una sesión tipo `chat` en Supabase con estado `esperando`
3. El popup muestra la sala de espera con spinner
4. Cuando un voluntario acepta desde el dashboard, el estado cambia a `en_atencion`
5. El popup detecta el cambio (polling cada 3s) y muestra el chat
6. El usuario puede chatear mientras navega normalmente por FamilySearch
7. La sesión se persiste: si cierras el popup y lo vuelves a abrir, retoma donde quedó

---

## Estructura de archivos

```
chrome-extension/
├── manifest.json      ← Config de la extensión (Manifest v3)
├── popup.html         ← UI de las 4 vistas
├── popup.css          ← Estilos con paleta FamilySearch
├── popup.js           ← Lógica y comunicación con Supabase
├── icons/
│   ├── icon32.png     ← Ícono 32px (barra de extensiones)
│   └── icon64.png     ← Ícono 64px (gestión de extensiones)
└── README.md
```
