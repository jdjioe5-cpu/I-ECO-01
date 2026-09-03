const assert = require('assert');
const EscrowController = require('../src/controllers/escrowController');

async function runSecurityAuditTests() {
    console.log('🛡️ Starting Multisig Escrow Security Validation Tests...');
    const controller = new EscrowController();

    // 1. Test NaN & Invalid Amount Rejection
    await assert.rejects(
        async () => await controller.createEscrow({
            serviceId: 'SRV-SEC',
            buyerAddress: 'valid_buyer_address',
            sellerAddress: 'valid_seller_address',
            amount: NaN
        }),
        /amount deve essere un numero positivo finito/
    );
    console.log('  ✅ 1. Rejection of NaN amounts verified');

    await assert.rejects(
        async () => await controller.createEscrow({
            serviceId: 'SRV-SEC',
            buyerAddress: 'valid_buyer_address',
            sellerAddress: 'valid_seller_address',
            amount: -5.0
        }),
        /amount deve essere un numero positivo finito/
    );
    console.log('  ✅ 2. Rejection of negative amounts verified');

    // 2. Create Valid Escrow
    const escrow = await controller.createEscrow({
        serviceId: 'SRV-SEC-01',
        buyerAddress: 'buyer_secure_addr_01',
        sellerAddress: 'seller_secure_addr_02',
        amount: 15.0
    });
    assert.strictEqual(escrow.status, 'PENDING');

    // 3. Test Private Key Non-Exposure
    assert.strictEqual(escrow.privateKey, undefined);
    assert.strictEqual(escrow.secret, undefined);
    console.log('  ✅ 3. Zero-Knowledge: No private keys or secrets exposed in escrow object');

    // 4. Test Replay Signature Rejection
    await controller.signEscrow(escrow.escrowId, 'signer_alpha', 'sig_alpha_01');
    await assert.rejects(
        async () => await controller.signEscrow(escrow.escrowId, 'signer_alpha', 'sig_alpha_02'),
        /Firmatario ha già firmato/
    );
    console.log('  ✅ 4. Anti-Replay: Duplicate signer rejection verified');

    // 5. Test Premature Release Rejection
    await assert.rejects(
        async () => await controller.releaseEscrow(escrow.escrowId, 'rel_sig'),
        /non è firmato/
    );
    console.log('  ✅ 5. Guard: Premature release before threshold blocked');

    // 6. Reach threshold & Release
    await controller.signEscrow(escrow.escrowId, 'signer_beta', 'sig_beta_01');
    const released = await controller.releaseEscrow(escrow.escrowId, 'valid_rel_sig');
    assert.strictEqual(released.status, 'RELEASED');

    // 7. Test Cancel Post-Release Rejection
    await assert.rejects(
        async () => await controller.cancelEscrow(escrow.escrowId, 'Malicious cancel'),
        /è già stato rilasciato/
    );
    console.log('  ✅ 6. Integrity: Post-release cancellation strictly blocked');

    console.log('🎉 All Multisig Security Audit tests passed with 100% success!');
}

runSecurityAuditTests().catch(err => {
    console.error('❌ Security test failed:', err);
    process.exit(1);
});
