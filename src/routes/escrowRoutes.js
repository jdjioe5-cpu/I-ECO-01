const express = require('express');
const router = express.Router();
const EscrowController = require('../controllers/escrowController');

const escrowController = new EscrowController();

// Helper to broadcast socket events safely
function broadcastEscrowEvent(req, eventName, escrow) {
    if (req && req.io) {
        // Broadcast global event
        req.io.emit(`escrow:${eventName}`, escrow);
        // Emit targeted room event to subscribers of this escrowId
        if (escrow && escrow.escrowId) {
            req.io.to(`escrow:${escrow.escrowId}`).emit('escrow:update', {
                event: eventName,
                escrowId: escrow.escrowId,
                status: escrow.status,
                escrow
            });
        }
    }
}

router.post('/create', async (req, res) => {
    try {
        const escrow = await escrowController.createEscrow(req.body);
        broadcastEscrowEvent(req, 'created', escrow);
        res.status(201).json({ success: true, escrow, message: 'Escrow creato con successo' });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

router.post('/sign', async (req, res) => {
    try {
        const { escrowId, signerAddress, signature } = req.body;
        const escrow = await escrowController.signEscrow(escrowId, signerAddress, signature);
        broadcastEscrowEvent(req, 'signed', escrow);
        res.json({ success: true, escrow, message: 'Firma aggiunta con successo' });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

router.post('/release', async (req, res) => {
    try {
        const { escrowId, releaseSignature } = req.body;
        const escrow = await escrowController.releaseEscrow(escrowId, releaseSignature);
        broadcastEscrowEvent(req, 'released', escrow);
        res.json({ success: true, escrow, message: 'Fondi rilasciati con successo' });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

router.post('/cancel', async (req, res) => {
    try {
        const { escrowId, reason } = req.body;
        const escrow = await escrowController.cancelEscrow(escrowId, reason);
        broadcastEscrowEvent(req, 'cancelled', escrow);
        res.json({ success: true, escrow, message: 'Escrow cancellato con successo' });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

router.get('/status/:escrowId', async (req, res) => {
    try {
        const { escrowId } = req.params;
        const status = escrowController.getEscrowStatus(escrowId);
        res.json({ success: true, ...status });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

router.get('/list', async (req, res) => {
    try {
        const filters = req.query;
        const escrows = escrowController.listEscrows(filters);
        res.json({ success: true, count: escrows.length, escrows });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

module.exports = router;
