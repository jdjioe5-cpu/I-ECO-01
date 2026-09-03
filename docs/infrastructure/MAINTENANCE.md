# 🔧 Guida alla Manutenzione del Server (I-ECO-01)

Procedure operative per la manutenzione ordinaria, pulizia log e aggiornamenti di sicurezza del server Aruba.

---

## 1. Routine Giornaliera / Settimanale
- **Controllo Uptime & Risorse**: Eseguire `node scripts/monitor/server_monitor.js` o verificare snapshot.
- **Verifica Backup**: Controllare i checksum SHA-256 degli archivi con `scripts/backup/backup_manager.js`.
- **Rotazione Log**:
  ```bash
  pm2 flush
  find /var/log -type f -name "*.gz" -mtime +30 -delete
  ```

## 2. Aggiornamenti di Sicurezza OS
```bash
sudo apt-get update
sudo apt-get --only-upgrade install -y openssh-server openssl
```

## 3. Manutenzione Monero Blockchain
Nel caso di scarsità di spazio su disco, avviare il daemon Monero con l'opzione `--prune-blockchain`:
```bash
monerod --prune-blockchain --rpc-bind-ip 127.0.0.1 --rpc-bind-port 18081 --detach
```
