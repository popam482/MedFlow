# Claude — conexiunile pacientului, in paralel cu Backend/Database

> Actualizare primary: `refreshProfile()` pastreaza profilul si pagina montata
> in timpul actualizarii in fundal pentru aceeasi identitate; la esec invalideaza
> accesul ca inainte. `accountApi.requestConnection(token,code,signal?)` si
> `updateConnection(token,id,action,signal?)` accepta acum AbortSignal. Ambele au
> fost verificate in browser. Backendul si migratiile sunt implementate, iar
> testele HTTP reale cu date sintetice aprobate au trecut; nu schimba contractele.

Executa acest task acum. Backendul si migratiile acestui flux sunt deja livrate.
Noua impartire generala este in WORK_ALLOCATION.md: Claude preia majoritatea
implementarii, Codex serviciile conectate si integrarea. Pentru taskul curent
ramane valabil ownership-ul exclusiv de mai jos. Nu modifica alte module.
Citeste AGENTS.md si AUTH_INTEGRATION.md, apoi inspecteaza implementarea existenta.

## Ownership exclusiv pentru aceasta runda

Poti modifica numai `Frontend/src/features/connections/**`.
Toate celelalte fisiere sunt read-only, inclusiv `src/auth/**`, `src/lib/**`,
`src/App.tsx`, modulul doctorului, stilurile globale, package.json si lockfile-ul.
Nu adauga dependinte, nu schimba contractele API si nu face operatii Git care
schimba indexul, checkoutul sau commiturile. Agentii impart acelasi workspace.

Nu executa din nou CLAUDE_AUTH_PLAN.md: livrarea precedenta a fost integrata.
QR-ul medicului foloseste acum uqr; nu il inlocui si nu modifica acele fisiere.

## Obiectiv

Finalizeaza si verifica UX-ul pacientului pentru cererile de conectare, cu
atentie la concurenta cererilor, schimbarea sesiunii si erorile reale. Pastreaza
structura vizuala existenta, layoutul fluid si textele in engleza. Nu implementa
chat medical real, upload sau functionalitati noi in afara acestui flux.

## Verificari si modificari necesare

1. `usePatientConnections`: inspecteaza citirile si mutatiile in curs. Dupa
   schimbarea utilizatorului/tokenului sau demontare, raspunsurile vechi nu trebuie
   sa suprascrie lista, sa arate date ale contului anterior sau sa declanseze
   actualizarea profilului noii sesiuni. Utilizeaza anulare/generatii si pastrarea
   identitatii cererii, nu doar filtrarea randarii dupa token.
2. Actualizarea manuala, pollingul si mutatiile nu trebuie sa se suprascrie in
   ordine inversa. Evita pollingul cand tabul nu este vizibil si suprapunerea
   inutila a cererilor. Curata listener-ele si timer-ele la demontare.
3. Dupa un conflict 409 sau o eroare de mutatie, pastreaza informatia utila,
   actualizeaza starea de pe server si ofera retry. Nu inventa acceptari sau
   asocieri locale. Cererile pending nu pot fi retrimise prin click repetat.
4. Verifica tranzitia pending -> accepted: profilul actualizat trebuie sa arate
   medicul in echipa activa. Daca ai nevoie de schimbari in AuthProvider, cere-le
   in handoff; nu modifica providerul si nu masca eroarea cu date sintetice.
5. Pastraza previzualizarea doctorului inainte de login, revenirea la acelasi cod
   dupa Google si confirmarea explicita Request connection. Nici preview-ul,
   nici loginul, nici pollingul nu trimit automat cereri de conectare.
6. Verifica pending/rejected/cancelled/accepted, lipsa configurarii, API indisponibil,
   link invalid/revocat, sesiune expirata si cont doctor pe ruta pacientului.
7. Verifica accesibilitatea si overflow la 320,360,390,768,1024,1440 px, Light/Dark,
   tastatura si text lung. Toate actiunile trebuie sa aiba stare pending clara.

## Contracte fixe

- `useAuth()` si AccountProfile din `src/auth` sunt sursa sesiunii si rolului.
- `accountApi` din `src/lib/accountApi` este singurul acces la noile API-uri.
- `refreshProfile()` inregistreaza erorile in provider, fara sa arunce pentru
  erori de profil normale; nu crea un client Supabase sau auth provider nou.
- Exporturile raman `PatientConnectPage({code})` si `PatientAccountPage()`.
- Codurile sunt URL-safe,16-256 caractere. Nu extrage ID-ul doctorului din JWT.
- Date medicale reale, tokenuri si chei nu se afiseaza in loguri sau handoff.

## Testare si predare

Foloseste backend/API simulate pentru testele de concurenta si erori; nu genera
utilizatori reali si nu modifica Supabase. Daca pornesti un server de test foloseste
un port separat, fara sa suprascrii .env sau serverele primary.

Testeaza concret raspuns intarziat dupa schimbarea sesiunii, refresh-uri in ordine
inversa, click repetat, anulare cu eroare si refresh dupa acceptare. Nu adauga un
framework de teste. Daca mediul impiedica o verificare, raporteaza exact limita.

Ruleaza build/lint fara --fix. Pentru erori in fisierele lucrate simultan de alti
agenti, raporteaza-le; nu iesi din ownership ca sa le repari.

Scrie rezultatele in `Frontend/src/features/connections/HANDOFF.md`: fisierele
modificate, bugurile concrete corectate, testele si ce mai necesita primary.
Nu pretinde ca integrarea backendului este finalizata pana nu o verifica Codex.
