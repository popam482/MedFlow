# MedFlow — plan Backend, date reale și hosting

> **Actualizare (7 nov 2026): Azure nu mai este varianta pentru MVP.** Secțiunea 3 și deciziile D1–D3
> (Static Web Apps, Container Apps, `deploy/azure`) sunt depășite și rămân doar ca istoric.
> MVP-ul de la 10:30 rulează ca mockup cu agenți AI locali (`AI_URL` și `MEDGEMMA_URL` spre această
> mașină). Interfața rămâne pe Vercel, iar backend-ul pe Render, dacă mai e nevoie de un URL public.
> Rămân valabile secțiunile 2 (Backend nou) și 4 (date sintetice, fără date reale până la DPIA).

Autor: Claude. Stare: **propunere, fără cod.** Completează [DEMO_IMPLEMENTATION_PLAN.md](DEMO_IMPLEMENTATION_PLAN.md).
Cititori: echipa, Codex și colegii de Backend, AI și Azure.

**Scop:** trecem de la mock-uri la date persistate real în Supabase și punem aplicația pe un URL HTTPS public, ca demo-ul să meargă pe telefon și pe laptop.

---

## 1. Unde suntem: trei variante de Backend care trebuie unite

| Sursă | Ce conține | Stare |
| --- | --- | --- |
| `Backend` `main` (`d17f6d4`) | Cazuri, mesaje, documente (MedGemma), analiză AI prin import direct din `../AI` | Pe GitHub |
| Working tree local (Codex + Claude) | 8 API-uri de cont (`src/account/`), admin (`src/admin/`), CORS strict (`src/httpConfig.ts`, `CORS_ORIGINS`), scripturi de invitații | **Necomis**, doar local |
| `origin/Azure-implementation` (`06d38d9`, Daniel) | AI apelat prin HTTP (`src/aiClient.ts`, `AI_URL`), `rootDir: ./src`, Dockerfile, CORS simplu (`CORS_ORIGIN`) | Pe GitHub, marcat „half” |
| `AI` `origin/Azure-implementation` (`5ae8356`) | `cloud/server.ts` (`/health`, `/analysis`, port 8091), Dockerfile, serviciul Python de extracție | Pe GitHub, marcat „half” |

**Ce e bine:** branch-ul Azure decuplează Backend-ul de folderul `AI`, fără care hosting-ul nu e posibil. Backend-ul și AI-ul devin două containere separate. Păstrăm această direcție.

**Conflicte sigure la unire:**
1. **`src/index.ts`.** Branch-ul Azure folosește `cors({ origin: CORS_ORIGIN })`; local avem `accountCors(allowedAppOrigins())`, cu `CORS_ORIGINS`, plus montarea routerelor de cont și admin. **Propunere:** păstrăm `httpConfig.ts`, care validează originile exact, și acceptăm ambele nume de variabilă o perioadă, ca nimeni să nu-și strice `.env`-ul.
2. **`package.json`** — `start` devine `node dist/index.js` după `rootDir: ./src`. Scripturile `test:account`, `test:admin` și `invite:*` trebuie păstrate.
3. **`.env.example`.** Local e șters, din motiv neclarificat; pe branch-ul Azure e actualizat. Îl refacem din varianta Azure plus variabilele contului (`APP_ORIGIN`, `APP_BASE_PATH`, `CORS_ORIGINS`).

**Ordinea propusă pentru Git** (o face Codex sau proprietarul, nu agenții, ca să nu se suprapună operațiile):
1. Daniel termină și unește `Azure-implementation` în `main`, în Backend și AI. Sau ne spune că putem porni de la starea actuală a branch-ului.
2. Codex comite munca locală de cont și admin pe un branch nou pornit din noul `main`. Rezolvă cele 3 conflicte de mai sus; eu pregătesc rezolvarea exactă dacă e nevoie.
3. Migrațiile 004–007 se comit în `Database`, iar pinurile se actualizează în superproiect.

Până atunci, Backend-ul nou se scrie **doar în fișiere noi**. Așa conflictele rămân la o linie în `index.ts`.

---

## 2. Backend nou pentru demo (date reale, nu mock)

**Principiu:** fișiere și routere noi, montate lângă cele existente. **Nu modificăm `cases.ts` și nici `schemas.ts`.** Express permite rute noi pe `/cases` dacă nu se suprapun cu cele existente: `GET /cases` și `GET /cases/:id/messages` nu există acolo.

**Model de securitate pentru rutele noi:** funcții SQL apelate cu JWT-ul utilizatorului, exact ca la conturi și admin. Autorizarea se face în baza de date, deci rămâne valabilă și dacă cineva ocolește Express. Nu cere cheia secretă la rulare și se poate testa cu scripturi SQL care fac rollback. Rutele existente ale colegilor (cheie secretă + verificare în cod) rămân cum sunt.

| Prioritate | Endpoint | Fișiere | Bază de date |
| --- | --- | --- | --- |
| **B1 MUST** | `GET /cases`: pacientul vede cazurile proprii, medicul doar cazurile pacienților alocați activ, cu numele pacientului | `src/caseViews/index.ts` + test | migrația 008: funcție RPC |
| **B1 MUST** | `GET /cases/:id/messages` (ordine stabilă, limită) și `GET /cases/:id/documents` (date extrase + metadate, fără fișier) | idem | 008 |
| **B1 MUST** | `POST /cases/:id/decision` (doar medicul cazului): `{ decisionType, finalResponse, aiAnalysisId? }`; `GET /cases/:id/decision` (pacientul și medicul cazului) | idem | 008: folosește tabela existentă `doctor_decisions`, plus un index |
| **B1 MUST** | Fix de securitate propus colegilor: medicul își pierde accesul la caz când alocarea devine inactivă | — (`cases.ts` e al lor) | — |
| **B2 MUST** | `POST /cases/:id/documents/:docId/review`: câmpurile confirmate sau corectate de pacient, cu cine și când | `src/caseViews/` | 008: coloanele `review`, `reviewed_by`, `reviewed_at` |
| **B2 MUST** | `GET /patient/context`, `POST /patient/context/items`, `POST /patient/context/items/:id/confirm` | `src/patientContext/index.ts` + test | 009: `medical_records` cu sursă și stare de confirmare (CHECK) |
| **B3 STRETCH** | `POST`/`GET`/`DELETE /patient/schedules` (program medicație) | `src/schedules/index.ts` + test | 010: tabela `medication_schedules`, RLS pe pacient |
| **B4 (echipa AI)** | `POST /cases/:id/intake`: Backend-ul verifică întâi regulile 112, apoi apelează `AI_URL/intake` | cere `AI/cloud/server.ts` `/intake` | `case_messages.client_message_id` unic (idempotență) |
| **B4 (echipa AI)** | Rezumat cu surse: `AI_URL/summary` | AI | — |

**Contractele sunt cele din secțiunea 4 a planului de demo:** `camelCase`, erori `{ error, code }`, `Cache-Control: no-store`.

**Teste pentru fiecare router:** cu transport fals, ca `account.test.ts`. Acoperă 401, 403 (cont străin, rol greșit), 404, body invalid, idempotență și răspuns malformat al bazei de date.

**Teste SQL:** fiecare migrație are `verify_00X_checks.sql`, rulat de mine local în Docker (`supabase/postgres`, ca la 007), apoi aplicat de Codex. Acoperă:
- `anon` fără acces;
- apeluri RPC directe;
- un pacient nu vede cazul altuia;
- medicul fără alocare activă nu vede cazul.

**Numerotarea 008–010** trebuie confirmată cu Maria (Database), ca să nu se suprapună cu migrațiile ei.

---

## 3. Hosting: propunere pe Azure (unde lucrează deja colegii)

```
Telefon / laptop ──HTTPS──> Frontend (Azure Static Web Apps, SPA)
        │
        └──HTTPS + Bearer──> Backend (Azure Container App, ingress public)
                                 ├──> Supabase (Auth + Postgres, proiectul existent)
                                 ├──> AI cloud (Container App, ingress DOAR intern) ──> Gemini
                                 └──> Extracție MedGemma (necesită GPU; vezi decizia D2)
```

| Componentă | Unde | Configurare |
| --- | --- | --- |
| **Frontend** | Azure Static Web Apps (plan gratuit) | <ul><li>`staticwebapp.config.json` cu fallback SPA, inclusiv `/auth/callback`</li><li>variabile publice la build: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_API_BASE_URL`</li><li>nicio cheie secretă</li></ul> |
| **Backend** | Container App, imaginea din Dockerfile-ul lui Daniel | <ul><li>`HOST=0.0.0.0`, `APP_ORIGIN` = URL-ul HTTPS al frontend-ului, `CORS_ORIGINS`</li><li>`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `AI_URL` (adresa internă), `MEDGEMMA_URL`</li><li>cheia secretă doar ca *secret*, **o cheie nouă, rotită**</li></ul> |
| **AI cloud** | Container App, **ingress intern** | <ul><li>`GEMINI_API_KEY` ca *secret*</li><li>`/analysis` nu are autentificare, deci nu trebuie expus public</li></ul> |
| **Extracție MedGemma** | Decizia D2 | Ollama + model de ~3–9 GB; pe CPU e lent |
| **Supabase** | Proiectul existent (de test) | <ul><li>de adăugat URL-ul de producție la *Redirect URLs*</li><li>în Google Cloud, de adăugat originea la OAuth</li><li>de verificat regiunea (UE)</li></ul> |

**Ce pot pregăti eu, fără acces la Azure:**
- `Frontend/staticwebapp.config.json` (fallback SPA, headere de securitate);
- verificarea Dockerfile-urilor după unire;
- un script de smoke test `scripts/smoke.mjs <frontendUrl> <apiUrl>`: verifică `/health`, CORS, `/connect/{cod}` public, `/me` fără token → 401 și HTML-ul cu titlul și favicon-ul din configurația de brand;
- documentația pas cu pas cu numele variabilelor, fără valori.

**Ce fac colegii sau Codex** (eu nu am cont Azure și nici CLI `az`):
- resource group;
- mediul Container Apps;
- registry pentru imagini;
- deploy-ul;
- secretele;
- URL-urile finale.

**Ce faci tu:** alegi hosting-ul (D1) și dai acces operatorului prin identitatea lui Azure, nu prin parola contului.

---

## 4. „Date reale” și aplicația

**Ce putem face de acum:** persistență reală. Conturi reale de test, Google login real, cazuri, documente, decizii și programe salvate în Supabase. Demo-ul încetează să mai fie mock: datele rămân după reload, pe alt dispozitiv și la alt utilizator.

**Ce nu putem face încă: date medicale ale unor pacienți reali.** Pentru asta lipsesc:
- regula 5 din AGENTS.md și brief-ul cer date sintetice;
- GDPR art. 9 cere consimțământ explicit și o evaluare de impact (DPIA);
- Gemini e folosit pe varianta gratuită, iar filtrul de confidențialitate e incomplet (vezi [AI_PRIVACY_GAPS.md](AI_PRIVACY_GAPS.md));
- regiunea Supabase nu e confirmată ca fiind în UE.

**Propunere:** persoane reale din echipă cu **conținut medical sintetic**: rețete tipărite inventate, simptome inventate.

**Aplicația pe telefon:**
- **Pentru mâine:** aplicația web pe URL-ul HTTPS, deschisă pe telefon. Camera merge prin selectorul de fișiere, Google login merge, se poate adăuga pe ecranul principal.
- **După demo:** aplicația Android nativă (Capacitor există deja în proiect). Cere deep links pentru OAuth, callback nativ și test pe dispozitiv. Notificările în fundal pentru remindere vin abia cu ea sau cu un service worker.

---

## 5. Decizii necesare de la tine sau de la echipă

| ID | Decizie | Recomandarea mea |
| --- | --- | --- |
| D1 | Hosting | **Azure**, cum au început colegii: Static Web Apps + Container Apps |
| D2 | Unde rulează extracția MedGemma pe internet | Pentru demo: **un laptop al echipei cu GPU**, la care Backend-ul ajunge printr-un tunel privat (de exemplu Tailscale), nu expus public. Alternativa e un VM Azure cu GPU (cost și cotă). Dacă nu reușim, upload-ul rămâne local și scrie clar „extracție indisponibilă” |
| D3 | Cine unește Backend-ul (Azure + cont/admin) | Daniel unește branch-ul Azure, apoi Codex comite cont/admin peste el |
| D4 | Rutele noi cu RPC + JWT (ca la conturi) | Da: autorizare în baza de date, fără cheie secretă la rulare |
| D5 | Date reale | Doar persistență reală cu conținut sintetic până la DPIA și furnizor AI cu DPA |

---

## 6. Ordinea de lucru (după aprobare)

| Pas | Cine | Ce |
| --- | --- | --- |
| 1 | Claude (2 agenți în paralel) | Migrația 008 + `verify_008`, routerul `caseViews` (B1, B2 review) cu teste; `staticwebapp.config.json` și `smoke.mjs` |
| 2 | Claude | Adaptoarele live în frontend pentru B1/B2, în locul fixture-urilor unde există API |
| 3 | Daniel / Codex | Unirea Backend + AI, comiterea muncii de cont și admin, aplicarea migrațiilor 007–008 |
| 4 | Colegii / Codex | Deploy pe Azure: Backend, AI intern, Frontend. Setări Supabase și Google pentru URL-ul nou |
| 5 | Claude | Rulează `smoke.mjs` pe URL-uri și verifică live scenariul în browser, cu conturile de test |
| 6 | Claude, după 009/010 | Context pacient (B2) și program (B3), dacă e timp. Altfel rămân fixture etichetate |

## 7. Întrebări pentru Daniel (Backend / Azure)

1. Când e gata `Azure-implementation` pentru `main`? Putem porni de la starea lui actuală?
2. Ești de acord să adăugăm routere noi (`caseViews`, `patientContext`) lângă `cases.ts`, cu RPC + JWT? Le faci tu sau le facem noi?
3. Accepți corecția: medicul pierde accesul la caz când alocarea devine inactivă?
4. Unde va rula MedGemma (D2)? Avem un GPU disponibil?
5. Poți păstra `/analysis` doar intern (ingress intern pe Container Apps)?
6. Care e numele final al variabilei CORS? Propunem să acceptăm temporar `CORS_ORIGINS` și `CORS_ORIGIN`.
