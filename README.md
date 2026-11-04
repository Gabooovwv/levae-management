# Virgo szabadságkezelés

Next.js felület a szabadságigényekhez, shadcn komponensekkel és MySQL adatbázissal.

A színek és a Gilroy betű a [virgo.hu](https://virgo.hu) arculatát követik. A betűfájlok a nyilvános oldalról származnak; a magyar ékezetekhez a rendszer betűje a tartalék.

## Indítás

```bash
docker compose up -d
npm install
npm run db:setup
npm run dev
```

- Alkalmazás: http://localhost:3002
- phpMyAdmin: http://localhost:8081 (`root` / `root`, adatbázis: `leave_management`)
- MySQL a gépről: `127.0.0.1:3307` (`leave` / `leave`)

A belépés a `/login` oldalon történik, Google-fiókkal vagy egy közös felhasználónév/jelszó űrlapon. Ha a MySQL-ben a felhasználónak van jelszóhash-e (admin), a rendszer a helyi jelszót ellenőrzi, és nem hívja az LDAP-ot. Egyébként LDAP-pal azonosít, majd az e-mail alapján a MySQL felhasználóhoz köti. A mintaadatokban Kovács Péter címe `peter.kovacs@virgo.hu`. Az admin, aki a szervezeti fát kezeli: `admin@virgo.hu` / `VirgoAdmin2026`. A szabadságkérelmet a dolgozó felettese kapja, és ő hagyja jóvá vagy utasítja el.

## Google belépés

A `.env` fájlban:

```env
APP_ORIGIN="http://localhost:3002"
GOOGLE_CLIENT_ID="...."
GOOGLE_CLIENT_SECRET="...."
GOOGLE_HOSTED_DOMAIN="virgo.hu"
```

A [Google Cloud Console](https://console.cloud.google.com/apis/credentials) OAuth 2.0 kliensénél az Authorized redirect URI:

`http://localhost:3002/api/auth/google/callback`

Csak olyan Google-fiókkal lehet belépni, amelynek e-mailje már szerepel a dolgozók között. A `GOOGLE_HOSTED_DOMAIN` opcionális; ha kitöltöd, csak az adott Workspace-domainről fogad belépést.
