import express from 'express';
import { pool } from '../db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { auth } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';

const router = express.Router();

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  console.error('Missing JWT_SECRET env var');
  process.exit(1);
}

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña requeridos' });
    }

    const { rows } = await pool.query('select * from usuario where email=$1 and activo=true', [email]);
    if (!rows.length) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.pass_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { 
        sub: user.id, 
        rol: user.rol, 
        email: user.email,
        nombre: user.nombre,
        apellido: user.apellido 
      }, 
      jwtSecret, 
      { expiresIn: '12h' }
    );
    
    res.json({ 
      token,
      user: {
        id: user.id,
        email: user.email,
        rol: user.rol,
        nombre: user.nombre,
        apellido: user.apellido,
        especialidad: user.especialidad
      }
    });
  } catch (e) {
    console.error('Login error:', e);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Crear usuario (solo admin)
router.post('/usuarios', auth, authorize(['admin']), async (req, res) => {
  try {
    const { email, password, rol, nombre, apellido, especialidad } = req.body;
    if (!email || !password || !rol || !nombre || !apellido) {
      return res.status(400).json({ error: 'Campos obligatorios: email, password, rol, nombre, apellido' });
    }

    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `insert into usuario (email, pass_hash, rol, nombre, apellido, especialidad)
       values ($1,$2,$3,$4,$5,$6) returning id, email, rol, nombre, apellido, especialidad, created_at`,
      [email, hash, rol, nombre, apellido, especialidad || null]
    );
    
    res.status(201).json(rows[0]);
  } catch (e) {
    console.error('Create user error:', e);
    if (e.code === '23505') { // unique constraint
      res.status(400).json({ error: 'El email ya existe' });
    } else {
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
});

// Listar usuarios (solo admin)
router.get('/usuarios', auth, authorize(['admin','secretaria']), async (req, res) => {
  try {
    const { rows } = await pool.query(
      'select id, email, rol, nombre, apellido, especialidad, activo, created_at from usuario order by apellido, nombre'
    );
    res.json(rows);
  } catch (e) {
    console.error('List users error:', e);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener perfil del usuario actual
router.get('/me', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'select id, email, rol, nombre, apellido, especialidad from usuario where id=$1',
      [req.user.sub]
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json(rows[0]);
  } catch (e) {
    console.error('Get profile error:', e);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
