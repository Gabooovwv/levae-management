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

- Alkalmazás: http://localhost:3000
- phpMyAdmin: http://localhost:8081 (`root` / `root`, adatbázis: `leave_management`)
- MySQL a gépről: `127.0.0.1:3307` (`leave` / `leave`)

A belépés a `/login` oldalon történik, Google-fiókkal vagy egy közös felhasználónév/jelszó űrlapon. Ha a MySQL-ben a felhasználónak van jelszóhash-e (admin), a rendszer a helyi jelszót ellenőrzi, és nem hívja az LDAP-ot. Egyébként LDAP-pal azonosít, majd az e-mail alapján a MySQL felhasználóhoz köti. A Google és az LDAP adatait a `.env` fájlban kell megadni. A mintaadatokban Kovács Péter címe `peter.kovacs@virgo.hu`. Az admin, aki a szervezeti fát kezeli: `admin@virgo.hu` / `VirgoAdmin2026`. A szabadságkérelmet a dolgozó felettese kapja, és ő hagyja jóvá vagy utasítja el.
