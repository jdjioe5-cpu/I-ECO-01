# 🛠️ Guida alla Risoluzione Problemi - Server Aruba (I-ECO-01)

Matrice diagnostica per intervenire tempestivamente sui problemi frequenti riscontrati sul server Aruba (`209.227.239.219`) dell'ecosistema **MyZubster (I-ECO-01)**.

---

## 1. Matrice di Intervento Rapido

| Sintomo | Causa Probabile | Azione Correttiva |
| :--- | :--- | :--- |
| **SSH Timeout / Impossibile connettersi** | Blocco IP da Fail2ban o crash interfaccia | Accedere tramite Console Web KVM Aruba; eseguire `sudo fail2ban-client unban <IP>` |
| **Server bloccato in GRUB rescue** | Bootloader corrotto dopo riavvio forzato | Seguire la procedura in `docs/server/RECOVERY_PLAN.md` (Scenario C) |
| **502 Bad Gateway / Processo offline** | Loop crash del processo Node.js | Controllare log con `pm2 logs --err --lines 50`; riavviare con `pm2 restart ieco-core` |
| **Database JSON corrotto / Errore sintassi** | Scrittura interrotta a causa di mancata corrente | Eseguire rollback atomico: `node scripts/recovery/disaster_recovery.js --restore latest` |
| **Monero RPC Timeout** | Daemon non sincronizzato o porta occupata | Verificare lo stato con `curl -X POST http://localhost:18081/json_rpc -d '{"jsonrpc":"2.0","id":"0","method":"get_info"}'` |

---

## 2. Diagnostica di Rete e Porte
```bash
ping -c 4 8.8.8.8
ip route show
sudo netstat -tlpn | grep -E '(22|5002|18081|18082)'
```
