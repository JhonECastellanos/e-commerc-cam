# Operación, despliegue y recuperación

## Desarrollo local seguro

1. Copia `.env.example` como `.env`; crea secretos únicos y la primera cuenta de administración. No reutilices ni subas ese archivo.
2. Ejecuta `docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build` para exponer PostgreSQL y API sólo en desarrollo. Para la configuración equivalente a producción usa únicamente `docker compose up --build -d`.
3. Comprueba `GET /api/health/live` y `GET /api/health/ready`. Cada respuesta y cada log incluye `X-Request-ID`/`request_id`.

## Producción

- Termina TLS en un proxy o plataforma administrada; expón sólo el frontend/proxy, nunca PostgreSQL ni Uvicorn directamente.
- Define `APP_ENV=production`, `FRONTEND_ORIGINS=https://dominio`, `TRUSTED_HOSTS=dominio` y secretos de al menos 32 caracteres. El backend se niega a iniciar con valores de ejemplo.
- Guarda PostgreSQL y archivos privados en volúmenes/servicios administrados. Los acuerdos PDF no se sirven desde el directorio público.
- Usa una instancia de Redis para rate limit y caché antes de añadir réplicas; el límite local actual es una barrera inicial, no un control distribuido.

## Recuperación ante fallos

1. Detén escrituras, conserva logs y el `request_id` de los errores.
2. Restaura PostgreSQL en una instancia aislada desde un respaldo probado; valida conteos, referencias e integridad antes de redirigir tráfico.
3. Restaura los volúmenes `uploads_data` y `private_agreements` con la misma ventana temporal del respaldo de base de datos.
4. Rota secretos y tokens después de un incidente; investiga el log de auditoría sin copiar PII a tickets.

## CI/CD y rollback

El flujo CI bloquea compilación, análisis estático y vulnerabilidades de severidad alta. El despliegue debe ejecutar migraciones, health/readiness y un smoke test antes de mover tráfico. Publica imágenes versionadas e inmutables; para revertir, despliega la imagen anterior compatible y restaura la base de datos sólo si la migración fue reversible y validada.
