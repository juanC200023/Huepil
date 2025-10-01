import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { pool, closePool } from '../src/db.js';

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const nombre = process.env.ADMIN_NOMBRE || 'Administrador';
  const apellido = process.env.ADMIN_APELLIDO || 'Sistema';
  
  if (!email || !password) {
    console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD env vars');
    process.exit(1);
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `insert into usuario (email, pass_hash, rol, nombre, apellido)
       values ($1,$2,'admin',$3,$4)
       on conflict (email) do update set 
       pass_hash=excluded.pass_hash, 
       rol='admin',
       nombre=excluded.nombre,
       apellido=excluded.apellido
       returning id, email, rol, nombre, apellido`,
      [email, hash, nombre, apellido]
    );
    console.log('Admin user ready:', rows[0]);
  } catch (e) {
    console.error('Error creating admin:', e);
    process.exit(1);
  } finally {
    await closePool();
  }
  
  process.exit(0);
}

main();
