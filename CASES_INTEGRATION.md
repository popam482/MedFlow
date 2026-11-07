# Dosare, mesaje si feedback - fara dependenta de AI local

Actualizare: contextul pacientului este acum implementat separat in
PATIENT_CONTEXT_INTEGRATION.md, cu endpoint de citire pentru participantii cazului.
Ramane neverificat live, conform preferintei utilizatorului.

Implementare pregatita la 7 noiembrie 2026. Utilizatorul a ales explicit pregatirea
codului fara test live acum. Nu au fost schimbate schema sau datele Supabase.

## Livrarea curenta

Sectiunea `Dosare si mesaje` este montata in conturile autentificate de pacient
si medic (`#/patient`, `#/doctor`). Foloseste API-ul real configurat, fara fixture
sau fallback la demo. Permite alegerea medicului activ si crearea unui dosar,
lista paginata, citirea/trimiterea mesajelor, feedback propriu medicului si citirea
lui de catre pacient. Refresh-ul este manual; notificari/push nu sunt implementate.

PatientJourney si `#/demo/care` pastreaza separat modulele lor demonstrative;
existenta acestei sectiuni nu conecteaza automat contextul/retetele/chatul AI.

## API-uri noi

Router: Backend/src/caseViews.ts, montat inaintea routerului existent cases.
Nu intercepteaza celelalte rute. JSON pentru randuri este snake_case, mapat la
camelCase de Frontend/src/lib/caseApi.ts. Toate cer Bearer JWT valid si profil
citit server-side. Nici rolul, nici identitatea nu vin din request body.

| Ruta | Acces | Rezultat |
| --- | --- | --- |
| GET /cases?limit=50&offset=0 | Pacient/medic, filtrat dupa profil | `{cases: [...]}` |
| GET /cases/:id/messages?limit=100&offset=0 | Participantul cazului | `{messages: [...]}` |
| GET /cases/:id/decision | Participantul cazului | `{decision: null}` sau ultimul feedback |
| POST /cases/:id/decision | Numai medicul atribuit cazului | `{decision: ...}`, 201 |

Body feedback: `{finalResponse: string}`, 1-10000 caractere dupa trim. Campurile
suplimentare sunt respinse. Medicul si tipul custom sunt stabilite server-side.
Raspuns feedback: id, case_id, doctor_id, final_response, created_at. Nu expune
analizele AI/propunerile. Salvarea adauga o decizie, fara a rescrie originalul sau
a pretinde o tranzitie de status a cazului care nu a fost efectuata.

Limita paginarii: 1-100, offset 0-100000. Ordine stabila pe created_at + id;
mesajele sunt cronologice. Cache-Control: no-store. Erori noi: 400 invalid,
401 sesiune, 403 rol, 404 lipsa/neparticipant, 503 serviciu indisponibil.

Autorizarea urmeaza contractul existent al cazurilor: pacientul si medicul
atribuit cazului. Daca produsul cere revocarea accesului la toate cazurile istorice
cand asocierea devine inactiva, aceasta politica necesita o schimbare coordonata
si pentru rutele existente, nu doar pentru noul router.

## Persistenta si limite

Foloseste tabelele existente cases, case_messages si doctor_decisions. Nu sunt
necesare migrari pentru aceasta livrare. Backend foloseste in continuare
SUPABASE_SECRET_KEY doar pe server; browserul trimite exclusiv tokenul sesiunii.

Drafturile sunt pastrate in memoria contului, separat pe dosar, la schimbarea
dosarului. Nu sunt salvate in localStorage. La logout/schimbarea contului sunt
eliminate prin cheia identitatii componentei. La succes sunt sterse numai dupa
confirmarea serverului. Erorile pastreaza textul; la raspuns pierdut utilizatorul
este avertizat sa verifice lista inainte de retrimitere.

LIMITA: create-case, post-message si post-decision nu au inca idempotenta
persistenta bazata pe clientRequestId. Ref-urile UI blocheaza clickuri simultane,
dar nu garanteaza lipsa duplicatelor dupa pierderea raspunsului sau intre clienti.
Aceasta ramane necesara inainte de lansarea produsului.

## Verificare

- Backend build si 10 teste HTTP noi: autentificare, ownership, rol doctor,
  paginare, validare, no-store, erori sigure si compatibilitatea rutelor vechi.
- Frontend build/lint/white-label. S-a extras formatarea datei din ScheduleCard
  in scheduleLabels.ts pentru a corecta eroarea lint deja prezenta in versiunea
  tradusa a modulului; comportamentul nu s-a schimbat.
- Browser cu doua contexte sintetice si API simulat: draft intre dosare, mesaj
  dupa reload, feedback medic -> pacient, lipsa butonului doctor la pacient,
  fara overflow la 320/390/1440 px. Nicio scriere live Supabase.
- Script de verificare ignorat: output/playwright/check-real-case-ui.js.

## Ce mai trebuie pentru produsul persistent

1. Configuratie server valida si smoke test cu doua conturi + date sintetice,
   cand utilizatorul doreste test live. /health nu dovedeste /health/db.
2. Idempotenta persistenta pentru mutatii si reguli explicite de status/revocare.
3. Context pacient structurat, surse, confirmare si istoric al modificarilor.
4. Persistenta review-ului retetei si a programului confirmat; notificari reale
   si test pe telefon, separat de timerul demonstrativ.
5. Tratarea upload-ului fara extractor: nu marca drept extras un rand cu
   extraction_status=unavailable; pastreaza fisierul pentru retry.
6. Legarea rezumatului cu surse si a AI-ului ulterior. Lipsa coloanei de stare
   a orchestratorului nu blocheaza noile rute fara AI, dar ramane de rezolvat.
7. Hosting si smoke test integrat, apoi commit/push coordonat. Nu include automat
   modificarile locale preexistente records/cases/medgemma sau fisierele .env.
