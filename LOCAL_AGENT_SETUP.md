# Agent local, Vercel si Render - 7 noiembrie 2026

> Actualizare: gateway repornit cu `gemma3:4b`, verificat prin `/ready`.
> Chatul primeste rezumatele dosarului numai local si alege intrebari existente.
> Contract si ordine de publicare: [AI/local/INTAKE_CONTEXT.md](AI/local/INTAKE_CONTEXT.md).
> Valorile de latenta si configuratia 1b de mai jos descriu verificarea initiala.

## Starea verificata

- Vercel: https://med-flow-frontend-five.vercel.app/ raspunde 200.
- Render: https://medflow-backend-kx1w.onrender.com/health si /health/db raspund 200.
- Ollama instalat, model gemma3:1b descarcat local. PC: aproximativ 16 GB RAM,
  Intel UHD; modelul mic este pentru intrebari/organizarea textului pe CPU.
- Gateway TypeScript local: 127.0.0.1:8092. Ollama ramane pe 127.0.0.1:11434.
- Tunel curent: https://theorem-internal-reproductive-hobbies.trycloudflare.com
- Test real prin tunel, continut sintetic: /ready 200, /intake aproximativ 5,4 s,
  /summary aproximativ 1,5 s; citatul "Nu am febra." a fost pastrat exact.
- 7 teste gateway, 10 teste client/rute Backend si build Backend trec. Autentificarea,
  URL-urile, raspunsurile inventate si pastrarea originalelor sunt verificate.

ATENTIE: bundle-ul public Vercel verificat contine inca http://127.0.0.1:3001,
nu URL-ul Render. Aceasta configuratie trebuie corectata pentru vizitatori.
Render nu are inca noua ruta /health/local-agent (404 la verificare).
Nu s-a modificat configuratia dashboard-urilor Vercel/Render din aceasta sesiune.

## Ce face agentul

Vercel -> Render -> tunel HTTPS -> gateway local -> Ollama.

- GET /health: liveness public, fara chei sau date medicale.
- GET /ready: token server obligatoriu; verifica existenta modelului configurat.
- POST /intake: messages[{id,text}], asked?:questionId[]. LLM selecteaza o
  intrebare dintr-o lista de colectare; textul final este predefinit, nu sfat
  medical liber. Nu genereaza scheme de tratament, diagnostice sau doze.
- POST /summary: messages[{id,text}]. Returneaza citate exacte verificate,
  messageId, mesajele originale si lista celor necitate. Textul inventat este
  respins. Nu pretinde ca un citat partial acopera integral mesajul original.
- POST /extract: proxy cu token catre serviciul Python existent pe 8090.
  MedGemma/extractia nu sunt pornite de aceasta instalare; pana atunci raspunde
  indisponibil. Gemma3:1b folosit aici este text-only, nu inlocuieste extractorul.

Doar gateway-ul este tunelat. Nu expune portul Ollama si nu pune tokenul in
variabile VITE_ sau in frontend. Nu exista acces DB in gateway si nu exista
fallback catre un furnizor cloud. Un singur apel model/extractie ruleaza odata;
cererile concurente primesc 429 pentru retry, nu se acumuleaza pe CPU.

## Configuratia concreta pentru dashboard-uri

### Vercel - Environment Variables, apoi Redeploy

```dotenv
VITE_API_BASE_URL=https://medflow-backend-kx1w.onrender.com
```

Pastreaza URL-ul/cheia publica Supabase existente. In Supabase verifica redirectul
exact https://med-flow-frontend-five.vercel.app/auth/callback in allowlist.

### Render - Environment, apoi deploy-ul codului Backend

Cele doua valori reale pentru agent sunt pregatite in **AI/local/.env.render**.
Fisierul este ignorat de Git. Copiaza-le direct din IDE in Render, nu in chat:

```dotenv
LOCAL_AGENT_URL=https://theorem-internal-reproductive-hobbies.trycloudflare.com
LOCAL_AGENT_TOKEN=<valoarea din fisierul local ignorat>
APP_ORIGIN=https://med-flow-frontend-five.vercel.app
CORS_ORIGINS=https://med-flow-frontend-five.vercel.app
```

Pastreaza configuratia Supabase server existenta, care raspunde deja /health/db.
Daca versiunea Render curenta foloseste variabila legacy CORS_ORIGIN singular,
configureaz-o cu aceeasi origine pana la integrarea versiunilor.

Noul client Backend este src/localAgent.ts; index.ts adauga /health/local-agent.
Dupa publicarea acestor modificari si configurare, ruta trebuie sa raspunda ready.
src/localAgentRoutes.ts adauga POST /cases/:id/intake-question (numai pacientul)
si POST /cases/:id/summary (numai medicul atribuit). Clientul nu poate trimite un
prompt sau istoric alternativ; sunt folosite mesajele persistate ale cazului.
Mesajul pacientului se salveaza prin API-ul existent inainte de cererea AI.
Intrebarea se salveaza ca sender_role=ai; esecul AI nu modifica mesajele pacientului.
Rezumatul are originale/citate si este returnat medicului, fara optiuni diagnostice.

Sectiunea reala Dosare si mesaje are actiuni explicite pentru intrebarea locala si
rezumatul medicului. Modulele fixture din PatientJourney raman separate; nu le
prezenta ca raspunsuri ale modelului local. Noile rute/UI nu sunt inca deployate.

Optional, dupa pornirea extractorului Python: MEDGEMMA_URL poate fi acelasi URL
de tunel, cu MEDGEMMA_TOKEN egal cu tokenul local; clientul Backend a fost adaptat
sa trimita Authorization. Nu activa aceasta configuratie ca extractie functionala
inainte de testarea MedGemma.

## Retete: citire si extragere (serviciul Python pe 8090)

Vercel -> Render -> tunel -> gateway `/extract` -> serviciu Python (127.0.0.1:8090) -> OCR + gemma3:1b.

- Serviciul `AI/edge/extraction_service` porneste cu `start-stack.ps1` (ruleaza cu
  `EDGE_LLM_MEDGEMMA=gemma3:1b`, `OCR_ENGINE=tesseract`, `OCR_FALLBACK=off`). Cere `.venv` creat
  din `requirements.txt` (fara `easyocr`) si, pentru poze si PDF-uri scanate, programul **Tesseract**
  cu datele `eng` si `ron`. Fara Tesseract, pozele dau `503` clar; PDF-urile cu text merg.
- In Render, ca Backend-ul sa foloseasca extractorul prin tunel:
  `MEDGEMMA_URL` = aceeasi adresa ca `LOCAL_AGENT_URL` (fara `/` la final) si
  `MEDGEMMA_TOKEN` = aceeasi valoare ca `LOCAL_AGENT_TOKEN`. Adresa tunelului se schimba la
  fiecare repornire a `cloudflared`: actualizeaza ambele variabile.
- Un document dureaza ~15 s pe CPU. Gateway-ul ruleaza un apel odata (429 la cereri simultane).
- Cand extragerea esueaza, Backend-ul nu salveaza nimic si raspunde cu codul real
  (422/502/503/504); documentul ramane pe telefonul pacientului, care poate reincerca.
- Pacientul verifica fiecare rand fata de reteta de hartie (`POST /cases/:id/documents/:docId/review`,
  migrarea `Database/migrations/008_document_review.sql`). Doar medicamentele confirmate intra in
  "Tratament activ" si in contextul AI.

## Pornire dupa restart

Din radacina proiectului:

```powershell
powershell -NoProfile -File AI/local/start-stack.ps1 -Tunnel
```

Scriptul porneste procesele in fundal, fara ferestre noi. Modelul trebuie deja
descarcat; nu face download la fiecare pornire. Daca tunelul ruleaza deja, foloseste
URL-ul existent. La un tunel nou citeste URL-ul din AI/local/tunnel-error.log si
actualizeaza LOCAL_AGENT_URL in Render; fisierul .env.render ramane un snapshot.
Nu opri procesele altor colegi pentru a elibera porturi.

Verificare reala cu continut sintetic, fara token afisat:

```powershell
cd AI/local
node --experimental-strip-types --env-file=.env smoke.mts
node --experimental-strip-types --env-file=.env smoke.mts https://URL-TUNEL
```

Tunelurile Quick Tunnel sunt temporare si nu ofera uptime garantat. PC-ul trebuie
sa ramana pornit, conectat la internet si fara sleep. Vercel/Render pot ramane
accesibile cand PC-ul este oprit, dar operatiile AI locale vor fi indisponibile.
Pentru adresa permanenta: Cloudflare Named Tunnel cu domeniu, ulterior.

Surse: [Ollama Windows](https://docs.ollama.com/windows),
[model Gemma 3](https://ollama.com/library/gemma3),
[Cloudflare Quick Tunnels](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/).
