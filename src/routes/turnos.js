import express from 'express';
import { pool } from '../db.js';
import { auth } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';

const router = express.Router();

// Crear turno (secretaria y admin)
router.post('/', auth, authorize(['secretaria', 'admin']), async (req, res) => {
  try {
    const { paciente_id, profesional_id, fecha, centro, servicio, notas } = req.body || {};
    
    if (!paciente_id || !profesional_id || !fecha) {
      return res.status(400).json({ error: 'paciente_id, profesional_id y fecha son obligatorios' });
    }
    
    const d = new Date(fecha);
    if (isNaN(d.getTime())) {
      return res.status(400).json({ error: 'fecha inválida; usar ISO 8601' });
    }

    const { rows } = await pool.query(
      `insert into turno (paciente_id, profesional_id, fecha, centro, servicio, notas, created_by)
       values ($1,$2,$3,$4,$5,$6,$7) returning *`,
      [paciente_id, profesional_id, fecha, centro || null, servicio || null, notas || null, req.user.sub]
    );
    
    res.status(201).json(rows[0]);
  } catch (e) {
    console.error('Create turno error:', e);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Listar turnos
router.get('/', auth, async (req, res) => {
  try {
    const { desde, hasta, profesional_id, paciente_id, estado } = req.query;
    const cond = [];
    const vals = [];
    
    // Filtros de fecha
    if (desde) { vals.push(desde); cond.push(`t.fecha >= $${vals.length}`); }
    if (hasta) { vals.push(hasta); cond.push(`t.fecha < $${vals.length}`); }
    if (estado) { vals.push(estado); cond.push(`t.estado = $${vals.length}`); }
    if (paciente_id) { vals.push(paciente_id); cond.push(`t.paciente_id = $${vals.length}`); }
    
    // Control de acceso según rol
    if (req.user.rol === 'profesional') {
      vals.push(req.user.sub);
      cond.push(`t.profesional_id = $${vals.length}`);
    } else if (profesional_id) {
      vals.push(profesional_id);
      cond.push(`t.profesional_id = $${vals.length}`);
    }
    
    const where = cond.length ? ('where ' + cond.join(' and ')) : '';
    
    const { rows } = await pool.query(`
      select 
        t.*,
        p.apellido as paciente_apellido,
        p.nombre as paciente_nombre,
        p.dni as paciente_dni,
        p.telefono as paciente_telefono,
        u.nombre as profesional_nombre,
        u.apellido as profesional_apellido,
        u.especialidad
      from turno t
      join paciente p on t.paciente_id = p.id
      join usuario u on t.profesional_id = u.id
      ${where}
      order by t.fecha asc 
      limit 500
    `, vals);
    
    res.json(rows);
  } catch (e) {
    console.error('List turnos error:', e);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener turnos del día para profesional
router.get('/hoy', auth, authorize(['profesional']), async (req, res) => {
  try {
    const { rows } = await pool.query(`
      select 
        t.*,
        p.apellido as paciente_apellido,
        p.nombre as paciente_nombre,
        p.dni as paciente_dni,
        p.telefono as paciente_telefono
      from turno t
      join paciente p on t.paciente_id = p.id
      where t.profesional_id = $1 
      and t.fecha::date = current_date
      order by t.fecha asc
    `, [req.user.sub]);
    
    res.json(rows);
  } catch (e) {
    console.error('Get today turnos error:', e);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Cambiar estado del turno
router.patch('/:id/estado', auth, authorize(['secretaria', 'admin', 'profesional']), async (req, res) => {
  try {
    const { estado } = req.body || {};
    const valid = ['reservado','presente','ausente','cancelado','ausente_profesional'];
    
    if (!valid.includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido' });
    }

    let sql, params;
    if (req.user.rol === 'profesional') {
      // Profesionales solo pueden modificar sus propios turnos
      sql = 'update turno set estado=$1 where id=$2 and profesional_id=$3 returning *';
      params = [estado, req.params.id, req.user.sub];
    } else {
      sql = 'update turno set estado=$1 where id=$2 returning *';
      params = [estado, req.params.id];
    }
    
    const { rows } = await pool.query(sql, params);
    if (!rows.length) {
      return res.status(404).json({ error: 'Turno no encontrado' });
    }
    
    res.json(rows[0]);
  } catch (e) {
    console.error('Update turno estado error:', e);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener turno por ID
router.get('/:id', auth, async (req, res) => {
  try {
    let sql, params;
    
    if (req.user.rol === 'profesional') {
      sql = `
        select 
          t.*,
          p.apellido as paciente_apellido,
          p.nombre as paciente_nombre,
          p.dni as paciente_dni,
          p.telefono as paciente_telefono
        from turno t
        join paciente p on t.paciente_id = p.id
        where t.id = $1 and t.profesional_id = $2
      `;
      params = [req.params.id, req.user.sub];
    } else {
      sql = `
        select 
          t.*,
          p.apellido as paciente_apellido,
          p.nombre as paciente_nombre,
          p.dni as paciente_dni,
          p.telefono as paciente_telefono,
          u.nombre as profesional_nombre,
          u.apellido as profesional_apellido
        from turno t
        join paciente p on t.paciente_id = p.id
        join usuario u on t.profesional_id = u.id
        where t.id = $1
      `;
      params = [req.params.id];
    }

    const { rows } = await pool.query(sql, params);
    if (!rows.length) {
      return res.status(404).json({ error: 'Turno no encontrado' });
    }
    
    res.json(rows[0]);
  } catch (e) {
    console.error('Get turno error:', e);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
