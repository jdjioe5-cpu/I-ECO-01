# 🏛️ Architettura dell'Infrastruttura Server (I-ECO-01)

Documento ufficiale dell'architettura hardware, di rete e applicativa per il server Aruba (`209.227.239.219`) di **MyZubster Ecosystem (I-ECO-01)** (risolve l'Issue #233).

---

## 1. Topologia di Rete e Sicurezza
```text
[ Traffico Esterno / Client Web / Socket.io ]
                     │
                     ▼
         [ Firewall UFW / Port 5002 ]
                     │
                     ▼
        [ PM2 Process Manager Cluster ]
                     │
      ┌──────────────┴──────────────┐
      ▼                             ▼
[ Express API Server ]     [ Socket.io Gateway ]
(/api/escrow, /api/auth)    (subscribe:escrow)
      │                             │
      └──────────────┬──────────────┘
                     ▼
  ┌──────────────────┼──────────────────┐
  ▼                  ▼                  ▼
[ JSON Storage ]  [ Monero RPC Daemon ] [ MongoDB Local ]
(users, plants)   (18081 / 18082)       (27017)
```

## 2. Specifiche Tecniche Hardware e OS
- **OS**: Ubuntu 22.04 LTS x86_64
- **Runtime**: Node.js v18.19.1 LTS + Python 3.10
- **Process Manager**: PM2 v5.x
- **Porte Assegnate**:
  - `22`: Accesso Amministrativo SSH
  - `5002`: API Gateway / WebSocket MyZubster
  - `18081`: Monero Daemon RPC (Mainnet) / `38081` (Stagenet)
  - `18082`: Monero Wallet RPC
  - `27017`: MongoDB Database
