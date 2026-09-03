# 🚀 Guida al Deployment in Produzione (I-ECO-01)

Procedura passo-passo per il rilascio, installazione e configurazione su server Aruba o nuovo nodo cloud.

---

## 1. Prerequisiti di Sistema
```bash
sudo apt-get update && sudo apt-get install -y curl git ufw fail2ban
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2
```

## 2. Configurazione Repository e Variabili (.env)
```bash
cd /opt
sudo git clone https://github.com/DanielIoni-creator/I-ECO-01.git
cd I-ECO-01
cp .env.example .env
nano .env
```

## 3. Avvio Servizi con PM2
```bash
pm2 start server.js --name "ieco-core" --watch
pm2 start scripts/monitor/server_monitor.js --name "ieco-monitor"
pm2 save
pm2 startup
```

## 4. Configurazione Firewall (UFW)
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 5002/tcp
sudo ufw enable
```
