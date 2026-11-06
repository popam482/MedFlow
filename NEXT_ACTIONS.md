# Actiuni curente - 7 noiembrie 2026

## Decizii confirmate

Scenariul principal: context pacient -> scanare/review reteta -> program confirmat
si reminder -> chat de colectare -> rezumat cu surse -> feedback medic.
Cele 3 variante de suport decizional sunt optionale. Adminul nu blocheaza demo-ul.
Claude implementeaza; Codex se ocupa de Supabase si integrarea externa.

## Stare reverificata

- DEMO_IMPLEMENTATION_PLAN.md si BACKEND_HOSTING_PLAN.md exista ca propuneri.
- In workspace nu exista inca modulele propuse pentru context, intake-chat,
  prescription-review, medication-schedule sau doctor/case. Incepem implementarea.
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
