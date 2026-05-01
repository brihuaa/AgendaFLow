const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../../agendaflow.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

function initDb() {
  const database = getDb();

  database.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      apellidos TEXT NOT NULL DEFAULT '',
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      rol TEXT NOT NULL DEFAULT 'cliente' CHECK(rol IN ('cliente','empleado','admin')),
      activo INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS servicios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      descripcion TEXT DEFAULT '',
      duracion_min INTEGER NOT NULL,
      precio REAL NOT NULL,
      activo INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS horarios_negocio (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dia_semana INTEGER NOT NULL CHECK(dia_semana BETWEEN 1 AND 7),
      hora_apertura TEXT NOT NULL,
      hora_cierre TEXT NOT NULL,
      UNIQUE(dia_semana)
    );

    CREATE TABLE IF NOT EXISTS turnos_empleado (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      empleado_id INTEGER NOT NULL REFERENCES usuarios(id),
      dia_semana INTEGER NOT NULL CHECK(dia_semana BETWEEN 1 AND 7),
      hora_entrada TEXT NOT NULL,
      hora_salida TEXT NOT NULL,
      UNIQUE(empleado_id, dia_semana)
    );

    CREATE TABLE IF NOT EXISTS citas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cliente_id INTEGER NOT NULL REFERENCES usuarios(id),
      empleado_id INTEGER NOT NULL REFERENCES usuarios(id),
      servicio_id INTEGER NOT NULL REFERENCES servicios(id),
      fecha TEXT NOT NULL,
      hora_inicio TEXT NOT NULL,
      hora_fin TEXT NOT NULL,
      estado TEXT NOT NULL DEFAULT 'confirmada' CHECK(estado IN ('confirmada','completada','cancelada')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS resenas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cita_id INTEGER NOT NULL UNIQUE REFERENCES citas(id),
      cliente_id INTEGER NOT NULL REFERENCES usuarios(id),
      empleado_id INTEGER NOT NULL REFERENCES usuarios(id),
      puntuacion INTEGER NOT NULL CHECK(puntuacion BETWEEN 1 AND 5),
      comentario TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Seed data only if DB is empty
  const count = database.prepare('SELECT COUNT(*) as c FROM usuarios').get();
  if (count.c === 0) {
    console.log('🌱 Seeding database...');

    const hash = (pw) => bcrypt.hashSync(pw, 12);

    // Users
    const insertUser = database.prepare(
      'INSERT INTO usuarios (nombre, apellidos, email, password_hash, rol) VALUES (?, ?, ?, ?, ?)'
    );
    insertUser.run('Admin', 'Sistema', 'admin@agendaflow.com', hash('admin123'), 'admin');
    insertUser.run('Ana', 'García', 'ana@agendaflow.com', hash('empleado123'), 'empleado');
    insertUser.run('Luis', 'Fernández', 'luis@agendaflow.com', hash('empleado123'), 'empleado');
    insertUser.run('Carlos', 'López', 'cliente@agendaflow.com', hash('cliente123'), 'cliente');
    insertUser.run('María', 'Martínez', 'maria@agendaflow.com', hash('cliente123'), 'cliente');

    // Services
    const insertServicio = database.prepare(
      'INSERT INTO servicios (nombre, descripcion, duracion_min, precio) VALUES (?, ?, ?, ?)'
    );
    insertServicio.run('Corte de pelo', 'Corte clásico o moderno', 30, 15.0);
    insertServicio.run('Tinte', 'Coloración completa con productos premium', 90, 60.0);
    insertServicio.run('Manicura', 'Manicura completa con esmalte', 45, 25.0);
    insertServicio.run('Pedicura', 'Pedicura completa con hidratación', 60, 30.0);

    // Business hours (Mon-Sat)
    const insertHorario = database.prepare(
      'INSERT INTO horarios_negocio (dia_semana, hora_apertura, hora_cierre) VALUES (?, ?, ?)'
    );
    for (let d = 1; d <= 6; d++) {
      insertHorario.run(d, '09:00', '19:00');
    }

    // Employee shifts (Ana: Mon-Fri, Luis: Tue-Sat)
    const insertTurno = database.prepare(
      'INSERT INTO turnos_empleado (empleado_id, dia_semana, hora_entrada, hora_salida) VALUES (?, ?, ?, ?)'
    );
    const ana = database.prepare("SELECT id FROM usuarios WHERE email='ana@agendaflow.com'").get();
    const luis = database.prepare("SELECT id FROM usuarios WHERE email='luis@agendaflow.com'").get();
    for (let d = 1; d <= 5; d++) insertTurno.run(ana.id, d, '09:00', '18:00');
    for (let d = 2; d <= 6; d++) insertTurno.run(luis.id, d, '10:00', '19:00');

    // Sample appointments
    const insertCita = database.prepare(
      'INSERT INTO citas (cliente_id, empleado_id, servicio_id, fecha, hora_inicio, hora_fin, estado) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    const carlos = database.prepare("SELECT id FROM usuarios WHERE email='cliente@agendaflow.com'").get();
    const maria = database.prepare("SELECT id FROM usuarios WHERE email='maria@agendaflow.com'").get();

    // Get next Monday
    const today = new Date();
    const nextMon = new Date(today);
    nextMon.setDate(today.getDate() + ((8 - today.getDay()) % 7 || 7));
    const fmt = (d) => d.toISOString().split('T')[0];

    insertCita.run(carlos.id, ana.id, 1, fmt(nextMon), '09:00', '09:30', 'confirmada');
    insertCita.run(carlos.id, ana.id, 2, fmt(nextMon), '10:00', '11:30', 'confirmada');
    insertCita.run(maria.id, luis.id, 3, fmt(nextMon), '10:00', '10:45', 'confirmada');

    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 7);
    insertCita.run(carlos.id, ana.id, 1, fmt(lastWeek), '09:00', '09:30', 'completada');
    insertCita.run(maria.id, luis.id, 1, fmt(lastWeek), '11:00', '11:30', 'cancelada');

    console.log('✅ Seed complete');
    console.log('   admin@agendaflow.com / admin123');
    console.log('   ana@agendaflow.com / empleado123');
    console.log('   cliente@agendaflow.com / cliente123');
  }

  return database;
}

module.exports = { getDb, initDb };
