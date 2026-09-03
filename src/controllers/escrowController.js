const crypto = require('crypto');
const { isValidAmount, sanitizeString, isValidAddress, sanitizeEscrowForExport } = require('../utils/security');

class EscrowController {
    constructor() {
        this.escrows = new Map();
        this.threshold = parseInt(process.env.ESCROW_MULTISIG_THRESHOLD, 10) || 2;
        this.signers = parseInt(process.env.ESCROW_MULTISIG_SIGNERS, 10) || 3;
        this.timeoutHours = parseInt(process.env.ESCROW_TIMEOUT_HOURS, 10) || 24;
        this.feePercent = parseFloat(process.env.ESCROW_FEE_PERCENT) || 0.5;
        this.treasuryAddress = sanitizeString(process.env.TREASURY_ADDRESS || '');
        this.adminWallet = sanitizeString(process.env.ADMIN_WALLET || '');

        console.log('🔐 Escrow Controller inizializzato (Security Hardened)');
        console.log(`   Threshold: ${this.threshold}/${this.signers}`);
        console.log(`   Timeout: ${this.timeoutHours}h`);
        console.log(`   Fee: ${this.feePercent}%`);
    }

    async createEscrow(data) {
        if (!data || typeof data !== 'object') {
            throw new Error('Dati richiesta non validi');
        }

        const { serviceId, buyerAddress, sellerAddress, amount, description, metadata = {} } = data;
        
        if (!serviceId) throw new Error('serviceId è richiesto');
        if (!buyerAddress) throw new Error('buyerAddress è richiesto');
        if (!sellerAddress) throw new Error('sellerAddress è richiesto');
        
        if (!isValidAddress(buyerAddress)) throw new Error('buyerAddress non valido o malformato');
        if (!isValidAddress(sellerAddress)) throw new Error('sellerAddress non valido o malformato');
        if (!isValidAmount(amount)) throw new Error('amount deve essere un numero positivo finito');

        const cleanServiceId = sanitizeString(serviceId, 64);
        const cleanDesc = sanitizeString(description, 500);

        const escrowId = `ESC-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
        const now = new Date();
        const expiresAt = new Date(now.getTime() + this.timeoutHours * 3600000);

        const fee = Number((amount * (this.feePercent / 100)).toFixed(8));
        const releaseAmount = Number((amount - fee).toFixed(8));

        const escrow = {
            escrowId,
            serviceId: cleanServiceId,
            buyerAddress: sanitizeString(buyerAddress, 128),
            sellerAddress: sanitizeString(sellerAddress, 128),
            amount,
            description: cleanDesc,
            metadata: typeof metadata === 'object' ? metadata : {},
            status: 'PENDING',
            createdAt: now.toISOString(),
            expiresAt: expiresAt.toISOString(),
            signatures: [],
            releaseHash: null,
            txHash: null,
            fee,
            releaseAmount
        };

        this.escrows.set(escrowId, escrow);
        console.log(`📝 Escrow creato: ${escrowId}`);
        return sanitizeEscrowForExport(escrow);
    }

    async signEscrow(escrowId, signerAddress, signature) {
        if (!escrowId) throw new Error('escrowId è richiesto');
        if (!signerAddress || !isValidAddress(signerAddress)) throw new Error('signerAddress non valido');
        if (!signature || typeof signature !== 'string' || signature.trim().length === 0) {
            throw new Error('Firma crittografica non valida o vuota');
        }

        const escrow = this.escrows.get(escrowId);
        if (!escrow) throw new Error(`Escrow ${escrowId} non trovato`);
        if (escrow.status !== 'PENDING') throw new Error(`Escrow ${escrowId} non è in stato PENDING`);

        if (escrow.signatures.some(s => s.signer === signerAddress)) {
            throw new Error(`Firmatario ha già firmato`);
        }

        escrow.signatures.push({
            signer: sanitizeString(signerAddress, 128),
            signature: sanitizeString(signature, 512),
            timestamp: new Date().toISOString()
        });

        if (escrow.signatures.length >= this.threshold) {
            escrow.status = 'SIGNED';
            escrow.releaseHash = crypto.createHash('sha256')
                .update(`${escrow.escrowId}:${escrow.sellerAddress}:${escrow.amount}`)
                .digest('hex');
            console.log(`✅ Escrow ${escrowId} ha raggiunto la soglia!`);
        }

        return sanitizeEscrowForExport(escrow);
    }

    async releaseEscrow(escrowId, releaseSignature) {
        if (!escrowId) throw new Error('escrowId è richiesto');
        if (!releaseSignature || typeof releaseSignature !== 'string') {
            throw new Error('Firma di rilascio richiesta');
        }

        const escrow = this.escrows.get(escrowId);
        if (!escrow) throw new Error(`Escrow ${escrowId} non trovato`);
        if (escrow.status !== 'SIGNED') throw new Error(`Escrow ${escrowId} non è firmato`);

        escrow.status = 'RELEASED';
        escrow.releasedAt = new Date().toISOString();
        escrow.releaseSignature = sanitizeString(releaseSignature, 512);

        console.log(`💰 Escrow ${escrowId} rilasciato! Netto: ${escrow.releaseAmount} XMR`);
        return sanitizeEscrowForExport(escrow);
    }

    async cancelEscrow(escrowId, reason = 'Cancellato dall\'utente') {
        if (!escrowId) throw new Error('escrowId è richiesto');
        const escrow = this.escrows.get(escrowId);
        if (!escrow) throw new Error(`Escrow ${escrowId} non trovato`);
        if (escrow.status === 'RELEASED') throw new Error(`Escrow ${escrowId} è già stato rilasciato`);

        escrow.status = 'CANCELLED';
        escrow.cancelledAt = new Date().toISOString();
        escrow.cancelReason = sanitizeString(reason, 256);

        console.log(`❌ Escrow ${escrowId} cancellato: ${escrow.cancelReason}`);
        return sanitizeEscrowForExport(escrow);
    }

    getEscrowStatus(escrowId) {
        const escrow = this.escrows.get(escrowId);
        if (!escrow) return { error: 'Escrow non trovato' };
        return {
            escrowId: escrow.escrowId,
            serviceId: escrow.serviceId,
            status: escrow.status,
            amount: escrow.amount,
            releaseAmount: escrow.releaseAmount,
            fee: escrow.fee,
            signatures: escrow.signatures.length,
            requiredSignatures: this.threshold,
            createdAt: escrow.createdAt,
            expiresAt: escrow.expiresAt,
            ...(escrow.releasedAt && { releasedAt: escrow.releasedAt }),
            ...(escrow.cancelledAt && { cancelledAt: escrow.cancelledAt })
        };
    }

    listEscrows(filters = {}) {
        let results = Array.from(this.escrows.values());
        if (filters.status) results = results.filter(e => e.status === filters.status);
        if (filters.buyerAddress) results = results.filter(e => e.buyerAddress === filters.buyerAddress);
        if (filters.sellerAddress) results = results.filter(e => e.sellerAddress === filters.sellerAddress);
        return results.map(e => sanitizeEscrowForExport(e));
    }
}

module.exports = EscrowController;
