# CropMarket Django API

REST backend for the Online Crop Market frontend (`../`).

## Setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_demo
python manage.py runserver
```

Open [http://127.0.0.1:8000/](http://127.0.0.1:8000/) for the site (HTML, CSS, JS, and API on one port).

You can also serve the frontend with Live Server on port 5500; the browser will call the API at `http://127.0.0.1:8000/api`.

## Demo accounts (password `123456`)

| Email | Role |
|-------|------|
| `buyer@demo.com` | Customer |
| `farmer@demo.com` | Farmer |

Additional farmer accounts are created for each seeded crop (e.g. `grace@demo.com`).

## Promo code

- `FRESH10` — 10% off (stored on server cart when logged in)

## API overview

| Method | Path | Auth |
|--------|------|------|
| POST | `/api/auth/register/` | — |
| POST | `/api/auth/login/` | — |
| POST | `/api/auth/logout/` | Token |
| GET | `/api/auth/me/` | Token |
| GET/POST | `/api/crops/` | POST: farmer token |
| GET/PATCH/DELETE | `/api/crops/{id}/` | Owner farmer |
| GET | `/api/crops/?mine=1&format=admin` | Farmer |
| GET | `/api/cart/` | Token |
| POST | `/api/cart/add_item/` | Token |
| POST | `/api/cart/update_item/` | Token |
| POST | `/api/cart/remove_item/` | Token |
| POST | `/api/cart/apply_promo/` | Token |
| POST | `/api/checkout/` | Token |
| GET/POST | `/api/messages/` | Token |
| POST | `/api/messages/{id}/mark_read/` | Token |
| GET | `/api/analytics/farmer/` | Farmer token |
| POST | `/api/auth/password-reset/` | — (sends email) |
| POST | `/api/auth/password-reset/confirm/` | — |

Use header: `Authorization: Token <key>` from login/register.

### Password reset (development)

Emails go to the **console** (`EMAIL_BACKEND=console`). After “Forgot password?” on the login page, copy the link from the `runserver` terminal or from the browser console when `DEBUG` returns `reset_link`.

## Reseed demo data

```bash
python manage.py seed_demo
```

Existing demo users are kept; missing crops and users are added.
