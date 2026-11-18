// El backend todavía no guarda imágenes. Mientras tanto, cada oferta muestra una foto ilustrativa
// de Unsplash elegida por su categoría y marcada como ilustrativa en la interfaz.
// Procedencia: todas son de images.unsplash.com (licencia Unsplash). Las cinco primeras vienen del mockup
// de Figma Make «tamaka ui/ux»; tayrona, sierra y aves se tomaron de la búsqueda de Unsplash
// «sierra nevada santa marta» (12/11/2026). Sustituir por fotos propias cuando el backend las admita.

const u = (id: string, w = 900) =>
  `https://images.unsplash.com/photo-${id}?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=80&w=${w}`;

export const photos = {
  hero: u("1754380578738-4fcf22068034", 2000),
  // Panel de acceso: Parque Tayrona (Santa Marta), en alta resolución para un panel de media pantalla.
  authArt: u("1612815867823-85cf0957890b", 1500),
  beach: u("1787411733658-8596a6e4b86f"),
  coast: u("1629905333701-460292c863a1"),
  island: u("1781036150515-1578cd1a55ef"),
  aerial: u("1705336083442-c62a0361f3b6"),
  tayrona: u("1612815867823-85cf0957890b"),
  sierra: u("1695341376808-dbb00946f4cc"),
  birds: u("1592737515832-21e32df75c1d"),
};

// Cada grupo tiene varias fotos: la semilla (el id) elige una, así dos tarjetas vecinas no se repiten.
// El texto puede incluir el nombre además de la categoría: los grupos más específicos van primero.
const groups: [RegExp, string[]][] = [
  [/sierra|teyuna|perdida|monta|caminat|trek/i, [photos.sierra]],
  [/tayrona|parque/i, [photos.tayrona]],
  [/protegid|sender/i, [photos.tayrona, photos.sierra]],
  [/aves|natur|selva|eco|cascad|minca/i, [photos.birds, photos.sierra, photos.tayrona]],
  [/playa|mar|bah[ií]a|beach|buceo|snorkel|isla|n[aá]utic|lancha/i, [photos.beach, photos.island, photos.coast]],
  [/aloja|hotel|hostal|posada|caba/i, [photos.aerial, photos.coast]],
  [/tour|aventura/i, [photos.tayrona, photos.sierra, photos.coast]],
  [/cultura|museo|hist[oó]ric|gastr|restaur|evento|festival|m[uú]sica|general/i, [photos.island, photos.aerial, photos.coast]],
];

const pool = [photos.beach, photos.tayrona, photos.island, photos.sierra, photos.aerial, photos.coast];

export function photoFor(category: string | null | undefined, seed: number) {
  const hit = category ? groups.find(([re]) => re.test(category)) : undefined;
  const list = hit ? hit[1] : pool;
  return list[Math.abs(seed) % list.length];
}
