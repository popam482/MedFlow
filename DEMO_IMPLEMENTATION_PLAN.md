# MedFlow — plan de implementare pentru demo-ul din 7 noiembrie 2026

Autor: Claude, la cererea din [DEMO_BRIEF.md](DEMO_BRIEF.md). Stare: **propunere, fără cod încă.**
Cititori: echipa, Codex (Supabase și integrare) și colegii de Backend, AI și Azure.

Revizuire Codex, 7 noiembrie: proprietarul a confirmat **rezumat + feedback;
variantele sunt optionale**. Nu conditionati scenariul de cele 3 variante sau de
panoul admin. Planul este pregatit pentru implementarea frontend in scope-ul
definit; Backend/AI/Azure necesita in continuare coordonare cu colegii.

---

## 1. Ce demonstrăm: un singur scenariu integrat

Pacienta sintetică „Ana Test”, medicul sintetic „Dr. Demo” și o rețetă sintetică tipărită pentru hipertensiune: amlodipină 5 mg, „1 cp dimineața”, 30 de zile.

| Pas | Pacient | Medic | Sursa datelor la demo |
| --- | --- | --- | --- |
| 1 | Login Google; are deja medic asociat (QR) | Login Google; pacienta apare conectată | **Live** (există) |
| 2 | Vede și confirmă contextul: alergii, boli cronice, medicamente; fiecare cu sursă și stare | — | Fixture etichetat → live când există API |
| 3 | Scanează rețeta, vede originalul lângă câmpurile extrase, corectează sau confirmă fiecare câmp | — | Scanare locală **live**; extracția **live** dacă rulează Backend + MedGemma, altfel fixture etichetat |
| 4 | Alege explicit orele, data de început și durata, apoi confirmă programul; vede „Următoarea administrare” | — | Doar în frontend (local, pe cont) |
| 5 | Răspunde în chat la întrebările de colectare; un semnal de alarmă afișează 112 imediat | — | Fixture scriptat etichetat → live când există endpoint-ul de intake |
| 6 | Apasă „Trimite medicului” | Vede cazul: rezumat cu surse, conversația originală, documentul, cele 3 variante de suport decizional | Rezumat: fixture. Variante: **live** dacă există `GEMINI_API_KEY`, altfel fixture |
| 7 | — | Scrie feedback-ul propriu (poate porni de la o variantă, dar îl editează și îl semnează) | Live dacă există endpoint-ul, altfel fixture |
| 8 | Vede „Dr. Demo a spus: …” (atribuit, cu ora), tratamentul confirmat și reminder-ul la ora programată | — | Reminder: notificare web **cu pagina deschisă** (limită anunțată) |

**Regula de prezentare.** Fiecare ecran afișează sursa datelor: `Live` sau `Date demo`. O eroare a unui serviciu real arată eroarea și buton de reîncercare. Nu trece niciodată în tăcere pe date demo (brief: „fără fallback ascuns”).

---

## 2. Ce există, ce lipsește, ce așteptăm de la colegi

| Domeniu | Există | Lipsește | Cine |
| --- | --- | --- | --- |
| Conturi, asociere, admin | 8 API-uri de cont, 004–006 aplicate; admin cu migrația 007 (încă neaplicată) | Aplicarea 007, test live | Codex |
| Cazuri | `POST /cases`, `GET /cases/:id`, `POST /cases/:id/messages` (format `snake_case`, erori `{error, details}` în română) | `GET /cases` (listă), `GET /cases/:id/messages`, idempotență mesaje | Backend: atinge `cases.ts`, deci după confirmarea colegilor |
| Chat / intake AI | Prompt intake, `redflags.ts`, `llm-client.ts` (doar în AI, neconectate) | Endpoint intake, apelarea regulilor 112 și a blocării sfaturilor medicale | Echipa AI (vezi [AI_PRIVACY_GAPS.md](AI_PRIVACY_GAPS.md)) |
| Context pacient | Tabela `medical_records` (`record_type`, `clinical_data` JSONB) | Contract citire/editare cu proveniență și stare de confirmare | Backend + Database (propunere în secțiunea 4) |
| Documente / rețetă | `POST /cases/:id/documents` + MedGemma: `medications[{name,dose,frequency,duration}]`, `dates`, `warnings`, `source` | `GET /cases/:id/documents`; **textul sursă pe fiecare câmp** (extracția nu-l returnează); salvarea confirmării omului | AI (citat sursă) + Backend (citire, confirmare) |
| Program medicație și reminders | Nimic | Model de date, persistență, notificări | Frontend acum (local); Backend și Database după demo |
| Rezumat cu surse | `CaseSummary` (fără surse); `EdgeSummarizer` e simulat cu regex | Mod „summary-only” cu referințe la mesaje și documente | Echipa AI |
| 3 variante (medic) | `POST /cases/:id/analysis` (`DoctorOrchestrator`, Gemini), răspuns `{options[3], missingInformation, contradictions}`. Pe branch-ul Azure trece prin `AI_URL/analysis` | Rezumatul îl construiește clientul, nu serverul; câmpul `urgenta` lipsește | AI + Backend |
| Feedback medic | Tabela `doctor_decisions` (`decision_type`, `final_response`); dialog demo | Endpoint salvare și citire pentru pacient | Backend |
| Azure | Branch-uri `Azure-implementation` (Backend `06d38d9`, AI `5ae8356`): `aiClient.ts`, `cloud/server.ts` (`/health`, `/analysis`), Dockerfile | Predarea lor (URL, health, secrets, deploy). **`/analysis` din `cloud/server.ts` nu are autentificare** | Colegii |

**Risc de conflict.** Branch-ul Azure al Backend-ului modifică `src/cases.ts` și `src/index.ts`. `index.ts` conține acum și montarea router-ului de admin (P0.5). La merge, trebuie păstrate ambele.

---

## 3. Extensie optionala: cele 3 variante

Decizia proprietarului din 7 noiembrie: rezumatul cu surse si feedback-ul sunt
prioritare. Variantele sunt STRETCH, numai dupa scenariul principal, cu limitele:

- **Medicul cere variantele explicit**, cu un buton „Generează variante (suport decizional)”. Nu apar automat.
- **Variantele se văd doar în workspace-ul medicului.** Nu ajung niciodată la pacient: nu există cale de cod de la variante la ecranul pacientului.
- **Feedback-ul către pacient e întotdeauna textul medicului.** Butonul „Pornește de la această variantă” doar precompletează un câmp editabil. Trimiterea cere confirmarea explicită „Trimit ca răspunsul meu”.
- **Etichetă permanentă:** „Generat de AI — suport decizional, nu diagnostic. Decide medicul.”
- **Afișăm `missingInformation` și `contradictions`** lângă variante.
- **Pentru juriu:** acest modul ar fi aproape sigur dispozitiv medical (MDR, regula 11). Nu folosim formularea „date anonime” și nici afirmațiile interzise de [AI_PRIVACY_GAPS.md](AI_PRIVACY_GAPS.md).

Decizie confirmata: variante optionale. Implementarea lor nu blocheaza restul.

---

## 4. Contracte propuse

Pentru API-urile noi propunem: JSON `camelCase`, erori `{ "error", "code" }`, `Authorization: Bearer` și roluri verificate pe server, ca la API-urile de cont.

Frontend-ul are câte un **adaptor** pe domeniu, cu două implementări: `live` (API) și `fixture` (date sintetice etichetate). Alegerea se face prin configurație, nu automat după o eroare.

```ts
// Proveniență comună
type Source =
  | { kind: 'patient-input'; at: string }
  | { kind: 'message'; caseId: string; messageId: string; quote: string }
  | { kind: 'document'; documentId: string; page?: number; quote?: string }
  | { kind: 'doctor'; doctorId: string; at: string };
type Confirmation = { status: 'confirmed' | 'unconfirmed' | 'unknown' | 'conflict'; by?: 'patient' | 'doctor'; at?: string };

// Context pacient — LIPSEȘTE (Backend + Database)
// GET  /patient/context            -> { context: { allergies, conditions, medications: ContextItem[] } }
// POST /patient/context/items      { kind, text }            -> { item }
// POST /patient/context/items/:id/confirm                    -> { item }
type ContextItem = { id: string; kind: 'allergy' | 'condition' | 'medication'; text: string; source: Source; confirmation: Confirmation };

// Intake chat — LIPSEȘTE (echipa AI + Backend). Regulile 112 rulează pe server ÎNAINTE de LLM.
// POST /cases/:id/intake { content, clientMessageId }
//   -> { patientMessage, assistantMessage: Msg | null, redFlag: { message: string } | null }
// Idempotent pe clientMessageId (retry fără duplicate). Cu redFlag, LLM-ul nu se apelează.

// Documente — EXISTĂ upload-ul; LIPSESC citirea și confirmarea
// POST /cases/:id/documents?documentType=prescription   (binar)  -> document (extracted_data MedGemma)
// GET  /cases/:id/documents                                     -> { documents }
// POST /cases/:id/documents/:docId/review { fields: ReviewedField[] } -> { document }
type ReviewedField = { path: string; extracted: string | null; value: string | null; confirmation: Confirmation; sourceQuote?: string };

// Program medicație — LIPSEȘTE (demo: doar local)
type MedicationSchedule = {
  id: string; medication: string; doseText: string;      // copiate din rețeta confirmată, fără inferențe
  instructionOriginal: string;                           // textul exact din rețetă
  times: string[];                                       // "HH:MM", alese explicit de pacient
  startDate: string; endDate: string | null;             // endDate calculat doar din startDate + o durată confirmată
  timezone: string;                                      // IANA, ex. "Europe/Bucharest"
  status: 'active' | 'ended' | 'cancelled'; confirmedAt: string;
};

// Rezumat cu surse — LIPSEȘTE (echipa AI): reprezentare derivată, versionată
// POST /cases/:id/summary -> { summary: { version: number; createdAt: string; items: { text: string; sources: Source[]; negated?: boolean; uncertain?: boolean }[] } }
// Completitudinea NU e o afirmație a modelului: UI-ul calculează în cod mesajele pacientului necitate de niciun rând (NEXT_ACTIONS.md).

// Variante (medic) — EXISTĂ: POST /cases/:id/analysis (doar medicul cazului)
// -> { status: 'FINAL', data: { options[3]{option, reasoning, confidence, confirmationPath}, missingInformation, contradictions } }
//  | { status: 'CLARIFICATION_REQUIRED', data: string }
// Cerere: CaseSummary să fie construit pe server din caz, nu primit de la client.

// Feedback medic — LIPSEȘTE (Backend; tabela doctor_decisions există)
// POST /cases/:id/decision { decisionType: 'approved' | 'modified' | 'custom', finalResponse, aiAnalysisId? } -> { decision }
// GET  /cases/:id/decision  -> { decision: { finalResponse, doctor: PublicDoctor, createdAt } | null }  (pacientul cazului)
```

**Necesar minim în baza de date** (propunere, fără SQL scris; Codex revizuiește și aplică):

1. `medical_records`: fie coloane noi pentru `source` (jsonb), `confirmation_status`, `confirmed_by` și `confirmed_at`, fie un `record_type` standard cu aceste chei în `clinical_data`. Recomandăm coloanele, ca să poată fi verificate prin CHECK.
2. `medical_documents`: o coloană `review` (jsonb) plus `reviewed_by` și `reviewed_at`.
3. `case_messages`: `client_message_id` cu index unic pe (`case_id`, `client_message_id`), pentru idempotență.
4. Tabelă nouă `medication_schedules` (câmpurile de mai sus, cu RLS pe pacient). **Doar după demo.**

Înainte de orice SQL citim schema actuală și ghidul Supabase al lui Codex.

---

## 5. MUST / STRETCH

| ID | Ce | Tip | Depinde de | Criteriu de acceptare |
| --- | --- | --- | --- | --- |
| M1 | Login + medic asociat | MUST, live | Codex: test live P0 | Pacientul vede medicul în echipă după acceptare |
| M2 | Ecran context pacient (alergii, boli, medicamente) cu sursă și stare | MUST | — (fixture) | Necunoscutul apare „Necunoscut”, nu gol și nu „Nu”; confirmarea arată cine și când |
| M3 | Scanare → review rețetă → confirmare | MUST | Scanner (există); extracția live e STRETCH | Originalul lângă câmpuri; un câmp ilizibil sau în conflict blochează confirmarea până la editare; nimic nu se completează din presupuneri |
| M4 | Program confirmat + „Următoarea administrare” + reminder cu pagina deschisă | MUST | — | „de 2 ori pe zi” fără ore → cere orele, nu le alege singur; durată fără dată de început → cere data; PRN → „nu se programează automat”; după `endDate` nu mai sună |
| M5 | Chat de colectare cu banner 112 | MUST (fixture scriptat) | Live = endpoint AI | Mesajul nu se pierde la eroare; banner AI vizibil; semnalul de alarmă oprește fluxul normal |
| M6 | Caz la medic: rezumat cu surse + conversația originală + documentul | MUST | Rezumat: fixture | Fiecare rând din rezumat duce la mesajul sau documentul sursă; negațiile rămân negații |
| M7 | 3 variante doar la medic, cu eticheta | STRETCH, optional | Serviciu AI disponibil si scenariul principal terminat | Niciun drum spre pacient; medicul le cere explicit |
| M8 | Feedback-ul medicului → pacientul vede „Dr. X a spus” | MUST | Cross-device = endpoint `decision` | Atribuit și separat de rezumat |
| S1 | Extracție live MedGemma | STRETCH | Backend + MedGemma pornite | La 502/503/504 documentul rămâne local, cu reîncercare |
| S2 | Variante live (Gemini) | STRETCH | `GEMINI_API_KEY` în Backend | Eroarea e afișată, fără fallback |
| S3 | Persistență reală pentru context, review, decizie | STRETCH | Endpoint-urile din secțiunea 4 + migrații | — |
| S4 | Notificări în fundal / pe telefon | NU mâine | Service worker / Capacitor | Spunem explicit că nu există |
| S5 | Panoul admin live | Secundar | Codex aplică 007 | Nu blochează scenariul |

**Atenție la M8 în modul fixture.** Fără endpoint-ul `decision`, medicul și pacientul pot fi demonstrați doar **în același browser** (două tab-uri, store local etichetat). Pentru două dispozitive e nevoie de **S3, minim `POST`/`GET /cases/:id/decision` + `GET /cases`**.

---

## 6. Împărțirea pe agenți: fișiere exclusive

| Agent | Fișiere | Livrează |
| --- | --- | --- |
| **A0 — integrare (unicul care atinge fișierele comune)** | `Frontend/src/App.tsx` (rute), `Frontend/src/features/demo-scenario/**` (store fixture pe cont, seed sintetic, `DataSourceBadge`, comutator live/fixture), `Frontend/src/lib/caseApi.ts` | Adaptoarele, rutele `#/patient/*` și `#/doctor/case/:id`, golirea stării la logout sau la schimbarea contului |
| **A1 — context + chat** | `Frontend/src/features/patient-context/**`, `Frontend/src/features/intake-chat/**` (refolosește componentele din `features/chat` doar prin import) | M2, M5 |
| **A2 — review rețetă** | `Frontend/src/features/prescription-review/**` (folosește `DocumentScanner` exportat de modulul Mariei) | M3 |
| **A3 — program și reminder** | `Frontend/src/features/medication-schedule/**` | M4 (logică pură testată: frecvență fără ore, durată fără start, expirare, fus orar, notificare refuzată) |
| **A4 — caz medic și feedback** | `Frontend/src/features/doctor/case/**` (modulul meu), `Frontend/src/features/doctor-feedback/**` (ecranul pacientului) | M6, M7, M8 |

**Regulă comună:** butoane `ui-button`, tokenuri și `brand.config` (white-label), date doar sintetice, `npm run build`, `npm run lint` și `node scripts/check-white-label.mjs`.

**Backend** (`GET /cases`, `GET /cases/:id/messages`, `decision`) **doar după confirmarea colegilor**. Acum pregătim doar adaptoarele.

---

## 7. Teste obligatorii (din brief)

- **Rezumat:**
  - „nu am febră” rămâne negat;
  - „poate de ieri” rămâne incert;
  - unitățile și datele se păstrează;
  - niciun simptom raportat nu dispare: test că fiecare mesaj al pacientului apare în rezumat sau într-o secțiune „neincluse, vezi originalul”.
- **Date contradictorii:** alergie la penicilină în context, dar rețeta conține un medicament din aceeași clasă. Arătăm conflictul; nu decidem nimic.
- **Rețetă ilizibilă:** doză `null` → câmp „Ilizibil, completează sau întreabă medicul”; confirmarea programului e blocată.
- **Program:**
  - frecvență fără ore;
  - durată fără dată de început;
  - expirarea programului;
  - fus orar `Europe/Bucharest`, inclusiv o zi cu schimbare de oră (DST);
  - anulare.
- **Notificări:** permisiune refuzată sau nesuportată → mesaj clar și „Următoarea administrare” rămâne vizibilă; textul de pe ecranul blocat e generic, fără numele medicamentului.
- **Schimbarea utilizatorului:** contextul, programul, chat-ul și cazul dispar imediat; un răspuns întârziat nu reapare (modelul din `connections` și `admin`).
- **Autorizare:**
  - pacientul nu vede variantele;
  - un alt pacient nu vede cazul;
  - medicul vede doar cazurile pacienților alocați activ;
  - pe API-urile live testăm și 401, 403 și 404.
- **Browser:** 320–1440 px, Light/Dark, tastatură; telefon real pentru scanare.

---

## 8. Operații pentru Codex

1. Decizie inchisa: rezumat + feedback MUST; variantele STRETCH.
2. Aplică 007 și rulează `verify_007_checks.sql` (verificat local în Docker; vezi `ADMIN_ONBOARDING.md`). Prioritate mică față de demo.
3. Testul live P0: pacient → QR → acceptare.
4. Verifica pornirea Backend-ului si MEDGEMMA_URL daca extractia este disponibila.
   In arhitectura Azure, GEMINI_API_KEY apartine serviciului AI; Backend foloseste
   AI_URL. Nu copia cheia intre module pentru a masca o diferenta de arhitectura.
5. Revizuiește propunerile de schemă din secțiunea 4 după ce ne răspund colegii. Nu aplica nimic înainte.
6. La integrarea Git: păstrează montarea admin din `Backend/src/index.ts` la merge cu `Azure-implementation`.

## 9. Întrebări pentru colegi

**Echipa AI:**
1. Puteți livra până mâine `POST /cases/:id/intake` cu `detectRedFlags` înainte de LLM și `checkMedicalAdviceGuardrail` pe răspuns? Dacă nu, rămânem pe fixture scriptat.
2. Poate extracția MedGemma să returneze **textul sursă (citatul) pentru fiecare câmp**? Brief-ul îl cere pentru review.
3. Există un mod „summary-only” cu referințe la surse? Dacă nu, rezumatul rămâne fixture și conversația originală e întotdeauna vizibilă.
4. `cloud/server.ts` (`/analysis`) nu are autentificare. Cum îl protejați pe Azure (rețea internă, identitate gestionată)?

**Backend:**
5. Pot adăuga `GET /cases`, `GET /cases/:id/messages`, `POST`/`GET /cases/:id/decision` în `cases.ts`, sau le faceți voi pe branch-ul Azure? Avem nevoie de ele pentru demo pe două dispozitive.
6. Formatul API-ului de cazuri (`snake_case`, erori în română fără `code`) rămâne? Frontend-ul îl poate traduce, dar contractul trebuie fixat.

**Azure:**
7. Predarea: branch și SHA final, URL-urile Backend și AI, health endpoints, variabilele necesare (fără valori), metoda de deploy, limite.

---

## 10. Etape relative pentru implementare, 7 noiembrie

| Ora | Ce |
| --- | --- |
| 0–1 | A0: store fixture, adaptoare, rute, seed sintetic. În paralel, întrebările către colegi |
| 1–6 | A1–A4 în paralel pe fișierele lor; teste pure la fiecare modul |
| 6–7 | Scenariul cap-coadă în fixture; trecem pe live fiecare domeniu care a primit API |
| 7–8 | Teste de browser (tabelul din secțiunea 7), telefon + desktop, Light/Dark |
| 8 | **Feature freeze.** Doar bugfix, scenariu de rezervă pe fixture etichetat, repetiție |

Acest plan stabilește demo-ul tehnic. Nu autorizează utilizarea clinică și nu atestă conformitatea MDR.
