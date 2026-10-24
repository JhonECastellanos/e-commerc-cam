FROM node:20-alpine AS build

WORKDIR /app

COPY package.json ./
COPY package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Run nginx as a non-root user. The default pid path /run/nginx.pid is not writable by
# appuser (/var/run is a symlink to /run, which chown -R does not follow), so point the pid
# and listen port to locations this user can write/bind.
RUN addgroup -S appgroup && adduser -S appuser -G appgroup \
    && sed -i 's/listen       80;/listen       8080;/' /etc/nginx/conf.d/default.conf \
    && sed -i 's|^pid .*;|pid /tmp/nginx.pid;|' /etc/nginx/nginx.conf \
    && chown -R appuser:appgroup /var/cache/nginx /usr/share/nginx/html
USER appuser
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
