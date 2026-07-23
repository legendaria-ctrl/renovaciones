## Renovaciones

Plataforma para que vendedores, coordinadores y administradores gestionen la
renovación de membresías del Club Sinergético (anual) y el Club Sinergético
Live (3/6/12 meses), a partir de los leads importados desde un Google Sheet.

### Stack

- Next.js (App Router) + Tailwind v4
- Firebase Auth (email/contraseña, desde el frontend) + Firestore
- Sin listeners en tiempo real salvo el propio perfil de sesión: todo lo
  demás se carga bajo demanda para minimizar lecturas en el plan gratuito.

### Puesta en marcha

1. Crea un proyecto en [Firebase Console](https://console.firebase.google.com/).
2. Habilita **Authentication → Email/contraseña**.
3. Crea una base de **Firestore** (modo producción).
4. Copia `.env.example` a `.env.local` y llena las variables `NEXT_PUBLIC_FIREBASE_*`
   con los datos de "Configuración del proyecto → Tus apps → SDK setup".
5. Llena `SHEET_ID` (el ID en la URL del Google Sheet) y `SHEET_GID` (la pestaña,
   `0` si es la primera). El sheet debe estar compartido como
   **"Cualquiera con el enlace puede ver"**.
6. Despliega las reglas de seguridad (`firestore.rules`) desde Firebase Console
   o con `firebase deploy --only firestore:rules` (requiere Firebase CLI).
7. **Primer usuario administrador** (huevo y gallina: no hay nadie que pueda
   crear al primer admin desde la app):
   - Crea el usuario a mano en Authentication → Users.
   - En Firestore, crea el documento `usuarios/{uid}` (el mismo uid del usuario
     de Auth) con:
     ```json
     { "nombre": "Tu nombre", "correo": "tu@correo.com", "rol": "ADMIN", "activo": true }
     ```
   - Desde ahí, ese admin ya puede crear al resto del equipo desde `/vendedores`.
8. `npm install && npm run dev`.

### Importación de leads

Desde `/importar` (solo Admin), el botón "Actualizar leads nuevos" lee el
sheet vía `/api/sheet-csv`, compara el último `#` importado contra el último
del sheet y solo escribe las filas nuevas. El estado de cada membresía
(activa/vencida) se calcula siempre a partir de la fecha de inscripción —
nunca se confía en columnas de vencimiento del sheet origen, ya que se
detectaron filas con esos valores corruptos.

### Deploy

Conecta este repo en Vercel y agrega las mismas variables de entorno de
`.env.example` en Project Settings → Environment Variables.
