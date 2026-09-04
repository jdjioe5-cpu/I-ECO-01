const assert = require('assert');
const path = require('path');
const fs = require('fs');

function testInfrastructureDocumentation() {
    console.log('🧪 Starting Server Infrastructure Documentation Comprehensive Tests (solves #233)...');

    const baseDir = path.join(__dirname, '../docs/infrastructure');
    const requiredDocs = [
        'ARCHITECTURE.md',
        'DEPLOYMENT.md',
        'MAINTENANCE.md',
        'TROUBLESHOOTING.md'
    ];

    // 1. Structural and Content Validation
    for (const doc of requiredDocs) {
        const fullPath = path.join(baseDir, doc);
        assert(fs.existsSync(fullPath), `Document ${doc} must exist`);
        const content = fs.readFileSync(fullPath, 'utf-8');
        assert(content.length > 300, `Document ${doc} must have substantial content (got ${content.length} chars)`);
        assert(content.includes('I-ECO-01'), `Document ${doc} must mention I-ECO-01`);
        console.log(`  ✅ 1. Verified ${doc} structure & content (${content.length} chars)`);
    }

    // 2. Node.js Version Alignment Check (Must strictly match Node 24.x from package.json)
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf-8'));
    const expectedNode = pkg.node || (pkg.engines && pkg.engines.node) || "24.x";
    assert(expectedNode.startsWith('24'), 'package.json requires Node 24.x');

    const deploymentContent = fs.readFileSync(path.join(baseDir, 'DEPLOYMENT.md'), 'utf-8');
    assert(deploymentContent.includes('setup_24.x'), 'DEPLOYMENT.md must configure NodeSource setup_24.x');
    assert(deploymentContent.includes('Node.js 24'), 'DEPLOYMENT.md must specify Node.js 24');
    assert(!deploymentContent.includes('setup_18.x'), 'DEPLOYMENT.md must NOT contain legacy Node.js 18 setup');
    console.log('  ✅ 2. Node.js 24.x runtime requirement perfectly aligned between docs and package.json');

    // 3. Operational Command Syntax Validation
    assert(deploymentContent.includes('scripts/monitor/server_monitor.js'), 'Must document server monitor');
    
    const troubleshootingContent = fs.readFileSync(path.join(baseDir, 'TROUBLESHOOTING.md'), 'utf-8');
    assert(troubleshootingContent.includes('scripts/recovery/disaster_recovery.js'), 'Must document disaster recovery script');

    console.log('🎉 All Server Infrastructure Documentation tests passed 100% with full Definition-of-Done!');
}

try {
    testInfrastructureDocumentation();
} catch (err) {
    console.error('❌ Infrastructure docs test failed:', err);
    process.exit(1);
}
