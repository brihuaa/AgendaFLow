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

  const count = database.prepare('SELECT COUNT(*) as c FROM usuarios').get();
  if (count.c === 0) {
    console.log('Seeding database with realistic data...');

    const hash = (pw) => bcrypt.hashSync(pw, 12);

    const insertUser = database.prepare(
      'INSERT INTO usuarios (nombre, apellidos, email, password_hash, rol) VALUES (?, ?, ?, ?, ?)'
    );
    insertUser.run('Admin',   'Sistema',   'admin@agendaflow.com',    hash('admin123'),    'admin');
    insertUser.run('Ana',     'Garcia',    'ana@agendaflow.com',      hash('empleado123'), 'empleado');
    insertUser.run('Luis',    'Fernandez', 'luis@agendaflow.com',     hash('empleado123'), 'empleado');
    insertUser.run('Sara',    'Molina',    'sara@agendaflow.com',     hash('empleado123'), 'empleado');
    insertUser.run('Carlos',  'Lopez',     'carlos@agendaflow.com',   hash('cliente123'),  'cliente');
    insertUser.run('Maria',   'Martinez',  'maria@agendaflow.com',    hash('cliente123'),  'cliente');
    insertUser.run('Javier',  'Romero',    'javier@agendaflow.com',   hash('cliente123'),  'cliente');
    insertUser.run('Laura',   'Sanchez',   'laura@agendaflow.com',    hash('cliente123'),  'cliente');
    insertUser.run('Elena',   'Torres',    'elena@agendaflow.com',    hash('cliente123'),  'cliente');
    insertUser.run('Pablo',   'Jimenez',   'pablo@agendaflow.com',    hash('cliente123'),  'cliente');

    const insertServicio = database.prepare(
      'INSERT INTO servicios (nombre, descripcion, duracion_min, precio) VALUES (?, ?, ?, ?)'
    );
    insertServicio.run('Corte de pelo',       'Corte clasico o moderno adaptado a tu estilo',          30,  15.0);
    insertServicio.run('Tinte completo',      'Coloracion completa con productos premium sin amoniaco', 90,  65.0);
    insertServicio.run('Manicura clasica',    'Manicura completa con lima, cuticulas y esmalte',        45,  25.0);
    insertServicio.run('Pedicura completa',   'Pedicura con hidratacion profunda y esmalte',            60,  35.0);
    insertServicio.run('Mechas / Highlights', 'Mechas californianas o balayage personalizadas',        120,  85.0);
    insertServicio.run('Tratamiento capilar', 'Mascarilla nutritiva y tratamiento keratina',            60,  45.0);

    const insertHorario = database.prepare(
      'INSERT INTO horarios_negocio (dia_semana, hora_apertura, hora_cierre) VALUES (?, ?, ?)'
    );
    for (let d = 1; d <= 6; d++) insertHorario.run(d, '09:00', '20:00');

    const insertTurno = database.prepare(
      'INSERT INTO turnos_empleado (empleado_id, dia_semana, hora_entrada, hora_salida) VALUES (?, ?, ?, ?)'
    );
    const ana  = database.prepare("SELECT id FROM usuarios WHERE email='ana@agendaflow.com'").get();
    const luis = database.prepare("SELECT id FROM usuarios WHERE email='luis@agendaflow.com'").get();
    const sara = database.prepare("SELECT id FROM usuarios WHERE email='sara@agendaflow.com'").get();

    for (let d = 1; d <= 5; d++) insertTurno.run(ana.id,  d, '09:00', '18:00');
    for (let d = 2; d <= 6; d++) insertTurno.run(luis.id, d, '10:00', '19:00');
    for (let d = 1; d <= 6; d++) insertTurno.run(sara.id, d, '09:00', '15:00');

    const clients = database.prepare("SELECT id FROM usuarios WHERE rol='cliente' ORDER BY id").all();
    const [cli1, cli2, cli3, cli4, cli5, cli6] = clients;
    const servicios = database.prepare('SELECT id, duracion_min FROM servicios ORDER BY id').all();
    const svc = {};
    servicios.forEach((s, i) => { svc[i + 1] = s; });

    const insertCita = database.prepare(
      'INSERT INTO citas (cliente_id, empleado_id, servicio_id, fecha, hora_inicio, hora_fin, estado) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    const insertResena = database.prepare(
      'INSERT INTO resenas (cita_id, cliente_id, empleado_id, puntuacion, comentario) VALUES (?, ?, ?, ?, ?)'
    );

    function addMin(timeStr, minutes) {
      const [h, m] = timeStr.split(':').map(Number);
      const total = h * 60 + m + minutes;
      return String(Math.floor(total / 60)).padStart(2, '0') + ':' + String(total % 60).padStart(2, '0');
    }

    function relDate(offsetDays) {
      const d = new Date();
      d.setDate(d.getDate() + offsetDays);
      return d.toISOString().split('T')[0];
    }

    function cita(clienteId, empleadoId, svcKey, dateOffset, hora, estado, resena) {
      const s = svc[svcKey];
      const fecha = relDate(dateOffset);
      const fin = addMin(hora, s.duracion_min);
      const info = insertCita.run(clienteId, empleadoId, s.id, fecha, hora, fin, estado);
      if (resena && estado === 'completada') {
        insertResena.run(info.lastInsertRowid, clienteId, empleadoId, resena[0], resena[1]);
      }
    }

    // Semana -6
    cita(cli1.id, ana.id,  1, -42, '09:00', 'completada', [5, 'Ana es genial, quede encantada con el corte.']);
    cita(cli2.id, luis.id, 3, -41, '10:00', 'completada', [4, 'Muy buena manicura, duradera.']);
    cita(cli3.id, sara.id, 1, -40, '09:30', 'completada', [5, 'Excelente trato y muy profesional.']);
    cita(cli4.id, ana.id,  6, -40, '11:00', 'completada', [4, 'El tratamiento capilar dejo mi pelo genial.']);
    cita(cli5.id, luis.id, 4, -39, '10:30', 'completada', [5, 'La mejor pedicura que me han hecho!']);
    cita(cli6.id, sara.id, 1, -39, '09:00', 'cancelada');
    cita(cli1.id, luis.id, 5, -38, '10:00', 'completada', [5, 'Las mechas quedaron preciosas.']);
    cita(cli2.id, ana.id,  2, -38, '09:00', 'completada', [3, 'Bien, aunque espere un poco mas de lo previsto.']);

    // Semana -5
    cita(cli3.id, ana.id,  1, -35, '10:00', 'completada', [5, 'Siempre perfecta con Ana.']);
    cita(cli4.id, luis.id, 3, -34, '11:00', 'completada', [4, 'Buena manicura, recomendada.']);
    cita(cli5.id, sara.id, 6, -34, '09:00', 'completada', [5, 'El tratamiento de keratina cambio mi pelo por completo.']);
    cita(cli6.id, ana.id,  2, -33, '09:30', 'completada', [4, 'El tinte quedo muy natural, estoy contenta.']);
    cita(cli1.id, luis.id, 4, -33, '10:00', 'completada', [5, 'Muy cuidadoso y profesional.']);
    cita(cli2.id, sara.id, 1, -32, '09:00', 'cancelada');
    cita(cli3.id, luis.id, 5, -32, '11:00', 'completada', [4, 'Las mechas quedaron bien, volveria.']);
    cita(cli4.id, ana.id,  1, -31, '09:00', 'completada', [5, 'Rapido y perfecto.']);
    cita(cli5.id, sara.id, 3, -31, '10:00', 'completada', [4, 'Manicura cuidada y duradera.']);

    // Semana -4
    cita(cli6.id, ana.id,  6, -28, '09:00', 'completada', [5, 'Increible resultado con la keratina.']);
    cita(cli1.id, luis.id, 3, -27, '10:30', 'completada', [4, 'Luis es muy detallista.']);
    cita(cli2.id, ana.id,  1, -27, '11:00', 'completada', [5, 'El mejor corte en mucho tiempo.']);
    cita(cli3.id, sara.id, 4, -26, '09:00', 'completada', [5, 'Pedicura fantastica, muy relajante.']);
    cita(cli4.id, luis.id, 2, -26, '10:00', 'completada', [4, 'Muy buen tinte, duro semanas.']);
    cita(cli5.id, ana.id,  5, -25, '09:30', 'completada', [5, 'Las mechas salieron espectaculares.']);
    cita(cli6.id, sara.id, 1, -25, '09:00', 'cancelada');
    cita(cli1.id, ana.id,  4, -24, '10:00', 'completada', [5, 'Siempre perfecta con Ana.']);
    cita(cli2.id, luis.id, 6, -24, '11:00', 'completada', [4, 'Tratamiento muy hidratante.']);

    // Semana -3
    cita(cli3.id, ana.id,  2, -21, '09:00', 'completada', [5, 'Color precioso, exactamente lo pedido.']);
    cita(cli4.id, sara.id, 3, -20, '09:00', 'completada', [4, 'Manicura muy cuidada.']);
    cita(cli5.id, luis.id, 1, -20, '10:00', 'completada', [3, 'Bien, nada especial.']);
    cita(cli6.id, ana.id,  5, -19, '09:30', 'completada', [5, 'Las mechas quedaron perfectas! Ana es una artista.']);
    cita(cli1.id, luis.id, 4, -19, '11:00', 'completada', [5, 'Muy profesional, pedicura impecable.']);
    cita(cli2.id, sara.id, 6, -18, '09:00', 'completada', [4, 'El tratamiento dejo el pelo muy suave.']);
    cita(cli3.id, luis.id, 3, -18, '10:30', 'cancelada');
    cita(cli4.id, ana.id,  1, -17, '09:00', 'completada', [5, 'Rapidisima y el resultado inmejorable.']);
    cita(cli5.id, sara.id, 2, -17, '09:00', 'completada', [4, 'Tinte muy bien aplicado.']);

    // Semana -2
    cita(cli6.id, luis.id, 5, -14, '10:00', 'completada', [5, 'Mechas californianas preciosas.']);
    cita(cli1.id, ana.id,  3, -13, '09:00', 'completada', [5, 'Manicura excelente, duro 3 semanas.']);
    cita(cli2.id, sara.id, 1, -13, '09:30', 'completada', [4, 'Corte limpio y bien acabado.']);
    cita(cli3.id, ana.id,  6, -12, '10:00', 'completada', [5, 'Tratamiento espectacular, el pelo me brilla.']);
    cita(cli4.id, luis.id, 4, -12, '11:00', 'completada', [4, 'Pedicura muy completa.']);
    cita(cli5.id, ana.id,  2, -11, '09:00', 'completada', [5, 'El tinte quedo exactamente como lo queria.']);
    cita(cli6.id, sara.id, 3, -11, '09:00', 'cancelada');
    cita(cli1.id, luis.id, 1, -10, '10:00', 'completada', [4, 'Buen corte, volvere.']);
    cita(cli2.id, ana.id,  5, -10, '09:30', 'completada', [5, 'Las mejores mechas que he tenido!']);

    // Semana -1
    cita(cli3.id, sara.id, 4, -7,  '09:00', 'completada', [5, 'Pedicura maravillosa.']);
    cita(cli4.id, ana.id,  1, -6,  '09:00', 'completada', [4, 'Corte muy bien hecho.']);
    cita(cli5.id, luis.id, 6, -6,  '10:30', 'completada', [5, 'Tratamiento de keratina increible.']);
    cita(cli6.id, ana.id,  3, -5,  '10:00', 'completada', [5, 'Manicura perfecta, muy detallada.']);
    cita(cli1.id, sara.id, 2, -5,  '09:00', 'completada', [4, 'Tinte bien, aunque tardo un poco.']);
    cita(cli2.id, luis.id, 5, -4,  '10:00', 'completada', [5, 'Luis es un crack con las mechas.']);
    cita(cli3.id, ana.id,  4, -4,  '09:30', 'cancelada');
    cita(cli4.id, sara.id, 1, -3,  '09:00', 'completada', [5, 'Sara muy amable y rapida.']);
    cita(cli5.id, ana.id,  6, -3,  '10:00', 'completada', [4, 'Tratamiento muy hidratante.']);

    // Semana actual + proximas 2 semanas (confirmadas)
    cita(cli1.id, ana.id,  1,  0,  '09:00', 'confirmada');
    cita(cli6.id, luis.id, 3,  0,  '10:00', 'confirmada');
    cita(cli2.id, sara.id, 4,  0,  '09:00', 'confirmada');
    cita(cli3.id, ana.id,  2,  1,  '09:30', 'confirmada');
    cita(cli4.id, luis.id, 1,  1,  '11:00', 'confirmada');
    cita(cli5.id, sara.id, 3,  1,  '09:00', 'confirmada');
    cita(cli6.id, ana.id,  5,  2,  '10:00', 'confirmada');
    cita(cli1.id, luis.id, 6,  2,  '10:30', 'confirmada');
    cita(cli2.id, ana.id,  1,  3,  '09:00', 'confirmada');
    cita(cli3.id, sara.id, 4,  3,  '09:00', 'confirmada');
    cita(cli4.id, luis.id, 2,  4,  '10:00', 'confirmada');
    cita(cli5.id, ana.id,  3,  4,  '11:00', 'confirmada');
    cita(cli6.id, sara.id, 1,  5,  '09:00', 'confirmada');
    cita(cli1.id, ana.id,  5,  7,  '09:30', 'confirmada');
    cita(cli2.id, luis.id, 4,  7,  '10:00', 'confirmada');
    cita(cli3.id, sara.id, 6,  8,  '09:00', 'confirmada');
    cita(cli4.id, ana.id,  1,  8,  '09:00', 'confirmada');
    cita(cli5.id, luis.id, 3,  9,  '11:00', 'confirmada');
    cita(cli6.id, ana.id,  2, 10,  '09:00', 'confirmada');
    cita(cli1.id, sara.id, 4, 10,  '09:30', 'confirmada');

    console.log('Seed completo - 3 empleados, 6 clientes, 6 servicios, ~90 citas en 6 semanas.');
  }

  return database;
}

module.exports = { getDb, initDb };
