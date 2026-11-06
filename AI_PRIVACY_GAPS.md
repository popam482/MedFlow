# AI: confidențialitate și siguranță, diferențe între declarații și cod

Stare verificată pe `AI` la commit `771253b` (6 noiembrie 2026).

Am comparat codul din modulul `AI/` cu ce susținem despre produs: „privacy-first”,
minimizare locală și AI care nu diagnostichează. Există patru diferențe în cod și un
punct de configurare de confirmat. Trebuie rezolvate înainte să folosim aceste
argumente într-o prezentare, un demo sau un pilot.

Responsabil: echipa AI (punctele 1–4), Backend/Supabase (punctul 5).

---

## 1. Minimizarea datelor este incompletă

**Fișier:** [AI/cloud/orchestration/privacy-gateway.ts](AI/cloud/orchestration/privacy-gateway.ts)

**Situația actuală**
- Filtrul înlocuiește doar emailuri, telefoane în format SUA (3-3-4 cifre), SSN-uri
  americane și date calendaristice.
- Nu tratează CNP-ul (13 cifre), numele, adresele, telefoanele românești scrise
  grupat (de exemplu `0722 123 456`) și numerele de fișă sau de asigurare.
- Pseudonimizarea numelor (`sessionMaps`) există doar ca un comentariu, iar
  `unscrub` returnează textul neschimbat.

Datele trec deci printr-un filtru, dar acesta nu acoperă identificatorii românești.

**De făcut**
- Reguli dedicate pentru formatele din România (CNP, telefoane, adrese).
- Extragerea numelor și adreselor, eventual cu modelul local prin Ollama, cum e
  descris în arhitectură.
- Pseudonimizare reală, reversibilă doar în vizualizarea medicului.
- Teste cu exemple sintetice: „după filtrare, textul nu mai conține X”.

## 2. Datele merg la Google Gemini fără garanții verificate

**Fișier:** [AI/cloud/orchestrator/gemini-client.ts](AI/cloud/orchestrator/gemini-client.ts)

**Situația actuală**
- Se folosesc SDK-ul `@google/generative-ai` și modelul `gemini-1.5-pro`, care e vechi.
- Pe nivelul gratuit al Gemini API, Google poate folosi conținutul trimis pentru
  îmbunătățirea produselor. Pe nivelul plătit sau pe Vertex AI, datele nu sunt
  folosite astfel.

**De făcut**
- Pentru date de sănătate, chiar pseudonimizate: Gemini API plătit sau Vertex AI,
  într-o regiune UE, cu acord de prelucrare a datelor (DPA) acceptat de echipă.
  Alternativ, alt furnizor cu garanții echivalente.
- Trecerea la un model Gemini actual și disponibil. Verificați lista oficială
  de modele la momentul migrării.

## 3. Regulile de siguranță nu sunt apelate

**Fișier:** [AI/edge/safety/redflags.ts](AI/edge/safety/redflags.ts)

**Situația actuală**
- `detectRedFlags` (alertele 112) și `checkMedicalAdviceGuardrail` (blocarea
  diagnosticelor și a tratamentelor) sunt definite, dar nu le apelează nimic
  în modul.

**De făcut**
- Fiecare mesaj al pacientului trece prin `detectRedFlags` înainte de LLM.
- Fiecare răspuns al AI-ului către pacient trece prin
  `checkMedicalAdviceGuardrail` înainte de afișare.
- Un test care confirmă că ambele sunt apelate pe acest drum.
- Asta ține de regulile 6 și 8 din [AGENTS.md](AGENTS.md).

**Notă:** alertele rămân reguli fixe, nu text generat de AI, și nu ordonează
pacienții după gravitate. Încadrarea lor sub MDR (Regulamentul UE 2017/745) trebuie
confirmată cu cineva care cunoaște reglementarea.

## 4. Rezumatul de pe edge este simulat

**Fișier:** [AI/edge/processing/summarizer.ts](AI/edge/processing/summarizer.ts)

**Situația actuală**
- `EdgeSummarizer` caută cu regex-uri etichete fixe (de exemplu `chief complaint:`)
  în transcript. Nu apelează niciun model local.
- Pe o conversație reală, aproape toate câmpurile vor ieși `Not specified`. Asta
  contravine regulii 7 din AGENTS.md: nu ignorăm simptomele raportate.
- Clientul pentru Ollama există deja în
  [AI/core/ai/llm-client.ts](AI/core/ai/llm-client.ts), dar nu e folosit aici.

**De făcut**
- Rezumatul să folosească modelul local prin `llm-client.ts`.
- Până atunci, rezumatul trimis medicului include și transcriptul original, ca să
  nu se piardă nimic.

## 5. De confirmat: regiunea Supabase

- Regiunea proiectului Supabase trebuie verificată în dashboard. Pentru date de
  sănătate, trebuie să fie în UE (de exemplu Frankfurt, `eu-central-1`).

---

## Ce nu susținem public până la rezolvarea punctelor 1–4

- „Datele sunt minimizate local înainte de cloud.”
- „Datele nu ajung la furnizori terți.”
- „Aplicația are reguli active de siguranță medicală și blocare a diagnosticelor.”

Ce putem susține acum: canal închis pacient–medic, medici doar pe bază de invitație,
conectare explicită prin cod sau QR.
