# Prompt de continuare MedFlow

> IMPARTIRE CURENTA: citeste WORK_ALLOCATION.md inainte de planurile istorice.
> Claude face majoritatea implementarii si verificarilor locale; Codex gestioneaza
> Supabase/serviciile conectate si verificarea punctuala a integrarii.

> ACTUALIZARE: Backendul local si cele 8 API-uri de cont sunt implementate.
> Migratiile 004-006 sunt aplicate, testele SQL cu rollback trec, iar cele 12
> scenarii HTTP reale cu conturi sintetice aprobate au trecut. Conturile si
> datele temporare au fost sterse si verificate. QR-ul local foloseste uqr si
> este decodabil. Paragrafele istorice de mai jos descriu punctul de pornire;
> pentru starea curenta foloseste AUTH_INTEGRATION.md si Backend/AUTH_SETUP.md.
> Claude lucreaza acum numai in features/connections conform CLAUDE_NEXT_TASK.md.

Lucrezi la MedFlow in D:\dev\ULBS\MedFlow. Citeste AGENTS.md aplicabile,
AUTH_INTEGRATION.md, CLAUDE_AUTH_PLAN.md si handoff-ul din modulul doctorului.
Inspecteaza codul si starea Git inainte de modificari. Codex este primary;
Claude detine modulul medicului; colegii detin Backend, Database si AI. Nu modifica
zonele celorlalti fara o redistribuire explicita a responsabilitatilor.

## Stare verificata la 6 noiembrie 2026

- O singura aplicatie web responsive, cu intrari separate pentru pacient si medic.
- Frontendul raspunde la http://127.0.0.1:5173/.
- Proiect Supabase existent: qodpmyyccbsagndkipib. Nu crea un proiect nou.
- Configuratia publica este in Frontend/.env, ignorat de Git. Nu afisa cheile.
- `npm.cmd run auth:check -- --online` confirma ca Google este activ in Supabase.
- Butonul real Continue with Google ajunge la accounts.google.com, la pagina de
  autentificare Google. Nu au fost introduse credentiale sau aprobat consimtamantul.
- Revenirea reala dupa Google si incarcarea profilului NU sunt inca validate.
- Buildul, lintul si verificarile locale pentru destinatiile OAuth trec.
  Buildul avertizeaza asupra unui chunk de peste 500 kB; nu este eroare de build.
- Backendul local nu raspunde la /health sau /me pe portul 3001.
- Modulul real al medicului a fost livrat de Claude cu HANDOFF.md: cereri,
  acceptare/respingere, link de asociere si regenerare. Testele lui sunt cu API simulat.
- Encoderul QR nu este implementat: QR_ENCODER_AVAILABLE este false.
- Exista modificari necomise in frontend/documentatie; nu le reseta si nu le pierde.
  Backend/.env.example apare sters in working tree; clarifica provenienta inainte
  de orice restaurare sau commit. Nu include stergerea automat intr-un commit.

## Obiectiv imediat

Obtine primul flux real complet: pacient Google -> profil persistent -> cerere
catre medic -> acceptare de medic -> asociere activa. Medicii primesc acces doar
prin invitatie verificata de echipa MedFlow. Foloseste numai identitati si date
sintetice pentru dezvoltare si testare.

## 1. Codex: verificarea Google si integrarea comuna

- Reconfirma configuratia prin auth:check fara sa afisezi valori secrete.
- Utilizatorul finalizeaza Google login in browserul normal. Nu introduce in numele
  sau parole, nu colecta tokenuri in chat si nu declara loginul complet doar pentru
  ca pagina Google se deschide.
- Verifica exact callbackul http://127.0.0.1:5173/auth/callback, restaurarea
  destinatiei QR/invitatie si apoi /me. La eroare identifica stratul concret:
  Google, Supabase, callback frontend, conexiune backend sau profil.
- Pastreaza o singura sesiune Supabase si rolul provenit exclusiv din backend.
  Erorile reale nu deschid workspace-ul demonstrativ.
- Demos raman numai la #/demo/patient si #/demo/doctor.

## 2. Colegii Backend/Database: servicii persistente

- Inspectati versiunile curente remote si locale; nu inlocuiti orbeste munca in curs.
  Backendul local este in urma fata de main, iar superproiectul foloseste git pins.
- Porniti backendul si implementati contractele exacte din AUTH_INTEGRATION.md,
  incepand cu GET /me si provisioning server-side al profilului pacientului.
- Continuati cu invitatii doctor, coduri revocabile, cereri si tranzactia de acceptare
  care creeaza asocierea activa. Generarea si trimiterea invitatiilor apartin
  operatorului MedFlow; nu implementati auto-promovare la doctor.
- JWT verificat, roluri server-side, autorizare per inregistrare, CORS pentru originul
  frontend si chei privilegiate exclusiv in backend. Nu deschideti tabelele medicale
  pentru scriere din browser ca solutie rapida.
- Migratii aditive, tokenuri aleatoare stocate ca hash, expirare/revocare, duplicate
  si retry idempotent, mai multi medici per pacient; respectati contractul documentat.
- Nu pretindeti persistenta pana cand tranzactia nu s-a incheiat cu succes.

## 3. Claude: QR real si UI medic

- Respecta write ownership-ul Frontend/src/features/doctor/**.
- Coordoneaza cu Codex alegerea unei biblioteci locale de encoder QR; numai primary
  modifica package.json/lockfile. Nu trimite linkurile catre un serviciu QR extern.
- Leaga seam-ul qrEncoder.ts, verifica imaginea prin decodare independenta si
  scanare cu un telefon. Download-ul trebuie sa contina acelasi link validat.
- Uniformizeaza formatul codului la 16-256 caractere URL-safe, conform contractului
  comun; UI-ul doctorului accepta momentan minimum 8, iar pacientul minimum 16.
- Testeaza acceptare/respingere, regenerare si erorile cu backendul real dupa livrare.

## Acceptare si incheiere

- Login/logout si sesiune expirata; QR/invitatie pornite inainte de login;
  invitatie pe email gresit, expirata, revocata sau deja folosita.
- Scanarea/loginul nu creeaza automat cererea; pacientul confirma, medicul accepta.
  Cererile duplicate nu dubleaza asocierea. Pacientul nu obtine rolul de medic din URL.
- Testeaza fluxul cu doua conturi de test si verificari in baza de date facute de
  echipa autorizata, fara a expune tokenuri sau continut medical in rapoarte.
- Verifica 320-1440 px, Light/Dark, tastatura si telefon real pentru scanare.
- Ruleaza build/lint si testele relevante. Distinge testele simulate de cele reale.
- Dupa finalizarea si revizuirea fiecarui livrabil, salveaza numai fisierele alocate;
  nu include .env, artefacte locale sau munca incompleta a celorlalti.
- Raporteaza ce este operational, ce a fost testat si blocajele ramase.
  Hostingul public si Android primesc o etapa separata dupa acest flux web.
