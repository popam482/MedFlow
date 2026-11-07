# Conectivitate DB si MedGemma - verificare 7 noiembrie 2026

Verificare read-only a schemei live si codului local. Nu au fost citite dosare
medicale, schimbate tabele sau afisate chei. Codul Backend are modificari locale
noi pentru records/documente; nu presupunem ca este identic cu versiunea main.

## Starea serviciilor

- Backend `/health`: 200; `/health/db`: 503.
- Backend/.env: URL si publishable key prezente; SUPABASE_SECRET_KEY si
  MEDGEMMA_URL nu au valori configurate. Prezenta unei chei nu ar dovedi validitatea.
- Extractie `127.0.0.1:8090/health`: nu raspunde.
- Ollama `127.0.0.1:11434/api/tags`: nu raspunde.
- Conturi/QR/admin utilizeaza cheia publica + JWT verificat + RPC autorizate.
  Rutele medicale folosesc inca getAdminClient(), deci necesita cheia server
  curenta. Nu copia cheia in frontend si nu reutiliza cheia expusa anterior.
- `#/demo/care` utilizeaza inca createFixtureScenario(), fara persistenta live.

## Tabele public existente, confirmate live

| Tabela | Continut |
| --- | --- |
| profiles | Profil si rol pacient/medic; id legat de identitatea Auth |
| doctor_details | Specialitate si clinica |
| doctor_invitations | Invitatii, hash token, expirare/revocare/consumare |
| platform_admins | Dreptul separat de administrator |
| doctor_connection_codes | Codul public revocabil pentru QR |
| connection_requests | Cereri pending/accepted/rejected/cancelled |
| doctor_patient_assignments | Asocieri active pacient-medic |
| cases | Cazuri, participanti si status |
| case_messages | Mesaje, rol expeditor si timestamp |
| medical_documents | Date extrase JSONB si metadate; nu contine fisierul brut |
| medical_records | Istoric/context in clinical_data JSONB si record_type |
| ai_analyses | Rezumat, propuneri, intrebari si alte campuri de analiza |
| doctor_decisions | Raspunsul final si decizia atribuite medicului |
| cloud_disclosures | Evidenta trimiterilor catre furnizori cloud |
| connection_test | Tabela tehnica de verificare a conectivitatii |

Toate au RLS activ. RLS activ nu inseamna singur ca toate drepturile sunt corecte:
getAdminClient foloseste privilegii care il ocolesc, deci autorizarea pe rute ramane
obligatorie. Identitatile si sesiunile sunt gestionate separat de Supabase Auth.

## Cum se acceseaza

Frontend -> Backend cu `Authorization: Bearer <token Supabase>` -> Supabase.
Pentru account/admin: backend verifica tokenul si apeleaza RPC-uri cu acelasi JWT;
functiile SQL verifica auth.uid(), rolul si ownership-ul. Frontendul nu scrie direct
in tabele medicale. Pentru `/cases`, backendul verifica participantii si foloseste
clientul privilegiat numai pe server. Dashboard-ul Supabase este pentru operatori,
nu reprezinta autorizarea utilizatorilor aplicatiei.

## Traseul MedGemma local deja pregatit in cod

Scanner -> `POST /cases/:id/documents?documentType=prescription` cu body binar si
Content-Type JPG/PNG/PDF -> backend autorizat -> `MEDGEMMA_URL/extract` -> serviciul
Python -> Ollama -> verificari deterministe -> `{extracted_data: {...}}` ->
medical_documents -> UI de verificare umana.

Serviciul nu scrie direct in Supabase. Backendul face persistenta. Adaptorul live
de extractie exista in frontend, dar pagina demo nu il foloseste. Salvarea review-ului
si citirea medicamentelor confirmate nu sunt implementate in acel adaptor.

Configuratie locala necesara, fara secrete in acest document:

```dotenv
# Backend/.env
MEDGEMMA_URL=http://127.0.0.1:8090
EXTRACTION_TIMEOUT_MS=120000
# SUPABASE_SECRET_KEY se completeaza local cu o cheie server valida, rotita.
```

Ollama trebuie sa aiba modelul agreat cu colegii. Serviciul Python foloseste
EDGE_LLM_ENDPOINT (implicit localhost:11434) si EDGE_LLM_MEDGEMMA (implicit
medgemma1.5:4b). Pornirea serviciului din AI/edge/extraction_service:
`.venv\Scripts\python -m uvicorn main:app --host 127.0.0.1 --port 8090`.
Dependintele Python trebuie instalate/verificate conform README-ului modulului;
testarea anterioara a fost blocata de lipsa httpx2 in mediul local.

## Ce trebuie terminat, in ordine

1. Configuratia backend pentru rutele medicale si verificare `/health/db` 200.
2. Rezolvat driftul DB: `cases.doctor_orchestration_state` lipseste live, desi
   orchestrationStateStore.ts o citeste/scrie (migrarea 003). Revizuim schema cu
   colegii si aplicam reparatia prin migrare; nu rescriem orbeste migrari aplicate.
3. Pornire Ollama + serviciu extractie; test health si o reteta sintetica.
4. Fixat contractul de esec: codul Backend local salveaza un rand cu
   extraction_status=unavailable, dar nu salveaza fisierul. Comentariul "nu pierdem
   fisierul" nu descrie comportamentul real. UI trebuie sa retina fisierul si sa
   permita retry, cu idempotenta sau endpoint explicit de re-extractie; nu returna
   asta drept extractie reusita si nu accepta un obiect gol ca review final.
5. Conectat UI autentificat la caz si upload; pastrat preview-ul pana la confirmare,
   citate/provenienta si valorile necunoscute. GET documente/records apar acum in
   codul local Backend, dar necesita testare si contract final.
6. Persistenta pentru context confirmat, review, program medicație si feedback,
   plus liste cazuri/mesaje si retry fara duplicate. Nu exista in schema live o
   tabela de programe/reminders sau client_message_id pentru idempotenta mesajelor.
7. Review al records.ts nou: medicamentele extrase din toate documentele nu devin
   automat "tratament activ"; trebuie data/confirmare/status si sursa. Nu transforma
   istoricul sau o reteta veche in schema curenta fara confirmare.
8. Test cap-coada cu doua conturi si continut sintetic: caz -> document -> review ->
   context -> rezumat -> feedback. Nu declara sincronizare cross-device pe fixture.

Daca Backend ruleaza pe Azure iar MedGemma pe laptop, 127.0.0.1 din cloud nu
inseamna laptopul. Colegii trebuie sa asigure o legatura privata/protejata;
nu expunem serviciul de extractie neautentificat direct pe internet.
