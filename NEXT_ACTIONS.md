# Actiuni curente - 7 noiembrie 2026

> PRELUARE TEMPORARA CODEX: utilizatorul a cerut continuarea aici cat Claude este
> indisponibil pana la 01:40. Codex a verificat demo-ul si a corectat integrarea
> perspectivelor. Claude trebuie sa citeasca noul
> [care-scenario/HANDOFF.md](Frontend/src/features/care-scenario/HANDOFF.md)
> inainte de reluare. Nu refaceti aceste corectii in paralel.
>
> Build/lint/white-label si cele 93 teste de logica au trecut. Browser: scenariu
> complet fixture, drafturi/review pastrate, feedback incarcat la revenire,
> resetare si 12 combinatii latime/tema fara overflow. Vezi DEMO_RUNBOOK.md.
> Reminderul in pagina a fost verificat si prin timerul de 15 secunde cu ceas
> controlat; starea "marcat ca luat" se pastreaza intre perspective.
> 007 a fost aplicata in Supabase dupa aprobarea explicita a utilizatorului.
> verify_007_checks.sql a trecut cu ROLLBACK; zero administratori si zero conturi
> sintetice de verificare ramase. RLS fortat si granturile restrictive confirmate.

## Ultima reverificare: scenariul frontend este in lucru

Aceasta sectiune actualizeaza snapshot-ul mai vechi de mai jos.

- Agentii Codex account_backend/account_database/qr_complete sunt completed.
  Blocajele de lock raportate de qr_complete au fost tratate anterior in 006;
  nu sunt probleme noi ramase de implementat din acel raport.
- Claude a creat modulele care-scenario, patient-context, intake-chat,
  prescription-review, medication-schedule, doctor/case si doctor-feedback,
  impreuna cu teste de logica si clientul caseApi. Sunt inca schimbari necomise.
- App monteaza `#/demo/care`. Pagina utilizeaza explicit createFixtureScenario:
  date sintetice in memorie, ambele perspective in aceeasi pagina, reload = reset.
- Exista adaptor live pentru extractia documentului; salvarea review-ului si
  citirea medicamentelor confirmate arunca explicit LiveNotAvailableError.
  Celelalte domenii ale scenariului nu au inca adaptoare live in acel modul.
- Nu exista inca un HANDOFF nou pentru care-scenario. Existenta testelor nu
  confirma ca au trecut; Claude trebuie sa predea rezultatele pe versiunea finala.
- Backend local are commit a9476c3 pentru account/admin; Database 5685c6e pentru
  004-007; Frontend 9553020 pentru branding/admin. Sunt si modificari locale noi.
- Verificarea GitHub confirma aceleasi SHA-uri Azure/main Backend/AI ca mai jos.
  Branch-ul frontend publicat a avansat la 9553020. Publicarea Backend/Database
  trebuie coordonata; main remote ramane d17f6d4 / cf43acc.
- MCP list_migrations confirma acum auth_connections, auth_code_validation,
  auth_lock_order si platform_admins (007). Onboarding-ul contului admin ramane
  separat, numai dupa ce proprietarul indica identitatea exacta.

### Ce terminam acum

1. Claude finalizeaza si testeaza `#/demo/care`: context -> reteta -> program ->
   chat -> rezumat/surse -> feedback. Preda un HANDOFF cu limite live/fixture,
   build/lint/white-label, testele logicii si verificarea browserului.
2. Claude verifica reminder-ul, resetul, fisierele locale, negatiile si datele
   contradictorii. Nu extinde scopul spre variantele optionale inainte de predare.
3. Codex face review punctual dupa predare; nu modifica folderele lui Claude in
   timp ce acesta implementeaza. Apoi verificam o repetitie cap-coada.
4. Colegii predau contractele Backend/AI si Azure; conectam pe rand persistenta
   caz/mesaje/feedback, apoi context/review/program. Nu prezentam demo-ul local
   ca functionare cross-device sau AI live.
5. 007/admin si integrarea Git raman secundare; accesul admin necesita contul
   indicat de proprietar. Nu aplica automat migrari noi sau merge-uri Azure.

Prompt scurt pentru Claude: continua implementarea existenta, finalizeaza si
verifica `#/demo/care`, apoi scrie `Frontend/src/features/care-scenario/HANDOFF.md`
cu fisiere, rezultate, limite si operatiile necesare Codex. Nu reface modulele
deja create si nu bloca predarea pe Azure sau variantele optionale.

## Decizii confirmate

Scenariul principal: context pacient -> scanare/review reteta -> program confirmat
si reminder -> chat de colectare -> rezumat cu surse -> feedback medic.
Cele 3 variante de suport decizional sunt optionale. Adminul nu blocheaza demo-ul.
Claude implementeaza; Codex se ocupa de Supabase si integrarea externa.

## Stare reverificata

- DEMO_IMPLEMENTATION_PLAN.md si BACKEND_HOSTING_PLAN.md exista ca propuneri.
- Snapshot anterior: modulele nu existau; intre timp au fost create conform
  ultimei reverificari de mai sus.
- Panoul admin exista local; migrarea 007 si verificarile ei sunt pregatite.
  Aplicarea remote nu a fost reverificata acum; nu o considera aplicata pe baza
  existentei fisierului. Nu acorda drepturi admin fara cont numit de proprietar.
- GitHub Backend: main d17f6d4, Azure-implementation 06d38d9.
- GitHub AI: main e3c533c, Azure-implementation 5ae8356.
  Aceste SHA-uri au fost verificate direct in aceasta revizuire. AI local este
  inca 771253b. Nu facem checkout/merge peste munca necomisa a colegilor.
- Sunt multe schimbari locale inclusiv branding/admin/auth. Pastreaza-le;
  nu face reset, stash general, commit global sau schimbare de branch automat.

## Ce face Claude acum

1. Creeaza contractele TypeScript comune pentru scenariu si adaptoarele fixture/live,
   cu sursa explicita pe fiecare domeniu. Un singur agent detine App/rutele/store-ul.
2. Porneste in paralel modulele frontend din sectiunea 6 a planului:
   context/chat, review reteta, program/reminder, rezumat/feedback medic.
   Rezerva fisiere distincte agentilor. Nu modifica Backend/AI in curs.
3. Livreaza mai intai un scenariu complet cu date sintetice marcate. Pregateste
   legaturile live unde contractele exista; erorile live nu activeaza fixture-uri.
4. Ruleaza build, lint, white-label check si testele pentru modificari. Preda
   fisierele, ce este live/simulat si cererile exacte pentru Codex/colegi.

## Corectii obligatorii fata de propunere

- Nu folosi `omittedNothing: true` produs de LLM ca dovada de completitudine.
  Pastreaza sursele si afiseaza mesajele neacoperite; verificarea acoperirii trebuie
  sa fie separata de afirmatia modelului. Originalul este mereu accesibil.
- Nu deduce automat o interactiune medicamentoasa sau clasa unui medicament din
  text pentru a genera un conflict clinic. Demo-ul poate avea un conflict sintetic
  explicit, etichetat; detectia clinica noua nu este necesara acestei etape.
- Doua taburi cu storage comun nu demonstreaza doua sesiuni Google independente:
  Supabase sincronizeaza sesiunea intre taburi. Pentru doua conturi autentificate
  foloseste profiluri de browser separate, iar pentru schimb de date intre ele
  este necesara persistenta comuna pe server. Un fixture local poate demonstra
  doua perspective numai ca demo separat, fara ocolirea auth/rolurilor reale.
- Nu introduce rute noi `/patient/*` fara a verifica explicit routerul si destinatiile
  post-login permise. Modificarile auth comune sunt rezervate unui singur integrator.
- La salvarea intake, persista mesajul pacientului chiar daca AI esueaza sau o
  regula fixa opreste raspunsul normal. Returneaza eroare partiala explicita;
  foloseste idempotenta pentru a evita duplicatele la retry.
- Confirmarea unei ore alese nu autorizeaza schimbarea instructiunii prescrise.
  Durata, unitatile, prima/ultima zi si timezone trebuie validate separat.
- Reminders doar cu pagina deschisa sunt acceptabile pentru demo daca limita e
  vizibila. Nu promite notificari background sau pe alt dispozitiv.

## Ce face Codex la integrare

1. Verifica predarile si contractele fara a dubla codingul/testele lui Claude.
2. Revizuieste 007 si verifica starea Supabase; prioritate secundara. Nu aplica
   automat 008/009/010: sunt propuneri, numerotarea trebuie coordonata.
3. Integreaza Backend/Azure doar dupa predarea colegilor, pastrand routerele cont,
   admin, CORS strict si configuratia linkurilor. Confirma ce versiune e deployata.
4. Testeaza o singura trecere UI live pacient -> cerere -> acceptare dupa ultima
   predare, apoi caz/feedback cand exista API-uri. Rezultatele API istorice nu
   demonstreaza automat integrarea UI noua.

## Ce asteptam concret de la colegi

- Backend: cine livreaza listele cazurilor/mesajelor/documentelor si feedback-ul;
  contractele finale si fisierele pe care Claude are voie sa le modifice.
- AI: endpoint intake, rezumat cu surse, extractie cu citate, tratarea erorilor;
  providerul/modelul curent si formatul raspunsurilor. Fara date reale de pacient.
- Azure: SHA final, URL Backend, adresa AI interna, health endpoints, extractie
  accesibila Backend-ului, configuratie si acces operator. Colegii inca lucreaza;
  nu exista o conectare Azure realizata de Codex in aceasta revizuire.

## Prompt de pornire pentru Claude

Citeste NEXT_ACTIONS.md, DEMO_IMPLEMENTATION_PLAN.md si AGENTS.md. Incepe acum
implementarea frontend din sectiunea 6, cu agenti pe fisiere exclusive. Rezumatul
si feedback-ul sunt MUST; variantele sunt optionale. Aplica toate corectiile din
NEXT_ACTIONS.md. Nu astepta Azure pentru UI si contracte, nu modifica Backend/AI
inca lucrate de colegi si nu prezenta fixture-urile ca integrare live. Preda un
scenariu complet demonstrabil, testele relevante si cererile precise pentru Codex.
