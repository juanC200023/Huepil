# Sistema Huepil

Node.js + Express + Postgres.

## Archivos clave
- `server.js`: servidor Express
- `public/index.html`, `public/app.js`: frontend (login -> `/api/auth/login`)
- `src/routes/`: rutas (`/api/auth`, `/api/patients`, etc.)
- `Dockerfile`: build de imagen para despliegue
- `.dockerignore`: exclusiones
- `.env.example`: variables necesarias

## Variables de entorno
```
PORT=8080
DATABASE_URL=postgres://neondb_owner:PASS@ep-xxxx.sa-east-1.aws.neon.tech/neondb?sslmode=require
JWT_SECRET=una_clave_larga_y_unica
ALLOWED_ORIGINS=http://TU_DOMINIO,https://TU_DOMINIO,http://103.199.185.202:8080,http://localhost:8080
```

> **No** subas `.env` con secretos. Cargalas en el panel donde despliegues (EasyPanel).

## Build local (opcional)

```bash
docker build -t huepil:clean .
docker run --rm -p 8080:8080 \
  -e PORT=8080 \
  -e DATABASE_URL="postgres://..." \
  -e JWT_SECRET="..." \
  -e ALLOWED_ORIGINS="http://localhost:8080" \
  huepil:clean
```

Probar:
```
curl -i http://localhost:8080/health
```

## Notas del frontend
- En `public/index.html` se define `window.API_BASE = ''`. Si el backend está en otro host/puerto, setear ahí la URL base.
- `app.js` usa `loginEmail` y `loginPassword` (IDs únicos) para evitar choques con otros formularios.
