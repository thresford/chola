# Online Crop Market (CropMarket)

Zambian crop marketplace — static frontend plus **Django REST API** for auth, catalog, cart, checkout, and orders.

## Quick start (recommended)

```bash
cd backend
source .venv/bin/activate   # create venv first — see backend/README.md
python manage.py migrate
python manage.py seed_demo
python manage.py runserver
```

Open **http://127.0.0.1:8000/** (site + API on one port).

### Demo logins (password `123456`)

| Email | Role |
|-------|------|
| `buyer@demo.com` | Customer — shop, cart, checkout, **My orders** |
| `farmer@demo.com` | Farmer — dashboard, crop CRUD, incoming orders |

Promo on cart: **`FRESH10`** (10% off).

## Frontend-only fallback

If Django is not running, the UI still works with browser `localStorage` and the built-in crop catalog (demo mode). With the API running, signed-in users use the server for catalog, cart, checkout, and order history.

## Project layout

| Path | Purpose |
|------|---------|
| `*.html`, `script.js`, `style.css` | Frontend |
| `api-client.js` | REST client |
| `backend/` | Django project (`cropmarket`, app `marketplace`) |

See [backend/README.md](backend/README.md) for API endpoints and admin.
