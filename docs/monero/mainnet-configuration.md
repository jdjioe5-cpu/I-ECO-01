# 💰 Guida alla Configurazione Monero Mainnet (I-ECO-01)

Questa guida illustra come configurare, verificare e commutare il wallet Monero di **MyZubster Ecosystem (I-ECO-01)** tra le reti **Stagenet** e **Mainnet** (risolve l'Issue #237).

---

## 📌 Indice
- [Panoramica delle Reti Monero](#-panoramica-delle-reti-monero)
- [Variabili di Ambiente (.env)](#-variabili-di-ambiente-env)
- [Validazione degli Indirizzi per Rete](#-validazione-degli-indirizzi-per-rete)
- [Procedura di Commutazione a Mainnet](#-procedura-di-commutazione-a-mainnet)
- [Test Automatizzati](#-test-automatizzati)

---

## 🌐 Panoramica delle Reti Monero

| Rete | Scopo | Prefisso Indirizzo Standard | Prefisso Subaddress | Porta Daemon RPC | Porta Wallet RPC |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Mainnet** | **Produzione Reale (Fondi reali)** | `4` | `8` | `18081` | `18082` |
| **Stagenet** | Staging / Test pre-rilascio | `5` | `7` | `38081` | `38082` |
| **Testnet** | Test sperimentali | `9` | `B` | `28081` | `28082` |

---

## ⚙️ Variabili di Ambiente (.env)

### Configurazione per Mainnet
```env
# Modalità di rete attiva (mainnet o stagenet)
MONERO_NETWORK=mainnet

# RPC Daemon Monero (Nodo locale o remoto)
MONERO_RPC_URL=http://localhost:18081

# RPC Wallet Monero (monero-wallet-rpc)
MONERO_WALLET_RPC_URL=http://localhost:18082

# Credenziali RPC
MONERO_RPC_USER=myzubster
MONERO_RPC_PASSWORD=your_secure_password_here

# Indirizzo Principale Mainnet (deve iniziare per 4 o 8)
MONERO_MAIN_WALLET_ADDRESS=45M4DW1ug8bdQowWpxucTpgsfjLbVxbYaAra79VewmBobuuhgqTjyD4R3DzpqLM2veiphcB16n24qN1QbLg3y2PYGK3Qkoe
```

---

## 🔒 Validazione degli Indirizzi per Rete

Il wallet incorpora un validatore automatico (`validateAddress`) che intercetta preventivamente gli errori prima dell'invio dei fondi:
- Su **Mainnet**: Rifiuta categoricamente indirizzi stagenet (inizianti per 5 o 7) per evitare perdite accidentali di fondi.
- Su **Stagenet**: Rifiuta indirizzi mainnet per prevenire contaminazioni tra ambienti.

---

## 🚀 Esecuzione Test
```bash
node tests/test_xmr_network_config.js
```
