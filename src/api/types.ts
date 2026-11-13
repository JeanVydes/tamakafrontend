// Contratos de la API (espejo de los records dto.response del backend).

export type Rol = "TURISTA" | "OPERADOR" | "GESTOR" | "ADMIN";

export interface Cuenta {
  id: number;
  email: string;
  nombre: string;
  activa: boolean;
  modoOperador: boolean;
  roles: Rol[];
  creadaEn: string;
}

export interface TokenPair {
  accessToken: string;
  tokenType: string;
  expiresInSeconds: number;
  refreshToken: string;
  refreshExpiresInSeconds: number;
}

export interface Sesion {
  cuenta: Cuenta;
  token: TokenPair;
}

export type EstadoAtractivo = "ABIERTO" | "RESTRINGIDO" | "CERRADO";

export interface Alerta {
  id: number;
  mensaje: string;
  emitidaEn: string;
}

export interface Atractivo {
  id: number;
  nombre: string;
  descripcion: string | null;
  categoria: string;
  estado: EstadoAtractivo;
}

export interface AtractivoDetalle extends Atractivo {
  alertasRecientes: Alerta[];
}

export interface Comercio {
  id: number;
  operadorId: number;
  nombre: string;
  rnt: string;
  categoria: string;
  descripcion: string | null;
  activo: boolean;
}

export interface Servicio {
  id: number;
  comercioId: number;
  operadorId: number;
  nombre: string;
  precioBase: number;
  minPersonas: number;
  maxPersonas: number;
  activo: boolean;
  atributos: Record<string, unknown> | null;
}

export interface ComercioDetalle extends Comercio {
  servicios: Servicio[];
}

export interface Evento {
  id: number;
  titulo: string;
  descripcion: string | null;
  lugar: string;
  categoria: string;
  fechaInicio: string;
  fechaFin: string;
  activo: boolean;
}

export type EstadoReserva = "PENDIENTE" | "ACEPTADA" | "RECHAZADA" | "CANCELADA" | "CONFIRMADA" | "FINALIZADA";

export interface Reserva {
  id: number;
  turistaId: number;
  servicioId: number;
  operadorId: number;
  fechaReserva: string;
  numeroPersonas: number;
  estado: EstadoReserva;
  valorAPagar: number | null;
  observacionOperador: string | null;
  creadaEn: string;
  plazoPago: string | null;
}

export type EstadoPago = "PENDIENTE" | "APROBADO" | "RECHAZADO" | "REEMBOLSADO";

export interface Pago {
  id: number;
  reservaId: number;
  monto: number;
  estado: EstadoPago;
  referenciaPasarela: string;
  urlPago: string | null;
}

export interface PagoDetalle {
  id: number;
  reservaId: number;
  turistaId: number;
  operadorId: number;
  monto: number;
  estado: EstadoPago;
  referenciaPasarela: string;
  creadoEn: string;
  aprobadoEn: string | null;
}

export interface Comprobante {
  id: number;
  reservaId: number;
  monto: number;
  estado: EstadoPago;
  referenciaPasarela: string;
  aprobadoEn: string | null;
}

export type TipoFavorito = "ATRACTIVO" | "SERVICIO" | "EVENTO" | "COMERCIO";

export interface Favorito {
  id: string;
  tipo: TipoFavorito;
  refId: string;
}

export interface Preferencias {
  categorias: string[];
  idioma: "es" | "en";
}

export interface Notificacion {
  id: string;
  tipo: string;
  titulo: string;
  cuerpo: string;
  leida: boolean;
  creadaEn: string;
}

export interface Conteo {
  tipo: string;
  total: number;
}
