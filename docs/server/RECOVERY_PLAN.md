# 🔄 Piano di Disaster Recovery - Server Aruba (I-ECO-01)

Documento operativo ufficiale per il ripristino di emergenza del server Aruba (`209.227.239.219`) e dell'infrastruttura di **MyZubster Ecosystem (I-ECO-01)** (risolve l'Issue #236, ricompensa **0.2 XMR + 150 MYZ**).

---

## 📌 Indice
- [1. Mappa dell'Architettura di Sistema](#1-mappa-dellarchitettura-di-sistema)
- [2. Strategia di Backup e Snapshot](#2-strategia-di-backup-e-snapshot)
- [3. Procedure Operative di Recovery Passo-Passo](#3-procedure-operative-di-recovery-passo-passo)
  - [Scenario A: Crash dei Servizi Node / PM2](#scenario-a-crash-dei-servizi-node--pm2)
  - [Scenario B: Corruzione Dati JSON / Ripristino Snapshot](#scenario-b-corruzione-dati-json--ripristino-snapshot)
  - [Scenario C: Server Bloccato in GRUB Recovery Mode](#scenario-c-server-bloccato-in-grub-recovery-mode)
  - [Scenario D: Perdita Completa della Connettività di Rete](#scenario-d-perdita-completa-della-connettivit-di-rete)
- [4. Script di Ripristino Automatico (`scripts/recovery/disaster_recovery.js`)](#4-script-di-ripristino-automatico)
- [5. Matrice dei Contatti di Emergenza](#5-matrice-dei-contatti-di-emergenza)

---

## 1. Mappa dell'Architettura di Sistema

```text
               ┌──────────────────────────────────────────────┐
               │         IP Pubblico: 209.227.239.219         │
               └──────────────────────┬───────────────────────┘
                                      │
                   ┌──────────────────┴──────────────────┐
                   │       Reverse Proxy / PM2 Server    │
                   │            Porta: 5002              │
                   └──────────┬────────────────┬─────────┘
                              │                │
             ┌────────────────┴──────┐   ┌─────┴────────────────┐
             │ Express API & Escrow  │   │  Socket.io WebSocket │
             │   /api/escrow/*       │   │  Porta: 5002 (ws://) │
             └───────────────┬───────┘   └──────────────────────┘
                             │
     ┌───────────────────────┼────────────────────────┐
     │                       │                        │
┌────┴────────────┐  ┌───────┴───────────────┐  ┌─────┴────────────────┐
│ Database JSON   │  │   Monero Wallet RPC   │  │  MongoDB Service     │
│ data/users.json │  │  Porta: 18081 / 18082 │  │  Porta: 27017        │
│ gateway/*.json  │  └───────────────────────┘  └──────────────────────┘
└─────────────────┘
```

---

## 2. Strategia di Backup e Snapshot

In conformità con il modulo di backup implementato in `#232`:
- **Snapshot Giornalieri**: Archiviati in `/home/ubuntu/bounty_work/I-ECO-01/backups/`.
- **Integrità**: Ogni archivio contiene `manifest.json` con hash crittografico SHA-256 di tutti i file.
- **Politica di Conservazione**: 30 giorni di storico con rotazione automatica.

---

## 3. Procedure Operative di Recovery Passo-Passo

### Scenario A: Crash dei Servizi Node / PM2
1. Connettersi via SSH al server:
   ```bash
   ssh root@209.227.239.219
   ```
2. Verificare lo stato dei processi con PM2:
   ```bash
   pm2 status
   pm2 logs --lines 50
   ```
3. Riavviare il cluster con configurazione pulita:
   ```bash
   pm2 restart all --update-env
   ```

### Scenario B: Corruzione Dati JSON / Ripristino Snapshot
1. Arrestare i servizi attivi:
   ```bash
   pm2 stop all
   ```
2. Identificare l'ultimo backup integro con esito SHA-256 positivo:
   ```bash
   node -e "const BM = require('./scripts/backup/backup_manager'); const bm = new BM(); console.log(bm.verifyBackup('latest'));"
   ```
3. Eseguire il rollback automatico tramite lo script dedicato:
   ```bash
   node scripts/recovery/disaster_recovery.js --restore latest
   ```
4. Riavviare i servizi:
   ```bash
   pm2 restart all
   ```

### Scenario C: Server Bloccato in GRUB Recovery Mode
1. Accedere al pannello web di controllo Aruba e aprire la **Console VNC / KVM**.
2. Al prompt `grub rescue>`, individuare la partizione di boot:
   ```bash
   ls
   ls (hd0,msdos1)/boot
   ```
3. Impostare root e prefisso di avvio:
   ```bash
   set root=(hd0,msdos1)
   set prefix=(hd0,msdos1)/boot/grub
   insmod normal
   normal
   ```
4. Una volta avviato il sistema, reinstallare e aggiornare GRUB permanentemente:
   ```bash
   sudo grub-install /dev/sda
   sudo update-grub
   ```

### Scenario D: Perdita Completa della Connettività di Rete
1. Da console KVM verificare lo stato delle interfacce:
   ```bash
   ip a
   systemctl status systemd-networkd
   ```
2. Se l'interfaccia principale (`eth0` o `ens3`) ha perso l'indirizzo statico, riapplicare Netplan:
   ```bash
   sudo netplan apply
   ```

---

## 4. Script di Ripristino Automatico (`scripts/recovery/disaster_recovery.js`)

Lo script esegue la validazione dei manifest, verifica le firme SHA-256 e ripristina atomicamente i file di stato (`users.json`, `plants.json`, ecc.) senza perdita di dati.

---

## 5. Matrice dei Contatti di Emergenza

| Ruolo | Nome / Handle | Canale Primario | Tempo di Risoluzione Atteso |
| :--- | :--- | :--- | :--- |
| **Maintainer & Lead** | `@DanielIoni-creator` | GitHub Issues / Telegram | P0 (< 2 ore) |
| **Server Admin & Agent** | `@jdjioe5-cpu` | Automated Sentinel 24/7 | Immediato (< 2 min) |
| **Supporto Tecnico Aruba** | Assistenza Cloud Aruba | Ticket ID / Telefono | P0 Hardware (< 4 ore) |
