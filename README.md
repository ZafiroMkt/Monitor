# Monitor de Redes (Cloudflare, gratis)

Panel compartido para ti y tu community. Se abre con un link desde PC y celular.

## Requisitos
- Node.js (nodejs.org, versión LTS)
- Cuenta gratuita de Cloudflare y de GitHub

## Despliegue (una sola vez)
1. Abre una terminal en esta carpeta y ejecuta: `npm install`
2. `npx wrangler login` (se abre el navegador; autoriza)
3. `npx wrangler d1 create monitor-redes` → copia el `database_id` que muestra y pégalo en `wrangler.toml`
4. `npx wrangler d1 execute monitor-redes --remote --file=schema.sql`
5. `npx wrangler secret put PANEL_PASSWORD` → escribe la contraseña del panel (la usarán tú y la community; el usuario puede ser cualquiera)
6. En `wrangler.toml` cambia `TZ` si tu zona horaria no es `America/New_York`
7. `npx wrangler deploy` → te da el link, algo como `https://monitor-redes.TU-USUARIO.workers.dev`

Abre el link, escribe cualquier usuario y la contraseña. En el celular puedes usar "Agregar a pantalla de inicio".

## Subirlo a GitHub
Crea un repositorio **privado**, sube esta carpeta (no se sube `.dev.vars` ni `node_modules`). Para que se despliegue solo con cada cambio: Cloudflare → Workers & Pages → tu proyecto → Settings → Builds → conecta el repositorio.

## Conectar Instagram y Facebook (automático cada 30 min)
1. En Meta Business Manager crea un **usuario del sistema** y genera un token con acceso a las páginas y cuentas de Instagram de tus clientes. Los permisos mínimos suelen ser `instagram_basic`, `pages_show_list` y `pages_read_engagement`, pero confírmalo en la documentación de Meta porque cambian.
2. `npx wrangler secret put META_TOKEN` y pega el token.
3. En el panel, al agregar cada cuenta, rellena **ID en Meta**: el ID de la cuenta de Instagram (empresa) o el ID de la página de Facebook.
4. Las cuentas con ID se actualizan solas. Las demás se siguen registrando a mano.
5. Para ver errores de las revisiones: `npx wrangler tail`

## Qué falta
TikTok, DMs, comentarios y campañas activas todavía se llenan a mano. Meta exige revisión de la app para leer DMs y anuncios.

## Probar en tu PC antes de desplegar
`npx wrangler d1 execute monitor-redes --local --file=schema.sql`, crea un archivo `.dev.vars` con `PANEL_PASSWORD=prueba` y ejecuta `npm run dev`.
