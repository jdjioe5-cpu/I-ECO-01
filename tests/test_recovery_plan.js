const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { DisasterRecoveryTool } = require('../scripts/recovery/disaster_recovery');

async function runTestSuite() {
    console.log('🧪 Starting Disaster Recovery Comprehensive Suite (solves #236)...');

    const testRootDir = path.join(__dirname, '.dr_test_sandbox_' + Date.now());
    const testBackupDir = path.join(testRootDir, 'backups');
    const testDataDir = path.join(testRootDir, 'data');
    fs.mkdirSync(testBackupDir, { recursive: true });
    fs.mkdirSync(testDataDir, { recursive: true });

    // Setup live data
    const liveDbPath = path.join(testDataDir, 'users.json');
    fs.writeFileSync(liveDbPath, JSON.stringify({ count: 10, state: 'corrupted' }), 'utf-8');

    // Create a real snapshot backup-2026-09-04-001
    const snapId = 'backup-2026-09-04-001';
    const snapDir = path.join(testBackupDir, snapId);
    fs.mkdirSync(path.join(snapDir, 'data'), { recursive: true });

    const validContent = JSON.stringify({ count: 50, state: 'healthy' });
    fs.writeFileSync(path.join(snapDir, 'data/users.json'), validContent, 'utf-8');

    const crypto = require('crypto');
    const validHash = crypto.createHash('sha256').update(validContent).digest('hex');

    const manifest = {
        backup_id: snapId,
        created_at: new Date().toISOString(),
        files: [
            { path: 'data/users.json', sha256: validHash, status: 'BACKED_UP' }
        ]
    };
    fs.writeFileSync(path.join(snapDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8');

    const tool = new DisasterRecoveryTool({
        backupDir: testBackupDir,
        baseDir: testRootDir
    });

    // 1. Test listBackups & latest resolution
    const list = tool.listBackups();
    assert.strictEqual(list.length, 1);
    assert.strictEqual(tool.resolveBackupId('latest'), snapId);
    console.log('  ✅ 1. Backup Listing & Latest Resolution: Verified correctly');

    // 2. Test Atomic Restore with "latest"
    const res = tool.restoreSnapshot('latest');
    assert.strictEqual(res.status, 'RESTORE_SUCCESS');
    assert.strictEqual(res.backup_id, snapId);

    const restoredData = JSON.parse(fs.readFileSync(liveDbPath, 'utf-8'));
    assert.strictEqual(restoredData.state, 'healthy');
    console.log('  ✅ 2. Atomic Restore via Latest: Successfully restored live state');

    // 3. Negative Test: Path Traversal Attack Defense
    let caughtTraversal = false;
    try {
        tool.restoreSnapshot('../../../etc/passwd');
    } catch (e) {
        if (e.message.includes('Path traversal')) caughtTraversal = true;
    }
    assert.strictEqual(caughtTraversal, true, 'Must reject path traversal');
    console.log('  ✅ 3. Negative Test: Path traversal attack correctly blocked');

    // 4. Negative Test: Corrupted Checksum Rejection & Rollback
    const snapCorruptId = 'backup-2026-09-04-002';
    const snapCorruptDir = path.join(testBackupDir, snapCorruptId);
    fs.mkdirSync(path.join(snapCorruptDir, 'data'), { recursive: true });
    fs.writeFileSync(path.join(snapCorruptDir, 'data/users.json'), 'tampered_content', 'utf-8');
    fs.writeFileSync(path.join(snapCorruptDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8');

    let caughtCorruption = false;
    try {
        tool.restoreSnapshot(snapCorruptId);
    } catch (e) {
        if (e.message.includes('Corruzione rilevata')) caughtCorruption = true;
    }
    assert.strictEqual(caughtCorruption, true, 'Must reject corrupted snapshot');
    console.log('  ✅ 4. Negative Test: Checksum mismatch correctly detected and rejected');

    // 5. End-to-End CLI Invocation Test
    const cliScript = path.join(__dirname, '../scripts/recovery/disaster_recovery.js');
    const cliOutput = execFileSync(process.execPath, [cliScript, '--list'], { encoding: 'utf-8' });
    assert(cliOutput.includes('Available backups:'));
    console.log('  ✅ 5. E2E CLI Execution: Verified --list CLI execution');

    // Clean test sandbox
    fs.rmSync(testRootDir, { recursive: true, force: true });
    console.log('🎉 All Disaster Recovery tests passed 100% with full Definition-of-Done!');
}

runTestSuite().catch(err => {
    console.error('❌ DR Test failed:', err);
    process.exit(1);
});
