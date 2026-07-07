# Kingshot Alliance Discord Bot

Bot Discord pentru alianța ta din **Kingshot**: înregistrare Player ID, detectare automată coduri noi, notificări în canal, redeem opțional.

---

## Cuprins

1. [Discord Developer Portal — pas cu pas](#1-discord-developer-portal--pas-cu-pas)
2. [Structura proiectului](#2-structura-proiectului)
3. [Instalare locală (Windows / VPS)](#3-instalare-locală)
4. [MariaDB — creare tabele](#4-mariadb)
5. [Configurare .env](#5-configurare-env)
6. [Pornire și testare](#6-pornire-și-testare)
7. [Deploy pe VPS (Docker)](#7-deploy-docker)
8. [Deploy pe VPS (PM2)](#8-deploy-pm2)
9. [Comenzi slash](#9-comenzi-slash)
10. [Redeem automat — IMPORTANT](#10-redeem-automat--important)
11. [Viitor: JEABSlist integration](docs/JEABS_INTEGRATION.md) — documentat, neimplementat

---

## 1. Discord Developer Portal — pas cu pas

### Pas 1.1 — Creează aplicația

1. Deschide [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **New Application**
3. Nume: `Kingshot Alliance Bot` (sau cum vrei)
4. Bifează Terms → **Create**

### Pas 1.2 — Creează bot-ul

1. În meniul stânga: **Bot**
2. Click **Add Bot** → confirmă
3. La **Privileged Gateway Intents**: **nu** ai nevoie de Message Content — lasă totul dezactivat
4. Click **Reset Token** → **Copy** → salvează token-ul într-un loc sigur (îl pui în `.env`)

> ⚠️ **Nu împărtăși niciodată token-ul.** Dacă l-ai expus, apasă Reset Token imediat.

### Pas 1.3 — Notează Client ID

1. Meniu stânga: **OAuth2** → **General**
2. Copiază **Client ID** → îl pui în `.env` ca `DISCORD_CLIENT_ID`

### Pas 1.4 — Invită botul în server

1. Meniu stânga: **OAuth2** → **URL Generator**
2. La **Scopes** bifează: `bot`, `applications.commands`
3. La **Bot Permissions** bifează minim:
   - Send Messages
   - Embed Links
   - Use Slash Commands
4. Copiază URL-ul generat, deschide-l în browser
5. Alege serverul alianței → **Authorize**

### Pas 1.5 — ID-uri Discord (Server, Canal, Roluri)

Activează **Developer Mode** în Discord: Settings → Advanced → Developer Mode ON.

| Ce ai nevoie | Cum îl obții |
|---|---|
| Server ID | Click dreapta pe numele serverului → Copy Server ID → `DISCORD_GUILD_ID` |
| Canal coduri | Click dreapta pe canalul unde vrei notificări → Copy Channel ID → `GIFT_CODES_CHANNEL_ID` |
| Rol R4/Admin | Server Settings → Roles → click dreapta pe rol → Copy Role ID → `ADMIN_ROLE_IDS` |

---

## 2. Structura proiectului

```
gift-code/
├── .env.example          # Șablon variabile mediu
├── .gitignore
├── docker-compose.yml    # MariaDB + bot în Docker
├── Dockerfile
├── ecosystem.config.js   # Config PM2
├── package.json
├── README.md
├── sql/
│   └── schema.sql        # Tabele MariaDB
└── src/
    ├── index.js          # Pornire bot
    ├── deploy-commands.js
    ├── config.js
    ├── commands/
    │   ├── register.js
    │   ├── myid.js
    │   ├── removeid.js
    │   ├── codes.js
    │   ├── redeem.js     # Opțional
    │   └── redeemall.js  # Opțional, doar admin
    ├── db/
    │   ├── pool.js
    │   └── queries.js
    ├── services/
    │   ├── giftCodeChecker.js   # Verifică kingshot.net
    │   └── kingshotRedeem.js    # Redeem experimental
    └── utils/
        ├── logger.js
        └── randomDelay.js
```

---

## 3. Instalare locală

### Windows (PC-ul tău)

```powershell
# Instalează Node.js 20 LTS de pe https://nodejs.org
node -v   # trebuie >= 18

cd "C:\Users\DEEPGAMING\Desktop\gift code"
copy .env.example .env
# Editează .env cu token-ul și ID-urile tale

npm install
```

### Linux VPS

```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs mariadb-server git

node -v
npm -v
```

---

## 4. MariaDB

### Varianta A — Docker (recomandat)

```bash
cp .env.example .env
# Completează .env

docker compose up -d mariadb
# Tabelele se creează automat din sql/schema.sql
```

### Varianta B — MariaDB instalat pe VPS

```bash
sudo mysql -u root -p
```

```sql
CREATE DATABASE kingshot_alliance CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'kingshot_bot'@'localhost' IDENTIFIED BY 'parola_ta_puternica';
GRANT ALL PRIVILEGES ON kingshot_alliance.* TO 'kingshot_bot'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

```bash
mysql -u kingshot_bot -p kingshot_alliance < sql/schema.sql
```

---

## 5. Configurare .env

```bash
cp .env.example .env
nano .env
```

| Variabilă | Descriere |
|---|---|
| `DISCORD_TOKEN` | Token bot din Developer Portal |
| `DISCORD_CLIENT_ID` | Application Client ID |
| `DISCORD_GUILD_ID` | ID server (pentru sync rapid comenzi) |
| `GIFT_CODES_CHANNEL_ID` | Canal unde se postează coduri noi |
| `CHECK_CODES_ENABLED` | Scheduler activ (`true`) |
| `CHECK_CODES_CRON` | Cron UTC (default `0 */2 * * *` = la 2h) |
| `ENABLE_AUTO_REDEEM` | Redeem automat la cod nou |
| `OWNER_USER_IDS` | ID-uri Discord (virgulă) — pot folosi `/addadmin` și `/removeadmin` |
| `ADMIN_ROLE_IDS` | ID-uri roluri R4/Admin — drepturi bot fără DB |
| `DB_*` | Conexiune MariaDB |
| `GIFT_CODE_CHECK_INTERVAL_MINUTES` | Cât des verifică coduri (default 10) |
| `ENABLE_AUTO_REDEEM` | `false` la început, `true` după testare |
| `REDEEM_MIN/MAX_DELAY_SECONDS` | Delay random la redeemall (3-8s) |

---

## 6. Pornire și testare

```bash
# 1. Înregistrează comenzile slash pe server
npm run deploy-commands

# 2. Pornește botul
npm start

# Sau cu auto-reload la dezvoltare:
npm run dev
```

### Checklist test

- [ ] Bot apare online în Discord
- [ ] `/register player_id:12345678` — salvează ID-ul
- [ ] `/myid` — afișează datele
- [ ] `/codes` — listează coduri de pe kingshot.net
- [ ] Așteaptă sau forțează verificare — cod nou în canalul configurat
- [ ] `/removeid` — șterge înregistrarea
- [ ] (Opțional) `/redeem code:TEST` — după `ENABLE_AUTO_REDEEM=true`
- [ ] (Opțional) `/redeemall code:TEST` — doar cu rol admin

---

## 7. Deploy Docker

Pe VPS Linux:

```bash
# Clonează / copiază proiectul
cd /opt/kingshot-bot
cp .env.example .env
nano .env

# Pornește tot (MariaDB + bot)
docker compose up -d --build

# Vezi loguri
docker compose logs -f bot

# Oprește
docker compose down

# Repornește după modificări cod
docker compose up -d --build bot
```

Docker setează `restart: unless-stopped` — botul pornește automat după restart VPS.

### Re-deploy comenzi slash (după update comenzi)

```bash
docker compose run --rm bot node src/deploy-commands.js
```

---

## 8. Deploy PM2

Dacă preferi MariaDB nativ + PM2:

```bash
cd /opt/kingshot-bot
npm install --omit=dev
cp .env.example .env
nano .env

mysql -u kingshot_bot -p kingshot_alliance < sql/schema.sql
npm run deploy-commands

# Instalează PM2 global
sudo npm install -g pm2

mkdir -p logs
pm2 start ecosystem.config.js
pm2 save
pm2 startup   # urmează instrucțiunile afișate — pornește la reboot
```

### Comenzi PM2 utile

```bash
pm2 status
pm2 logs kingshot-bot
pm2 restart kingshot-bot
pm2 stop kingshot-bot
```

---

## 9. Comenzi slash

| Comandă | Cine | Descriere |
|---|---|---|
| `/register player_id` | Toți | Înregistrează Player ID (o singură dată) |
| `/myid` | Toți | Afișează Player ID-ul tău |
| `/removeid` | Toți | Șterge înregistrarea |
| `/codes` | Toți | Listează coduri active detectate |
| `/getinfo player_id` | Toți | Info jucător (JEABS + API joc); fără ID = al tău |
| `/redeem code` | Înregistrați | Redeem pentru tine (opțional) |
| `/redeemall code` | Bot admin | Redeem pentru toți, cu delay 3-8s |
| `/setjeabtoken token` | Bot admin | Token JEABS pentru `/getinfo` |
| `/addadmin user` | Owner | Adaugă admin bot în MariaDB |
| `/removeadmin user` | Owner | Elimină admin bot din MariaDB |
| `/listadmins` | Bot admin | Listează adminii din baza de date |
| `/addplayer player_id` | Bot admin | Adaugă jucător în lista redeem (fără Discord OK) |
| `/removeplayer` | Bot admin | Scoate jucător din listă (by ID sau user) |
| `/listplayers` | Bot admin | Listează toți jucătorii din lista redeem |
| `/checkcodes` | Bot admin | Forțează verificare coduri acum |
| `/lastcodes` | Toți | Ultimele coduri detectate |
| `/schedulerstatus` | Bot admin | Status scheduler + redeem |

---

## 9.1 Gestionare admini bot

Botul suportă **trei moduri** de a avea drepturi admin (OR — oricare e suficient):

1. **`OWNER_USER_IDS`** în `.env` — owner complet (`/addadmin`, `/removeadmin`, plus toate comenzile admin)
2. **`ADMIN_ROLE_IDS`** în `.env` — roluri Discord (ex. R4), fără să atingi `.env` după setup
3. **Tabel `bot_admins`** în MariaDB — adăugați din Discord cu `/addadmin`

### Configurează owner-ul (obligatoriu pentru `/addadmin`)

1. Discord → Setări → Avansat → **Developer Mode** ON
2. Click dreapta pe numele tău → **Copy User ID**
3. În `.env`:

```env
OWNER_USER_IDS=123456789012345678
```

4. Repornește botul (`npm start`)

### Comenzi

| Comandă | Cine | Ce face |
|---|---|---|
| `/addadmin user:@Membru` | Owner | Salvează user în `bot_admins` |
| `/removeadmin user:@Membru` | Owner | Șterge din `bot_admins` |
| `/listadmins` | Bot admin | Afișează lista din DB (ephemeral) |

### Comenzi protejate cu `requireAdmin`

- `/redeemall`
- `/setjeabtoken`
- `/listadmins`
- `/addplayer` / `/removeplayer`
- `/listplayers`

### Listă jucători pentru coduri (fără Discord)

Unii membri nu scriu în canalul de register — adminii îi pot adăuga manual:

```
/addplayer player_id:265681775
/addplayer player_id:265681775 note:Alecu
/addplayer player_id:265681775 user:@MembruDiscord
/removeplayer player_id:265681775
/removeplayer user:@MembruDiscord
```

Jucătorii fără cont Discord primesc ID intern `manual:PLAYER_ID` și intră în `/redeemall`.

### Schema DB

Tabelul `bot_admins` se creează **automat** la pornirea botului. Alternativ manual:

```bash
node scripts/setup-tables.js
```

Sau SQL direct:

```sql
CREATE TABLE IF NOT EXISTS bot_admins (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  discord_user_id VARCHAR(32) NOT NULL,
  discord_username VARCHAR(128) NOT NULL,
  added_by_discord_id VARCHAR(32) NOT NULL,
  added_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_bot_admin_discord_user_id (discord_user_id)
) ENGINE=InnoDB;
```

### Test rapid

1. Pune ID-ul tău în `OWNER_USER_IDS` → restart bot
2. `npm run deploy-commands`
3. `/addadmin user:@R4` — ar trebui succes (ephemeral)
4. `/listadmins` — apare userul
5. Userul adăugat poate rula `/setjeabtoken` sau `/redeemall`
6. `/removeadmin user:@R4` — eliminat din DB

---

## 10. Gift Code Scheduler (automat)

Botul verifică **kingshot.net + jeab.dev** la fiecare 2 ore (cron UTC), anunță coduri noi pe Discord și poate face **redeem automat** pentru toți jucătorii înregistrați.

### `.env`

```env
CHECK_CODES_ENABLED=true
CHECK_CODES_CRON=0 */2 * * *
ENABLE_AUTO_REDEEM=true
REDEEM_MIN_DELAY_SECONDS=3
REDEEM_MAX_DELAY_SECONDS=8
GIFT_CODES_CHANNEL_ID=your_channel_id
```

| Variabilă | Descriere |
|---|---|
| `CHECK_CODES_ENABLED` | `true` = scheduler activ |
| `CHECK_CODES_CRON` | Expresie cron **UTC** (default: la fiecare 2h) |
| `ENABLE_AUTO_REDEEM` | `true` = redeem automat la cod nou |
| `REDEEM_MIN/MAX_DELAY_SECONDS` | Pauză random între jucători (3–8s) |

### Flux automat

1. Scheduler rulează (cron sau la pornire după 10s)
2. Fetch coduri → salvează în DB → ignoră coduri cunoscute
3. Cod nou → mesaj în canalul Discord
4. Dacă `ENABLE_AUTO_REDEEM=true` → redeem secvențial pentru toți (max 2 retry/eșec)
5. Rezumat redeem postat în același canal

### Comenzi scheduler

| Comandă | Descriere |
|---|---|
| `/checkcodes` | Verificare imediată (admin) |
| `/lastcodes` | Ultimele coduri din DB |
| `/schedulerstatus` | Cron, next run, jucători, ultimul cod |
| `/redeemall code:X` | Redeem manual forțat (admin) |

### Troubleshooting

| Problemă | Soluție |
|---|---|
| Nu apar coduri | `/checkcodes`, verifică loguri, `CHECK_CODES_ENABLED=true` |
| Nu face redeem | `ENABLE_AUTO_REDEEM=true`, testează `/redeem` pe contul tău |
| „Redeem busy” | Un job e deja activ — așteaptă sau `/schedulerstatus` |
| DB error `announced_at` | Repornește botul (migrare automată) sau `node scripts/setup-tables.js` |

### Deploy după update

```bash
npm install
npm run deploy-commands
npm start
```

---

## 11. Redeem automat — IMPORTANT

### Ce funcționează sigur (faza 1)

- ✅ `/register`, `/myid`, `/removeid`
- ✅ Verificare automată `https://kingshot.net/api/gift-codes`
- ✅ Notificare în canal Discord când apare cod nou
- ✅ `/codes`

### Ce este experimental (faza 2)

Comenzile `/redeem` și `/redeemall` folosesc API-ul neoficial:

```
https://kingshot-giftcode.centurygame.com/api
```

- Reverse-engineered de comunitate (nu documentat oficial)
- Salt MD5 poate să se schimbe → setează `KINGSHOT_REDEEM_SALT` în `.env` dacă e nevoie
- Century Games a cerut oprirea bulk redeem pe kingshot.net
- **Recomandare:** lasă `ENABLE_AUTO_REDEEM=false` până testezi manual `/redeem` pe contul tău

### Activare redeem

```env
ENABLE_AUTO_REDEEM=true
REDEEM_MIN_DELAY_SECONDS=3
REDEEM_MAX_DELAY_SECONDS=8
```

### Erori comune redeem

| err_code | Semnificație |
|---|---|
| 20000 | Succes |
| 40005 | Cod indisponibil global (limită atinsă pe server — nu „l-ai folosit tu”) |
| 40008 / 40011 | Deja folosit pe cont |
| 40014 | Cod invalid |
| 40007 | Cod expirat |
| 40001 | Player ID invalid |

---

## Licență

Proiect privat pentru alianța ta. Folosește responsabil.
