const assert = require('assert');
const EventEmitter = require('events');

// Mock Socket.io Server instance
class MockSocketIO extends EventEmitter {
    constructor() {
        super();
        this.rooms = new Map();
    }

    to(room) {
        return {
            emit: (event, payload) => {
                this.emit(`room:${room}:${event}`, payload);
            }
        };
    }
}

// Mock EscrowController
const EscrowController = require('../src/controllers/escrowController');

async function testWebSocketEscrowFlow() {
    console.log('🧪 Starting Escrow WebSocket Notification Automated Tests (Pure Node.js)...');

    const io = new MockSocketIO();
    const controller = new EscrowController();

    // Broadcast helper logic (same as escrowRoutes.js)
    function broadcastEscrowEvent(ioInstance, eventName, escrow) {
        if (ioInstance) {
            ioInstance.emit(`escrow:${eventName}`, escrow);
            if (escrow && escrow.escrowId) {
                ioInstance.to(`escrow:${escrow.escrowId}`).emit('escrow:update', {
                    event: eventName,
                    escrowId: escrow.escrowId,
                    status: escrow.status,
                    escrow
                });
            }
        }
    }

    const eventsCaptured = [];

    // Global listeners
    io.on('escrow:created', (data) => eventsCaptured.push({ type: 'global', event: 'created', data }));
    io.on('escrow:signed', (data) => eventsCaptured.push({ type: 'global', event: 'signed', data }));
    io.on('escrow:released', (data) => eventsCaptured.push({ type: 'global', event: 'released', data }));
    io.on('escrow:cancelled', (data) => eventsCaptured.push({ type: 'global', event: 'cancelled', data }));

    // 1. Create Escrow & Verify Event
    const escrow = await controller.createEscrow({
        serviceId: 'SRV-NOTIF-01',
        buyerAddress: 'buyer_abc',
        sellerAddress: 'seller_xyz',
        amount: 8.0,
        description: 'Test Webhook & WS Notifications'
    });
    broadcastEscrowEvent(io, 'created', escrow);

    assert.strictEqual(eventsCaptured.length, 1);
    assert.strictEqual(eventsCaptured[0].event, 'created');
    assert.strictEqual(eventsCaptured[0].data.escrowId, escrow.escrowId);
    console.log('  ✅ 1. escrow:created event successfully emitted and captured');

    // 2. Room listener for specific escrow
    const roomEvents = [];
    io.on(`room:escrow:${escrow.escrowId}:escrow:update`, (payload) => {
        roomEvents.push(payload);
    });

    // 3. Sign Escrow & Verify Room Event
    await controller.signEscrow(escrow.escrowId, 'signer_1', 'sig1');
    await controller.signEscrow(escrow.escrowId, 'signer_2', 'sig2');
    broadcastEscrowEvent(io, 'signed', escrow);

    assert(eventsCaptured.some(e => e.event === 'signed'));
    assert.strictEqual(roomEvents.length, 1);
    assert.strictEqual(roomEvents[0].event, 'signed');
    assert.strictEqual(roomEvents[0].status, 'SIGNED');
    console.log('  ✅ 2. escrow:signed & targeted room event (escrow:update) received');

    // 4. Release Escrow & Verify
    await controller.releaseEscrow(escrow.escrowId, 'sig_rel');
    broadcastEscrowEvent(io, 'released', escrow);

    assert(eventsCaptured.some(e => e.event === 'released'));
    assert.strictEqual(roomEvents.length, 2);
    assert.strictEqual(roomEvents[1].status, 'RELEASED');
    console.log('  ✅ 3. escrow:released & room update received');

    // 5. Cancel Flow
    const escrow2 = await controller.createEscrow({
        serviceId: 'SRV-NOTIF-02',
        buyerAddress: 'buyer_abc',
        sellerAddress: 'seller_xyz',
        amount: 3.0
    });
    await controller.cancelEscrow(escrow2.escrowId, 'User abort');
    broadcastEscrowEvent(io, 'cancelled', escrow2);

    assert(eventsCaptured.some(e => e.event === 'cancelled' && e.data.escrowId === escrow2.escrowId));
    console.log('  ✅ 4. escrow:cancelled event successfully emitted');

    console.log('🎉 All WebSocket Notification tests passed with 100% success!');
}

testWebSocketEscrowFlow().catch(err => {
    console.error('❌ Test failed:', err);
    process.exit(1);
});
