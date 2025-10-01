export function authorize(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.rol)) {
      return res.status(403).json({ error: 'No autorizado para esta acción' });
    }
    next();
  };
}

// Middleware específico para que profesionales solo accedan a sus datos
export function onlyOwnData(req, res, next) {
  if (req.user.rol === 'profesional') {
    req.filterByProfesional = req.user.sub; // ID del profesional
  }
  next();
}
