/**
 * 💰 Monero Wallet - Gestione Wallet XMR (Mainnet / Stagenet / Testnet)
 */

class XMRWallet {
    constructor(config = {}) {
        const network = (config.networkType || process.env.MONERO_NETWORK || 'stagenet').toLowerCase();
        
        // Default standard Monero ports by network
        const defaultDaemonPort = network === 'mainnet' ? 18081 : (network === 'testnet' ? 28081 : 38081);
        const defaultWalletPort = network === 'mainnet' ? 18082 : (network === 'testnet' ? 28082 : 38082);

        this.config = {
            networkType: network,
            rpcUrl: config.rpcUrl || process.env.MONERO_RPC_URL || `http://localhost:${defaultDaemonPort}`,
            walletRpcUrl: config.walletRpcUrl || process.env.MONERO_WALLET_RPC_URL || `http://localhost:${defaultWalletPort}`,
            username: config.username || process.env.MONERO_RPC_USER || 'myzubster',
            password: config.password || process.env.MONERO_RPC_PASSWORD || 'pytho2026'
        };
        this.wallet = null;
    }

    // Valida compatibilità indirizzo con la rete attiva
    validateAddress(address) {
        if (!address || typeof address !== 'string') return false;
        const clean = address.trim();
        if (clean.length !== 95 && clean.length !== 106) return false;

        if (this.config.networkType === 'mainnet') {
            // Mainnet: standard '4', subaddress '8'
            return clean.startsWith('4') || clean.startsWith('8');
        } else if (this.config.networkType === 'stagenet') {
            // Stagenet: standard '5', subaddress '7'
            return clean.startsWith('5') || clean.startsWith('7');
        } else if (this.config.networkType === 'testnet') {
            // Testnet: standard '9', subaddress 'B'
            return clean.startsWith('9') || clean.startsWith('B') || clean.startsWith('A');
        }
        return false;
    }

    // Ottieni configurazione corrente di rete
    getNetworkInfo() {
        return {
            networkType: this.config.networkType,
            isMainnet: this.config.networkType === 'mainnet',
            rpcUrl: this.config.rpcUrl,
            walletRpcUrl: this.config.walletRpcUrl
        };
    }

    // Inizializza il wallet
    async initialize(moneroLib) {
        try {
            const MoneroWallet = moneroLib || require('monero-javascript');
            this.wallet = await MoneroWallet.createWallet({
                networkType: this.config.networkType,
                server: {
                    uri: this.config.rpcUrl,
                    username: this.config.username,
                    password: this.config.password
                }
            });
            console.log(`✅ Wallet XMR inizializzato su rete: [${this.config.networkType.toUpperCase()}]`);
            return this.wallet;
        } catch (error) {
            console.error('❌ Errore inizializzazione wallet:', error);
            throw error;
        }
    }

    // Crea un nuovo indirizzo
    async createAddress() {
        try {
            if (!this.wallet) throw new Error('Wallet non inizializzato');
            const address = await this.wallet.getPrimaryAddress();
            return address;
        } catch (error) {
            console.error('❌ Errore creazione indirizzo:', error);
            throw error;
        }
    }

    // Ottieni il balance
    async getBalance() {
        try {
            if (!this.wallet) throw new Error('Wallet non inizializzato');
            const balance = await this.wallet.getBalance();
            return {
                unlocked: balance.unlockedBalance / 1e12,
                total: balance.balance / 1e12
            };
        } catch (error) {
            console.error('❌ Errore recupero balance:', error);
            throw error;
        }
    }

    // Monitora transazioni
    async monitorTransactions() {
        try {
            if (!this.wallet) throw new Error('Wallet non inizializzato');
            const txs = await this.wallet.getTransactions();
            return txs.map(tx => ({
                id: tx.id,
                amount: tx.amount / 1e12,
                confirmations: tx.confirmations,
                timestamp: tx.timestamp,
                isOutgoing: tx.isOutgoing
            }));
        } catch (error) {
            console.error('❌ Errore monitoraggio transazioni:', error);
            throw error;
        }
    }

    // Invia pagamento con validazione rete
    async sendPayment(address, amount) {
        if (!this.validateAddress(address)) {
            throw new Error(`Indirizzo ${address} non valido per la rete ${this.config.networkType}`);
        }
        if (!amount || amount <= 0) {
            throw new Error('Importo non valido');
        }

        try {
            if (!this.wallet) throw new Error('Wallet non inizializzato');
            const result = await this.wallet.send({
                address: address,
                amount: amount * 1e12,
                priority: 'normal'
            });
            return {
                txId: result.txHash,
                amount: amount,
                address: address,
                network: this.config.networkType,
                status: 'pending'
            };
        } catch (error) {
            console.error('❌ Errore invio pagamento:', error);
            throw error;
        }
    }
}

module.exports = { XMRWallet };
