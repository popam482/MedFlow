# MedFlow - brief principal pentru demo-ul din 7 noiembrie 2026

Acest brief actualizeaza prioritatea produsului din HANDOFF.md. Nu inlocuieste
contractele auth/QR. Claude face majoritatea codingului; Codex gestioneaza Supabase
si integrarea serviciilor. Colegii lucreaza inca la Backend/AI/Azure: nu presupune
ca schimbarile lor sunt terminate sau disponibile local.

## Experienta pe care vrem sa o prezentam

1. Pacientul intra cu Google si are un medic asociat prin fluxul existent.
2. Completeaza/consulta istoricul, alergiile si medicamentele curente. Informatia
   are sursa si stare de confirmare; datele necunoscute raman necunoscute.
3. Scaneaza un document sintetic. Vede originalul/textul extras si verifica
   campurile structurate inainte ca ele sa devina context confirmat.
4. Pentru o reteta, vede medicamentul, doza, instructiunea originala, durata,
   data de inceput/sfarsit si orele confirmate. Confirma explicit programul.
5. Chatul foloseste contextul pentru intrebari de clarificare si colectare;
   nu diagnosticheaza, nu prescrie si nu modifica schema prescrisa.
6. Medicul vede rezumatul organizat, sursele si conversatia originala, apoi
   trimite feedback propriu. Feedback-ul este atribuit medicului si pastrat separat.
7. Pacientul vede tratamentul confirmat si un reminder la ora programata.

Pentru demo folosim numai persoane, documente si tratamente sintetice. Separati
explicit ce functioneaza live de ce este fixture demonstrativ. Erorile serviciilor
reale nu produc fallback ascuns catre succes simulat.

## Regula centrala: prezentarea nu schimba sursa

- Mesajele originale, instructiunile si datele confirmate nu sunt suprascrise de
  rezumat. Rezumatul este o reprezentare derivata, versionata si legata de surse.
- Pastrati negatiile, incertitudinea, unitatile, datele si cronologia. Nu omiteti
  rapoarte de simptome doar fiindca nu incap in rezumat. Originalul ramane accesibil.
- Un rezumat generativ poate gresi: formularea "nu schimbam informatia" este un
  obiectiv verificabil, nu o garantie oferita de folosirea unui LLM.
- Pentru fiecare camp extras important, pastrati textul sursa si referinta la
  document/pagina sau mesaj. Campurile ilizibile/conflictuale cer confirmare.
- Corectarea de catre om pastreaza provenienta, cine a confirmat si momentul.
  Nu introduceti stocarea bruta a documentelor in cloud implicit; conveniti
  separat retentia, accesul si ce original ramane numai local.

## Reteta si reminders: limite functionale

- Extragere inseamna transcrierea prescriptiei existente, nu generarea tratamentului.
  Nu completati doze, unitati, durata, ore sau data inceperii din presupuneri.
- "De doua ori pe zi" nu inseamna automat "la 08:00 si 20:00" sau "la 12 ore".
  Cereti confirmarea instructiunilor si a orelor; schema ambigua necesita medic.
- Schema programata trebuie sa acopere fusul orar, prima/ultima zi, intervalul
  prescris si oprirea/anularea reminderelor. PRN/la nevoie si scheme variabile
  raman explicit nesuportate pentru automatizare in primul demo.
- Nu recomandati compensarea unei doze omise si nu schimbati doza pe baza
  istoricului, simptomelor ori interactiunilor deduse de AI.
- Pentru maine: un program simplu, confirmat, o afisare "urmatoarea administrare"
  si un reminder demonstrabil. Daca notificarea functioneaza doar cu pagina
  deschisa, etichetati limita; un timer web nu demonstreaza notificari de fundal.
- Cereti permisiunea de notificare prin actiunea utilizatorului. Continutul de pe
  ecranul blocat este generic implicit, fara numele medicamentului/date medicale.

## Ce exista si ce lipseste

| Flux | Punct de pornire | Lipsa pentru demo integrat |
| --- | --- | --- |
| Login/QR | API-uri de cont, migratii 004-006 si workspace-uri reale | Verificare UI finala cu predarea connections |
| Chat | UI mock si prompt intake in AI | Transport real, persistenta, context istoric/tratamente, endpoint intake agreat |
| Rezumat | Scheme si orchestrator AI existente | Mod summary-only cu surse; nu conecta automat generatorul de optiuni diagnostice |
| Scanare | `#/demo/scan`, obiect local si API documente in Backend | Legare de caz, extractie, review si confirmare, erori/retry |
| Istoric | `medical_records` exista | Contract de citire/editare, provenienta, acces autorizat si UI |
| Medicamente | Context textual in schema CaseSummary | Model/contract pentru tratamente confirmate si program; nu exista flux complet |
| Reminders | Nu a fost gasit un modul implementat in codul curent | Scheduler, permisiuni, persistenta si test pe dispozitiv pentru metoda aleasa |
| Feedback medic | UI demonstrativ si tabela doctor_decisions | Contract, salvare si livrare reala catre pacient |
| Azure | Branch-uri AI/Backend existente | Predarea colegilor, resurse/URL-uri, configuratie, health si smoke test |

## Branch-uri gasite in referintele locale

Numele branch-urilor modulelor si SHA-urile Azure au fost confirmate direct pe
GitHub prin `git ls-remote --heads origin`, fara checkout/merge. Continutul Azure
a fost inspectat din referintele locale care au aceleasi SHA-uri. AI remote main
este `e3c533c`; working tree-ul AI poate avea o versiune mai veche. Nu presupuneti
ca main local contine ultimele teste/extractia adaugata de colegi.
Nu schimbati branch-ul intr-un working tree cu modificari in curs.

- Superproiect: activ `feat/frontend-foundation`; exista `main`,
  `backup/before-submodules`, remote `chore/update-backend-ai-database`.
- Frontend: activ `feat/frontend-foundation`; remote `main`,
  `feat/frontend-foundation`, `feat/document-scanner`.
- Backend: activ `main`; remote `Azure-implementation` (snapshot `06d38d9`),
  `AI-Backend`, `feat/be-02-cases`, `feat/be-03-documents`, `feat/supabase-env`, `main`.
- AI: activ `main`; remote `Azure-implementation` (snapshot `5ae8356`),
  `AI-Backend`, `AI-implementation2`, `AI-response`, `main`.
- Database: activ `main`; remote `AI-Database`, `feat/db`,
  `fix/db-schema-review`, `main`.

In snapshot-ul Azure, Backend adauga un client HTTP AI si Dockerfile; AI adauga
server HTTP/Dockerfile. Serviciul AI foloseste inca Gemini. Hosting pe Azure si
folosirea modelelor Azure sunt decizii diferite. Nu migram providerul implicit.

## Azure: ce cerem colegilor la predare

Codex nu are in aceasta sesiune conector Azure sau CLI az disponibil. Nu a fost
realizata o conectare la un cont Azure si nu sunt create resurse prin acest brief.

Cerem un handoff cu: branch + SHA final, resource group/regiune, URL Backend,
adresa interna AI, serviciul de extractie si contractele lor, health endpoints,
numele variabilelor/secrets necesare, metoda de deploy si limitele cunoscute.
Fara valori secrete in documentatie/chat. Pentru acces, configurati identitatea
operatorului in Azure; nu partajati parola contului.

Arhitectura tinta de verificat cu colegii: frontend -> Backend autentificat ->
serviciu AI/extractie protejat. Supabase ramane identitate + persistenta.
AI nu trebuie expus public fara protectie doar pentru a face demo-ul sa mearga.
Pe Azure, folositi identitati gestionate unde serviciile permit; pentru API keys
necesare, configurati secrets numai pe server. Model endpoint/deployment sunt
necesare numai daca se alege efectiv un provider de modele Azure.

Microsoft descrie OCR/extractia structurata si necesitatea review-ului uman in
[Document Intelligence](https://learn.microsoft.com/legal/cognitive-services/document-intelligence/transparency-note).
Aceasta este o optiune, nu o inlocuire decisa a serviciului MedGemma existent.
[Autentificare fara chei pentru Azure OpenAI](https://learn.microsoft.com/en-us/azure/developer/ai/keyless-connections).

## Claude: task imediat de gandire si implementare

Citeste acest brief, HANDOFF.md si AGENTS.md, apoi inspecteaza implementarea.
Pregateste `DEMO_IMPLEMENTATION_PLAN.md` cu o propunere concreta pentru maine.

1. Deseneaza fluxul cap-coada si propune contracte pentru context pacient,
   chat/intake, summary-only, extractie reteta, program confirmat si feedback.
   Distinge API-uri existente, lipsa si cele pe care le asteptam de la colegi.
2. Fa un tabel MUST / STRETCH, dependinte si criterii de acceptare. Prioritizeaza
   un singur scenariu integrat demonstrabil; nu promite toate functiile live.
   Panoul admin este secundar daca ameninta livrarea acestui scenariu.
3. Imparte munca intre agentii tai: UI chat/context, review document/reteta,
   workspace summary/feedback, program/reminder. Un agent detine fisierele comune.
   Preferati `Frontend/src/features/**` noi; inventariati fisierele exacte.
4. Nu modifica `Backend/src/cases.ts`, `schemas.ts`, `AI/**` sau migratiile
   colegilor pana la confirmarea fisierelor disponibile. Pregateste adaptoare
   si fixture sintetice etichetate in paralel; nu crea API-uri concurente.
5. Pentru Database, propune necesarul minim in contract; inspecteaza schema si
   citeste skill-ul Supabase inainte de a scrie SQL. Codex revizuieste/aplica.
6. Include teste cu negatii in summary, date contradictorii, reteta ilizibila,
   frecventa fara ore, durata fara data inceperii, expirarea programului, timezone,
   notificari refuzate si schimbarea utilizatorului. Verifica autorizarea cazului.
7. Livreaza lista exacta de operatii pentru Codex si intrebarile pentru colegi.
   Dupa stabilirea contractelor, implementeaza in scope-ul disponibil; nu cere
   Codex sa refaca implementarea sau toate testele tale locale.

## Acceptarea demo-ului

- [ ] Un pacient sintetic, un medic, o conversatie si o reteta sintetica lizibila.
- [ ] Originalul/contextul, rezumatul si feedback-ul sunt distincte si atribuibile.
- [ ] Medicul poate verifica sursele; nu apar optiuni diagnostice generate in flux.
- [ ] Pacientul confirma schema inainte de orice reminder; ambiguitatile blocheaza
  programarea automata, fara doze sau ore inventate.
- [ ] Demonstram explicit notificarea aleasa si spunem daca cere pagina deschisa.
- [ ] Erorile pastreaza mesajul/documentul pentru retry; datele nu trec intre conturi.
- [ ] Telefon + desktop, Light/Dark; scenariu de prezentare si verificare de rezerva
  cu fixture marcate, fara a prezenta rezultate simulate ca integrare live.

Formatarea informatiei nu garanteaza singura exceptarea MDR; acest brief stabileste
demo-ul tehnic, nu autorizeaza utilizarea clinica sau lansarea cu pacienti reali.
