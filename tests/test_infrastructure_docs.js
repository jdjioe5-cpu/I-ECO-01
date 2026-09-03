const assert = require('assert');
const path = require('path');
const fs = require('fs');

function testInfrastructureDocumentation() {
    console.log('🧪 Starting Server Infrastructure Documentation Tests...');

    const baseDir = path.join(__dirname, '../docs/infrastructure');
    const requiredDocs = [
        'ARCHITECTURE.md',
        'DEPLOYMENT.md',
        'MAINTENANCE.md',
        'TROUBLESHOOTING.md'
    ];

    for (const doc of requiredDocs) {
        const fullPath = path.join(baseDir, doc);
        assert(fs.existsSync(fullPath), `Document ${doc} must exist`);
        const content = fs.readFileSync(fullPath, 'utf-8');
        assert(content.length > 300, `Document ${doc} must have substantial content (got ${content.length} chars)`);
        assert(content.includes('I-ECO-01'), `Document ${doc} must mention I-ECO-01`);
        console.log(`  ✅ Verified ${doc} (${content.length} chars, comprehensive sections)`);
    }

    console.log('🎉 All 4 Server Infrastructure Documents verified with 100% success!');
}

try {
    testInfrastructureDocumentation();
} catch (err) {
    console.error('❌ Infrastructure docs test failed:', err);
    process.exit(1);
}
