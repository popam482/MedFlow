# MedFlow - punct principal de continuare

> REVIZUIRE 7 NOIEMBRIE: incepe cu [NEXT_ACTIONS.md](NEXT_ACTIONS.md).
> Planul Claude a fost citit; rezumat + feedback sunt prioritare, variantele
> optionale. Frontendul scenariului poate incepe fara a astepta branch-urile Azure.

> PRIORITATE NOUA: [DEMO_BRIEF.md](DEMO_BRIEF.md) stabileste scenariul pentru
> 7 noiembrie: chat/context, rezumat cu surse, scanare/reteta confirmata,
> reminders si feedback medic. Colegii lucreaza la Azure; nu integrati branch-urile
> lor neterminate. Claude pregateste planul conform brief-ului inainte de P1-P4.

Actualizat: 6 noiembrie 2026. Citeste acest fisier primul, apoi AGENTS.md din
modulele implicate. Este indexul curent de lucru; planurile vechi descriu etape
istorice si nu stabilesc ownership-ul actual.

## 1. Obiectiv si impartire

O singura aplicatie web responsive, cu intrari separate Pacient/Medic. Pacientii
intra cu Google; medicii cu Google si invitatie verificata profesional de echipa.
Pacientul deschide linkul QR, confirma cererea, iar medicul accepta asocierea.
Urmatorul obiectiv functional: caz medical persistent, mesaje si documente pentru
pacientul si medicul asociati, folosind serviciile deja existente.

- **Claude:** implementarea principala frontend/backend, propuneri de migratii,
  teste locale si repararea erorilor. Poate folosi agenti cu fisiere exclusive.
- **Codex:** Supabase si servicii conectate, verificarea contractelor, aplicarea
  migratiilor revizuite si verificarea punctuala a integrarii. Nu dubleaza codingul.
- **Colegii AI:** pastreaza ownership-ul AI; orice schimbare de contract se
  coordoneaza inainte. Claude nu modifica automat `AI/**`.
- **Utilizatorul:** Google login/consimtamant propriu, verificarea profesionala a
  medicilor si alegerea hostingului. Nu trimite parole, tokenuri sau chei in chat.

Regulile complete sunt in [WORK_ALLOCATION.md](WORK_ALLOCATION.md).

## 2. Stare constatata

| Zona | Implementat | Verificare / limita |
| --- | --- | --- |
| Auth comuna | Supabase PKCE, callback dedicat, sesiune unica, rol din backend, destinatie interna restaurata | Verificari locale/browser; utilizatorul a raportat ca Google merge; intregul flux personal nu a fost repetat de agent |
| Conturi si asociere | Cele 8 API-uri, profil pacient, invitatii, cod QR revocabil, cereri si acceptare atomica | 22 teste backend si 12 scenarii HTTP reale cu identitati sintetice; conturile si datele temporare au fost sterse |
| Database | Migratiile 004-006 aplicate proiectului existent | Verificari SQL cu rollback, inclusiv autorizare, duplicate si ordine de lock |
| Workspace medic | Modul real pentru QR si cereri; QR generat local cu uqr | Handoff medic si teste locale; nu echivaleaza cu test pe telefon real |
| Conexiuni pacient | Protectie la raspunsuri vechi, anulare, polling vizibil, retry si actualizare care team | Claude raporteaza 67 verificari browser cu mock-uri + 10 teste unitare, build/lint; vezi handoff-ul modulului |
| Chat pacient | Interfata si raspunsuri simulate in demo | `chatService.ts` intoarce inca serviciul mock; nu este conversatie medicala persistenta |
| Scanner documente | Camera/fisiere, preview si confirmare locala la `#/demo/scan` | Ruta si linkul din header exista; fara upload; compatibilitatea efectiva camera/WebView necesita test pe dispozitiv |
| API cazuri | Creare/citire caz, salvare mesaj, upload cu extractie, analiza pentru medic | Exista in `Backend/src/cases.ts`; integrarea UI si verificarea live a acestor rute raman de facut |
| Hosting / Android | Scaffold Capacitor disponibil | Deploy HTTPS, callback productie, camera reala si deep links nu sunt validate |

Testele de mai sus sunt rezultate din predarile precedente, nu o noua rulare
completa dupa orice modificare ulterioara. Nu declara aplicatia medicala completa.

## 3. Rute curente

| Ruta | Scop |
| --- | --- |
| `#/home` | Alegere Pacient / Medic |
| `#/patient` | Login pacient, care team, cereri |
| `#/doctor` | Workspace cu rol medic verificat |
| `#/doctor/invite/{token}` | Acceptarea explicita a invitatiei dupa Google |
| `#/connect/{code}` | Previzualizare medic si cerere explicita |
| `#/admin` | Panou administrator: invitatii medici (doar conturi din `platform_admins`) |
| `/auth/callback` | Callback OAuth web, separat de hash |
| `#/demo/patient` | Chat/sugestii sintetice |
| `#/demo/doctor` | Workspace medic demonstrativ |
| `#/demo/scan` | Captura locala document, fara upload |

## 4. Urmatorii pasi, in ordine

### P0 - inchiderea livrarii auth/asociere

- [ ] Codex: verifica punctual diferenta predata de Claude fata de contractele
  existente. Handoff-ul connections exista; nu relua taskul de la zero.
- [ ] Verificare browser integrata: pacient -> link QR -> cerere -> acceptare
  medic -> medic in `activeDoctors`; reload si logout/login pastreaza datele.
  Cele 12 teste API reale nu inlocuiesc aceasta verificare UI dupa ultimul handoff.
  Nu recrea conturi temporare fara necesitate; orice fixture trebuie curatat.
- [ ] Codex/operator: confirma configuratia necesara invitatiilor si rutelor
  medicale. Acestea necesita o cheie privilegiata curenta numai in backend;
  API-urile de cont folosesc cheia publica + JWT verificat. Nu reutiliza cheia
  secreta expusa anterior; daca nu a fost rotita, rotirea ramane de facut.
- [ ] Integrare Git coordonata dupa verificare: review pe module, commit/push
  pe branch-urile stabilite, apoi actualizarea pinurilor in superproiect.
  Nu include automat stergerea existenta `Backend/.env.example`; clarifica separat.

### P0.5 - onboarding administrator (panou #/admin)

Implementat de Claude; detalii complete in [ADMIN_ONBOARDING.md](ADMIN_ONBOARDING.md).
Dreptul de admin este separat de `profiles.role`; medicii primesc rolul tot
numai prin acceptarea invitatiei cu emailul Google invitat.

- [x] Claude: `Database/migrations/007_platform_admins.sql` si
  `verify_007_checks.sql`; `Backend/src/admin/index.ts` + `admin.test.ts`, montat in
  `Backend/src/index.ts` (`npm run test:admin`); `Frontend/src/features/admin/**`,
  ruta `#/admin` in `App.tsx` si `/admin` in `src/auth/navigation.ts`.
- [ ] Codex: review punctual pe migratie, router si pagina admin.
- [ ] Codex: aplica 007 dupa review, apoi ruleaza `verify_007_checks.sql`
  (face rollback; trebuie sa afiseze NOTICE-ul de succes).
- [ ] Codex/operator: acorda admin numai contului numit explicit de utilizator,
  dupa ce acesta s-a autentificat o data cu Google (comanda SQL in
  ADMIN_ONBOARDING.md). Niciun alt cont; nu exista API pentru acordarea dreptului.
- [ ] Verificare live: admin -> `#/admin` -> invitatie -> link copiat si trimis
  manual -> medicul accepta cu emailul invitat -> `#/doctor`. Fara date reale in
  documente; orice fixture temporar se curata.

### P1 - urmatoarea implementare pentru Claude: cazuri si mesaje persistente

Incepe cu aceasta etapa dupa review-ul P0; nu implementa toate etapele simultan.

- [ ] Inspecteaza `Backend/src/cases.ts`, `schemas.ts`, `auth.ts`, UI chat si
  workspace-urile reale. Documenteaza contractele actuale intr-un
  `CASES_INTEGRATION.md`; nu presupune ca API-urile de cont si cazuri au acelasi
  format JSON sau aceleasi coduri de eroare.
- [ ] Completeaza API-urile lipsa pentru reluarea conversatiei: lista cazurilor
  utilizatorului si lista mesajelor unui caz, cu ordine stabila/paginare potrivita.
  Inspectia curenta a gasit create/get-case si send-message, nu aceste liste.
- [ ] Adauga client tipizat si UI autentificat pentru alegerea medicului activ,
  crearea/deschiderea cazului si trimiterea/citirea mesajelor. Pastreaza demo-urile
  separate si nu transforma serviciul mock in fallback pentru erori reale.
- [ ] La eroare pastreaza mesajul si ofera retry; defineste tratarea retry-ului
  dupa un raspuns pierdut astfel incat sa eviti duplicatele. Un mesaj al
  pacientului nu trebuie pierdut in tacere sau prezentat ca raspuns AI real.
- [ ] Acces exclusiv participantilor verificati server-side. Testeaza cont strain,
  rol fals in body, sesiune expirata, reload, schimbarea contului si eroare retea.
- [ ] Preda contractul, fisierele, verificarile si orice migrare propusa lui Codex.

Ownership propus pentru P1: Claude poate lucra in `Frontend/src/features/cases/**`
(nou), `Frontend/src/lib/caseApi.ts` (nou), `Backend/src/cases.ts` si teste aferente,
`Backend/src/schemas.ts`, plus legaturile strict necesare din App/workspace-uri.
Rezerva App si fisierele comune unui singur agent. `src/auth/**`, account API si
`AI/**` raman read-only in aceasta etapa; cere o schimbare concreta daca e necesara.
Database: doar migratii noi propuse, aplicate ulterior de Codex.

### P2 - documente reale, dupa existenta cazului

- [ ] Claude conecteaza scannerul la cazul autentificat, cu confirmare explicita,
  categorie, pending/retry si pastrarea documentului local la esec.
- [ ] Respecta API-ul existent: `POST /cases/:id/documents?documentType=...`, body
  binar, nu JSON/multipart; JPG/PNG/PDF, limita server 10 MB. Tipul real este
  verificat pe server; filtrul inputului nu este validare suficienta.
- [ ] Backendul extrage prin MedGemma si salveaza metadate + date extrase, nu
  fisierul brut. Nu adauga implicit bucket public sau stocare bruta in Supabase.
- [ ] Codex verifica dependintele/configuratia serviciului de extractie cu colegii;
  Claude verifica esec extractie, fisier invalid/mare si ownership caz.
- [ ] Adauga citirea documentelor cazului daca lipseste. Arata clar ce s-a salvat
  si ce ramane doar local; elibereaza object URL-urile cand nu mai sunt necesare.

### P3 - workspace clinic si AI coordonat

- [ ] Claude conecteaza lista/cazurile reale la workspace-ul medicului si afiseaza
  distinct continutul pacientului, medicului si asistenta generata.
- [ ] Coordoneaza cu echipa AI intrarea/iesirea pentru `/cases/:id/analysis`,
  extractie, clarificari si persistenta starii existente. Nu rescrie orchestratorul.
- [ ] Verifica minimizarea datelor inainte de cloud; regulile medicale deterministe
  raman separate. AI nu diagnosticheaza/prescrie independent si nu trimite automat
  pacientului recomandari clinice neaprobate de medic.

### P4 - livrare web si verificare pe dispozitiv

- [ ] Alege hosting frontend + backend; verifica buildul backend care importa
  modulul AI vecin. Nu presupune ca fiecare folder poate fi publicat izolat.
- [ ] Configureaza HTTPS, origini API/CORS, APP_ORIGIN/APP_BASE_PATH, variabile
  publice frontend si redirecturi Supabase exacte; hostul serveste SPA la callback.
- [ ] Testeaza Google intr-un browser normal si QR cu Camera telefonului. Un QR
  cu `127.0.0.1` nu trimite telefonul la calculator; necesita URL accesibil.
- [ ] Verifica Light/Dark, 320-1440 px, tastatura, zoom, camera, anulare si retea
  lenta. Android/deep links sunt etapa separata dupa web.
- [ ] Inlocuieste brand assets placeholder si decide optimizarea chunkului >500 kB
  inainte de livrarea publica; avertismentul singur nu blocheaza buildul.

## 5. Pornire si configuratie

Frontend: `npm.cmd run dev` in `Frontend/`, uzual `http://127.0.0.1:5173`.
Backend: `npm.cmd run dev` in `Backend/`, uzual `http://127.0.0.1:3001`.
Instaleaza dependintele AI si Backend daca lipsesc; Backend importa AI vecin.
Acestea sunt adresele de dezvoltare, nu o garantie ca procesele sunt pornite acum.

Frontend `.env`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`,
`VITE_API_BASE_URL`. Backend: `HOST`, `PORT`, `SUPABASE_URL`,
`SUPABASE_PUBLISHABLE_KEY`; operator/medical necesita suplimentar secret backend.
Configuratia de deploy si serviciile AI sunt descrise in documentele modulelor.
Nu afisa sau copia valori secrete in acest fisier.

Verificari locale relevante: frontend build/lint, `auth:check -- --online`,
testele navigation/connectionSync/QR; backend build si `test:account`.
Claude ruleaza testele pentru schimbarile sale. Codex verifica numai integrarea
afectata si operatiile externe; nu reluam toate verificarile fara un motiv.

## 6. Documente si predare

- [Contract auth/QR](AUTH_INTEGRATION.md) - API-uri fixe si autorizare.
- [Configuratie backend/operator](Backend/AUTH_SETUP.md).
- [Onboarding administrator si API admin](ADMIN_ONBOARDING.md).
- [Handoff conexiuni pacient](Frontend/src/features/connections/HANDOFF.md).
- [Handoff medic](Frontend/src/features/doctor/HANDOFF.md).
- [Scanner local](Frontend/src/features/document-scanner/README.md).
- [Schema](Database/SCHEMA.md), [AI](AI/README.md), [workflow Git](docs/TEAM_WORKFLOW.md).

`CLAUDE_NEXT_TASK.md` descrie livrarea connections deja predata; `CODEX_PLAN.md`
si `CONTINUE_MEDFLOW.md` contin istoric. Nu restaura fisiere de plan sterse de
altcineva si nu executa din nou planuri vechi ca si cum ar fi taskuri curente.

Formatul fiecarei predari: scop final, fisiere schimbate, contracte/migratii,
comenzi si rezultate, limite cunoscute, operatii concrete necesare Codex.
Actualizeaza acest checklist dupa acceptarea fiecarei etape.

## Prompt pentru Claude

Citeste HANDOFF.md si AGENTS.md aplicabile. Tu esti implementatorul principal;
Codex gestioneaza Supabase si integrarea. Livrarea connections are deja handoff:
nu o reface. Pregateste P1 prin inspectia modulelor si CASES_INTEGRATION.md, apoi
implementeaza P1 dupa inchiderea review-ului P0, in ownership-ul definit aici.
Foloseste agenti pe fisiere exclusive; un singur agent modifica fisierele comune.
Nu porni P2-P4 in acelasi timp. Ruleaza verificarile relevante si preda rezultatul
concis, inclusiv migratii noi propuse si cererile exacte pentru Codex. Nu modifica
Supabase direct, nu expune secrete, nu pierde schimbarile existente si nu face
operatii Git concurente cu alt agent.
