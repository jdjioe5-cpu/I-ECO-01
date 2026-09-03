const assert = require('assert');
const { XMRWallet } = require('../gateway/xmr/wallet/xmr.wallet');

async function testMoneroNetworkConfiguration() {
    console.log('🧪 Starting Monero Network Configuration & Mainnet Tests...');

    // 1. Test Default Stagenet fallback
    const stagenetWallet = new XMRWallet({ networkType: 'stagenet' });
    const stageInfo = stagenetWallet.getNetworkInfo();
    assert.strictEqual(stageInfo.networkType, 'stagenet');
    assert.strictEqual(stageInfo.isMainnet, false);
    assert.strictEqual(stageInfo.rpcUrl, 'http://localhost:38081');
    console.log('  ✅ 1. Stagenet network fallback and ports verified');

    // 2. Test Mainnet Configuration
    const mainnetWallet = new XMRWallet({ networkType: 'mainnet' });
    const mainInfo = mainnetWallet.getNetworkInfo();
    assert.strictEqual(mainInfo.networkType, 'mainnet');
    assert.strictEqual(mainInfo.isMainnet, true);
    assert.strictEqual(mainInfo.rpcUrl, 'http://localhost:18081');
    console.log('  ✅ 2. Mainnet network configuration and default RPC port (18081) verified');

    // 3. Address Validation Tests
    // Valid Mainnet Addresses (Starts with 4 or 8, 95 chars)
    const validMainnetAddr = '45M4DW1ug8bdQowWpxucTpgsfjLbVxbYaAra79VewmBobuuhgqTjyD4R3DzpqLM2veiphcB16n24qN1QbLg3y2PYGK3Qkoe';
    const validMainnetSub =  '888tNkZrPN6JsEgekjMnABU4TBzc2Dt29EPAvkFxbTNsFo5UMVeEHwdNW65721W6Avg2EBmeeEccznChM7NWwREnFdsa999';

    // Stagenet Address (Starts with 5 or 7, 95 chars)
    const validStagenetAddr = '55M4DW1ug8bdQowWpxucTpgsfjLbVxbYaAra79VewmBobuuhgqTjyD4R3DzpqLM2veiphcB16n24qN1QbLg3y2PYGK3Qkoe';

    assert.strictEqual(mainnetWallet.validateAddress(validMainnetAddr), true);
    assert.strictEqual(mainnetWallet.validateAddress(validMainnetSub), true);
    assert.strictEqual(mainnetWallet.validateAddress(validStagenetAddr), false); // Cross-network rejected!
    console.log('  ✅ 3. Mainnet address validator correctly accepts mainnet and rejects stagenet');

    assert.strictEqual(stagenetWallet.validateAddress(validStagenetAddr), true);
    assert.strictEqual(stagenetWallet.validateAddress(validMainnetAddr), false); // Cross-network rejected!
    console.log('  ✅ 4. Stagenet address validator correctly accepts stagenet and rejects mainnet');

    // 4. Test Mock Transaction Send Safeguard on Mainnet
    await assert.rejects(
        async () => await mainnetWallet.sendPayment(validStagenetAddr, 1.0),
        /non valido per la rete mainnet/
    );
    console.log('  ✅ 5. sendPayment rejects wrong network address before network call');

    console.log('🎉 All Monero Mainnet Configuration tests passed with 100% success!');
}

testMoneroNetworkConfiguration().catch(err => {
    console.error('❌ Test failed:', err);
    process.exit(1);
});
