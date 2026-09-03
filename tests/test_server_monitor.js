const assert = require('assert');
const ServerMonitor = require('../scripts/monitor/server_monitor');

async function testServerMonitor() {
    console.log('🧪 Starting Server Monitor Automated Validation Tests...');

    const monitor = new ServerMonitor({
        targetHost: '127.0.0.1',
        sshPort: 22,
        cpuMaxPercent: 85,
        ramMaxPercent: 90
    });

    // 1. Test CPU Metrics
    const cpu = monitor.getCpuUsage();
    assert(cpu.cores > 0, 'CPU core count should be > 0');
    assert(typeof cpu.load1m === 'number', 'Load 1m should be numeric');
    console.log(`  ✅ 1. CPU metrics retrieved: ${cpu.cores} cores, load1m: ${cpu.load1m}`);

    // 2. Test RAM Metrics
    const ram = monitor.getRamUsage();
    assert(ram.totalMB > 0, 'Total RAM should be > 0');
    assert(ram.usedPercent >= 0 && ram.usedPercent <= 100, 'RAM percent should be between 0 and 100');
    console.log(`  ✅ 2. RAM metrics retrieved: ${ram.usedMB}MB / ${ram.totalMB}MB (${ram.usedPercent}%)`);

    // 3. Test Uptime
    const uptime = monitor.getUptime();
    assert(uptime.uptimeSeconds > 0, 'Uptime seconds should be > 0');
    assert(uptime.formatted.includes('d') || uptime.formatted.includes('h'), 'Uptime should be formatted');
    console.log(`  ✅ 3. System uptime: ${uptime.formatted}`);

    // 4. Test Alert Evaluator Logic
    const simulatedAlerts = monitor.evaluateAlerts({
        cpu: { estimatedUsagePercent: 95 },
        ram: { usedPercent: 92 },
        ssh: { available: false, error: 'ECONNREFUSED' }
    });
    assert.strictEqual(simulatedAlerts.length, 3, 'Should trigger 3 alerts under simulated breach');
    assert(simulatedAlerts.some(a => a.metric === 'SSH' && a.level === 'CRITICAL'));
    assert(simulatedAlerts.some(a => a.metric === 'CPU' && a.level === 'WARNING'));
    assert(simulatedAlerts.some(a => a.metric === 'RAM' && a.level === 'WARNING'));
    console.log('  ✅ 4. Alert threshold evaluator correctly triggers WARNING and CRITICAL events');

    // 5. Test Complete Snapshot Collection
    const snapshot = await monitor.collectHealthSnapshot(false);
    assert(snapshot.timestamp, 'Snapshot should contain ISO timestamp');
    assert(['HEALTHY', 'DEGRADED', 'CRITICAL'].includes(snapshot.status));
    console.log(`  ✅ 5. Complete health snapshot captured with status: [${snapshot.status}]`);

    console.log('🎉 All Server Monitor tests passed with 100% success!');
}

testServerMonitor().catch(err => {
    console.error('❌ Monitor test failed:', err);
    process.exit(1);
});
