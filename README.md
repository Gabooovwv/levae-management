# Virgo szabadságkezelés

Next.js alkalmazás szabadságigények leadására, felettesi jóváhagyásra és szervezeti adminisztrációra. UI: shadcn + Virgo arculat; adat: MySQL (Prisma).

## Indítás

```bash
docker compose up -d
npm install
cp .env.example .env   # ha még nincs .env
npm run db:setup
npm run dev
```

| Szolgáltatás | URL / kapcsolat |
| --- | --- |
| Alkalmazás | http://localhost:3002 |
| phpMyAdmin | http://localhost:8081 (`root` / `root`) |
| MySQL | `127.0.0.1:3307` (`leave` / `leave`, DB: `leave_management`) |

**Minta belépés**

- Admin (szervezet + munkarend): `admin@virgo.hu` / `VirgoAdmin2026`
- Dolgozó (seed): `peter.kovacs@virgo.hu` (LDAP vagy jelszó a seed szerint)
- Google: csak akkor, ha az e-mail már szerepel a `User` táblában

Ha a MySQL leállt, a Prisma pool beragadhat — `docker compose up -d` után érdemes újraindítani a `npm run dev`-et.

---

## Szerepkörök és menük

| Szerep | Mit lát / mit csinál |
| --- | --- |
| **admin** | Dolgozók (`/szervezet`), munkarend (`/munkarend`), beállítások (`/beallitasok`), riportok. Nincs saját szabadságigény, nincs Csapatom / Jóváhagyások. |
| **dolgozó / vezető / HR** | Áttekintés, Szabadságaim, Naptár, Riportok. |
| **Van közvetlen beosztottja** (`managerId` rá mutat) | Emellett: Csapatom, Jóváhagyások; a fejléc harangján a függő kérelmek száma. |

A felettes–beosztott kapcsolat a szervezeti fában (`User.managerId`) él, nem pusztán a `role` mezőn.

---

## Fő folyamatok

### 1. Szabadságigény (dolgozó)

1. **Új szabadságigény** a kezdőlapon vagy a Szabadságaim oldalon.
2. Jogcím, kezdőnap, opcionálisan **fél nap** (ekkor az utolsó nap inaktív, `workDays = 0,5`).
3. A rendszer a **munkanapokat** számolja (lásd munkarend), ellenőrzi a keretet és az átfedést.
4. Státusz: `pending`. Értesítés + e-mail a felettesnek és a dolgozónak.
5. Ha nincs kiadható nap (elfogadott + függő figyelembevétele), a gomb **inaktív**.

**Keret**

- Éves keret: `LeaveBalance.totalDays`
- Felhasznált: jóváhagyott, keretet csökkentő jogcímek `workDays` összege
- Kiadható: `totalDays − usedDays`
- A függő igények a keretellenőrzésbe beleszámítanak (új igény nem lépheti túl)

### 2. Jóváhagyás (felettes)

1. Fejléc **harang** → jobb oldali sheet a `pending` kérelmekkel.
2. Kiválasztás → modal: jóváhagyás / elutasítás.
3. A dolgozó értesítést és e-mailt kap. Jóváhagyáskor a kiadható napok csökkennek.

A `/jovahagyasok` oldal ugyanezt a listát szolgálja táblázatos formában.

### 3. Munkarend (admin)

`/munkarend` — egész éves naptár.

Kattintás ciklusa egy napra:

1. alapértelmezett → **munkaszüneti**
2. → **áthelyezett munkanap** (pl. szombat, ami mégis munkanap)
3. → vissza alapra

**Számítás szabályai** (`isWorkday`):

- Hétvége **nem** számít, kivéve ha áthelyezett munkanap.
- Munkaszüneti nap **nem** számít (hétköznapi ünnep sem).
- Áthelyezett munkanap **számít**, ha beleesik az igény intervallumába.

Így két hét szabadságnál a közben lévő ünnep nem megy el a keretből, a szombati munkanap viszont igen.

Ha az admin módosít egy napot a munkarendben, az összes **pending/approved** igény, ami tartalmazza azt a napot, automatikusan újraszámolja a `workDays` értékét (pl. áthelyezett szombat visszavonása → kevesebb nap; új ledolgozós szombat → több nap).

### 4. Szervezet (admin)

`/szervezet`

- Dolgozók **lista** (alap) és **fa** nézet (összecsukható, szintenként színek).
- Keresés / szűrők jobb oldali sheetben.
- Katalógusok: beosztás, részleg, szerep — felvétel, hoverrel törlés.
- Dolgozó: felvétel, szerkesztés, passzívvá tétel / újraaktiválás, törlés (beosztottak áthelyezése).
- Éves szabadságkeret megadása; listában összes / kiadható; dupla kattintás a listában csak az összes nap gyorsszerkesztése.

### 5. Egyéb oldalak

- **Áttekintés** — keret, közelgő távollét, legutóbbi igények, csapat távollétei (ha van beosztott).
- **Naptár** — DB-ből: saját (jóváhagyott/függő) és csapat (beosztottak / azonos felettes) távollétek munkanapokra; jobb oldalon saját időszaklista.
- **Csapatom** — a közvetlen beosztottak listája (keret + következő távollét); cégválasztótól független.
- **Riportok** — DB-ből: saját éves összesítő; ha van beosztott, **Saját / Csapatom** tabok; adminnak szervezeti riport.

---

## Értesítések és e-mail

| Esemény | Kik kapnak |
| --- | --- |
| Új igény | Dolgozó + felettes (app értesítés + e-mail) |
| Elutasítás | Dolgozó |
| Jóváhagyás | Dolgozó + a Beállításokban felvett extra e-mail címek (`ApprovalNotifyEmail`) |

A dolgozó a fejléc harangjával jobb oldali sheetben látja az értesítéseket: **új = fehér**, **olvasott (egyszer rákattintott) = szürke**. A felettesnél emellett a függő kérelmek panelje is megmarad.

Az extra címzetteket az admin a `/beallitasok` oldalon kezeli. Csak **elfogadott** kérelmekről kapnak másolatot.

**Localhost:** nincs SMTP. Minden levél az `emails/` mappába íródik:  
`emails/[cimzett].[datum].txt`  
A mappa a `.gitignore`-ban van.

---

## Beléptetés

1. **Google OAuth** — `/api/auth/google` → callback; csak regisztrált e-mail; opcionális `GOOGLE_HOSTED_DOMAIN`.
2. **Űrlap** — ha van `passwordHash` (pl. admin), helyi jelszó; különben LDAP (`LDAP_*` env), majd e-mail → MySQL user.
3. Session cookie (`AUTH_SECRET`); passzív felhasználó nem léphet be.

`.env` Google részlet:

```env
APP_ORIGIN="http://localhost:3002"
GOOGLE_CLIENT_ID="...."
GOOGLE_CLIENT_SECRET="...."
GOOGLE_HOSTED_DOMAIN="virgo.hu"
```

Redirect URI a Google Console-ban:  
`http://localhost:3002/api/auth/google/callback`

---

## Adatmodell (röviden)

| Entitás | Szerepe |
| --- | --- |
| `User` | Dolgozó, `managerId`, `role`, aktív/passzív |
| `LeaveBalance` | Éves keret + negyedéves kvóták |
| `LeaveType` | Jogcím; `deductsBalance` = csökkenti-e a keretet |
| `LeaveRequest` | Időszak, `workDays` (float), `halfDay`, státusz |
| `CalendarDay` | `holiday` / `workday` felülírás egy dátumra |
| `Notification` | Fejléc / in-app értesítések |
| `ApprovalNotifyEmail` | Extra címzettek jóváhagyott kérelmekről |
| `Company`, `Department`, `JobTitle`, `StaffRole` | Katalógusok |

---

## Technikai stack

- **Next.js 16** App Router, Server Actions (`src/app/actions.ts`)
- **Prisma 7** + MariaDB adapter → `src/generated/prisma`
- **UI:** React 19, Tailwind 4, shadcn / Base UI
- Adatelérés: `src/lib/data.ts`; dátum / munkanap: `src/lib/dates.ts` + `src/lib/work-calendar.ts`
- E-mail log: `src/lib/mail.ts`

Hasznos scripek: `db:generate`, `db:push`, `db:seed`, `db:setup` (= generate + push + seed).

## AI agent / Cursor

- `AGENTS.md` — rövid agent útmutató
- `.cursor/rules/` — mindig érvényes termék- és stack-szabályok
- `.cursor/skills/` — skill-ek: leave-domain, leave-request-flow, work-calendar, org-admin, local-dev-db
