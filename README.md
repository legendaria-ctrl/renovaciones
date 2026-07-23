## Renovaciones

Plataforma para que vendedores, coordinadores y administradores gestionen la
renovación de membresías del Club Sinergético (anual) y el Club Sinergético
Live (3/6/12 meses), a partir de los leads importados desde un Google Sheet.

### Stack

- Next.js (App Router) + Tailwind v4
- Firestore (solo base de datos, sin Firebase Auth)
- Sesión propia: login con nombre + una clave de acceso compartida por rol
  (Vendedor / Coordinador / Admin), como el CRM hermano. La sesión es una
  cookie JWT firmada en el servidor (`/api/session`); el control de acceso
  vive ahí y en qué muestra la UI según el rol, no en reglas de Firestore
  (`firestore.rules` queda abierto a propósito — ver el comentario en ese
  archivo).
- Sin listeners en tiempo real salvo el propio perfil de sesión: todo lo
  demás se carga bajo demanda para minimizar lecturas en el plan gratuito.

### Puesta en marcha

1. Crea un proyecto en [Firebase Console](https://console.firebase.google.com/).
2. Crea una base de **Firestore** (puede quedar en modo prueba: no se usa
   Firebase Auth, así que las reglas por usuario no aplican aquí).
3. Copia `.env.example` a `.env.local` y llena las variables `NEXT_PUBLIC_FIREBASE_*`
   con los datos de "Configuración del proyecto → Tus apps → SDK setup".
4. Llena `SHEET_ID` (el ID en la URL del Google Sheet) y `SHEET_API_KEY`: en
   [Google Cloud Console](https://console.cloud.google.com/) crea/usa un
   proyecto, habilita **Google Sheets API** (APIs y servicios → Biblioteca) y
   crea una **Clave de API** (Credenciales → Crear credenciales), restringida
   a esa API. El sheet debe estar compartido como
   **"Cualquiera con el enlace puede ver"**.
5. Define `SESSION_SECRET` (cualquier cadena larga aleatoria) y las 3 claves
   de acceso compartidas: `ADMIN_PASSCODE`, `COORDINADOR_PASSCODE`,
   `VENDEDOR_PASSCODE`. Si no las defines, se usan valores por defecto
   escritos en `src/app/api/session/route.ts` (solo para pruebas).
6. **Primer usuario administrador**: no hace falta crear nada a mano. La
   primera persona que inicie sesión eligiendo el perfil "Administrador"
   (con su nombre + `ADMIN_PASSCODE`) queda aprobada automáticamente, para
   que la plataforma nunca se quede sin nadie que apruebe al resto. Desde
   ahí, ese admin aprueba o da de alta directamente al resto del equipo
   desde `/vendedores`.
7. `npm install && npm run dev`.

### Importación de leads

Desde `/importar` (solo Admin), el botón "Actualizar leads nuevos" lee el
sheet vía `/api/sheet-values` (API real de Google Sheets, no el CSV
exportado — más robusto, igual que el CRM hermano que lee este mismo sheet).
El checkpoint de "hasta dónde ya se importó" es la **cantidad de filas de
datos procesadas**, no el valor de la columna `#` del sheet: esa columna
puede venir vacía o corrupta en algunas filas, así que nunca se usa como
referencia. El estado de cada membresía (activa/vencida) se calcula siempre
a partir de la fecha de inscripción — nunca se confía en columnas de
vencimiento del sheet origen, ya que se detectaron filas con esos valores
corruptos.

Firestore tiene una cuota gratuita de 20,000 escrituras/día (plan Spark). Si
la carga inicial masiva la excede, el botón avisa y guarda el progreso —
solo hay que volver a presionarlo al día siguiente para traer el resto.

### Deploy

Conecta este repo en Vercel y agrega las mismas variables de entorno de
`.env.example` en Project Settings → Environment Variables.
