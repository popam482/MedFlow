# Context medical persistent - 7 noiembrie 2026

Cod pregatit fara MedGemma si fara scrieri/test live in Supabase, conform alegerii
utilizatorului. Nu au fost aplicate migrari. Necesita inca un backend configurat
corect pentru testul integrat cu baza de date reala.

## Comportament

Pacientul vede istoricul in `#/patient`, independent de confirmarea unei retete:
alergii, afectiuni si medicamente declarate. Adaugarea creeaza un element
neconfirmat. Pacientul poate confirma sau marca necunoscut; necunoscutul poate fi
confirmat ulterior. Necunoscut nu inseamna absenta unei afectiuni/medicatii.

Confirmarea este a pacientului, nu validare medicala. Medicul atribuit dosarului
poate citi contextul prin GET /cases/:id/context; nu are mutatii in acest modul.
Accesul urmeaza politica participantilor cazului existenta, ca la mesaje.
Niciun medicament nu este dedus dintr-un document si declarat automat activ.

PatientJourney nu mai afiseaza contextul fixture in contul real. Reteta/intake-ul
raman demonstrative pana la integrarea etapelor urmatoare; `#/demo/care` isi
pastreaza separat contextul sintetic.

## API

Toate rutele cer JWT verificat si rol derivat din profilul serverului.

| Ruta | Acces / body | Raspuns |
| --- | --- | --- |
| GET /patient/context | Pacient, numai propriile date | `{items: ContextItem[]}` |
| POST /patient/context/items | Pacient; `{kind, text}` | 201 `{item}` |
| POST /patient/context/items/:id/confirm | Pacient; `{}` | `{item}` |
| POST /patient/context/items/:id/unknown | Pacient; `{}` | `{item}` |
| GET /cases/:id/context | Participant autorizat al cazului | `{items}` |

kind: allergy/condition/medication. Text: 1-300 caractere dupa trim. Identitatea,
source, status, revision, history si timestampurile nu sunt acceptate de la client.
Sursa este patient-input; istoricul inregistreaza actorId, actiune/status si ora.
Raspunsurile nu sunt cache-uite. Conflictele returneaza 409; panelul reincarca datele
in loc sa suprascrie o schimbare concurenta.

## Stocare si concurenta

Un element = un rand in medical_records, cu record_type=patient_context_v1.
clinical_data contine versiunea 1 a contractului, kind/text/source/confirmation,
revision si history. patient_id si id sunt gestionate de server.

Nu modificam sau agregam aici randurile prescriptions/clinical_summary din
records.ts. API-ul generic POST /cases/:id/records respinge categoria rezervata
patient_context_v1, pentru a nu permite ocolirea validarii contextului.

Confirmarea foloseste compare-and-swap pe id + patient_id + record_type + revision.
Doua confirmari simultane nu pierd istoricul: una reuseste, cealalta primeste 409.
Repetarea unei actiuni deja efectuate este idempotenta. Confirmatul nu poate fi
retrogradat la unknown prin acest API. Textul original si sursa raman nemodificate.

Citirea detecteaza trunchierea dupa count exact si esueaza explicit daca depaseste
limita de 1000 elemente; nu arata o lista partiala ca istoric complet. Datele
incompatibile cu schema JSON produc eroare vizibila, nu sunt eliminate tacit.

Cheia server ramane numai in Backend/.env; aceste rute folosesc getAdminClient,
deci verifica identitatea si ownership-ul inainte de acces. Inainte de lansare
trebuie reverificate granturile/RLS existente si rezolvate dependentele mediului.

## Verificari

- Backend build, 9 teste noi context si 10 teste views: roluri, identitate din
  server, input invalid, confirmare/unknown, replay, ownership, concurenta,
  rezervarea categoriei si compatibilitatea rutelor vechi.
- Frontend build/lint/white-label, plus browser cu doua sesiuni si API simulat:
  adaugare alergie -> unknown -> reload -> confirmare -> citire la medic.
- Browserul verifica si drafturi intre dosare, mesaje dupa reload, feedback si
  layout la 320/390/1440 px. Nu demonstreaza persistenta reala Supabase.
- Test: `npx.cmd tsx --test src/patientContext.test.ts src/caseViews.test.ts`.

## Limite ramase

- Adaugarea nu are inca idempotenta persistenta pe clientRequestId; un raspuns
  pierdut si o retrimitere pot crea duplicate. Confirmarile au replay sigur.
- Editarea/retragerea unei declaratii confirmate necesita un flux separat cu
  versiuni/audit; modulul actual permite adaugare si confirmare, nu stergere.
- Istoricul actiunilor este pastrat in DB; UI arata sursa/starea curenta, nu inca
  un viewer complet de audit.
- Contextul nu este transmis unui LLM. Integrarea AI/minimizarea se fac ulterior.
- Testul live si orice publicare se fac separat, fara conturi/date medicale reale.
