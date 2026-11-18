// En pantallas estrechas las tablas se muestran como tarjetas (ver styles.css, «Tablas en móvil»): cada fila es una
// tarjeta y cada celda lleva su etiqueta delante. La etiqueta sale de la cabecera de la tabla, así que se copia aquí
// a un atributo data-label de cada celda y ninguna tabla de la app necesita marcarse a mano.
//
// Las columnas cuya cabecera solo tiene texto para lectores de pantalla (.sr-only, la de «Acciones») quedan con la
// etiqueta vacía: el CSS las trata como la fila de botones de la tarjeta.

function labelTable(table: HTMLTableElement) {
  const heads = [...table.querySelectorAll<HTMLTableCellElement>("thead th")];
  if (heads.length === 0) return;
  const labels = heads.map((th) => (th.querySelector(".sr-only") ? "" : (th.textContent ?? "").trim()));
  table.querySelectorAll<HTMLTableRowElement>("tbody tr").forEach((row) => {
    [...row.children].forEach((cell, i) => {
      if (cell instanceof HTMLElement && cell.tagName === "TD") {
        const label = labels[i] ?? "";
        if (cell.dataset.label !== label) cell.dataset.label = label;
      }
    });
  });
}

export function enableResponsiveTables() {
  let queued = false;
  const run = () => {
    queued = false;
    document.querySelectorAll("table").forEach(labelTable);
  };
  const schedule = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(run);
  };
  // Solo se observan altas y bajas de nodos: escribir data-label no vuelve a disparar el observador.
  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  schedule();
}
