import express from 'express';
import { pool } from '../db.js';
import { auth } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';

const router = express.Router();

// Crear historia clínica/seguimiento (solo profesionales)
router.post('/', auth, authorize(['profesional']), async (req, res) => {
  try {
    const { paciente_id, tipo, titulo, descripcion, medicamentos, indicaciones } = req.body || {};
    
    if (!paciente_id || !titulo || !descripcion) {
      return res.status(400).json({ error: 'paciente_id, titulo y descripcion son obligatorios' });
    }
    
    // Verificar que el profesional tenga acceso a este paciente
    const { rows: accessCheck } = await pool.query(`
      select 1 from turno where paciente_id = $1 and profesional_id = $2 limit 1
    `, [paciente_id, req.user.sub]);
    
    if (!accessCheck.length) {
      return res.status(403).json({ error: 'No tiene acceso a este paciente' });
    }

    const { rows } = await pool.query(
      `insert into historia_clinica (paciente_id, profesional_id, tipo, titulo, descripcion, medicamentos, indicaciones)
       values ($1,$2,$3,$4,$5,$6,$7) returning *`,
      [paciente_id, req.user.sub, tipo || 'consulta', titulo, descripcion, medicamentos || null, indicaciones || null]
    );
    
    res.status(201).json(rows[0]);
  } catch (e) {
    console.error('Create historia error:', e);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Listar historias clínicas de un paciente
router.get('/paciente/:paciente_id', auth, async (req, res) => {
  try {
    let sql, params;
    
    if (req.user.rol === 'profesional') {
      // Verificar acceso del profesional al paciente
      const { rows: accessCheck } = await pool.query(`
        select 1 from turno where paciente_id = $1 and profesional_id = $2 limit 1
      `, [req.params.paciente_id, req.user.sub]);
      
      if (!accessCheck.length) {
        return res.status(403).json({ error: 'No tiene acceso a este paciente' });
      }
      
      // Profesional ve todas las historias del paciente
      sql = `
        select 
          h.*,
          u.nombre as profesional_nombre,
          u.apellido as profesional_apellido,
          u.especialidad
        from historia_clinica h
        join usuario u on h.profesional_id = u.id
        where h.paciente_id = $1
        order by h.fecha desc
      `;
      params = [req.params.paciente_id];
    } else {
      // Secretaria y admin ven todas las historias
      sql = `
        select 
          h.*,
          u.nombre as profesional_nombre,
          u.apellido as profesional_apellido,
          u.especialidad
        from historia_clinica h
        join usuario u on h.profesional_id = u.id
        where h.paciente_id = $1
        order by h.fecha desc
      `;
      params = [req.params.paciente_id];
    }

    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (e) {
    console.error('List historias error:', e);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener historia clínica por ID
router.get('/:id', auth, async (req, res) => {
  try {
    let sql, params;
    
    if (req.user.rol === 'profesional') {
      sql = `
        select 
          h.*,
          p.apellido as paciente_apellido,
          p.nombre as paciente_nombre,
          u.nombre as profesional_nombre,
          u.apellido as profesional_apellido
        from historia_clinica h
        join paciente p on h.paciente_id = p.id
        join usuario u on h.profesional_id = u.id
        join turno t on t.paciente_id = h.paciente_id
        where h.id = $1 and t.profesional_id = $2
        limit 1
      `;
      params = [req.params.id, req.user.sub];
    } else {
      sql = `
        select 
          h.*,
          p.apellido as paciente_apellido,
          p.nombre as paciente_nombre,
          u.nombre as profesional_nombre,
          u.apellido as profesional_apellido
        from historia_clinica h
        join paciente p on h.paciente_id = p.id
        join usuario u on h.profesional_id = u.id
        where h.id = $1
      `;
      params = [req.params.id];
    }

    const { rows } = await pool.query(sql, params);
    if (!rows.length) {
      return res.status(404).json({ error: 'Historia clínica no encontrada' });
    }
    
    res.json(rows[0]);
  } catch (e) {
    console.error('Get historia error:', e);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Actualizar historia clínica (solo el profesional que la creó)
router.put('/:id', auth, authorize(['profesional']), async (req, res) => {
  try {
    const { tipo, titulo, descripcion, medicamentos, indicaciones } = req.body || {};
    
    if (!titulo || !descripcion) {
      return res.status(400).json({ error: 'titulo y descripcion son obligatorios' });
    }

    const { rows } = await pool.query(
      `update historia_clinica set 
       tipo=$1, titulo=$2, descripcion=$3, medicamentos=$4, indicaciones=$5
       where id=$6 and profesional_id=$7 returning *`,
      [tipo || 'consulta', titulo, descripcion, medicamentos || null, indicaciones || null, req.params.id, req.user.sub]
    );
    
    if (!rows.length) {
      return res.status(404).json({ error: 'Historia clínica no encontrada o no autorizado' });
    }
    
    res.json(rows[0]);
  } catch (e) {
    console.error('Update historia error:', e);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
