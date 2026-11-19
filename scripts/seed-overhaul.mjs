#!/usr/bin/env node
// Overhaul del entorno dev local: fotos reales (Unsplash) subidas por la API al bucket R2
// (TAMAKA_STORAGE_* del backend), y contenido nuevo encima del seed básico:
//   +6 atractivos (con imágenes), fotos para los 6 existentes,
//   +1 comercio (Taganga Dive Center) y +6 servicios en total,
//   +3 eventos, 2 reservas extra y 1 alerta más.
// Aditivo e idempotente: no borra nada; salta lo que ya existe y no re-sube imagen donde ya hay.
//
// Requiere: backend local levantado (gateway en TAMAKA_GATEWAY o http://127.0.0.1:80),
// seed-demo corrido y TAMAKA_STORAGE_* configurados (imágenes reales en R2, no fotos en Unsplash en caliente).
//
//   node scripts/seed-overhaul.mjs

const BASE = process.env.TAMAKA_GATEWAY ?? "http://127.0.0.1:80";
const PASSWORD = "Tamaka2026!";

// Unsplash (licencia Unsplash), los IDs ya vetados por el sitio; todos responden con w=900.
const IMG = (id) => `https://images.unsplash.com/photo-${id}?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=80&w=900`;
const PHOTOS = {
  tayrona: IMG("1612815867823-85cf0957890b"),
  sierra: IMG("1695341376808-dbb00946f4cc"),
  birds: IMG("1592737515832-21e32df75c1d"),
  beach: IMG("1787411733658-8596a6e4b86f"),
  coast: IMG("1629905333701-460292c863a1"),
  island: IMG("1781036150515-1578cd1a55ef"),
  aerial: IMG("1705336083442-c62a0361f3b6"),
  hero: IMG("1754380578738-4fcf22068034"),
};

async function call(method, path, { token, body, headers = {}, formData } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: formData
      ? { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers }
      : { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
    body: formData ?? (body === undefined ? undefined : JSON.stringify(body)),
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

const log = (...a) => console.log("·", ...a);

// --- cuentas -------------------------------------------------------------
async function account(email, nombre) {
  const r = await call("POST", "/api/auth/login", { body: { email, password: PASSWORD } });
  return ok(r, `login ${email}`);
}
async function operadorMode(email) {
  const base = await account(email, "Rafael Pertuz");
  const sesion = await call("POST", "/api/cuentas/me/modo-operador", { token: base.accessToken });
  if (sesion.status < 300) return sesion.json.token.accessToken;
  return ok(await call("PATCH", "/api/cuentas/me/modo", { token: base.accessToken, body: { modo: "OPERADOR" } }), "modo operador").token.accessToken;
}

// --- imágenes ------------------------------------------------------------
let uploads = 0;
let uploadErrors = 0;
async function putImage(kind, id, photoUrl, token) {
  try {
    const imgRes = await fetch(photoUrl);
    if (!imgRes.ok) throw new Error(`foto HTTP ${imgRes.status}`);
    const buf = await imgRes.arrayBuffer();
    const form = new FormData();
    form.append("archivo", new Blob([buf], { type: "image/jpeg" }), "foto.jpg");
    const r = await call("POST", `/api/${kind}/${id}/imagen`, { token, formData: form });
    if (r.status >= 400) throw new Error(`imagen ${r.status}: ${JSON.stringify(r.json)}`);
    uploads++;
    log(`  imagen ${kind}/${id} → ${r.json.imagen ?? "ok"}`);
    return r.json;
  } catch (e) {
    uploadErrors++;
    console.warn(`  ⚠ imagen ${kind}/${id}: ${e.message}`);
    return null;
  }
}

/** Si la entidad no tiene imagen, baja y sube la foto indicada. */
async function ensureImage(kind, entity, photoUrl, token) {
  if (entity.imagen) return log(`  imagen ${kind}/${entity.id} ya estaba`);
  return putImage(kind, entity.id, photoUrl, token);
}

// --- 1. cuentas ----------------------------------------------------------
const gestor = await account("gestor@tamaka.test", "Luisa Mendoza");
const operadorToken = await operadorMode("operador@tamaka.test");
const viajero = await account("viajero@tamaka.test", "Valentina Ortiz");
log("cuentas listas");

// --- 2. atractivos -------------------------------------------------------
const atractivos = ok(await call("GET", "/api/atractivos"), "atractivos");
const byNombre = (list, name) => list.find((x) => x.nombre === name);
const newAtractivos = [
  ["Playa Cristal", "PLAYA", "Playa de arena rosada en el Tayrona, con arrecife y aguas cristalinas y poco concurrida.", PHOTOS.beach],
  ["Cabo San Juan del Tayrona", "PLAYA", "Cabo de playa gemela custodiada por dos cerros; amanecer y atardecer en el agua.", PHOTOS.coast],
  ["Taganga", "PLAYA", "Poblado de pescadores artesanales con caletas tranquilas, careteo y turismo comunitario.", PHOTOS.island],
  ["El Rodadero", "PLAYA", "La playa urbana principal de Santa Marta, con malecón, marismas y planes en familia.", PHOTOS.aerial],
  ["Centro Histórico de Santa Marta", "CULTURA", "Catedral, plaza Bastidas y edificios coloniales fundados por españoles en 1525.", PHOTOS.hero],
  ["Pozo Azul (Minca)", "NATURALEZA", "Poza natural de agua fría bajo las cascadas de Minca, rodeada de selva y cafetales.", PHOTOS.birds],
];
const attractIds = new Map(atractivos.map((a) => [a.nombre, a]));
for (const [nombre, categoria, descripcion, foto] of newAtractivos) {
  // En AWS ya existe «Centro Historico» del seed original: no duplicarlo con el homólogo nuevo.
  if (nombre === "Centro Histórico de Santa Marta" && attractIds.has("Centro Historico")) continue;
  if (attractIds.has(nombre)) continue;
  const a = ok(await call("POST", "/api/atractivos", { token: gestor.accessToken, body: { nombre, categoria, descripcion } }), nombre);
  attractIds.set(nombre, a);
  log(`atractivo creado: ${nombre} (#${a.id})`);
}
// refrescar lista completa
const allAttracts = ok(await call("GET", "/api/atractivos"), "atractivos");
const atractivoImage = new Map([
  ["Playa Blanca", PHOTOS.coast],
  ["Parque Nacional Natural Tayrona", PHOTOS.tayrona],
  ["Quinta de San Pedro Alejandrino", PHOTOS.island],
  ["Bahía Concha", PHOTOS.aerial],
  ["Minca", PHOTOS.sierra],
  ["Ciudad Perdida (Teyuna)", PHOTOS.birds],
  // nombres del seed de AWS (producción)
  ["Playa Cristal", PHOTOS.beach],
  ["Centro Historico", PHOTOS.hero],
  ["Centro Histórico de Santa Marta", PHOTOS.hero],
  ["Sendero de la Sierra", PHOTOS.sierra],
  ...newAtractivos.map(([nombre]) => [nombre, newAtractivos.find(([n]) => n === nombre)[3]]),
]);
for (const a of allAttracts) {
  const foto = atractivoImage.get(a.nombre);
  if (foto) await ensureImage("atractivos", a, foto, gestor.accessToken);
}

// alerta adicional: una nueva para Bahía Concha
const bay = byNombre(allAttracts, "Bahía Concha");
if (bay) {
  await call("POST", "/api/alertas", {
    token: gestor.accessToken,
    body: { atractivoId: bay.id, mensaje: "Salidas en lancha sujetas a marea; operadoras parten desde las 7:00 a. m. Verifica el parte antes de subirte." },
  });
  log("alerta añadida a Bahía Concha");
}

// --- 3. eventos ----------------------------------------------------------
const eventos = ok(await call("GET", "/api/eventos"), "eventos");
const byTitulo = (list, name) => list.find((x) => x.titulo === name);
const d = (days) => new Date(Date.now() + days * 86400_000).toISOString().slice(0, 10);
const newEventos = [
  ["Festival Internacional de Jazz del Mar", "Jazz al aire libre en el malecón con artistas nacionales e internacionales.", "Malecón de El Rodadero", "MUSICA", d(21), d(23), PHOTOS.coast],
  ["Carrera nocturna Bastidas", "Carrera de 5K por el Centro Histórico iluminado, 6:30 p. m.", "Plaza de Bolívar", "DEPORTE", d(11), d(11), PHOTOS.aerial],
  ["Feria Gastronómica del Caribe", "Cocinas del Caribe, coctelería y recetas de herencia en la bahía.", "Bahía de Santa Marta", "GASTRONOMIA", d(25), d(28), PHOTOS.hero],
];
const eventImage = new Map([
  ["Fiestas del Mar", PHOTOS.island],
  ["Noche de cumbia en el Parque de los Novios", PHOTOS.island],
  ["Mercado campesino de Minca", PHOTOS.sierra],
  // nombres del seed de AWS (producción)
  ["Festival del Mar", PHOTOS.island],
  ["Feria Artesanal", PHOTOS.hero],
  ...newEventos.map(([titulo]) => [titulo, newEventos.find(([t]) => t === titulo)[6]]),
]);
for (const [titulo, descripcion, lugar, categoria, fechaInicio, fechaFin, foto] of newEventos) {
  if (byTitulo(eventos, titulo)) continue;
  const e = ok(await call("POST", "/api/eventos", { token: gestor.accessToken, body: { titulo, descripcion, lugar, categoria, fechaInicio, fechaFin } }), titulo);
  eventos.push(e);
  log(`evento creado: ${titulo} (#${e.id})`);
}
const allEventos = ok(await call("GET", "/api/eventos"), "eventos");
for (const e of allEventos) {
  const foto = eventImage.get(e.titulo);
  if (foto) await ensureImage("eventos", e, foto, gestor.accessToken);
}

// --- 4. comercios y servicios -------------------------------------------
const me = ok(await call("GET", "/api/cuentas/me", { token: operadorToken }), "me");
const comercios = ok(await call("GET", "/api/comercios"), "comercios");
let sierra = comercios.find((c) => c.operadorId === me.id && c.nombre === "Sierra Viva Tours");
if (!sierra && !comercios.some((c) => c.nombre === "Sierra Viva Tours")) {
  sierra = ok(
    await call("POST", "/api/comercios", {
      token: operadorToken,
      body: { nombre: "Sierra Viva Tours", rnt: `RNT-DEMO-${me.id}`, categoria: "TOURS", descripcion: "Operador local de caminatas y tours de naturaleza en la Sierra Nevada y el Tayrona." },
    }),
    "comercio Sierra Viva",
  );
  log("comercio creado: Sierra Viva Tours");
} else if (!sierra) {
  log("Sierra Viva Tours ya existe en el entorno (otro operador); se omite junto con sus servicios");
}
if (sierra && (sierra.imagen === null || sierra.imagen === undefined)) {
  await ensureImage("comercios", sierra, PHOTOS.sierra, operadorToken);
}
const diveName = "Taganga Dive Center";
let dive = comercios.find((c) => c.operadorId === me.id && c.nombre === diveName);
if (!dive) {
  dive = ok(
    await call("POST", "/api/comercios", {
      token: operadorToken,
      body: { nombre: diveName, rnt: `RNT-DIVE-${me.id}`, categoria: "BUCEO", descripcion: "Escuela de buceo comunitaria en Taganga: bautizos, cursos PADI y careteo en arrecifes de coral." },
    }),
    diveName,
  );
  log(`comercio creado: ${diveName} (#${dive.id})`);
}
await ensureImage("comercios", dive, PHOTOS.coast, operadorToken);

// --- 4b. Comercios adicionales -------------------------------------------
const extraComercios = [
  {
    nombre: "Senderos de la Sierra",
    categoria: "TOURS",
    rnt: `RNT-TREK-${me.id}`,
    descripcion: "Operador de trekking en la Sierra Nevada: Ciudad Perdida, Pozo Azul y senderos con guías locales certificados.",
    foto: PHOTOS.sierra,
    servicios: [
      ["Trekking Ciudad Perdida (4 días)", 1850000, 2, 8, PHOTOS.sierra],
      ["Pozo Azul y cascadas de Minca", 95000, 2, 10, PHOTOS.birds],
      ["Trekking nocturno a la Sierra", 140000, 2, 8, PHOTOS.aerial],
    ],
  },
  {
    nombre: "Sábana Gourmet",
    categoria: "GASTRONOMIA",
    rnt: `RNT-REST-${me.id}`,
    descripcion: "Restaurante y bar de cocina criolla caribeña a 15 minutos del Rodadero: almuerzos del día, tours de cacao y cena maridaje.",
    foto: PHOTOS.hero,
    servicios: [
      ["Almuerzo criollo del día", 45000, 1, 20, PHOTOS.coast],
      ["Tour de chocolate y cacao", 60000, 4, 12, PHOTOS.island],
      ["Cena maridaje 7 tiempos (viernes)", 210000, 2, 10, PHOTOS.hero],
    ],
  },
  {
    nombre: "Tayrona Rentas",
    categoria: "TRANSPORTE",
    rnt: `RNT-RENT-${me.id}`,
    descripcion: "Lanchas, 4x4 y motos para Tayrona, El Rodadero y Taganga. Salidas programadas y vuelta garantizada.",
    foto: PHOTOS.aerial,
    servicios: [
      ["Lancha a Playa Blanca (ida y vuelta)", 130000, 1, 12, PHOTOS.beach],
      ["4x4 a Tayrona con guía", 350000, 1, 6, PHOTOS.aerial],
      ["Moto por la ciudad (día)", 80000, 1, 2, PHOTOS.coast],
    ],
  },
];
for (const eco of extraComercios) {
  let c = comercios.find((x) => x.operadorId === me.id && x.nombre === eco.nombre);
  if (!c) {
    c = ok(
      await call("POST", "/api/comercios", {
        token: operadorToken,
        body: { nombre: eco.nombre, rnt: eco.rnt, categoria: eco.categoria, descripcion: eco.descripcion },
      }),
      eco.nombre,
    );
    log(`comercio creado: ${eco.nombre} (#${c.id})`);
    comercios.push(c);
  }
  await ensureImage("comercios", c, eco.foto, operadorToken);
  const detail = ok(await call("GET", `/api/comercios/${c.id}`), `detalle ${c.id}`);
  for (const [nombre, precioBase, minPersonas, maxPersonas, foto] of eco.servicios) {
    let svc = detail.servicios.find((s) => s.nombre === nombre);
    if (!svc) {
      svc = ok(await call("POST", `/api/comercios/${c.id}/servicios`, { token: operadorToken, body: { nombre, precioBase, minPersonas, maxPersonas } }), nombre);
      log(`servicio creado: ${nombre}`);
      detail.servicios.push(svc);
    }
    await ensureImage("servicios", svc, foto, operadorToken);
  }
}


const sierraServices = [
  ["Caminata a las cascadas de Minca", 120000, 2, 10, PHOTOS.sierra],
  ["Tour en lancha a Playa Blanca", 85000, 1, 12, PHOTOS.island],
  ["Avistamiento de aves al amanecer", 150000, 1, 6, PHOTOS.birds],
  ["Tour de estrellas en la Sierra", 110000, 2, 8, PHOTOS.aerial],
  ["Tayrona día completo con almuerzo", 150000, 2, 12, PHOTOS.tayrona],
  ["Bicicleta eléctrica por Minca", 95000, 2, 10, PHOTOS.sierra],
];
const diveServices = [
  ["Bautizo de buceo en Taganga", 280000, 1, 4, PHOTOS.coast],
  ["Careteo en el arrecife", 65000, 1, 10, PHOTOS.beach],
  ["PADI Open Water (3 días)", 950000, 1, 6, PHOTOS.hero],
  ["Snorkel al amanecer en el coral", 90000, 2, 8, PHOTOS.island],
  ["Inmersión nocturna entre rayas", 340000, 1, 4, PHOTOS.aerial],
  ["PADI Advanced Open Water", 850000, 1, 6, PHOTOS.hero],
  ["Renta de equipo de buceo (día)", 45000, 1, 6, PHOTOS.coast],
  ["Careteo para niños acompañados", 40000, 1, 8, PHOTOS.beach],
];
for (const [owner, list] of [[sierra, sierraServices], [dive, diveServices]]) {
  if (!owner) continue;
  const detail = ok(await call("GET", `/api/comercios/${owner.id}`), `detalle ${owner.id}`);
  for (const [nombre, precioBase, minPersonas, maxPersonas, foto] of list) {
    let svc = detail.servicios.find((s) => s.nombre === nombre);
    if (!svc) {
      svc = ok(await call("POST", `/api/comercios/${owner.id}/servicios`, { token: operadorToken, body: { nombre, precioBase, minPersonas, maxPersonas } }), nombre);
      log(`servicio creado: ${nombre}`);
      detail.servicios.push(svc);
    }
    await ensureImage("servicios", svc, foto, operadorToken);
  }
}

// --- 5. reservas extra del viajero --------------------------------------
// En producción se omiten por defecto: TAMAKA_SKIP_RESERVAS=1
const SKIP_RESERVAS = process.env.TAMAKA_SKIP_RESERVAS === "1";
if (!SKIP_RESERVAS) {
  const mias = ok(await call("GET", "/api/reservas/mias", { token: viajero.accessToken }), "mis reservas");
  const fee = (days) => new Date(Date.now() + days * 86400_000).toISOString().slice(0, 10);
  const diveDetail = ok(await call("GET", `/api/comercios/${dive.id}`), "detalle dive");
  const bautizo = diveDetail.servicios.find((s) => s.nombre === "Bautizo de buceo en Taganga");
  if (bautizo && !mias.some((r) => r.servicioId === bautizo.id)) {
    const r = ok(await call("POST", "/api/reservas", { token: viajero.accessToken, body: { servicioId: bautizo.id, fechaReserva: fee(8), numeroPersonas: 2 } }), "reserva bautizo");
    await call("PATCH", `/api/operador/reservas/${r.id}/respuesta`, { token: operadorToken, body: { aceptada: true, valorAPagar: 560000, observacion: "Salida 8:00 a. m. desde la playa de Taganga. Trae tu documento." } });
    log(`reserva aceptada creada: R-${r.id} (bautizo)`);
  }
  if (sierra) {
    const sierraDetail = ok(await call("GET", `/api/comercios/${sierra.id}`), "detalle sierra");
    const estrellas = sierraDetail.servicios.find((s) => s.nombre === "Tour de estrellas en la Sierra");
    if (estrellas && !mias.some((r) => r.servicioId === estrellas.id)) {
      const r = ok(await call("POST", "/api/reservas", { token: viajero.accessToken, body: { servicioId: estrellas.id, fechaReserva: fee(9), numeroPersonas: 2 } }), "reserva estrellas");
      log(`reserva pendiente creada: R-${r.id} (estrellas)`);
    }
  }
} else {
  log("reservas omitidas por TAMAKA_SKIP_RESERVAS=1");
}

// --- 6. preferencias -----------------------------------------------------
await call("PUT", "/api/preferencias/me", { token: viajero.accessToken, body: { categorias: ["PLAYA", "NATURALEZA", "BUCEO"], idioma: "es" } });

log(`listo. subidas=${uploads}, errores-imagen=${uploadErrors}`);
