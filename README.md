# GMAO Template

Plantilla base del sistema GMAO para desplegar en una empresa nueva.

## Requisitos

- Node.js 18+
- PostgreSQL 14+

## Estructura

- `backend/`: API Fastify, PostgreSQL, migraciones y servicios de correo.
- `frontend/`: interfaz React/Vite.

## Preparacion inicial

1. Instalar dependencias:
   - `cd backend && npm install`
   - `cd frontend && npm install`
2. Crear `backend/.env` a partir de `backend/.env.example`.
3. Crear una base de datos PostgreSQL vacia.
4. Ejecutar migraciones:
   - `cd backend && npm run migrate`
5. Compilar frontend:
   - `cd frontend && npm run build`
6. Arrancar backend:
   - `cd backend && npm start`

## Datos iniciales

- `npm run db:seed` carga un dataset de demostracion minimo y generico.
- No usar `db:seed` si quieres arrancar completamente vacio.

## Datos y archivos que no se suben

- `.env`
- `backend/uploads`
- `backend/manuals`
- `backend/dist`
- `node_modules`

## Despliegue en otra empresa

Antes de usar esta plantilla:

- Configura correo SMTP propio.
- Cambia branding, titulo y logo si aplica.
- Revisa emails por defecto y destinatarios.
- Ajusta seed de demostracion o no lo uses.
