# 🔐 Documentazione API Escrow Multisig (I-ECO-01)

Documentazione completa per tutti gli endpoint del servizio Escrow di **MyZubster Ecosystem (I-ECO-01)**, con schema dettagliato, parametri, codici di stato ed esempi pratici di richiesta e risposta (cURL e JSON).

---

## 📌 Indice
- [Panoramica dell'Architettura](#-panoramica-dellarchitettura)
- [Stati dell'Escrow (State Machine)](#-stati-dellescrow-state-machine)
- [Variabili di Ambiente](#-variabili-di-ambiente)
- [Endpoints API](#-endpoints-api)
  - [1. Creazione Escrow (`POST /api/escrow/create`)](#1-creazione-escrow-post-apiescrowcreate)
  - [2. Aggiunta Firma (`POST /api/escrow/sign`)](#2-aggiunta-firma-post-apiescrowsign)
  - [3. Rilascio Fondi (`POST /api/escrow/release`)](#3-rilascio-fondi-post-apiescrowrelease)
  - [4. Cancellazione Escrow (`POST /api/escrow/cancel`)](#4-cancellazione-escrow-post-apiescrowcancel)
  - [5. Stato Escrow (`GET /api/escrow/status/:escrowId`)](#5-stato-escrow-get-apiescrowstatusescrowid)
  - [6. Lista Escrow con Filtri (`GET /api/escrow/list`)](#6-lista-escrow-con-filtri-get-apiescrowlist)
- [Gestione degli Errori](#-gestione-degli-errori)

---

## 🏛️ Panoramica dell'Architettura

Il modulo Escrow gestisce transazioni fiduciarie per pagamenti decentralizzati (inclusi XMR / Crypto) con logica multisig a soglia (`M-of-N`, di default 2 su 3).
- **Buyer**: Blocca i fondi nel contratto/servizio.
- **Signers**: Firmano la transazione crittografica. Raggiunta la soglia configurata (`ESCROW_MULTISIG_THRESHOLD`), l'escrow passa allo stato `SIGNED`.
- **Seller**: Riceve l'importo netto al netto delle commissioni (`ESCROW_FEE_PERCENT`) al momento del rilascio (`RELEASED`).

---

## 🔄 Stati dell'Escrow (State Machine)

```text
       [CREATE]
          │
          ▼
      ┌─────────┐     Threshold Firme
      │ PENDING │ ──────────────────────► ┌────────┐
      └─────────┘                          │ SIGNED │
          │                                └────────┘
          │                                     │
       [CANCEL]                              [RELEASE]
          │                                     │
          ▼                                     ▼
    ┌───────────┐                         ┌──────────┐
    │ CANCELLED │                         │ RELEASED │
    └───────────┘                         └──────────┘
```

1. `PENDING`: Escrow creato, in attesa del raggiungimento della soglia firme.
2. `SIGNED`: Soglia multisig raggiunta (`signatures.length >= threshold`), `releaseHash` generato.
3. `RELEASED`: Transazione completata, fondi rilasciati al venditore.
4. `CANCELLED`: Escrow annullato prima del rilascio.

---

## ⚙️ Variabili di Ambiente

| Variabile | Descrizione | Default |
|-----------|-------------|---------|
| `ESCROW_MULTISIG_THRESHOLD` | Numero minimo di firme necessarie per autorizzare l'escrow | `2` |
| `ESCROW_MULTISIG_SIGNERS` | Numero totale di firmatari autorizzati | `3` |
| `ESCROW_TIMEOUT_HOURS` | Durata di validità dell'escrow prima della scadenza | `24` (ore) |
| `ESCROW_FEE_PERCENT` | Percentuale trattenuta come commissione di rete | `0.5` (%) |
| `TREASURY_ADDRESS` | Indirizzo del tesoro per la raccolta commissioni | - |
| `ADMIN_WALLET` | Wallet dell'amministratore | - |

---

## 🚀 Endpoints API

Base URL: `http://localhost:5002/api/escrow` (o il dominio configurato per I-ECO-01)

### 1. Creazione Escrow (`POST /api/escrow/create`)

Crea un nuovo contratto escrow con calcolo automatico della commissione e data di scadenza.

#### Request Header
```http
Content-Type: application/json
```

#### Request Body
```json
{
  "serviceId": "SRV-2026-XMR-BOT",
  "buyerAddress": "45M4DW1ug8bdQowWpxucTpgsfjLbVxbYaAra79VewmBobuuhgqTjyD4R3DzpqLM2veiphcB16n24qN1QbLg3y2PYGK3Qkoe",
  "sellerAddress": "888tNkZrPN6JsEgekjMnABU4TBzc2Dt29EPAvkFxbTNsFo5UMVeEHwdNW65721W6Avg2EBmeeEccznChM7NWwREnFdsa9",
  "amount": 5.0,
  "description": "Sviluppo modulo multi-lingua I-ECO-01",
  "metadata": {
    "milestone": "M1",
    "deliveryDate": "2026-09-10"
  }
}
```

#### Esempio cURL
```bash
curl -X POST http://localhost:5002/api/escrow/create \
  -H "Content-Type: application/json" \
  -d '{
    "serviceId": "SRV-2026-XMR-BOT",
    "buyerAddress": "45M4DW1ug8bdQowWpxucTpgsfjLbVxbYaAra79VewmBobuuhgqTjyD4R3DzpqLM2veiphcB16n24qN1QbLg3y2PYGK3Qkoe",
    "sellerAddress": "888tNkZrPN6JsEgekjMnABU4TBzc2Dt29EPAvkFxbTNsFo5UMVeEHwdNW65721W6Avg2EBmeeEccznChM7NWwREnFdsa9",
    "amount": 5.0,
    "description": "Sviluppo modulo multi-lingua I-ECO-01"
  }'
```

#### Response Success (`201 Created`)
```json
{
  "success": true,
  "escrow": {
    "escrowId": "ESC-1786341582000-A1B2C3D4",
    "serviceId": "SRV-2026-XMR-BOT",
    "buyerAddress": "45M4DW1ug8bdQowWpxucTpgsfjLbVxbYaAra79VewmBobuuhgqTjyD4R3DzpqLM2veiphcB16n24qN1QbLg3y2PYGK3Qkoe",
    "sellerAddress": "888tNkZrPN6JsEgekjMnABU4TBzc2Dt29EPAvkFxbTNsFo5UMVeEHwdNW65721W6Avg2EBmeeEccznChM7NWwREnFdsa9",
    "amount": 5.0,
    "description": "Sviluppo modulo multi-lingua I-ECO-01",
    "metadata": {},
    "status": "PENDING",
    "createdAt": "2026-09-03T07:50:00.000Z",
    "expiresAt": "2026-09-04T07:50:00.000Z",
    "signatures": [],
    "releaseHash": null,
    "txHash": null,
    "fee": 0.025,
    "releaseAmount": 4.975
  },
  "message": "Escrow creato con successo"
}
```

---

### 2. Aggiunta Firma (`POST /api/escrow/sign`)

Aggiunge una firma multisig all'escrow. Se la soglia (`threshold`) viene raggiunta, l'escrow passa automaticamente a `SIGNED`.

#### Request Body
```json
{
  "escrowId": "ESC-1786341582000-A1B2C3D4",
  "signerAddress": "45M4DW1ug8bdQowWpxucTpgsfjLbVxbYaAra79VewmBobuuhgqTjyD4R3DzpqLM2veiphcB16n24qN1QbLg3y2PYGK3Qkoe",
  "signature": "3045022100e4...8a9c"
}
```

#### Response Success (`200 OK`)
```json
{
  "success": true,
  "escrow": {
    "escrowId": "ESC-1786341582000-A1B2C3D4",
    "status": "SIGNED",
    "signatures": [
      {
        "signer": "45M4DW1ug8bdQowWpxucTpgsfjLbVxbYaAra79VewmBobuuhgqTjyD4R3DzpqLM2veiphcB16n24qN1QbLg3y2PYGK3Qkoe",
        "signature": "3045022100e4...8a9c",
        "timestamp": "2026-09-03T07:51:00.000Z"
      },
      {
        "signer": "888tNkZrPN6JsEgekjMnABU4TBzc2Dt29EPAvkFxbTNsFo5UMVeEHwdNW65721W6Avg2EBmeeEccznChM7NWwREnFdsa9",
        "signature": "304402202f...91ab",
        "timestamp": "2026-09-03T07:52:00.000Z"
      }
    ],
    "releaseHash": "4a7d6e8b2c1f9e8a7d6e8b2c1f9e8a7d6e8b2c1f9e8a7d6e8b2c1f9e8a7d6e8b"
  },
  "message": "Firma aggiunta con successo"
}
```

---

### 3. Rilascio Fondi (`POST /api/escrow/release`)

Sblocca ed eroga l'importo netto al venditore dopo che l'escrow è in stato `SIGNED`.

#### Request Body
```json
{
  "escrowId": "ESC-1786341582000-A1B2C3D4",
  "releaseSignature": "sig_release_9921fa"
}
```

#### Response Success (`200 OK`)
```json
{
  "success": true,
  "escrow": {
    "escrowId": "ESC-1786341582000-A1B2C3D4",
    "status": "RELEASED",
    "amount": 5.0,
    "fee": 0.025,
    "releaseAmount": 4.975,
    "releasedAt": "2026-09-03T07:53:00.000Z",
    "releaseSignature": "sig_release_9921fa"
  },
  "message": "Fondi rilasciati con successo"
}
```

---

### 4. Cancellazione Escrow (`POST /api/escrow/cancel`)

Annulla un escrow prima che i fondi vengano rilasciati.

#### Request Body
```json
{
  "escrowId": "ESC-1786341582000-A1B2C3D4",
  "reason": "Mancato accordo sui requisiti tecnici"
}
```

#### Response Success (`200 OK`)
```json
{
  "success": true,
  "escrow": {
    "escrowId": "ESC-1786341582000-A1B2C3D4",
    "status": "CANCELLED",
    "cancelledAt": "2026-09-03T07:54:00.000Z",
    "cancelReason": "Mancato accordo sui requisiti tecnici"
  },
  "message": "Escrow cancellato con successo"
}
```

---

### 5. Stato Escrow (`GET /api/escrow/status/:escrowId`)

Recupera i dettagli e lo stato sintetico di un escrow per monitoraggio.

#### Esempio cURL
```bash
curl http://localhost:5002/api/escrow/status/ESC-1786341582000-A1B2C3D4
```

#### Response Success (`200 OK`)
```json
{
  "success": true,
  "escrowId": "ESC-1786341582000-A1B2C3D4",
  "serviceId": "SRV-2026-XMR-BOT",
  "status": "SIGNED",
  "amount": 5.0,
  "releaseAmount": 4.975,
  "fee": 0.025,
  "signatures": 2,
  "requiredSignatures": 2,
  "createdAt": "2026-09-03T07:50:00.000Z",
  "expiresAt": "2026-09-04T07:50:00.000Z"
}
```

---

### 6. Lista Escrow con Filtri (`GET /api/escrow/list`)

Elenca gli escrow registrati con possibilità di filtrare per `status`, `buyerAddress` o `sellerAddress`.

#### Esempio cURL
```bash
curl "http://localhost:5002/api/escrow/list?status=SIGNED"
```

#### Response Success (`200 OK`)
```json
{
  "success": true,
  "count": 1,
  "escrows": [
    {
      "escrowId": "ESC-1786341582000-A1B2C3D4",
      "serviceId": "SRV-2026-XMR-BOT",
      "status": "SIGNED",
      "amount": 5.0,
      "fee": 0.025,
      "releaseAmount": 4.975
    }
  ]
}
```

---

## ⚠️ Gestione degli Errori

In caso di parametri mancanti o violazioni della state machine, l'API restituisce HTTP `400 Bad Request` con dettaglio JSON:

```json
{
  "success": false,
  "error": "serviceId è richiesto"
}
```

Errori tipici:
- `amount deve essere positivo`
- `Escrow ESC-XXX non trovato`
- `Escrow ESC-XXX non è in stato PENDING` (quando si prova a firmare un escrow non pending)
- `Firmatario ha già firmato` (tentativo di doppia firma dello stesso indirizzo)
- `Escrow ESC-XXX è già stato rilasciato` (tentativo di annullare un escrow rilasciato)
