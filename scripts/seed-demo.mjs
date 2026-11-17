#!/usr/bin/env node
// Datos de demostración para probar el frontend contra el backend local (gateway en TAMAKA_GATEWAY o http://127.0.0.1:80, TAMAKA_HTTP_PORT del backend).
// Todo lo que crea es sintético: cuentas de prueba, atractivos, un comercio con servicios, eventos y
// una reserva en cada estado útil. Es idempotente en lo posible (ignora los 409 de "ya existe").
//
// Uso:
//   node scripts/seed-demo.mjs            # basta si el backend usa el mock de pago (aprobación al instante)
//   PAGOS_WEBHOOK_SECRET=... node scripts/seed-demo.mjs   # con TAMAKA_PAGOS_APROBACION_AUTOMATICA=false, aprueba por webhook
//
// Los roles ADMIN y GESTOR no se pueden asignar por la API sin un admin previo, así que el script los
// inserta en la base local con `docker exec infra-postgres-1 psql` (solo entorno de desarrollo).
//
// Cuentas de prueba (contraseña común: Tamaka2026!):
//   viajero@tamaka.test   Turista
//   operador@tamaka.test  Turista + Operador (con el comercio de demostración)
//   gestor@tamaka.test    Turista + Gestor turístico
//   admin@tamaka.test     Turista + Administrador + Gestor

import { execFileSync } from "node:child_process";
import crypto from "node:crypto";

const BASE = process.env.TAMAKA_GATEWAY ?? "http://127.0.0.1:80";
const PASSWORD = "Tamaka2026!";
const WEBHOOK = process.env.PAGOS_WEBHOOK_SECRET ?? "";

async function call(method, path, { token, body, headers = {} } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : undefined;
  } catch {
    json = text;
  }
  return { status: res.status, json };
}

const ok = (r, what) => {
  if (r.status >= 400 && r.status !== 409) throw new Error(`${what}: ${r.status} ${JSON.stringify(r.json)}`);
  return r.json;
};

async function account(email, nombre) {
  await call("POST", "/api/cuentas", { body: { email, password: PASSWORD, nombre } });
  const r = await call("POST", "/api/auth/login", { body: { email, password: PASSWORD } });
  return ok(r, `login ${email}`);
}

function grantRoles(email, roles) {
  const values = roles.map((r) => `((SELECT id FROM cuentas.cuenta WHERE email='${email}'),'${r}')`).join(",");
  const sql = `INSERT INTO cuentas.cuenta_rol (cuenta_id, rol) VALUES ${values} ON CONFLICT DO NOTHING;`;
  execFileSync("docker", ["exec", "infra-postgres-1", "psql", "-U", "tamaka_admin", "-d", "tamaka", "-c", sql], { stdio: "pipe" });
}

const log = (...a) => console.log("·", ...a);

// 1. Cuentas
await account("viajero@tamaka.test", "Valentina Ortiz");
await account("operador@tamaka.test", "Rafael Pertuz");
await account("gestor@tamaka.test", "Luisa Mendoza");
await account("admin@tamaka.test", "Admin TAMAKA");
grantRoles("gestor@tamaka.test", ["GESTOR"]);
grantRoles("admin@tamaka.test", ["ADMIN", "GESTOR"]);
log("cuentas listas");

const gestor = await account("gestor@tamaka.test", "Luisa Mendoza");

// 2. Atractivos (solo si no hay ninguno)
const existing = ok(await call("GET", "/api/atractivos"), "atractivos");
if (!existing.length) {
  const attrs = [
    ["Playa Blanca", "PLAYA", "Playa de arena clara a 15 minutos en lancha desde El Rodadero. Aguas tranquilas para nadar."],
    ["Parque Nacional Natural Tayrona", "AREA_PROTEGIDA", "Área protegida y territorio ancestral de los pueblos de la Sierra. Cierra en temporadas de descanso ecológico."],
    ["Quinta de San Pedro Alejandrino", "CULTURA", "Hacienda histórica donde murió Simón Bolívar, con museo y jardín botánico."],
    ["Bahía Concha", "PLAYA", "Bahía dentro del Tayrona con acceso por carretera destapada desde Bonda."],
    ["Minca", "NATURALEZA", "Corregimiento en la Sierra Nevada con cascadas, cafetales y avistamiento de aves."],
    ["Ciudad Perdida (Teyuna)", "AREA_PROTEGIDA", "Sitio arqueológico sagrado en la Sierra Nevada; se llega en una caminata de cuatro a seis días con guía."],
  ];
  const created = [];
  for (const [nombre, categoria, descripcion] of attrs)
    created.push(ok(await call("POST", "/api/atractivos", { token: gestor.accessToken, body: { nombre, categoria, descripcion } }), nombre));
  await call("PATCH", `/api/atractivos/${created[1].id}/estado`, { token: gestor.accessToken, body: { estado: "RESTRINGIDO" } });
  await call("PATCH", `/api/atractivos/${created[5].id}/estado`, { token: gestor.accessToken, body: { estado: "CERRADO" } });
  await call("POST", "/api/alertas", {
    token: gestor.accessToken,
    body: { atractivoId: created[5].id, mensaje: "Cierre temporal del sendero por bloqueo en el corredor de acceso. No inicies la caminata hasta nuevo aviso." },
  });
  await call("POST", "/api/alertas", {
    token: gestor.accessToken,
    body: { atractivoId: created[1].id, mensaje: "Aforo controlado: ingreso solo hasta las 2:00 p. m. Lleva tu documento y el pago de la entrada." },
  });
  log("atractivos y alertas creados");
}

// 3. Eventos
const evs = ok(await call("GET", "/api/eventos"), "eventos");
if (!evs.length) {
  const d = (days) => new Date(Date.now() + days * 86400_000).toISOString().slice(0, 10);
  const events = [
    ["Fiestas del Mar", "Desfiles, regatas y música en la bahía de Santa Marta.", "Bahía de Santa Marta", "FESTIVAL", d(9), d(13)],
    ["Noche de cumbia en el Parque de los Novios", "Agrupaciones locales de cumbia y tambora.", "Parque de los Novios", "MUSICA", d(4), d(4)],
    ["Mercado campesino de Minca", "Café, cacao y productos de las fincas de la Sierra.", "Plaza de Minca", "GASTRONOMIA", d(16), d(17)],
  ];
  for (const [titulo, descripcion, lugar, categoria, fechaInicio, fechaFin] of events)
    ok(await call("POST", "/api/eventos", { token: gestor.accessToken, body: { titulo, descripcion, lugar, categoria, fechaInicio, fechaFin } }), titulo);
  log("eventos creados");
}

// 4. Operador con comercio y servicios
let op = await account("operador@tamaka.test", "Rafael Pertuz");
const sesion = await call("POST", "/api/cuentas/me/modo-operador", { token: op.accessToken });
if (sesion.status < 300) op = sesion.json.token;
else op = ok(await call("PATCH", "/api/cuentas/me/modo", { token: op.accessToken, body: { modo: "OPERADOR" } }), "modo").token;
const me = ok(await call("GET", "/api/cuentas/me", { token: op.accessToken }), "me");
let mine = ok(await call("GET", "/api/comercios"), "comercios").filter((c) => c.operadorId === me.id);
if (!mine.length) {
  const c = ok(
    await call("POST", "/api/comercios", {
      token: op.accessToken,
      body: { nombre: "Sierra Viva Tours", rnt: `RNT-DEMO-${me.id}`, categoria: "TOURS", descripcion: "Operador local de caminatas y tours de naturaleza en la Sierra Nevada y el Tayrona." },
    }),
    "comercio",
  );
  const svcs = [
    ["Caminata a las cascadas de Minca", 120000, 2, 10],
    ["Tour en lancha a Playa Blanca", 85000, 1, 12],
    ["Avistamiento de aves al amanecer", 150000, 1, 6],
  ];
  for (const [nombre, precioBase, minPersonas, maxPersonas] of svcs)
    ok(await call("POST", `/api/comercios/${c.id}/servicios`, { token: op.accessToken, body: { nombre, precioBase, minPersonas, maxPersonas } }), nombre);
  mine = [c];
  log("comercio y servicios creados");
}

// 5. Reservas del viajero en varios estados
const viajero = await account("viajero@tamaka.test", "Valentina Ortiz");
const mias = ok(await call("GET", "/api/reservas/mias", { token: viajero.accessToken }), "mias");
if (!mias.length) {
  const detalle = ok(await call("GET", `/api/comercios/${mine[0].id}`), "detalle");
  const [s1, s2, s3] = detalle.servicios;
  const fecha = (days) => new Date(Date.now() + days * 86400_000).toISOString().slice(0, 10);
  const pedir = async (s, dias, personas) =>
    ok(await call("POST", "/api/reservas", { token: viajero.accessToken, body: { servicioId: s.id, fechaReserva: fecha(dias), numeroPersonas: personas } }), "reserva");
  const r1 = await pedir(s1, 6, 3); // queda PENDIENTE
  const r2 = await pedir(s2, 10, 2); // ACEPTADA
  const r3 = await pedir(s3 ?? s1, 3, 2); // RECHAZADA
  await call("PATCH", `/api/operador/reservas/${r2.id}/respuesta`, {
    token: op.accessToken,
    body: { aceptada: true, valorAPagar: 170000, observacion: "Salida desde el muelle de El Rodadero a las 8:00 a. m." },
  });
  await call("PATCH", `/api/operador/reservas/${r3.id}/respuesta`, {
    token: op.accessToken,
    body: { aceptada: false, observacion: "Ese día ya tenemos el cupo completo. Prueba con el fin de semana." },
  });
  log(`reservas creadas: R-${r1.id} pendiente, R-${r2.id} aceptada, R-${r3.id} rechazada`);
}

// 5b. Una reserva pagada. El backend aprueba el pago al instante (mock, TAMAKA_PAGOS_APROBACION_AUTOMATICA=true);
// con el mock desactivado se puede aprobar por webhook firmado pasando PAGOS_WEBHOOK_SECRET.
const pagosViajero = ok(await call("GET", "/api/pagos/mis", { token: viajero.accessToken }), "mis pagos");
if (!pagosViajero.some((p) => p.estado === "APROBADO")) {
  const detalle = ok(await call("GET", `/api/comercios/${mine[0].id}`), "detalle");
  const fecha = new Date(Date.now() + 12 * 86400_000).toISOString().slice(0, 10);
  const r4 = ok(await call("POST", "/api/reservas", { token: viajero.accessToken, body: { servicioId: detalle.servicios[0].id, fechaReserva: fecha, numeroPersonas: 2 } }), "reserva");
  await call("PATCH", `/api/operador/reservas/${r4.id}/respuesta`, { token: op.accessToken, body: { aceptada: true, valorAPagar: 240000 } });
  // Pagos conoce la reserva aceptada por el bus de eventos (outbox): se reintenta unos segundos.
  let pago;
  for (let i = 0; i < 30 && !pago; i++) {
    const r = await call("POST", "/api/pagos", { token: viajero.accessToken, body: { reservaId: r4.id } });
    if (r.status < 300) pago = r.json;
    else await new Promise((res) => setTimeout(res, 1000));
  }
  if (!pago) throw new Error("Pagos no recibió la reserva aceptada (¿bus de eventos detenido?)");
  if (pago.estado === "APROBADO") {
    log(`R-${r4.id} pagada al instante (aprobación automática del mock); se confirma por el bus de eventos`);
  } else {
    if (!WEBHOOK) throw new Error("Pago en PENDIENTE y falta PAGOS_WEBHOOK_SECRET para aprobarlo por webhook");
    const monto = Number(pago.monto).toFixed(2);
    const firma = crypto.createHmac("sha256", WEBHOOK).update(`${pago.referenciaPasarela}|APROBADO|${monto}`).digest("hex");
    await call("POST", "/api/pagos/webhook", {
      body: { referencia: pago.referenciaPasarela, estado: "APROBADO", monto },
      headers: { "X-Firma-Pasarela": firma },
    });
    log(`R-${r4.id} pagada por webhook (se confirma al llegar el evento PagoAprobado)`);
  }
}

// 6. Preferencias del viajero
await call("PUT", "/api/preferencias/me", { token: viajero.accessToken, body: { categorias: ["PLAYA", "NATURALEZA"], idioma: "es" } });
log("listo. Contraseña de las cuentas de prueba:", PASSWORD);
