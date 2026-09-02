const assert = require('assert');
const EscrowController = require('../src/controllers/escrowController');

async function runTests() {
    console.log('🧪 Starting Escrow Controller Automated Validation Tests...');
    const controller = new EscrowController();

    // 1. Test Create
    const created = await controller.createEscrow({
        serviceId: 'SRV-TEST',
        buyerAddress: 'buyer_001',
        sellerAddress: 'seller_002',
        amount: 10.0,
        description: 'Test payment'
    });
    assert.strictEqual(created.status, 'PENDING');
    assert.strictEqual(created.amount, 10.0);
    assert.strictEqual(created.fee, 0.05); // 0.5%
    assert.strictEqual(created.releaseAmount, 9.95);
    console.log('  ✅ 1. createEscrow works as documented');

    // 2. Test Sign (Threshold 2)
    await controller.signEscrow(created.escrowId, 'signer_1', 'sig1');
    let status = controller.getEscrowStatus(created.escrowId);
    assert.strictEqual(status.signatures, 1);
    assert.strictEqual(status.status, 'PENDING');

    await controller.signEscrow(created.escrowId, 'signer_2', 'sig2');
    status = controller.getEscrowStatus(created.escrowId);
    assert.strictEqual(status.signatures, 2);
    assert.strictEqual(status.status, 'SIGNED');
    console.log('  ✅ 2. signEscrow reaches threshold and advances to SIGNED');

    // 3. Test Release
    const released = await controller.releaseEscrow(created.escrowId, 'release_sig');
    assert.strictEqual(released.status, 'RELEASED');
    console.log('  ✅ 3. releaseEscrow successfully transitions to RELEASED');

    // 4. Test Cancel on new escrow
    const created2 = await controller.createEscrow({
        serviceId: 'SRV-TEST-2',
        buyerAddress: 'buyer_001',
        sellerAddress: 'seller_002',
        amount: 5.0
    });
    const cancelled = await controller.cancelEscrow(created2.escrowId, 'Test reason');
    assert.strictEqual(cancelled.status, 'CANCELLED');
    console.log('  ✅ 4. cancelEscrow transitions to CANCELLED');

    // 5. Test List
    const all = controller.listEscrows({ status: 'RELEASED' });
    assert.strictEqual(all.length, 1);
    assert.strictEqual(all[0].escrowId, created.escrowId);
    console.log('  ✅ 5. listEscrows filtering works cleanly');

    console.log('🎉 All 5 Escrow tests passed with zero errors!');
}

runTests().catch(err => {
    console.error('❌ Test failed:', err);
    process.exit(1);
});
