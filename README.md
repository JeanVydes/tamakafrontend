# TAMAKA — Frontend web

SPA en React 18 + Vite 5 + TypeScript, conectada a los microservicios del repositorio `tamakabackend` a través del gateway nginx.
El diseño parte del mockup de Figma Make «tamaka ui/ux» (paleta océano/coral sobre papel, Manrope + DM Sans)
y de los wireframes del proyecto, con cambios donde el backend real lo exigía.

## Arrancar

Requisitos: Node 20+ y el backend levantado (repositorio `tamakabackend`, carpeta `infra`; gateway en `http://localhost`).

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```

Vite reenvía `/api` al gateway (`TAMAKA_GATEWAY`, por defecto `http://127.0.0.1`), así el navegador ve un solo
origen y no hace falta CORS. Para producción: `npm run build` y servir `dist/` detrás del mismo nginx, con
`try_files $uri /index.html;` para las rutas de la SPA.

## Datos de demostración

```bash
node scripts/seed-demo.mjs
# con un pago aprobado por webhook firmado:
PAGOS_WEBHOOK_SECRET=$(grep '^PAGOS_WEBHOOK_SECRET=' <ruta-a-tamakabackend>/infra/.env | cut -d= -f2-) node scripts/seed-demo.mjs
```

Crea atractivos con estados y alertas, eventos, un comercio con servicios y reservas en varios estados. Los roles
GESTOR y ADMIN se insertan en la base local con `docker exec infra-postgres-1 psql` (no hay API para el primer
admin). Contraseña de todas las cuentas de prueba: `Tamaka2026!`

| Cuenta | Roles |
|---|---|
| `viajero@tamaka.test` | Turista |
| `operador@tamaka.test` | Turista + Operador |
| `gestor@tamaka.test` | Turista + Gestor turístico |
| `admin@tamaka.test` | Turista + Administrador + Gestor |

## Pantallas

| Ruta | Rol | Wireframe |
|---|---|---|
| `/` | público | Fig. 1 Inicio |
| `/explorar?tab=atractivos\|comercios\|eventos` | público | Fig. 2 Explorar y filtrar |
| `/atractivos/:id`, `/comercios/:id`, `/eventos/:id` | público (reservar: Turista) | Fig. 3 Detalle |
| `/ingresar`, `/registro` | público | — |
| `/perfil` | autenticado | Fig. 4 Mi cuenta, Fig. 5 Habilitar operador |
| `/reservas` | Turista | Fig. 10 Mis reservas |
| `/favoritos` | Turista | Fig. 11 Favoritos |
| `/recomendaciones` | Turista | Fig. 12 Recomendaciones |
| `/notificaciones` | autenticado | Fig. 13 Notificaciones |
| `/operador`, `/operador/solicitudes`, `/operador/comercios`, `/operador/servicios`, `/operador/pagos` | Operador (en modo operador) | Fig. 6, 7 |
| `/gestor/atractivos`, `/gestor/alertas`, `/gestor/eventos`, `/gestor/indicadores` | Gestor (o Admin) | — |
| `/admin`, `/admin/cuentas/:id`, `/admin/comercios`, `/admin/reservas`, `/admin/pagos` | Admin | Fig. 9, 14, 15 |

Interfaz en español e inglés (selector ES|EN); para el turista el idioma se guarda en sus preferencias.

## Organización

```
src/
  api/        http.ts (token, refresh con rotación, errores), endpoints.ts (un objeto por microservicio), types.ts
  auth/       Auth.tsx (sesión, roles del token, modo operador), Favorites.tsx
  i18n/       messages.ts (es/en con las mismas claves, comprobado por TypeScript), I18n.tsx
  components/ Header, Layouts (sitio, panel, RequireRole), Cards, JourneyRail, ui (estados, diálogos), Toast
  pages/      Home, Explore, Details, Auth, Reservations, Tourist (favoritos, recomendaciones, notificaciones),
              Profile, Operator, Gestor, Admin
  lib/        format.ts (moneda COP, fechas, errores), hooks.ts (useAsync, caché), media.ts (fotos ilustrativas)
```

## Lo que el backend aún no permite (la interfaz no lo simula)

- Imágenes: no hay campo ni subida. Cada oferta muestra una foto ilustrativa de Unsplash según su categoría,
  marcada como tal.
- Nivel de ocupación, ubicación/mapa, zonas y filtro por precio de los wireframes: no existen en la API.
- Listado de comercios propios: se filtra `GET /api/comercios` por `operadorId`, que solo devuelve los activos.
  Los servicios desactivados dejan de aparecer al recargar.
- Asociar atractivos a un servicio (Fig. 8), suspender un comercio suelto, categorías administrables,
  historial de cambios de cuenta, retirar el rol Gestor, editar perfil y cambiar contraseña: sin endpoints.
- «Marcar todas como leídas» marca una por una (no hay endpoint masivo).
- Recomendaciones: la API devuelve solo ids; el «¿Por qué?» se explica con las categorías de interés del turista.
- Pagos: la pasarela es un sandbox; tras iniciar el pago la confirmación llega por el webhook de la pasarela.
