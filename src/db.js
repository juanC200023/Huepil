import pg from 'pg';
const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('Missing DATABASE_URL env var');
  process.exit(1);
}

export const pool = new Pool({
  connectionString: databaseUrl,
  ssl: databaseUrl.includes('sslmode=require') ? { rejectUnauthorized: false } : false
});

export async function init() {
  try {
    await pool.query(`
      -- Tabla de usuarios (admin, secretaria, profesional)
      create table if not exists usuario (
        id bigserial primary key,
        email text not null unique,
        pass_hash text not null,
        rol text not null check (rol in ('admin','secretaria','profesional')),
        nombre text,
        apellido text,
        especialidad text,
        activo boolean not null default true,
        created_at timestamptz not null default now()
      );

      -- Tabla de pacientes
      create table if not exists paciente (
        id bigserial primary key,
        dni text unique,
        apellido text not null,
        nombre text not null,
        telefono text,
        email text,
        fecha_nacimiento date,
        direccion text,
        obra_social text,
        numero_afiliado text,
        activo boolean not null default true,
        created_at timestamptz not null default now()
      );

      -- Tabla de turnos
      create table if not exists turno (
        id bigserial primary key,
        paciente_id bigint not null references paciente(id),
        profesional_id bigint not null references usuario(id),
        fecha timestamptz not null,
        centro text,
        servicio text,
        estado text not null default 'reservado' check (estado in ('reservado','presente','ausente','cancelado','ausente_profesional')),
        notas text,
        created_at timestamptz not null default now(),
        created_by bigint references usuario(id)
      );

      -- Tabla de historias clínicas
      create table if not exists historia_clinica (
        id bigserial primary key,
        paciente_id bigint not null references paciente(id),
        profesional_id bigint not null references usuario(id),
        fecha timestamptz not null default now(),
        tipo text not null default 'consulta' check (tipo in ('consulta','seguimiento','diagnostico','tratamiento')),
        titulo text not null,
        descripcion text not null,
        medicamentos text,
        indicaciones text,
        created_at timestamptz not null default now()
      );

      -- Índices para mejorar rendimiento
      create index if not exists idx_paciente_nombre on paciente (apellido, nombre);
      create index if not exists idx_paciente_dni on paciente (dni);
      create index if not exists idx_turno_fecha on turno (fecha);
      create index if not exists idx_turno_profesional on turno (profesional_id);
      create index if not exists idx_turno_paciente on turno (paciente_id);
      create index if not exists idx_historia_paciente on historia_clinica (paciente_id);
      create index if not exists idx_historia_profesional on historia_clinica (profesional_id);
    `);
    console.log('Database initialized successfully');
  } catch (err) {
    console.error('Error initializing database:', err);
    process.exit(1);
  }
}

// Función para cerrar el pool correctamente
export async function closePool() {
  await pool.end();
}

await init();
