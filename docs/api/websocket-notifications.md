# 🔌 Documentazione Notifiche WebSocket per Escrow (I-ECO-01)

Questo documento descrive il sistema di notifiche in tempo reale basato su **WebSocket (Socket.io)** integrato in **MyZubster Ecosystem (I-ECO-01)** per il tracciamento delle transazioni Escrow (risolve l'Issue #240).

---

## 📌 Indice
- [Connessione WebSocket](#-connessione-websocket)
- [Stanze e Sottoscrizioni (Rooms)](#-stanze-e-sottoscrizioni-rooms)
- [Eventi Emessi dal Server](#-eventi-emessi-dal-server)
  - [`escrow:created`](#escrowcreated)
  - [`escrow:signed`](#escrowsigned)
  - [`escrow:released`](#escrowreleased)
  - [`escrow:cancelled`](#escrowcancelled)
  - [`escrow:update` (Targeted Room Event)](#escrowupdate-targeted-room-event)
- [Esempio di Client JavaScript (Node.js & Browser)](#-esempio-di-client-javascript-nodejs--browser)

---

## 🌐 Connessione WebSocket

Il server WebSocket è in ascolto sul medesimo endpoint HTTP del server:
- **URL di connessione**: `ws://localhost:5002` (oppure `http://localhost:5002`)
- **Libreria consigliata**: `socket.io-client` v4.x

---

## 🎯 Stanze e Sottoscrizioni (Rooms)

Per evitare overhead di traffico, i client possono iscriversi a stanze dedicate a specifici escrow (`escrow:<escrowId>`).

### Iscrizione a un Escrow (`subscribe:escrow`)
Inviare un messaggio dal client con l'identificativo dell'escrow:
```javascript
socket.emit('subscribe:escrow', 'ESC-1786341582000-A1B2C3D4');

// Risposta dal server
socket.on('subscribed', (data) => {
    console.log('Iscritto con successo a:', data.escrowId);
});
```

### Disiscrizione (`unsubscribe:escrow`)
```javascript
socket.emit('unsubscribe:escrow', 'ESC-1786341582000-A1B2C3D4');
```

---

## 📢 Eventi Emessi dal Server

### `escrow:created`
Emesso in broadcast a tutti i client connessi al momento della creazione di un nuovo escrow (`POST /api/escrow/create`).
- **Payload**: Oggetto completo dell'escrow (`status: "PENDING"`, `fee`, `releaseAmount`, ecc.).

### `escrow:signed`
Emesso ogni volta che un firmatario autorizzato aggiunge la propria firma (`POST /api/escrow/sign`).
- Se le firme raggiungono la soglia (`threshold`), l'oggetto trasmesso avrà stato `"SIGNED"` e congederà il campo `releaseHash`.

### `escrow:released`
Emesso all'avvenuto rilascio dei fondi verso il venditore (`POST /api/escrow/release`).
- **Payload**: Oggetto escrow con `status: "RELEASED"`, `releasedAt` e `releaseSignature`.

### `escrow:cancelled`
Emesso se l'escrow viene annullato (`POST /api/escrow/cancel`).
- **Payload**: Oggetto escrow con `status: "CANCELLED"` e `cancelReason`.

### `escrow:update` (Targeted Room Event)
Emesso **esclusivamente** ai client che hanno effettuato la sottoscrizione alla stanza specifica (`escrow:<escrowId>`).
```json
{
  "event": "signed",
  "escrowId": "ESC-1786341582000-A1B2C3D4",
  "status": "SIGNED",
  "escrow": { ... }
}
```

---

## 💻 Esempio di Client JavaScript (Node.js & Browser)

```javascript
const { io } = require('socket.io-client');

const socket = io('http://localhost:5002');

socket.on('connect', () => {
    console.log('Connesso al gateway WebSocket I-ECO-01 con id:', socket.id);

    // Iscriviti agli aggiornamenti di un escrow specifico
    socket.emit('subscribe:escrow', 'ESC-1786341582000-A1B2C3D4');
});

// Ascolto aggiornamenti mirati della stanza
socket.on('escrow:update', (data) => {
    console.log(`[Notifica Room] Evento: ${data.event}, Stato: ${data.status}`);
});

// Ascolto eventi globali
socket.on('escrow:released', (escrow) => {
    console.log(`[Notifica Globale] Escrow ${escrow.escrowId} rilasciato per ${escrow.releaseAmount} XMR`);
});
```
