# 📊 Sistema di Monitoraggio Server Aruba (I-ECO-01)

Questo documento descrive l'agente di monitoraggio 24/7 implementato per i nodi del server Aruba e l'infrastruttura di **MyZubster Ecosystem (I-ECO-01)** (risolve l'Issue #235, taglia **0.3 XMR**).

---

## 📌 Indice
- [Obiettivi di Monitoraggio](#-obiettivi-di-monitoraggio)
- [Metriche Tracciate](#-metriche-tracciate)
- [Soglie di Allarme (Alert Thresholds)](#-soglie-di-allarme-alert-thresholds)
- [Integrazione Script (`scripts/monitor/server_monitor.js`)](#-integrazione-script)
- [Esecuzione e Risultati del Benchmark](#-esecuzione-e-risultati-del-benchmark)

---

## 🎯 Obiettivi di Monitoraggio
A seguito dei problemi di connessione e riavvii rilevati sul server Aruba (`209.227.239.219`), questo agente assicura:
1. **Rilevamento Preventivo dei Guasti**: Monitoraggio costante dell'utilizzo di RAM e CPU prima del crash.
2. **Controllo Disponibilità SSH**: Probe TCP asincrono sulla porta SSH (22 o configurata).
3. **Log Centralizzato e Sanificato**: Snapshot strutturato in JSON esportabile per PM2 / crontab.
4. **Resilienza Zero-Dipendenze**: Utilizza esclusivamente librerie standard di Node.js (`os`, `net`, `fs`), non richiede pacchetti esterni pesanti.

---

## 📈 Metriche Tracciate

| Metrica | Descrizione | Soglia Normale | Soglia Alert |
| :--- | :--- | :--- | :--- |
| **CPU Load** | Load average a 1m, 5m, 15m e stima utilizzo percentuale | `< 70%` | `> 85%` (WARNING) |
| **RAM Usage** | Memoria totale, libera, utilizzata e percentuale | `< 80%` | `> 90%` (WARNING) |
| **Uptime** | Tempo di attività continuo del sistema operativo | Continuo | Riavvio non programmato |
| **SSH Probe** | Raggiungibilità porta 22 e latenza TCP in millisecondi | `< 500ms` | Timeout / Refused (CRITICAL) |

---

## ⚙️ Variabili di Configurazione (.env)

```env
# Host bersaglio del monitor
MONITOR_HOST=127.0.0.1

# Porta SSH da testare
MONITOR_SSH_PORT=22

# Soglie Allarme Percentuali
MONITOR_CPU_MAX=85
MONITOR_RAM_MAX=90
```

---

## 🧪 Esecuzione Test Automatizzato
```bash
node tests/test_server_monitor.js
```
