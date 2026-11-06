# Prezentare MedFlow - 7 noiembrie

## Ce functioneaza in acest scenariu

Deschide `http://127.0.0.1:5173/#/demo/care` dupa pornirea frontendului cu
`npm.cmd run dev`. Ruta este un demo sintetic in memorie: nu cere login, nu
scrie in Supabase, nu apeleaza AI si nu transfera date intre dispozitive.
Auth/QR reale raman separate la `#/patient` si `#/doctor`.

## Scenariu de 3-5 minute

1. Arata eticheta Demo data si istoricul sintetic. Explica diferenta intre
   confirmat, necunoscut si conflict deja marcat in datele de demonstratie.
2. Descarca reteta sintetica din introducere. Pentru camera poti tipari SVG-ul;
   pentru selectorul de fisiere foloseste o captura PNG/JPG a retetei. Nu utiliza
   o reteta reala. Selecteaza documentul, apoi apasa Use Document.
3. Explica faptul ca extragerea de pe aceasta ruta este un fixture prestabilit:
   nu demonstreaza OCR real si nu recunoaste continutul oricarui fisier ales.
   Confirma separat numele, doza, instructiunea si durata, apoi Confirm prescription.
4. Introdu explicit o ora si prima zi, confirma ultima zi rezultata din durata,
   apoi Confirm schedule. Instructiunea originala ramane vizibila.
5. Scrie in chat: "Nu am febra. Poate de ieri ma doare capul." Apasa Send.
   Raspunsul asistentului este scriptat, nu produs de un model live.
6. Apasa Send to my doctor si schimba perspectiva in Doctor. Verifica rezumatul,
   negatia/incertitudinea, citatele si mesajele originale. Variantele sunt optionale.
7. Scrie feedback sintetic propriu si apasa Send as my response. Revino la Patient:
   feedback-ul se incarca, atribuit medicului, separat de asistent.
8. Pentru reminder alege initial o ora apropiata, lasa pagina deschisa si asteapta
   bannerul. Timerul verifica la 15 secunde. Notificarile de sistem depind de
   browser si permisiune; nu promite functionare in fundal/cu pagina inchisa.
9. Restart demo sterge starea acestui scenariu. Reload-ul o reseteaza de asemenea.

## Limite de spus clar

- Ambele perspective din demo impart un store local; nu sunt doua conturi reale.
- Rezumatul organizat si citatele nu dovedesc completitudinea unui LLM.
- Confirmarea programului nu este prescriere si nu modifica tratamentul.
- Pentru telefon, `127.0.0.1` inseamna telefonul insusi; este necesara o adresa
  accesibila/hosting. Camera, OAuth si notificarile trebuie probate pe dispozitiv.
- Integrarea reala context/chat/review/program/feedback si Azure raman taskuri
  separate din NEXT_ACTIONS.md; demo-ul nu le inlocuieste.
