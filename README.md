# AgendaFlow 📅

Sistema de gestión de citas para negocios. React + Node.js/Express + SQLite.

## Requisitos
- Node.js 18+

## Para Desarroladores

sobrescribir todo el repo

git init
git remote add origin https://github.com/brihuaa/AgendaFLow
git branch -M main
git add .
git commit -m "reset project"
git push origin main --force


Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install

## Instalación y arranque

```bash
# 1. Instalar dependencias
npm run install:all

# 2. Iniciar en desarrollo (puerto 3000)
npm run dev
```

Abre http://localhost:3000

## Cuentas de prueba

| Rol      | Email                    | Contraseña   |
|----------|--------------------------|--------------|
| Admin    | admin@agendaflow.com     | admin123     |
| Empleado | ana@agendaflow.com       | empleado123  |
| Empleado | luis@agendaflow.com      | empleado123  |
| Cliente  | cliente@agendaflow.com   | cliente123   |

## Estructura

```
AgendaFlow/
├── package.json          ← Scripts raíz (dev, install:all)
├── backend/
│   ├── package.json
│   ├── agendaflow.db     ← Creado automáticamente al arrancar
│   └── src/
│       ├── index.js      ← Express API (puerto 3001)
│       ├── db/index.js   ← SQLite + seed inicial
│       ├── middleware/auth.js
│       └── routes/
│           ├── auth.js
│           ├── citas.js
│           ├── servicios.js
│           ├── horarios.js
│           └── usuarios.js
└── frontend/
    ├── package.json
    ├── vite.config.js    ← Puerto 3000, proxy /api → 3001
    └── src/
        ├── App.jsx
        ├── index.css
        ├── api/client.js
        ├── context/AuthContext.jsx
        ├── components/Navbar.jsx
        └── pages/
            ├── Login.jsx
            ├── Registro.jsx
            ├── PanelCliente.jsx
            ├── ReservarCita.jsx
            ├── PanelAdmin.jsx
            └── PanelEmpleado.jsx
```

## Roles y vistas

- **Admin** → `/admin` — 4 tabs: Reservas, Servicios, Horarios, Empleados
- **Empleado** → `/empleado` — Vista de citas asignadas (solo lectura)
- **Cliente** → `/panel` — Mis citas + `/reservar` — Reservar nueva cita

## Tecnologías

- **Frontend**: React 18, React Router v6, Axios, Vite
- **Backend**: Node.js 20, Express 4, better-sqlite3, JWT, bcrypt
- **BD**: SQLite (archivo local `backend/agendaflow.db`)
