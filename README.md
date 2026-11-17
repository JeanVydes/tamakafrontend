# TAMAKA — Frontend web

SPA en React 18 + Vite 5 + TypeScript, conectada a los microservicios del repositorio `tamakabackend` a través del gateway nginx.
El diseño parte del mockup de Figma Make «tamaka ui/ux» (paleta océano/coral sobre papel, Manrope + DM Sans)
y de los wireframes del proyecto, con cambios donde el backend real lo exigía.

## Arrancar

Requisitos: Node 20+ y el backend levantado (repositorio `tamakabackend`, `docker compose up -d`; el gateway nginx
publica `TAMAKA_HTTP_PORT`, 80 por defecto, ver `infra/gateway/nginx.conf`).

```bash
cd tamakafrontend
npm install
npm run dev          # http://localhost:5173
```

Vite reenvía `/api` al gateway (`TAMAKA_GATEWAY`, por defecto `http://127.0.0.1:80`), así el navegador ve un solo
origen y no hace falta CORS en desarrollo.

## Producción

El frontend se sirve desde `https://taminaka.com` y la API desde `https://api.taminaka.com` (el mismo gateway nginx
del backend). `.env.production` define `VITE_API_BASE_URL=https://api.taminaka.com`, de modo que `src/api/http.ts`
usa rutas absolutas a la API en vez de las relativas `/api` del desarrollo. El gateway responde CORS para
todos los orígenes (`Access-Control-Allow-Origin: *`) + preflight `OPTIONS` (ver `infra/gateway/nginx.conf` del backend).

```bash
npm run build        # genera dist/ con la API de producción
# servir dist/ estático en https://taminaka.com con try_files $uri /index.html; para las rutas de la SPA
```

`npx vite preview` también funciona: sirve `dist/` y aplica el mismo proxy `/api` de desarrollo.

## Datos de demostración

```bash
node scripts/seed-demo.mjs
# el pago es un mock: el backend lo aprueba al instante (TAMAKA_PAGOS_APROBACION_AUTOMATICA=true, por defecto)
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
- Pagos: es un mock (`TAMAKA_PAGOS_APROBACION_AUTOMATICA=true`): al pulsar **Pagar** el cobro se aprueba al instante y la reserva pasa a confirmada por el bus de eventos. El webhook firmado sigue disponible con el mock desactivado.
