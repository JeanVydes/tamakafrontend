import { api, apiForm } from "./http";
import type {
  Atractivo,
  AtractivoDetalle,
  Comercio,
  ComercioDetalle,
  Comprobante,
  Conteo,
  Cuenta,
  EstadoAtractivo,
  EstadoPago,
  EstadoReserva,
  Evento,
  Favorito,
  Notificacion,
  Pago,
  PagoDetalle,
  Preferencias,
  Reserva,
  Servicio,
  Sesion,
  TipoFavorito,
  TokenPair,
} from "./types";

const qs = (params: Record<string, string | undefined>) => {
  const s = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => v && s.set(k, v));
  const out = s.toString();
  return out ? `?${out}` : "";
};

export const auth = {
  login: (email: string, password: string) =>
    api<TokenPair>("/auth/login", { method: "POST", body: { email, password }, auth: false }),
  logout: (refreshToken: string) =>
    api<void>("/auth/logout", { method: "POST", body: { refreshToken }, auth: false }),
};

export const cuentas = {
  registrar: (body: { email: string; password: string; nombre: string }) =>
    api<Cuenta>("/cuentas", { method: "POST", body, auth: false }),
  me: () => api<Cuenta>("/cuentas/me"),
  habilitarOperador: () => api<Sesion>("/cuentas/me/modo-operador", { method: "POST" }),
  cambiarModo: (modo: "TURISTA" | "OPERADOR") => api<Sesion>("/cuentas/me/modo", { method: "PATCH", body: { modo } }),
  subirFoto: (file: File) => {
    const fd = new FormData();
    fd.append("archivo", file);
    return apiForm<Cuenta>("/cuentas/me/foto", { formData: fd });
  },
  eliminarFoto: () => api<Cuenta>("/cuentas/me/foto", { method: "DELETE" }),
};

export const admin = {
  cuentas: () => api<Cuenta[]>("/admin/cuentas"),
  cuenta: (id: number) => api<Cuenta>(`/admin/cuentas/${id}`),
  suspension: (id: number, suspendida: boolean, motivo?: string) =>
    api<Cuenta>(`/admin/cuentas/${id}/suspension`, { method: "PATCH", body: { suspendida, motivo } }),
  asignarGestor: (id: number) => api<Cuenta>(`/admin/cuentas/${id}/roles/gestor`, { method: "PUT" }),
  reservas: (estado?: EstadoReserva) => api<Reserva[]>(`/admin/reservas${qs({ estado })}`),
  pagos: (estado?: EstadoPago) => api<PagoDetalle[]>(`/admin/pagos${qs({ estado })}`),
};

export const atractivos = {
  buscar: (q?: string) => api<Atractivo[]>(`/atractivos${qs({ q })}`, { auth: false }),
  obtener: (id: number | string) => api<AtractivoDetalle>(`/atractivos/${id}`, { auth: false }),
  crear: (body: { nombre: string; descripcion?: string; categoria: string }) =>
    api<Atractivo>("/atractivos", { method: "POST", body }),
  cambiarEstado: (id: number, estado: EstadoAtractivo) =>
    api<Atractivo>(`/atractivos/${id}/estado`, { method: "PATCH", body: { estado } }),
  subirImagen: (id: number, file: File) => {
    const fd = new FormData();
    fd.append("archivo", file);
    return apiForm<Atractivo>(`/atractivos/${id}/imagen`, { formData: fd });
  },
  eliminarImagen: (id: number) => api<Atractivo>(`/atractivos/${id}/imagen`, { method: "DELETE" }),
  emitirAlerta: (atractivoId: number, mensaje: string) =>
    api<void>("/alertas", { method: "POST", body: { atractivoId, mensaje } }),
};

export interface ServicioInput {
  nombre: string;
  precioBase: number;
  minPersonas: number;
  maxPersonas: number;
  atributos?: Record<string, unknown>;
}

export const comercios = {
  buscar: (params: { q?: string; categoria?: string } = {}) =>
    api<Comercio[]>(`/comercios${qs(params)}`, { auth: false }),
  obtener: (id: number | string) => api<ComercioDetalle>(`/comercios/${id}`, { auth: false }),
  crear: (body: { nombre: string; rnt: string; categoria: string; descripcion?: string }) =>
    api<Comercio>("/comercios", { method: "POST", body }),
  actualizar: (id: number, body: { nombre: string; categoria: string; descripcion?: string }) =>
    api<Comercio>(`/comercios/${id}`, { method: "PATCH", body }),
  agregarServicio: (id: number, body: ServicioInput) =>
    api<Servicio>(`/comercios/${id}/servicios`, { method: "POST", body }),
  subirImagen: (id: number, file: File) => {
    const fd = new FormData();
    fd.append("archivo", file);
    return apiForm<Comercio>(`/comercios/${id}/imagen`, { formData: fd });
  },
  eliminarImagen: (id: number) => api<Comercio>(`/comercios/${id}/imagen`, { method: "DELETE" }),
};

export const servicios = {
  obtener: (id: number | string) => api<Servicio>(`/servicios/${id}`, { auth: false }),
  actualizar: (id: number, body: Partial<ServicioInput>) =>
    api<Servicio>(`/servicios/${id}`, { method: "PATCH", body }),
  cambiarActivo: (id: number, activo: boolean) =>
    api<Servicio>(`/servicios/${id}/activo`, { method: "PATCH", body: { activo } }),
  subirImagen: (id: number, file: File) => {
    const fd = new FormData();
    fd.append("archivo", file);
    return apiForm<Servicio>(`/servicios/${id}/imagen`, { formData: fd });
  },
  eliminarImagen: (id: number) => api<Servicio>(`/servicios/${id}/imagen`, { method: "DELETE" }),
};

export interface EventoInput {
  titulo: string;
  descripcion?: string;
  lugar: string;
  categoria?: string;
  fechaInicio: string;
  fechaFin: string;
}

export const eventos = {
  listar: (desde?: string) => api<Evento[]>(`/eventos${qs({ desde })}`, { auth: false }),
  obtener: (id: number | string) => api<Evento>(`/eventos/${id}`, { auth: false }),
  publicar: (body: EventoInput) => api<Evento>("/eventos", { method: "POST", body }),
  actualizar: (id: number, body: EventoInput) => api<Evento>(`/eventos/${id}`, { method: "PATCH", body }),
  desactivar: (id: number) => api<Evento>(`/eventos/${id}/desactivar`, { method: "PATCH" }),
  subirImagen: (id: number, file: File) => {
    const fd = new FormData();
    fd.append("archivo", file);
    return apiForm<Evento>(`/eventos/${id}/imagen`, { formData: fd });
  },
  eliminarImagen: (id: number) => api<Evento>(`/eventos/${id}/imagen`, { method: "DELETE" }),
};

export const reservas = {
  solicitar: (body: { servicioId: number; fechaReserva: string; numeroPersonas: number }) =>
    api<Reserva>("/reservas", { method: "POST", body }),
  mias: () => api<Reserva[]>("/reservas/mias"),
  cancelar: (id: number) => api<Reserva>(`/reservas/${id}/cancelar`, { method: "PATCH" }),
  operador: () => api<Reserva[]>("/operador/reservas"),
  responder: (id: number, body: { aceptada: boolean; valorAPagar?: number; observacion?: string }) =>
    api<Reserva>(`/operador/reservas/${id}/respuesta`, { method: "PATCH", body }),
  cancelarOperador: (id: number, motivo?: string) =>
    api<Reserva>(`/operador/reservas/${id}/cancelar`, { method: "PATCH", body: motivo ? { motivo } : {} }),
};

export const pagos = {
  iniciar: (reservaId: number) => api<Pago>("/pagos", { method: "POST", body: { reservaId } }),
  mios: () => api<Pago[]>("/pagos/mis"),
  comprobante: (id: number) => api<Comprobante>(`/pagos/${id}/comprobante`),
  operador: () => api<PagoDetalle[]>("/operador/pagos"),
};

export const favoritos = {
  listar: () => api<Favorito[]>("/favoritos"),
  guardar: (tipo: TipoFavorito, refId: string) => api<Favorito>("/favoritos", { method: "POST", body: { tipo, refId } }),
  eliminar: (id: string) => api<void>(`/favoritos/${id}`, { method: "DELETE" }),
};

export const preferencias = {
  obtener: () => api<Preferencias>("/preferencias/me"),
  actualizar: (body: Preferencias) => api<Preferencias>("/preferencias/me", { method: "PUT", body }),
};

export const recomendaciones = {
  atractivos: () => api<number[]>("/recomendaciones/atractivos"),
  servicios: () => api<number[]>("/recomendaciones/servicios"),
  eventos: () => api<number[]>("/recomendaciones/eventos"),
};

export const notificaciones = {
  listar: () => api<Notificacion[]>("/notificaciones"),
  marcarLeida: (id: string) => api<void>(`/notificaciones/${id}/leida`, { method: "PATCH" }),
};

export const indicadores = {
  demanda: (desde: string, hasta: string) => api<Conteo[]>(`/indicadores/demanda${qs({ desde, hasta })}`),
  operador: () => api<Conteo[]>("/operador/indicadores"),
};
