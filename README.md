# AgendaFlow

> **Sistema de gestión de citas para negocios de servicios** — peluquerías, spas, centros de estética, clínicas de belleza y similares.

Construido con **React 18 + Node.js/Express + SQLite**. Listo para arrancar en local en menos de un minuto.

---
### Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/brihuaa/AgendaFLow
cd AgendaFlow

# 2. Instalar todas las dependencias (raíz + backend + frontend)
npm run install:all

# 3. Iniciar en modo desarrollo
npm run dev
```

Abre **http://localhost:3000** en tu navegador.

El backend arranca en el puerto **3001** y el frontend en el **3000** (Vite hace de proxy para `/api`).

> **Primera ejecución:** la base de datos se crea automáticamente con datos de ejemplo realistas: 3 empleados, 6 clientes, 6 servicios y ~90 citas distribuidas en las últimas 6 semanas + próximas 2 semanas.

## Para Desarroladores

sobrescribir todo el repo

git init
git remote add origin https://github.com/brihuaa/AgendaFLow
git branch -M main
git add .
git commit -m "NOMBRE VERSION"
git commit -m "Analiticas y Reseñas"

git push origin main --force


Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install

## Tabla de contenidos

- [Descripción](#descripción)
- [Funcionalidades](#funcionalidades)
- [Tecnologías](#tecnologías)
- [Instalación y uso](#instalación-y-uso)
- [Cuentas de prueba](#cuentas-de-prueba)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Módulos activables](#módulos-activables-feature-flags)
- [API — endpoints principales](#api--endpoints-principales)
- [Variables de entorno](#variables-de-entorno-opcionales)
- [Mejoras futuras](#mejoras-futuras)

---

## Descripción

AgendaFlow permite a un negocio de servicios gestionar toda su operativa de citas desde una sola interfaz web:

- Los **clientes** reservan, consultan y cancelan sus citas de forma autónoma.
- Los **empleados** ven su agenda diaria asignada.
- El **administrador** tiene visión completa: reservas, servicios, horarios, equipo y analítica de negocio.

La base de datos incluye datos de ejemplo realistas repartidos en 6 semanas para que las analíticas tengan sentido desde el primer arranque.

---

## Funcionalidades

### Panel de administración

| Módulo | Descripción |
|---|---|
| **Reservas** | Tabla completa de citas con columnas de empleado, cliente, servicio, duración, precio y estado. Filtros por estado y búsqueda libre. Acciones rápidas: completar / cancelar. KPIs de ingresos en tiempo real. |
| **Servicios** | Crear, editar y eliminar servicios con nombre, descripción, duración y precio. |
| **Horarios** | Asignar turnos semanales por empleado (hora entrada/salida por día). |
| **Empleados** | Dar de alta, dar de baja y reactivar empleados. |
| **Analítica** *(activable)* | Métricas por empleado: horas trabajadas, citas completadas, ingresos y rating. Filtros por período (hoy / semana / mes / personalizado). Gráficas comparativas de barras. |

### Panel de empleado

- Vista de citas asignadas con filtro por fecha.
- Indicador de citas para hoy y pendientes totales.

### Panel de cliente

- Historial de citas con filtros por estado.
- Reservar nuevas citas en un wizard paso a paso: servicio → empleado disponible → fecha → franja horaria.
- Cancelar citas confirmadas (con confirmación).
- Dejar reseñas *(activable)* en citas completadas: 1–5 estrellas + comentario opcional.

### Autenticación y seguridad

- JWT con access token (15 min) + refresh token (7 días).
- Auto-renovación transparente de token en el cliente.
- Rutas protegidas por rol (admin / empleado / cliente).
- Helmet, CORS y rate-limiting en el backend.

---

## Tecnologías

| Capa | Stack |
|---|---|
| **Frontend** | React 18, React Router v6, Axios, Vite 5 |
| **Backend** | Node.js 20, Express 4, better-sqlite3, jsonwebtoken, bcryptjs |
| **Base de datos** | SQLite (archivo local `backend/agendaflow.db`) |
| **Seguridad** | JWT (access + refresh tokens), bcrypt, helmet, express-rate-limit |

---

## Instalación y uso

### Requisitos

- **Node.js 18+** (recomendado 20 LTS)
- npm 9+



### Scripts disponibles (raíz)

| Script | Descripción |
|---|---|
| `npm run dev` | Arranca backend y frontend en paralelo |
| `npm run install:all` | Instala dependencias en raíz, backend y frontend |

---

## Cuentas de prueba

| Rol | Email | Contraseña |
|---|---|---|
| Admin | admin@agendaflow.com | admin123 |
| Empleada | ana@agendaflow.com | empleado123 |
| Empleado | luis@agendaflow.com | empleado123 |
| Empleada | sara@agendaflow.com | empleado123 |
| Cliente | carlos@agendaflow.com | cliente123 |
| Cliente | maria@agendaflow.com | cliente123 |
| Cliente | javier@agendaflow.com | cliente123 |
| Cliente | laura@agendaflow.com | cliente123 |

---

## Estructura del proyecto

```
AgendaFlow/
├── package.json                    ← Scripts raíz (dev, install:all)
│
├── backend/
│   ├── package.json
│   ├── agendaflow.db               ← Creado automáticamente al arrancar
│   └── src/
│       ├── index.js                ← Express API (puerto 3001)
│       ├── config.js               ← Feature flags (módulos activables)
│       ├── db/
│       │   └── index.js            ← Esquema SQLite + seed de datos realistas
│       ├── middleware/
│       │   └── auth.js             ← JWT middleware + requireRole()
│       └── routes/
│           ├── auth.js             ← Login, registro, refresh, logout
│           ├── citas.js            ← CRUD citas + completar/cancelar
│           ├── servicios.js        ← CRUD servicios
│           ├── horarios.js         ← Horarios negocio + turnos empleado
│           ├── usuarios.js         ← Gestión empleados (admin)
│           ├── analytics.js        ← Métricas por empleado [módulo]
│           └── resenas.js          ← Reseñas post-cita [módulo]
│
└── frontend/
    ├── package.json
    ├── vite.config.js              ← Puerto 3000, proxy /api → 3001
    └── src/
        ├── App.jsx                 ← Rutas protegidas por rol
        ├── index.css               ← Design system (variables CSS, componentes)
        ├── config.js               ← Feature flags frontend
        ├── api/
        │   └── client.js           ← Axios + auto-refresh de tokens
        ├── context/
        │   └── AuthContext.jsx     ← Estado de sesión global
        ├── components/
        │   ├── Navbar.jsx          ← Barra de navegación con logo SVG
        │   ├── TabAnalitica.jsx    ← Tab de analítica admin [módulo]
        │   └── ReviewButton.jsx    ← Botón de reseña cliente [módulo]
        └── pages/
            ├── Login.jsx
            ├── Registro.jsx
            ├── PanelAdmin.jsx      ← Tabs: Reservas, Servicios, Horarios, Empleados, Analítica
            ├── PanelEmpleado.jsx
            ├── PanelCliente.jsx
            └── ReservarCita.jsx    ← Wizard paso a paso
```

---

## Módulos activables (feature flags)

Los módulos pueden desactivarse sin romper la aplicación. Edita los flags en **dos archivos**:

```js
// backend/src/config.js
module.exports = {
  ENABLE_ANALYTICS_MODULE: true,   // Analítica admin
  ENABLE_REVIEWS: true,            // Reseñas post-cita
};

// frontend/src/config.js
export const ENABLE_ANALYTICS_MODULE = true;
export const ENABLE_REVIEWS = true;
```

Con `false`: las rutas no se registran, los componentes no se renderizan, la app funciona exactamente igual que sin los módulos.

---

## API — endpoints principales

| Método | Ruta | Roles | Descripción |
|---|---|---|---|
| POST | `/api/auth/login` | — | Autenticación |
| POST | `/api/auth/registro` | — | Registro de cliente |
| POST | `/api/auth/refresh` | — | Renovar access token |
| GET | `/api/citas` | todos | Lista citas (filtrada por rol) |
| POST | `/api/citas` | cliente | Crear cita |
| PATCH | `/api/citas/:id/completar` | admin | Completar cita |
| PATCH | `/api/citas/:id/cancelar` | admin, cliente | Cancelar cita |
| GET | `/api/servicios` | público | Lista servicios activos |
| GET | `/api/usuarios?rol=empleado` | admin | Lista empleados |
| GET | `/api/analytics/empleados` | admin | Métricas por empleado |
| GET | `/api/analytics/resumen` | admin | Resumen global del período |
| POST | `/api/resenas` | cliente | Crear reseña |
| GET | `/api/resenas/empleado/:id` | todos | Reseñas de un empleado |

---

## Variables de entorno (opcionales)

```bash
# backend/.env
JWT_SECRET=tu_secreto_seguro_aqui   # Por defecto: agendaflow_dev_secret_2026
PORT=3001                            # Puerto del backend
NODE_ENV=production
```

---

## Mejoras futuras

### UX y funcionalidad
- **Notificaciones por email / SMS** al confirmar o cancelar citas (integración con Resend o Twilio).
- **Recordatorios automáticos** 24 h antes de cada cita.
- **Calendario visual interactivo** — vista de cuadrícula semanal para ver huecos disponibles de un vistazo.
- **Perfil de usuario editable** — nombre, teléfono, foto de perfil.
- **Historial de pagos y facturas** — generación de recibos en PDF por cita o por período.
- **Modo oscuro/claro** — toggle manual además del tema por defecto.

### Panel de administración
- **Dashboard de inicio** con KPIs del día (citas pendientes, ingresos del día, próxima cita).
- **Gestión de clientes** — panel para ver y buscar la base de clientes con historial individual.
- **Días festivos y cierres** — bloquear fechas específicas para que no aparezcan en la reserva.
- **Capacidad múltiple** — permitir que un mismo servicio se atienda en paralelo con distintos empleados.
- **Exportación de datos** — CSV/Excel de citas e ingresos filtrados por período.
- **Gráfica temporal de ingresos** — evolución semanal/mensual en lugar de solo por empleado.

### Técnico
- **Tests automatizados** — Vitest + Testing Library en frontend; Jest + Supertest en backend.
- **Docker Compose** — despliegue reproducible en un solo comando.
- **PostgreSQL** como alternativa a SQLite para producción.
- **WebSockets** — actualización en tiempo real del panel de reservas (sin recargar).
- **PWA** — instalable en móvil con notificaciones push nativas.
- **i18n** — internacionalización para otros mercados.
