import {
  BadgeDollarSign,
  CalendarDays,
  ChartColumn,
  Compass,
  Inbox,
  Landmark,
  LayoutDashboard,
  Megaphone,
  PackageOpen,
  Store,
  UsersRound,
  Wallet,
} from "lucide-react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/Auth";
import { FavoritesProvider } from "./auth/Favorites";
import { PanelLayout, RequireRole, SiteLayout } from "./components/Layouts";
import { ToastProvider } from "./components/Toast";
import { EmptyState, LinkButton } from "./components/ui";
import { I18nProvider, useI18n } from "./i18n/I18n";
import { AdminAccountDetail, AdminAccounts, AdminBookings, AdminBusinesses, AdminPayments } from "./pages/Admin";
import { Login, Register } from "./pages/Auth";
import { AtractivoDetail, ComercioDetail, EventoDetail } from "./pages/Details";
import { Explore } from "./pages/Explore";
import { GestorAlerts, GestorAttractions, GestorEvents, GestorIndicators } from "./pages/Gestor";
import { Home } from "./pages/Home";
import { OperatorBusinesses, OperatorOverview, OperatorPayments, OperatorRequests, OperatorServices } from "./pages/Operator";
import { Profile } from "./pages/Profile";
import { Reservations } from "./pages/Reservations";
import { Favorites, Notifications, Recommendations } from "./pages/Tourist";

function NotFound() {
  const { t } = useI18n();
  return (
    <main className="shell page">
      <EmptyState icon={Compass} title={t("notFound.title")} hint={t("notFound.lead")} action={<LinkButton to="/">{t("nav.home")}</LinkButton>} />
    </main>
  );
}

function GestorIndex() {
  return <Navigate to="atractivos" replace />;
}

function Panels() {
  const { t } = useI18n();
  return (
    <Routes>
      <Route
        path="/operador"
        element={
          <RequireRole any={["OPERADOR"]}>
            <PanelLayout
              title={t("panel.operator")}
              links={[
                { to: "/operador", label: t("panel.summary"), icon: LayoutDashboard, end: true },
                { to: "/operador/solicitudes", label: t("panel.requests"), icon: Inbox },
                { to: "/operador/comercios", label: t("panel.businesses"), icon: Store },
                { to: "/operador/servicios", label: t("panel.services"), icon: PackageOpen },
                { to: "/operador/pagos", label: t("panel.payments"), icon: Wallet },
              ]}
            />
          </RequireRole>
        }
      >
        <Route index element={<OperatorOverview />} />
        <Route path="solicitudes" element={<OperatorRequests />} />
        <Route path="comercios" element={<OperatorBusinesses />} />
        <Route path="servicios" element={<OperatorServices />} />
        <Route path="pagos" element={<OperatorPayments />} />
      </Route>

      <Route
        path="/gestor"
        element={
          <RequireRole any={["GESTOR", "ADMIN"]}>
            <PanelLayout
              title={t("panel.gestor")}
              links={[
                { to: "/gestor/atractivos", label: t("panel.attractions"), icon: Landmark },
                { to: "/gestor/alertas", label: t("panel.alerts"), icon: Megaphone },
                { to: "/gestor/eventos", label: t("panel.events"), icon: CalendarDays },
                { to: "/gestor/indicadores", label: t("panel.indicators"), icon: ChartColumn },
              ]}
            />
          </RequireRole>
        }
      >
        <Route index element={<GestorIndex />} />
        <Route path="atractivos" element={<GestorAttractions />} />
        <Route path="alertas" element={<GestorAlerts />} />
        <Route path="eventos" element={<GestorEvents />} />
        <Route path="indicadores" element={<GestorIndicators />} />
      </Route>

      <Route
        path="/admin"
        element={
          <RequireRole any={["ADMIN"]}>
            <PanelLayout
              title={t("panel.admin")}
              links={[
                { to: "/admin", label: t("panel.accounts"), icon: UsersRound, end: true },
                { to: "/admin/comercios", label: t("panel.allBusinesses"), icon: Store },
                { to: "/admin/reservas", label: t("panel.bookings"), icon: CalendarDays },
                { to: "/admin/pagos", label: t("panel.payments"), icon: BadgeDollarSign },
                { to: "/gestor", label: t("panel.gestor"), icon: Landmark },
              ]}
            />
          </RequireRole>
        }
      >
        <Route index element={<AdminAccounts />} />
        <Route path="cuentas/:id" element={<AdminAccountDetail />} />
        <Route path="comercios" element={<AdminBusinesses />} />
        <Route path="reservas" element={<AdminBookings />} />
        <Route path="pagos" element={<AdminPayments />} />
      </Route>

      <Route element={<SiteLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/explorar" element={<Explore />} />
        <Route path="/atractivos/:id" element={<AtractivoDetail />} />
        <Route path="/comercios/:id" element={<ComercioDetail />} />
        <Route path="/eventos/:id" element={<EventoDetail />} />
        <Route path="/ingresar" element={<Login />} />
        <Route path="/registro" element={<Register />} />
        <Route path="/reservas" element={<RequireRole any={["TURISTA"]}><Reservations /></RequireRole>} />
        <Route path="/favoritos" element={<RequireRole any={["TURISTA"]}><Favorites /></RequireRole>} />
        <Route path="/recomendaciones" element={<RequireRole any={["TURISTA"]}><Recommendations /></RequireRole>} />
        <Route path="/notificaciones" element={<RequireRole any={["TURISTA", "OPERADOR", "GESTOR", "ADMIN"]}><Notifications /></RequireRole>} />
        <Route path="/perfil" element={<RequireRole any={["TURISTA", "OPERADOR", "GESTOR", "ADMIN"]}><Profile /></RequireRole>} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <I18nProvider>
        <ToastProvider>
          <AuthProvider>
            <FavoritesProvider>
              <Panels />
            </FavoritesProvider>
          </AuthProvider>
        </ToastProvider>
      </I18nProvider>
    </BrowserRouter>
  );
}
