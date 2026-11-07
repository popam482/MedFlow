# Specificație extragere documente (OCR + MedGemma)

Pentru: agentul și colegii care lucrează la `AI/edge/extraction_service`.
Stare: **propunere de contract**, compatibilă cu ce există acum în Backend și Frontend.
Sursa de inspirație: o schiță generată cu Google AI Mode. Am păstrat doar ce ne trebuie.
Nu atinge contractul HTTP existent (`POST {MEDGEMMA_URL}/extract`, vezi `Backend/src/medgemma.ts`).

## 1. Ce trebuie să iasă din extragere

Câmpurile **existente** rămân cu aceleași nume (`name`, `dose`, `frequency`, `duration`), pentru că le citesc
`Backend/src/records.ts`, `Frontend/src/features/care-scenario/live/mapExtractedDocument.ts` și modulul
de program de medicație. Se **adaugă** doar câmpuri noi, opționale.

```json
{
  "documentType": "prescription | pharmacy_receipt | medicine_box | unknown",
  "medications": [
    {
      "name": "string | null",
      "form": "string | null",
      "strength": "string | null",
      "quantity": "number | null",
      "dose": "string | null",
      "frequency": "string | null",
      "duration": "string | null",
      "handwritten": false,
      "confidence": "low | medium | high"
    }
  ]
}
```

| Câmp | Ce conține | Exemple |
| --- | --- | --- |
| `name` | denumirea comercială sau substanța activă, curățată de zgomot | `AMOXICILINĂ / CLAVULANAT` |
| `form` | forma farmaceutică, formă scurtă | `cpr`, `cps`, `plicuri`, `sirop` |
| `strength` | concentrația | `875mg/125mg`, `500 mg` |
| `quantity` | unități prescrise sau eliberate, **număr**; `null` dacă e în ml, ½ etc. | `14` |
| `dose` | doza, **text brut** (câmp existent) | `1 cpr` |
| `frequency` | cât de des, **text brut** (câmp existent) | `2 cpr. / zi (1 la 12h)`, `1-0-1`, `la nevoie` |
| `duration` | cât timp, **text brut** (câmp existent) | `7 zile`, `o lună` |
| `handwritten` | `true` dacă valoarea a fost citită din scris de mână | adnotarea farmacistului `1-0-1` |
| `confidence` | încrederea extractorului în rând | `low` pentru scris de mână neclar |

## 2. Reguli

1. **Fără inventare.** Ce nu se vede în imagine rămâne `null`. Nu se fac presupuneri.
2. **Fără normalizare numerică.** `o lună` rămâne `o lună`, nu `30 de zile`. Calculele de date și de ore
   se fac în Frontend, cu confirmarea pacientului (`scheduleLogic.ts`).
3. **Textul brut e sfânt:** `dose`, `frequency` și `duration` se copiază exact cum apar, inclusiv `1 - 0 - 1`
   sau `1.0.1`.
4. **Scrisul de mână** se marchează cu `handwritten: true` și, dacă e neclar, `confidence: "low"`.
5. **Nu se corectează și nu se completează** valorile care se contrazic (de exemplu cantitate vs durată).
   Contradicțiile le semnalează Frontend-ul, nu extractorul.
6. **Nu se diagnostichează și nu se prescrie.** Extragerea transcrie, nu interpretează.

## 3. Tipuri de documente

| `documentType` | Ce este | Ce trebuie știut |
| --- | --- | --- |
| `prescription` | rețetă, electronică sau tipărită, în format tabelar | aici apar `frequency` și `duration` |
| `pharmacy_receipt` | bon sau decont de la farmacie | arată **ce s-a eliberat** (nume, concentrație, cantitate). **Nu conține posologie:** `frequency` și `duration` rămân `null` și nu se deduc din cantitate |
| `medicine_box` | fotografie de cutie, eventual cu adnotări olografe ale farmacistului | `1-0-1` apare aici, marcat `handwritten: true` |
| `unknown` | nu se poate stabili | nu se inventează tipul |

Pe un bon de farmacie nu se extrag prețurile, TVA-ul și numerele fiscale: nu ajută pe nimeni.

## 4. Date personale: două niveluri, nu unul

Distincția contează, pentru că medicul are nevoie de o parte din date, iar un LLM extern nu.

| Nivel | Ce se aplică |
| --- | --- |
| **Ce se salvează pentru medicul pacientului** (în Supabase, cu acordul pacientului) | Nu se extrag și nu se stochează: **CNP, CID, serie și număr CI, coduri de bare și QR**. Rămân utile medicului: medicamentele, analizele, diagnosticul din document. |
| **Ce iese spre un LLM extern** (Gemini sau alt serviciu din cloud) | Înainte de apel, **local**, se elimină: nume pacient, adresă, număr și serie rețetă sau bon, numele medicului și al clinicii. Diagnosticul și analizele ajung la un LLM extern **doar** cu consimțământ explicit (vezi `AI_PRIVACY_GAPS.md`). |

Datele de test sunt **sintetice** (regula 5 din `AGENTS.md`). Exemplele de mai jos sunt inventate.

## 5. Exemple (sintetice)

**A. Rețetă electronică**

Brut: `1 | AMOXICILINĂ / CLAVULANAT | Cpr. filmate 875mg/125mg | 14 tablete | 7 zile | 2 cpr. / zi (1 la 12h)`

```json
{
  "documentType": "prescription",
  "medications": [{
    "name": "AMOXICILINĂ / CLAVULANAT", "form": "cpr", "strength": "875mg/125mg", "quantity": 14,
    "dose": null, "frequency": "2 cpr. / zi (1 la 12h)", "duration": "7 zile",
    "handwritten": false, "confidence": "high"
  }]
}
```

**B. Cutie de medicament cu adnotare de mână**

Brut: `Paracetamol 500 mg, 20 tablete. Scris de mână: 1 - 0 - 1, timp de 5 zile`

```json
{
  "documentType": "medicine_box",
  "medications": [{
    "name": "Paracetamol", "form": "tablete", "strength": "500 mg", "quantity": 20,
    "dose": null, "frequency": "1 - 0 - 1", "duration": "5 zile",
    "handwritten": true, "confidence": "medium"
  }]
}
```

**C. Bon de farmacie** (fără posologie)

```json
{
  "documentType": "pharmacy_receipt",
  "medications": [{
    "name": "LEKOKLAR XL", "form": null, "strength": "500 mg", "quantity": 6,
    "dose": null, "frequency": null, "duration": null,
    "handwritten": false, "confidence": "medium"
  }]
}
```

## 6. Ce NU face extragerea (se face în altă parte)

| Verificare | Unde |
| --- | --- |
| Numărul de ore alese vs. administrările pe zi din text | `Frontend/src/features/medication-schedule/coherence.ts` |
| Cantitate vs. doze × zile (doar când cantitatea e **mai mică** decât necesarul) | același fișier, informativ |
| Calculul datei de sfârșit și alegerea orelor | `scheduleLogic.ts`, cu confirmarea pacientului |
| Confirmarea fiecărui rând de către pacient | `Frontend/src/features/prescription-review` |

Orice verificare e **informativă**: nu corectează, nu blochează și nu schimbă datele.

## 7. Compatibilitate și pași

- Câmpurile noi (`documentType`, `form`, `strength`, `quantity`, `handwritten`, `confidence`) sunt **opționale** în
  Backend și Frontend: un răspuns fără ele rămâne valid, iar `mapExtractedDocument.ts` ignoră ce nu cunoaște.
- Dacă extragerea se schimbă, rulează testele existente ale serviciului (`pytest`) și `evaluate.py` pe
  documentele din `fixtures/`, care sunt fictive.
- Orice schimbare de contract se anunță înainte, ca Backend-ul și Frontend-ul să se adapteze (regula 10).
