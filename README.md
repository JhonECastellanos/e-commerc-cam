# InstalaCámara

Plataforma comercial de cámaras de seguridad e instalación, con catálogo, cotizaciones, agenda y demostraciones interactivas de hogar inteligente.

Frontend React/TypeScript, backend FastAPI y PostgreSQL, ejecutados mediante Docker Compose.

La configuración, credenciales, sesiones y documentación operativa se mantienen únicamente en el entorno local. No deben publicarse en Git.

## Validación

- Frontend: `npm ci`, `npm test` y `npm run build` desde `frontend`.
- Backend: instalar `backend/requirements-dev.txt` y ejecutar las pruebas en un entorno aislado.
- La integración continua comprueba pruebas, compilación y auditorías de dependencias.

Las fotografías comerciales y recursos públicos son necesarios para el catálogo y las demostraciones. La administración requiere autenticación y no está disponible por la entrada pública.
