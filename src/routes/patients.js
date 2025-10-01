import express from 'express';
import { pool } from '../db.js';
import { auth } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';

const router = express.Router();

// Listar pacientes
router.get('/', auth, async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    let sql, params;

    if (req.user.rol === 'profesional') {
      // Profesionales solo ven pacientes con turnos asignados a ellos
      if (q) {
        sql = `select distinct p.* from paciente p 
               join turno t on p.id = t.paciente_id 
               where t.profesional_id = $1 
               and (p.apellido ilike $2 or p.nombre ilike $2 or p.dni ilike $2)
               order by p.apellido, p.nombre limit 100`;
        params = [req.user.sub, '%' + q + '%'];
      } else {
        sql = `select distinct p.* from paciente p 
               join turno t on p.id = t.paciente_id 
               where t.profesional_id = $1
               order by p.apellido, p.nombre limit 100`;
        params = [req.user.sub];
      }
    } else {
      // Secretarias y admin ven todos los pacientes
      if (q) {
        sql = 'select * from paciente where (apellido ilike $1 or nombre ilike $1 or dni ilike $1) order by apellido, nombre limit 100';
        params = ['%' + q + '%'];
      } else {
        sql = 'select * from paciente order by apellido, nombre limit 100';
        params = [];
      }
    }

    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (e) {
    console.error('List patients error:', e);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Crear paciente (secretaria y admin)
router.post('/', auth, authorize(['secretaria', 'admin']), async (req, res) => {
  try {
    const { 
      dni, apellido, nombre, telefono, email, 
      fecha_nacimiento, direccion, obra_social, numero_afiliado 
    } = req.body || {};
    
    if (!apellido || !nombre) {
      return res.status(400).json({ error: 'Apellido y nombre son obligatorios' });
    }

    const { rows } = await pool.query(
      `insert into paciente (dni, apellido, nombre, telefono, email, fecha_nacimiento, direccion, obra_social, numero_afiliado)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning *`,
      [
        dni || null, apellido, nombre, telefono || null, email || null,
        fecha_nacimiento || null, direccion || null, obra_social || null, numero_afiliado || null
      ]
    );
    
    res.status(201).json(rows[0]);
  } catch (e) {
    console.error('Create patient error:', e);
    if (e.code === '23505') { // unique constraint
      res.status(400).json({ error: 'El DNI ya existe' });
    } else {
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
});

// Obtener paciente por ID
router.get('/:id', auth, async (req, res) => {
  try {
    let sql, params;
    
    if (req.user.rol === 'profesional') {
      // Profesionales solo pueden ver pacientes con turnos asignados a ellos
      sql = `select distinct p.* from paciente p 
             join turno t on p.id = t.paciente_id 
             where p.id = $1 and t.profesional_id = $2`;
      params = [req.params.id, req.user.sub];
    } else {
      sql = 'select * from paciente where id = $1';
      params = [req.params.id];
    }

    const { rows } = await pool.query(sql, params);
    if (!rows.length) {
      return res.status(404).json({ error: 'Paciente no encontrado' });
    }
    
    res.json(rows[0]);
  } catch (e) {
    console.error('Get patient error:', e);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Actualizar paciente (secretaria y admin)
router.put('/:id', auth, authorize(['secretaria', 'admin']), async (req, res) => {
  try {
    const { 
      dni, apellido, nombre, telefono, email, 
      fecha_nacimiento, direccion, obra_social, numero_afiliado 
    } = req.body || {};
    
    if (!apellido || !nombre) {
      return res.status(400).json({ error: 'Apellido y nombre son obligatorios' });
    }

    const { rows } = await pool.query(
      `update paciente set 
       dni=$1, apellido=$2, nombre=$3, telefono=$4, email=$5, 
       fecha_nacimiento=$6, direccion=$7, obra_social=$8, numero_afiliado=$9
       where id=$10 returning *`,
      [
        dni || null, apellido, nombre, telefono || null, email || null,
        fecha_nacimiento || null, direccion || null, obra_social || null, 
        numero_afiliado || null, req.params.id
      ]
    );
    
    if (!rows.length) {
      return res.status(404).json({ error: 'Paciente no encontrado' });
    }
    
    res.json(rows[0]);
  } catch (e) {
    console.error('Update patient error:', e);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
