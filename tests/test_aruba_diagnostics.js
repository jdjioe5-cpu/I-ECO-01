const assert = require('assert');
const ArubaDiagnostics = require('../scripts/diagnostics/aruba_diagnostics');

async function testArubaDiagnostics() {
    console.log('🧪 Starting Aruba Server Stability Diagnostics Tests (Issue #234)...');

    const diag = new ArubaDiagnostics({
        targetHost: '127.0.0.1',
        sshPort: 22,
        timeoutMs: 2000
    });

    // 1. Test SSH Configuration Audit
    const sshAudit = diag.auditSshConfiguration();
    assert.strictEqual(sshAudit.recommendedSettings.ClientAliveInterval, 30);
    assert.strictEqual(sshAudit.recommendedSettings.ClientAliveCountMax, 5);
    assert.strictEqual(sshAudit.recommendedSettings.TCPKeepAlive, 'yes');
    console.log('  ✅ 1. SSH hardening parameter audit verified');

    // 2. Test Local TCP Socket Probe
    const probe = await diag.probeTcpConnection('127.0.0.1', 22);
    assert(typeof probe.success === 'boolean');
    assert(typeof probe.latencyMs === 'number');
    console.log(`  ✅ 2. TCP socket latency probe completed (success=${probe.success}, latency=${probe.latencyMs}ms)`);

    // 3. Test Diagnostic Report Synthesis
    const report = diag.generateDiagnosticReport(probe);
    assert(report.timestamp, 'Report must contain timestamp');
    assert(report.systemMetrics.load1m !== undefined, 'Report must contain CPU load');
    assert(report.mitigationActions.length >= 3, 'Report must contain mitigation actions');
    console.log(`  ✅ 3. Diagnostic report synthesized with status: [${report.stabilityStatus}]`);

    console.log('🎉 All Aruba Diagnostics tests passed with 100% success!');
}

testArubaDiagnostics().catch(err => {
    console.error('❌ Diagnostics test failed:', err);
    process.exit(1);
});
