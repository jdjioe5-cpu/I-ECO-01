const assert = require('assert');
const EscrowController = require('../src/controllers/escrowController');

/**
 * Escrow Concurrent Load & Performance Benchmark Suite
 * Tests high-throughput concurrent escrow creation, multi-signature, and release.
 */
async function runLoadTest(concurrency = 100, iterations = 5) {
    console.log(`🚀 Starting Escrow Concurrent Load Test (Concurrency: ${concurrency}, Iterations: ${iterations})...`);
    const controller = new EscrowController();

    const metrics = {
        created: 0,
        signed: 0,
        released: 0,
        errors: 0,
        latencies: []
    };

    const startTime = Date.now();

    for (let iter = 1; iter <= iterations; iter++) {
        const batchStart = Date.now();
        const promises = [];

        for (let i = 0; i < concurrency; i++) {
            promises.push((async () => {
                const opStart = Date.now();
                try {
                    // 1. Create
                    const escrow = await controller.createEscrow({
                        serviceId: `SRV-LOAD-${iter}-${i}`,
                        buyerAddress: `buyer_${i}`,
                        sellerAddress: `seller_${i}`,
                        amount: 1.0 + (i * 0.1)
                    });
                    metrics.created++;

                    // 2. Sign (2 signers to reach threshold)
                    await controller.signEscrow(escrow.escrowId, `signer_a_${i}`, `sig_a_${i}`);
                    await controller.signEscrow(escrow.escrowId, `signer_b_${i}`, `sig_b_${i}`);
                    metrics.signed++;

                    // 3. Release
                    await controller.releaseEscrow(escrow.escrowId, `rel_sig_${i}`);
                    metrics.released++;

                    const opEnd = Date.now();
                    metrics.latencies.push(opEnd - opStart);
                } catch (err) {
                    metrics.errors++;
                }
            })());
        }

        await Promise.all(promises);
        const batchDuration = Date.now() - batchStart;
        console.log(`  [Batch ${iter}/${iterations}] Completed ${concurrency} concurrent operations in ${batchDuration}ms`);
    }

    const totalDuration = (Date.now() - startTime) / 1000;
    const totalOps = metrics.created + metrics.signed + metrics.released;
    const throughput = (totalOps / totalDuration).toFixed(2);

    // Latency Percentiles
    metrics.latencies.sort((a, b) => a - b);
    const p50 = metrics.latencies[Math.floor(metrics.latencies.length * 0.50)] || 0;
    const p95 = metrics.latencies[Math.floor(metrics.latencies.length * 0.95)] || 0;
    const p99 = metrics.latencies[Math.floor(metrics.latencies.length * 0.99)] || 0;

    console.log('\n==================================================');
    console.log('📊 Escrow Load & Concurrency Benchmark Results');
    console.log('==================================================');
    console.log(`Total Requests Processed: ${metrics.created * 3} (${metrics.created} full lifecycles)`);
    console.log(`Successful Completions:   ${metrics.released}`);
    console.log(`Errors / Failures:       ${metrics.errors}`);
    console.log(`Total Elapsed Time:      ${totalDuration.toFixed(3)}s`);
    console.log(`Overall Throughput:      ${throughput} ops/sec`);
    console.log(`Latency p50:             ${p50}ms`);
    console.log(`Latency p95:             ${p95}ms`);
    console.log(`Latency p99:             ${p99}ms`);
    console.log('==================================================');

    assert.strictEqual(metrics.errors, 0, 'Load test should have 0 errors under concurrent execution');
    assert.strictEqual(metrics.released, concurrency * iterations, 'All escrows should reach RELEASED state');
    console.log('🎉 Load test validation PASSED with 100% integrity!');
}

runLoadTest(100, 5).catch(err => {
    console.error('❌ Load test failed:', err);
    process.exit(1);
});
