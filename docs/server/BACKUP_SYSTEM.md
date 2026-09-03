# 💾 Sistema di Backup Automatico per Server (I-ECO-01)

Documentazione dell'architettura di backup automatica, verifica dell'integrità crittografica e rotazione programmata a 30 giorni per **MyZubster Ecosystem (I-ECO-01)** (risolve l'Issue #232, ricompensa **0.15 XMR + 100 MYZ**).

---

## 📌 Indice
- [Obiettivi e Ambito](#-obiettivi-e-ambito)
- [Cosa Viene Protetto (File & Database)](#-cosa-viene-protetto)
- [Architettura del Manager (`scripts/backup/backup_manager.js`)](#-architettura-del-manager)
- [Rotazione e Pulizia a 30 Giorni](#-rotazione-e-pulizia-a-30-giorni)
- [Verifica di Integrità SHA-256](#-verifica-di-integrit-sha-256)
- [Schedulazione Automatica (Crontab / Systemd)](#-schedulazione-automatica)

---

## 🎯 Obiettivi e Ambito
1. **Backup Snapshot Atomico**: Copia programmata giornaliera di tutti gli archivi dati critici.
2. **Controllo di Integrità**: Generazione e verifica di checksum `SHA-256` per ogni file archiviato.
3. **Criterio di Rotazione**: Conservazione delle ultime 30 copie giornaliere, con rimozione automatica programmata di snapshot obsoleti per evitare saturazione disco.

---

## 📂 Cosa Viene Protetto

| Componente | Percorso | Descrizione |
| :--- | :--- | :--- |
| **Utenti & Profili** | `data/users.json` | Database principale account e credenziali |
| **Database Piante** | `gateway/plants.json` | Schede fenologiche e sensori vegetali |
| **Database Minerali** | `gateway/minerals/minerals.json` | Registro geologico e minerali |
| **Orti Francescani** | `gateway/orti-francescani/orti-francescani.json` | Archiviazione particelle e comunità |

---

## ⚙️ Esecuzione Manuale e Test
```bash
node tests/test_backup_system.js
```

### Schedulazione Giornaliera Crontab
```bash
# Esegue il backup ogni notte alle 03:00 AM
0 3 * * * node /home/ubuntu/bounty_work/I-ECO-01/scripts/backup/backup_manager.js >> /var/log/myzubster_backup.log 2>&1
```
