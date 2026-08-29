# qualified.at — Landing Page

Static marketing homepage for [qualified.at](https://qualified.at). The page
mirrors the production Rails app's marketing layout (Tabler-based dark theme,
orange primary) so its markup can be ported into the app's homepage view.
The repo also still hosts the reveal.js SFRuby April 2026 deck under `slides/`.

## Directory layout

```
qualified-at-temp/
├── index.html          ← landing page (markup mirrors the production homepage)
├── assets/             ← vendored application CSS + webfonts from qualified.at
├── static/             ← logo and product screenshots used by the homepage
├── serve.json          ← MIME-type fix for npx serve (.md → text/plain)
├── site.webmanifest    ← PWA manifest (favicons)
├── favicon*.png        ← favicons
├── justfile            ← task runner (optional)
└── slides/             ← fully static reveal.js presentation build
    ├── index.html      ← deck entry point (available at /slides/)
    ├── slides.md       ← all slide content
    ├── assets/         ← CSS, JS (Three.js, Vanta, admonitions, typewriter)
    └── vendor/reveal/  ← reveal.js runtime (CSS, JS, plugins, fonts)
```

Everything is static. No build step, no Node runtime, no database.

Note: app links on the homepage (`/users/sign_up`, `/demos/...`, `/docs`,
`/plans/...`) are root-relative and resolve only when the page is served on
the qualified.at domain in front of (or ported into) the Rails app.

## Running locally

Any static file server works. The iframe requires HTTP — plain `file://` will
not load the slides due to browser security policy.

### Python (simplest, already installed on macOS)

```bash
cd qualified-at-temp
python3 -m http.server 8000
# open http://localhost:8000
```

### npx serve

```bash
npx serve .
```

The included `serve.json` configures the correct `Content-Type` for `.md`
files so reveal.js can load `slides.md` via XHR.

### just (if you have justfile support)

```bash
just serve
```

## Deploying with Nginx

Copy (or symlink) the entire `qualified-at-temp/` directory to your web root
and point an Nginx server block at it. Below is a minimal production config.

### 1. Copy files

```bash
sudo mkdir -p /var/www/qualified.at
sudo cp -R qualified-at-temp/* /var/www/qualified.at/
sudo chown -R www-data:www-data /var/www/qualified.at
```

### 2. Nginx config

Save as `/etc/nginx/sites-available/qualified.at` (or under `conf.d/`):

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name qualified.at www.qualified.at;

    root /var/www/qualified.at;
    index index.html;

    # Cache static assets aggressively
    location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Serve .md files as text/plain so reveal.js markdown plugin can fetch them
    location ~* \.md$ {
        types { }
        default_type "text/plain; charset=utf-8";
    }

    # SPA fallback — serve index.html for any path that doesn't match a file
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip
    gzip on;
    gzip_types text/plain text/css text/javascript application/javascript application/json image/svg+xml;
    gzip_min_length 256;
}
```

### 3. Enable and reload

```bash
sudo ln -s /etc/nginx/sites-available/qualified.at /etc/nginx/sites-enabled/
sudo nginx -t          # verify config
sudo systemctl reload nginx
```

### 4. HTTPS (optional but recommended)

```bash
sudo certbot --nginx -d qualified.at -d www.qualified.at
```

Certbot rewrites the server block to add TLS listeners and redirect HTTP to
HTTPS automatically.

## Rebuilding the slides

The `slides/` directory is a static snapshot produced by the presentation's
build script. To regenerate it after editing the deck:

```bash
cd ../inquirex-presentation
npm run build                # outputs to dist/
cp -R dist/ ../qualified-at-temp/slides/
```

## Keyboard shortcuts (embedded presentation)

| Key | Action |
|-----|--------|
| Left / Right arrow | Previous / next slide |
| Up / Down arrow | Previous / next (also works when iframe has focus) |
| F | Fullscreen (when iframe has focus) |
| Esc | Slide overview (when iframe has focus) |
