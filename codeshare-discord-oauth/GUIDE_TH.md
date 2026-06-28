# 📘 คู่มือฉบับสมบูรณ์ — CodeShare Discord (ภาษาไทย)

> เขียนโดย "คลอส" ผู้ช่วยของคุณครับ — คู่มือนี้สอนตั้งแต่ศูนย์จนใช้งานจริงได้ ครอบคลุม Discord OAuth, Backend, ตัว Extension, การ Deploy และการแก้ปัญหา อ่านไล่จากบนลงล่างได้เลยครับ

---

## 🧭 สารบัญ

1. [ภาพรวมโปรเจกต์](#1-ภาพรวมโปรเจกต์)
2. [OAuth คืออะไร (อธิบายจากศูนย์)](#2-oauth-คืออะไร-อธิบายจากศูนย์)
3. [โครงสร้างโฟลเดอร์ทั้งหมด](#3-โครงสร้างโฟลเดอร์ทั้งหมด)
4. [ขั้นที่ 1 — สร้าง Discord Application + Webhook](#4-ขั้นที่-1--สร้าง-discord-application--webhook)
5. [ขั้นที่ 2 — ตั้งค่าและรัน Backend](#5-ขั้นที่-2--ตั้งค่าและรัน-backend)
6. [ขั้นที่ 3 — รันตัว Extension](#6-ขั้นที่-3--รันตัว-extension)
7. [การไหลของข้อมูล (Data Flow)](#7-การไหลของข้อมูล-data-flow)
8. [อธิบายไฟล์ทุกไฟล์](#8-อธิบายไฟล์ทุกไฟล์)
9. [การตั้งค่า (Settings) ทั้งหมด](#9-การตั้งค่า-settings-ทั้งหมด)
10. [Wizard, History, Notifications](#10-wizard-history-notifications)
11. [การ Debug และแก้ปัญหา OAuth](#11-การ-debug-และแก้ปัญหา-oauth)
12. [การ Build, Package (.vsix) และ Publish](#12-การ-build-package-vsix-และ-publish)
13. [การ Deploy Backend ขึ้น Production](#13-การ-deploy-backend-ขึ้น-production)
14. [Checklist สรุปก่อนใช้งานจริง](#14-checklist-สรุปก่อนใช้งานจริง)

---

## 1. ภาพรวมโปรเจกต์

**CodeShare Discord** คือชุดโปรแกรม 2 ส่วนที่ทำงานร่วมกัน เพื่อให้เราแชร์โค้ดจาก VS Code ไปยังห้อง Discord ได้ โดย**ทุกข้อความจะระบุชัดเจนว่าใครเป็นคนส่ง** (ดึงตัวตนจากการล็อกอิน Discord จริง ไม่ใช่พิมพ์ชื่อเอง)

```
┌──────────────────┐   OAuth login    ┌─────────────────┐   forward    ┌──────────────┐
│  VS Code         │ ───────────────► │  Secure Backend │ ───────────► │  Discord     │
│  Extension       │ ◄─────────────── │  (Express API)  │   webhook    │  Channel     │
│  (เครื่องผู้ใช้)    │   session token  │  (เก็บความลับ)    │              │              │
└──────────────────┘                  └─────────────────┘              └──────────────┘
```

**ทำไมต้องมี Backend?** เพราะของลับ 3 อย่างนี้ **ห้ามอยู่บนเครื่องผู้ใช้เด็ดขาด**:
- `Client Secret` ของ Discord App
- `Webhook URL` (ใครได้ไปก็ยิงข้อความเข้าห้องได้)
- `Access Token / Refresh Token` ของผู้ใช้

Backend จะถือของลับเหล่านี้ไว้ฝั่งเซิร์ฟเวอร์ ส่วน Extension จะถือแค่ "session token" (JWT ใบเดียว) ที่เปิดดูแล้วไม่เจอความลับอะไรเลยครับ

---

## 2. OAuth คืออะไร (อธิบายจากศูนย์)

### 2.1 ปัญหาที่ OAuth มาแก้

สมมติเราอยากรู้ว่า "ใครเป็นคนส่งโค้ด" วิธีที่แย่ที่สุดคือให้ผู้ใช้พิมพ์ชื่อ Discord เอง เพราะปลอมได้ทันที OAuth แก้ปัญหานี้โดยให้ **Discord เป็นคนยืนยันตัวตนให้** แล้วส่งข้อมูลจริงกลับมาให้เรา

### 2.2 Authorization Code Flow (แบบที่โปรเจกต์นี้ใช้)

นี่คือ flow มาตรฐานที่ปลอดภัยที่สุดสำหรับแอปที่มี backend ลำดับเป็นแบบนี้ครับ:

1. **เริ่ม:** Extension เปิดเบราว์เซอร์ไปที่ Backend → Backend สร้างค่า `state` (กันการปลอมคำขอ) แล้ว redirect ไปหน้า authorize ของ Discord
2. **ผู้ใช้กด Authorize:** Discord ถามผู้ใช้ว่าอนุญาตไหม (ขอ scope `identify`, `email`)
3. **Discord ส่ง `code` กลับ:** Discord redirect กลับมาที่ `Backend/oauth/callback?code=...&state=...`
4. **แลก token:** Backend เอา `code` + `Client Secret` ไปแลกเป็น `access_token` + `refresh_token` กับ Discord (ขั้นนี้เกิดฝั่ง server เท่านั้น Client Secret จึงไม่รั่ว)
5. **ดึงโปรไฟล์:** Backend เอา `access_token` ไปเรียก `/users/@me` ได้ข้อมูล User ID, Username, Global Name, Avatar, Email
6. **ออกบัตรผ่าน:** Backend สร้าง **session JWT** (เซ็นด้วย `SESSION_SECRET`) แล้ว redirect กลับ VS Code ผ่านลิงก์ `vscode://...`
7. **Extension เก็บบัตร:** Extension รับ JWT มาเก็บใน SecretStorage และใช้แนบทุกครั้งที่เรียก `/api/share`

> **หัวใจสำคัญ:** `code` ใช้ได้ครั้งเดียวและอายุสั้นมาก ส่วน `access_token` จะหมดอายุ เราจึงมี `refresh_token` ไว้ขอใหม่อัตโนมัติ (ดูข้อ 7.3)

### 2.3 ศัพท์ที่ต้องรู้

| คำ | แปลไทยแบบเข้าใจง่าย |
|---|---|
| Client ID | เลขประจำตัวแอป (เปิดเผยได้) |
| Client Secret | รหัสลับของแอป (ห้ามรั่ว) |
| Redirect URI | ที่อยู่ที่ Discord จะส่งผู้ใช้กลับมาหลัง authorize |
| Scope | สิทธิ์ที่เราขอ เช่น `identify` (ดูโปรไฟล์), `email` (ดูอีเมล) |
| Authorization Code | ตั๋วชั่วคราวที่เอาไปแลก token |
| Access Token | กุญแจเรียก API ของ Discord (อายุสั้น) |
| Refresh Token | ตั๋วไว้ขอ Access Token ใบใหม่ |
| State | ค่าสุ่มกัน CSRF บน callback |

---

## 3. โครงสร้างโฟลเดอร์ทั้งหมด

```
codeshare-discord-oauth/
├── README.md                 ← ภาพรวม + ลิงก์คู่มือ (อังกฤษ)
├── GUIDE_TH.md               ← คู่มือเล่มนี้ (ไทย)
├── CHANGELOG.md
├── LICENSE
│
├── backend/                  ← เซิร์ฟเวอร์ OAuth + Webhook (ถือความลับ)
│   ├── package.json
│   ├── tsconfig.json
│   ├── .eslintrc.json
│   ├── .env.example          ← แม่แบบค่าคอนฟิก (คัดลอกเป็น .env)
│   └── src/
│       ├── index.ts          ← จุดเริ่มเซิร์ฟเวอร์
│       ├── app.ts            ← ประกอบ Express app
│       ├── config/
│       │   ├── env.ts        ← อ่าน+ตรวจสอบ environment
│       │   └── logger.ts     ← logger แบบ JSON
│       ├── middleware/
│       │   ├── auth.ts       ← ตรวจ session JWT
│       │   ├── rateLimit.ts  ← จำกัดอัตราเรียก
│       │   ├── requestLogger.ts
│       │   └── errorHandler.ts
│       ├── routes/
│       │   ├── oauth.ts      ← /oauth/start, /oauth/callback
│       │   └── api.ts        ← /api/me, /api/share, /api/logout, /api/connection
│       ├── services/
│       │   ├── discordOAuth.ts   ← สร้าง URL, แลก/รีเฟรช token, ดึง user
│       │   ├── sessionService.ts ← ออก/ตรวจ JWT, รีเฟรชอัตโนมัติ
│       │   ├── tokenStore.ts     ← เก็บ token ของ Discord ฝั่ง server
│       │   ├── embedBuilder.ts   ← สร้าง embed "Code Shared"
│       │   └── webhookForwarder.ts ← ส่งเข้า webhook (inline/ไฟล์)
│       ├── utils/
│       │   ├── http.ts       ← ตัวช่วยเรียก HTTPS (built-in)
│       │   └── state.ts      ← เก็บค่า state กัน CSRF
│       ├── types/index.ts
│       └── views/callbackPages.ts ← หน้า HTML สำเร็จ/ล้มเหลว
│
└── extension/                ← ตัว VS Code Extension (เครื่องผู้ใช้)
    ├── package.json          ← manifest: คำสั่ง, เมนู, view, settings
    ├── tsconfig.json
    ├── resources/            ← ไอคอน
    └── src/
        ├── extension.ts      ← activate() ต่อทุกอย่างเข้าด้วยกัน
        ├── auth/
        │   ├── authService.ts   ← flow login/logout/reconnect/auto-login
        │   ├── sessionStore.ts  ← เก็บ JWT ใน SecretStorage
        │   └── uriHandler.ts    ← รับลิงก์ vscode://.../auth
        ├── api/backendClient.ts ← เรียก Backend (me/share/logout)
        ├── config/configuration.ts
        ├── commands/
        │   ├── authCommands.ts
        │   ├── shareCommands.ts
        │   └── shareController.ts ← ออร์เคสเตรตการแชร์
        ├── services/payloadBuilder.ts ← เก็บโค้ด+เมทาดาทา
        ├── history/historyManager.ts
        ├── notifications/notify.ts
        ├── providers/        ← 5 view ในแถบข้าง
        │   ├── accountProvider.ts
        │   ├── quickShareProvider.ts
        │   ├── connectionProvider.ts
        │   ├── historyProvider.ts
        │   └── settingsProvider.ts
        ├── views/statusBar.ts
        ├── wizard/welcomeWizard.ts ← หน้าต้อนรับครั้งแรก
        ├── utils/  (logger, format, languageMap, validation)
        └── types/index.ts
```

---

## 4. ขั้นที่ 1 — สร้าง Discord Application + Webhook

### 4.1 สร้างแอปและเอา Client ID / Secret

**ทำอะไร:** ไปที่ https://discord.com/developers/applications → กด **New Application** → ตั้งชื่อ เช่น `CodeShare`
1. เข้าเมนู **OAuth2** ทางซ้าย
2. คัดลอก **Client ID** เก็บไว้
3. กด **Reset Secret** เพื่อดู **Client Secret** แล้วคัดลอกเก็บไว้ (โชว์ครั้งเดียว)

**ทำทำไม:** Client ID/Secret คือบัตรประจำตัวแอปเรา ใช้ตอนแลก token
**ผลลัพธ์:** ได้เลข 2 ชุดไปใส่ใน `.env` ของ backend
**ข้อผิดพลาดที่พบบ่อย:** ลืมกด Reset Secret แล้วหาที่คัดลอกไม่เจอ → กด Reset ใหม่ได้ (ของเก่าจะใช้ไม่ได้)

### 4.2 ตั้ง OAuth2 Redirect URI

**ทำอะไร:** ในหน้า **OAuth2 → Redirects** กด **Add Redirect** แล้วใส่ให้ตรงกับ backend เป๊ะๆ:
- ตอน dev: `http://localhost:8787/oauth/callback`
- ตอน production: `https://โดเมนของคุณ/oauth/callback`

> ⚠️ ค่านี้ต้อง**ตรงทุกตัวอักษร**กับ `DISCORD_REDIRECT_URI` ใน `.env` มิฉะนั้นจะเจอ error `invalid_redirect_uri`

**ทำทำไม:** Discord จะยอม redirect กลับเฉพาะที่อยู่ที่อยู่ใน whitelist นี้เท่านั้น (ความปลอดภัย)
**ผลลัพธ์:** Discord รู้จักปลายทางที่จะส่ง `code` กลับมา

> 💡 หมายเหตุเรื่อง `vscode://...`: เราไม่ต้องใส่ลิงก์ `vscode://` ใน Discord เพราะ Discord จะ redirect มาที่ **backend** ก่อน แล้ว backend ค่อยส่งต่อไป VS Code เองครับ

### 4.3 เลือก Scopes

โปรเจกต์นี้ใช้ scope:
- `identify` — เพื่อดึง User ID, Username, Global Name, Avatar (จำเป็น)
- `email` — เพื่อดึงอีเมล (ใส่หรือไม่ก็ได้)

ค่าเหล่านี้ตั้งใน `.env` ที่ `DISCORD_SCOPES="identify email"` (ไม่ต้องไปติ๊กใน Discord เพราะเราส่ง scope ตอน redirect)

### 4.4 สร้าง Webhook ของห้องที่จะรับโค้ด

**ทำอะไร:** ใน Discord เปิดห้องที่ต้องการ → **Edit Channel (รูปเฟือง)** → **Integrations** → **Webhooks** → **New Webhook** → ตั้งชื่อ/รูป → **Copy Webhook URL**
**ทำทำไม:** Webhook คือช่องทางส่งข้อความเข้าห้องโดยไม่ต้องมีบอท
**ผลลัพธ์:** ได้ URL หน้าตาแบบ `https://discord.com/api/webhooks/<id>/<token>` เอาไปใส่ `DISCORD_WEBHOOK_URL`
**ข้อผิดพลาด:** ต้องมีสิทธิ์ **Manage Webhooks** ในห้องนั้น ไม่งั้นจะไม่เห็นเมนู

---

## 5. ขั้นที่ 2 — ตั้งค่าและรัน Backend

### 5.1 ติดตั้ง Node.js และ dependencies

ต้องมี **Node.js เวอร์ชัน 18 ขึ้นไป** (เช็คด้วย `node -v`) จากนั้น:

```bash
cd backend
npm install
```

**ผลลัพธ์:** ได้โฟลเดอร์ `node_modules` ครบ

### 5.2 สร้างไฟล์ .env

**ทำอะไร:** คัดลอกแม่แบบแล้วแก้ค่า:

```bash
cp .env.example .env
```

เปิด `.env` แล้วกรอก:

```ini
PORT=8787
PUBLIC_BASE_URL=http://localhost:8787
DISCORD_CLIENT_ID=<Client ID จากข้อ 4.1>
DISCORD_CLIENT_SECRET=<Client Secret จากข้อ 4.1>
DISCORD_REDIRECT_URI=http://localhost:8787/oauth/callback
DISCORD_SCOPES=identify email
DISCORD_WEBHOOK_URL=<Webhook URL จากข้อ 4.4>
SESSION_SECRET=<สุ่มยาวๆ ดูข้อ 5.3>
SESSION_TTL=7d
EXTENSION_REDIRECT_URI=vscode://your-publisher-name.codeshare-discord/auth
```

> ✅ `EXTENSION_REDIRECT_URI` ต้องเป็นรูปแบบ `vscode://<publisher>.<ชื่อ extension>/auth` ค่าเริ่มต้นตรงกับ `package.json` ของ extension อยู่แล้ว ถ้าคุณเปลี่ยน `publisher` ในภายหลัง อย่าลืมแก้ตรงนี้ให้ตรงกันด้วยครับ

### 5.3 สร้าง SESSION_SECRET ที่ปลอดภัย

รันคำสั่งนี้แล้วเอาผลไปวางใน `.env`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

**ทำทำไม:** ค่านี้ใช้เซ็น JWT ถ้าสั้นหรือเดาง่าย คนอื่นอาจปลอม session ได้

### 5.4 รัน Backend

โหมดพัฒนา (รีโหลดอัตโนมัติ):
```bash
npm run dev
```
หรือโหมด production:
```bash
npm run build
npm start
```

**ผลลัพธ์ที่ควรเห็น:** log บอกว่า `CodeShare Discord backend started` พร้อม `OAuth start endpoint: http://localhost:8787/oauth/start`

### 5.5 ทดสอบว่า Backend ทำงาน

```bash
# ควรได้ {"status":"ok",...}
curl http://localhost:8787/health

# ควรได้ HTTP 302 ชี้ไป discord.com/oauth2/authorize?...
curl -i "http://localhost:8787/oauth/start"
```

ถ้า `/oauth/start` เด้งไป Discord พร้อมพารามิเตอร์ `client_id`, `redirect_uri`, `scope`, `state` แสดงว่าตั้งค่าถูกต้องครับ

---

## 6. ขั้นที่ 3 — รันตัว Extension

### 6.1 ติดตั้งและคอมไพล์

```bash
cd extension
npm install
npm run compile
```

### 6.2 เปิด Extension Development Host

1. เปิดโฟลเดอร์ `extension/` ด้วย VS Code
2. กด **F5** (หรือเมนู Run → Start Debugging)
3. จะเด้งหน้าต่าง VS Code ใหม่ชื่อ **[Extension Development Host]** — นี่คือที่เราทดสอบ

### 6.3 ตั้งค่า Backend URL

ในหน้าต่างทดสอบ เปิด Settings (Ctrl+,) ค้นหา `codeshare` แล้วตั้ง:
- `Codeshare: Backend Url` = `http://localhost:8787`

### 6.4 ล็อกอินและแชร์

1. ครั้งแรกจะเห็น **Welcome Wizard** เด้งขึ้น → กด **Login with Discord**
2. เบราว์เซอร์เปิดหน้า Discord → กด **Authorize**
3. เบราว์เซอร์โชว์ "Login successful" แล้วเด้งกลับ VS Code อัตโนมัติ
4. เปิดไฟล์โค้ดสักไฟล์ → คลิกขวา → **CodeShare: Share Selection** หรือกดปุ่มเมฆ ↑ บนแถบ title
5. เข้าไปดูห้อง Discord จะเห็น embed "📤 Code Shared" พร้อมชื่อ/อวตารของคุณ และโค้ดในบล็อกที่ไฮไลต์ตามภาษา

**ข้อผิดพลาด:** ถ้ากด Login แล้วเบราว์เซอร์ขึ้น error ให้ดูข้อ 11 (แก้ปัญหา OAuth)

---

## 7. การไหลของข้อมูล (Data Flow)

### 7.1 Flow การล็อกอิน (ละเอียดทีละสเต็ป)

```
[1] ผู้ใช้กด "Login with Discord"
        │
[2] authService สร้าง callback = vscode://publisher.codeshare-discord/auth
        │   แล้วเปิดเบราว์เซอร์ไป  backend/oauth/start?redirect_uri=<callback>
        │
[3] backend สร้าง state, จำ returnUri, redirect → discord.com/oauth2/authorize
        │
[4] ผู้ใช้กด Authorize บน Discord
        │
[5] Discord redirect → backend/oauth/callback?code=...&state=...
        │
[6] backend ตรวจ state → แลก code เป็น token → ดึง /users/@me
        │
[7] backend เก็บ token ไว้ฝั่ง server (tokenStore) + ออก session JWT
        │
[8] backend คืนหน้า HTML "สำเร็จ" ที่เด้งไป vscode://...auth?token=<JWT>
        │
[9] uriHandler ใน extension รับ JWT → เก็บใน SecretStorage
        │
[10] extension เรียก /api/me เพื่อโหลดโปรไฟล์ → แสดงในแถบ Account
```

### 7.2 Flow การแชร์โค้ด

```
[1] ผู้ใช้สั่ง Share (selection/file/clipboard/explorer)
[2] payloadBuilder เก็บ: เนื้อโค้ด, ชื่อไฟล์, ภาษา, workspace, path, จำนวนบรรทัด, ขนาด, OS, เวอร์ชัน VS Code
[3] shareController ตรวจว่าล็อกอินหรือยัง (ถ้ายัง → ชวนล็อกอิน)
[4] backendClient POST /api/share พร้อม Authorization: Bearer <JWT>
[5] backend ตรวจ JWT → เช็ค/รีเฟรช access token ของ Discord
[6] embedBuilder สร้าง embed + โค้ดบล็อก → webhookForwarder ส่งเข้า webhook
[7] ถ้าโค้ดยาวเกิน ~1900 ตัว จะอัปโหลดเป็นไฟล์ .txt แทน inline
[8] backend คืนผล + ลิงก์ข้อความ → extension บันทึก history + แจ้งเตือน
```

### 7.3 การรีเฟรช token อัตโนมัติ

ทุกครั้งที่จะแชร์ backend เรียก `getValidAccessToken()`:
- ถ้า access token ยังไม่หมดอายุ (เหลือ > 60 วินาที) → ใช้เลย
- ถ้าใกล้หมด → เอา refresh token ไปขอใบใหม่กับ Discord อัตโนมัติ แล้วอัปเดตที่เก็บ
- ถ้า refresh ล้มเหลว (ผู้ใช้ถอนสิทธิ์) → คืน 401 → extension จะชวนผู้ใช้ล็อกอินใหม่

นี่คือส่วนที่ทำให้ "จำการล็อกอินได้" และ "ตรวจจับ token หมดอายุ" ตามสเปกครับ

---

## 8. อธิบายไฟล์ทุกไฟล์

### 8.1 ฝั่ง Backend

| ไฟล์ | ทำอะไร |
|---|---|
| `src/index.ts` | สตาร์ตเซิร์ฟเวอร์ที่ `PORT`, รองรับปิดแบบ graceful (SIGINT/SIGTERM) |
| `src/app.ts` | ประกอบ Express: logger, json parser, cors, `/health`, ผูก route `/oauth` และ `/api`, ตัวจัดการ error |
| `src/config/env.ts` | อ่านและ**ตรวจสอบ** environment ทั้งหมด ถ้าขาดค่าจำเป็นจะหยุดทันทีพร้อมข้อความชัดเจน |
| `src/config/logger.ts` | logger แบบ JSON บรรทัดเดียว อ่านง่ายและส่งเข้าระบบเก็บ log ได้ |
| `src/middleware/auth.ts` | ดึง `Bearer` token จาก header แล้วตรวจ JWT ถ้าไม่ผ่านตอบ 401 (`session_expired`) |
| `src/middleware/rateLimit.ts` | จำกัดอัตรา: OAuth 30 ครั้ง/5 นาที, share 20 ครั้ง/นาที |
| `src/middleware/requestLogger.ts` | log ทุก request (เมธอด, path, status, เวลา) |
| `src/middleware/errorHandler.ts` | รวมศูนย์จัดการ error + 404 |
| `src/routes/oauth.ts` | `/oauth/start` เริ่ม flow, `/oauth/callback` แลก code แล้วเด้งกลับ VS Code |
| `src/routes/api.ts` | `/api/me`, `/api/connection`, `/api/share`, `/api/logout` (ทุกอันต้องมี session) |
| `src/services/discordOAuth.ts` | สร้าง authorize URL, แลก/รีเฟรช token, ดึง user, แปลงเป็นโปรไฟล์ (รองรับทั้งบัญชีเก่า/ใหม่ + อวตารดีฟอลต์) |
| `src/services/sessionService.ts` | ออก/ตรวจ JWT, เก็บ token, **รีเฟรชอัตโนมัติ** |
| `src/services/tokenStore.ts` | เก็บ token ของ Discord ฝั่ง server (in-memory; สลับเป็น Redis/DB ได้) |
| `src/services/embedBuilder.ts` | สร้าง embed "📤 Code Shared" ครบทุกฟิลด์ + โค้ดบล็อกกัน fence ชนกัน |
| `src/services/webhookForwarder.ts` | ตัดสินใจ inline vs ไฟล์, อัปโหลด multipart, ใส่ `?wait=true` เพื่อได้ลิงก์, retry เมื่อโดน 429 |
| `src/utils/http.ts` | ตัวช่วยเรียก HTTPS ด้วยโมดูล built-in (ไม่พึ่ง axios) |
| `src/utils/state.ts` | เก็บค่า `state` กัน CSRF อายุ 10 นาที ใช้ครั้งเดียว |
| `src/views/callbackPages.ts` | หน้า HTML "สำเร็จ/ล้มเหลว" ที่เด้งกลับ VS Code |

### 8.2 ฝั่ง Extension

| ไฟล์ | ทำอะไร |
|---|---|
| `src/extension.ts` | `activate()` สร้างและต่อทุก service, ลงทะเบียน URI handler, คำสั่ง, view; เรียก `restoreSession()` แล้วโชว์ wizard ครั้งแรก |
| `src/auth/authService.ts` | จัดการ flow ล็อกอิน/ออก/reconnect และ auto-login ตอนเปิด |
| `src/auth/sessionStore.ts` | เก็บ JWT ใน SecretStorage (เข้ารหัสโดย OS) |
| `src/auth/uriHandler.ts` | รับลิงก์ `vscode://.../auth?token=...` แล้วส่ง token ให้ flow ที่รออยู่ |
| `src/api/backendClient.ts` | เรียก backend (me/connection/share/logout/health) แนบ Bearer token อัตโนมัติ |
| `src/config/configuration.ts` | อ่าน settings ทั้งหมด (backendUrl, การแจ้งเตือน, ขนาด history, โหมดอัปโหลด, ธีม) |
| `src/commands/authCommands.ts` | คำสั่ง login/logout/reconnect |
| `src/commands/shareCommands.ts` | คำสั่ง share selection/file/clipboard/explorer (รองรับเลือกหลายไฟล์) |
| `src/commands/shareController.ts` | ออร์เคสเตรต: ตรวจล็อกอิน → ส่ง → บันทึก history → แจ้งเตือน → จัดการ error |
| `src/services/payloadBuilder.ts` | เก็บโค้ด + เมทาดาทาจาก editor/ไฟล์/คลิปบอร์ด |
| `src/history/historyManager.ts` | เก็บประวัติใน globalState จำกัดตามที่ตั้งไว้ |
| `src/notifications/notify.ts` | แจ้งเตือนผลการแชร์ + ปุ่ม "เปิดใน Discord/คัดลอกลิงก์" |
| `src/providers/accountProvider.ts` | view แสดงบัญชีที่ล็อกอิน หรือปุ่มล็อกอิน |
| `src/providers/quickShareProvider.ts` | view ปุ่มแชร์ด่วน |
| `src/providers/connectionProvider.ts` | view สถานะ backend + webhook + การล็อกอิน |
| `src/providers/historyProvider.ts` | view ประวัติการแชร์ (ไอคอนสำเร็จ/ล้มเหลว + tooltip) |
| `src/providers/settingsProvider.ts` | view ลิงก์ลัดไปตั้งค่า/คำสั่งดูแลระบบ |
| `src/views/statusBar.ts` | ปุ่มบนแถบสถานะ: ล็อกอินแล้ว = "Share Code", ยังไม่ล็อกอิน = "Login Discord" |
| `src/wizard/welcomeWizard.ts` | หน้าต้อนรับครั้งแรก (Webview) ที่บังคับให้ล็อกอินก่อนแชร์ |
| `src/utils/*` | logger, จัดรูปแบบขนาด/บรรทัด/OS, แม็ปภาษา, ตรวจ URL |

---

## 9. การตั้งค่า (Settings) ทั้งหมด

ค้นหา `codeshare` ในหน้า Settings:

| Setting | ค่าเริ่มต้น | ความหมาย |
|---|---|---|
| `codeshare.backendUrl` | `http://localhost:8787` | ที่อยู่ Backend |
| `codeshare.showNotifications` | `true` | แสดงการแจ้งเตือนเวลาแชร์ |
| `codeshare.autoCopyMessageLink` | `false` | คัดลอกลิงก์ข้อความอัตโนมัติหลังแชร์ |
| `codeshare.historySize` | `50` | เก็บประวัติกี่รายการ (1–500) |
| `codeshare.uploadMode` | `auto` | `auto`/`alwaysFile`/`alwaysInline` |
| `codeshare.theme` | `auto` | ธีมของ Welcome wizard |

ส่วนคำสั่งที่เกี่ยวกับบัญชี (Login, Logout, Reconnect, Test Connection) เรียกได้จาก Command Palette (Ctrl+Shift+P) พิมพ์ `CodeShare` หรือกดในแถบข้าง

---

## 10. Wizard, History, Notifications

- **Welcome Wizard:** โผล่อัตโนมัติครั้งแรก (จำสถานะใน globalState) เปิดซ้ำได้ด้วยคำสั่ง `CodeShare: Open Welcome Wizard` มันบังคับให้ล็อกอินก่อนถึงจะแชร์ได้ ตรงตามสเปก
- **History:** เก็บ ผู้ใช้, ชื่อไฟล์, ภาษา, เวลา, สำเร็จ/ล้มเหลว, ระยะเวลา (ms) — ดูได้ในแถบข้าง "Recent Shares" ล้างได้ด้วย `CodeShare: Clear History`
- **Notifications:** หลังแชร์สำเร็จมีปุ่ม "Open in Discord" และ "Copy Link"; ปิดการแจ้งเตือนได้ที่ settings

---

## 11. การ Debug และแก้ปัญหา OAuth

### 11.1 ดู log
- **Backend:** ดูที่ terminal ที่รัน `npm run dev` (ทุก request + error เป็น JSON)
- **Extension:** เปิด Output panel เลือกช่อง **"CodeShare Discord"**

### 11.2 ตารางปัญหาที่พบบ่อย

| อาการ / ข้อความ | สาเหตุ | วิธีแก้ |
|---|---|---|
| `invalid_redirect_uri` หรือหน้า Discord ฟ้อง redirect | `DISCORD_REDIRECT_URI` ไม่ตรงกับที่เพิ่มใน Discord | ทำให้ตรงกันเป๊ะ รวม http/https และ slash ท้าย |
| กด Authorize แล้วเบราว์เซอร์ค้าง ไม่กลับ VS Code | `EXTENSION_REDIRECT_URI` ไม่ตรง publisher.name | ตั้งให้เป็น `vscode://<publisher>.codeshare-discord/auth` |
| `Invalid or expired login state` | เปิดทิ้งไว้นานเกิน 10 นาที หรือเปิดหลายแท็บ | เริ่มล็อกอินใหม่ |
| `Token exchange failed (HTTP 401)` | Client ID/Secret ผิด | ตรวจค่าใน `.env` / Reset Secret ใหม่ |
| แชร์แล้วได้ 401 `session_expired` | JWT หมดอายุ หรือผู้ใช้ถอนสิทธิ์ | กด Login ใหม่ (extension จะชวนให้เอง) |
| แชร์แล้วได้ 502 `webhook_failed` | Webhook URL ผิด/ถูกลบ | สร้าง webhook ใหม่แล้วอัปเดต `.env` |
| `Backend is not reachable` | ยังไม่ได้รัน backend หรือ URL ผิด | รัน backend + ตรวจ `codeshare.backendUrl` |
| `rate_limited` | เรียกถี่เกินไป | รอสักครู่แล้วลองใหม่ |
| โค้ดยาวกลายเป็นไฟล์แนบ | เกิน ~1900 ตัวอักษร | ปกติ; ถ้าอยากบังคับ inline ตั้ง `uploadMode=alwaysInline` (เสี่ยงถูกตัด) |

### 11.3 เคล็ดลับ
- ทดสอบ backend แยกด้วย `curl` ก่อนเสมอ (ข้อ 5.5) จะตัดปัญหาได้เร็ว
- ใช้ `CodeShare: Test Connection` เพื่อเช็ค backend + session + webhook ในคลิกเดียว

---

## 12. การ Build, Package (.vsix) และ Publish

### 12.1 Build
```bash
cd extension
npm run compile     # ได้โฟลเดอร์ out/
```

### 12.2 Package เป็นไฟล์ .vsix
```bash
npm install -g @vscode/vsce
vsce package        # ได้ codeshare-discord-1.0.0.vsix
```
ติดตั้งทดสอบ: VS Code → Extensions → เมนู `...` → **Install from VSIX...**

> ⚠️ ก่อน package ต้องแก้ `publisher` ใน `package.json` ให้เป็นชื่อ publisher จริงของคุณ และอย่าลืมแก้ `EXTENSION_REDIRECT_URI` ฝั่ง backend ให้ตรงกัน

### 12.3 Publish ขึ้น Marketplace (ย่อ)
1. สร้าง Publisher ที่ https://marketplace.visualstudio.com/manage
2. สร้าง Personal Access Token จาก Azure DevOps (สิทธิ์ Marketplace > Manage)
3. `vsce login <publisher>` แล้ว `vsce publish`

---

## 13. การ Deploy Backend ขึ้น Production

1. **ต้องเป็น HTTPS:** Discord ต้องการ redirect ที่ปลอดภัย ใช้โดเมนจริง + ใบรับรอง (เช่นหลัง Nginx/Caddy หรือแพลตฟอร์มอย่าง Render/Railway/Fly.io)
2. **ตั้ง env ให้ครบ:** โดยเฉพาะ
   - `PUBLIC_BASE_URL=https://api.yourdomain.com`
   - `DISCORD_REDIRECT_URI=https://api.yourdomain.com/oauth/callback` (และเพิ่มค่านี้ใน Discord Redirects ด้วย)
   - `SESSION_SECRET` ตัวใหม่ที่ยาวและลับ
3. **Reverse proxy:** โค้ดตั้ง `trust proxy` ไว้แล้ว เพื่อให้ rate-limit อ่าน IP จริงจาก `X-Forwarded-For`
4. **ความคงทนของ session:** `tokenStore` เป็น in-memory จะหายเมื่อรีสตาร์ต/มีหลาย instance — ถ้าต้องการคงอยู่ ให้ทำคลาสใหม่ที่ implement `TokenStore` บน Redis/DB แล้วสลับ export ตัวเดียวในไฟล์ `tokenStore.ts`
5. **อย่า commit `.env`:** มีใน `.gitignore` แล้ว เก็บความลับผ่าน secret manager ของแพลตฟอร์ม

---

## 14. Checklist สรุปก่อนใช้งานจริง

- [ ] สร้าง Discord App, คัดลอก Client ID + Secret
- [ ] เพิ่ม Redirect URI ใน Discord ให้ตรงกับ `.env`
- [ ] สร้าง Webhook ของห้องเป้าหมาย
- [ ] กรอก `.env` ของ backend ครบ + สร้าง `SESSION_SECRET`
- [ ] `npm install && npm run dev` แล้วทดสอบ `/health`, `/oauth/start`
- [ ] ตั้ง `codeshare.backendUrl` ใน extension
- [ ] กด F5 → Login with Discord → Authorize → กลับ VS Code สำเร็จ
- [ ] แชร์ไฟล์/selection → เห็น embed พร้อมชื่อผู้ส่งใน Discord
- [ ] (production) ใช้ HTTPS + แก้ redirect URI ทั้งสองฝั่งให้ตรง

---

ถ้าทำครบทุกขั้นแล้วยังติดตรงไหน ให้ย้อนไปดูตารางข้อ 11 หรือดู log ทั้งสองฝั่งครับ — โดยมากปัญหามาจาก redirect URI ไม่ตรงกัน หรือ `.env` กรอกไม่ครบ ขอให้สนุกกับการแชร์โค้ดครับ 🚀
