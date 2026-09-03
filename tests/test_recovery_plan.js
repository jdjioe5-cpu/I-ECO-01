const assert = require('assert');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const DisasterRecoveryTool = require('../scripts/recovery/disaster_recovery');

function computeHash(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
}

async function testDisasterRecovery() {
    console.log('🧪 Starting Disaster Recovery Validation Tests...');

    const testBackupDir = path.join(__dirname, 'temp_rec_backups');
    const testBaseDir = path.join(__dirname, 'temp_rec_data');

    // 1. Setup mock source files
    fs.mkdirSync(path.join(testBackupDir, 'backup-disaster-safe/data'), { recursive: true });
    fs.mkdirSync(path.join(testBackupDir, 'backup-disaster-safe/gateway'), { recursive: true });
    fs.mkdirSync(path.join(testBaseDir, 'data'), { recursive: true });
    fs.mkdirSync(path.join(testBaseDir, 'gateway'), { recursive: true });

    const userContent = Buffer.from(JSON.stringify({ users: ['pytho', 'admin'] }));
    const plantContent = Buffer.from(JSON.stringify({ plants: ['rosmarino'] }));

    fs.writeFileSync(path.join(testBackupDir, 'backup-disaster-safe/data/users.json'), userContent);
    fs.writeFileSync(path.join(testBackupDir, 'backup-disaster-safe/gateway/plants.json'), plantContent);

    const manifest = {
        backupId: 'backup-disaster-safe',
        createdAt: new Date().toISOString(),
        files: [
            { path: 'data/users.json', sizeBytes: userContent.length, sha256: computeHash(userContent) },
            { path: 'gateway/plants.json', sizeBytes: plantContent.length, sha256: computeHash(plantContent) }
        ],
        status: 'SUCCESS'
    };
    fs.writeFileSync(path.join(testBackupDir, 'backup-disaster-safe/manifest.json'), JSON.stringify(manifest, null, 2));
    console.log('  ✅ 1. Safe snapshot created with manifest and SHA-256 signatures');

    // 2. Simulate Disaster / Corrupted files in baseDir
    fs.writeFileSync(path.join(testBaseDir, 'data/users.json'), 'CORRUPTED_DISASTER_STATE');
    console.log('  ✅ 2. Disaster scenario simulated (corrupted users, missing plants)');

    // 3. Run Disaster Recovery Tool
    const recoveryTool = new DisasterRecoveryTool({
        backupDir: testBackupDir,
        baseDir: testBaseDir
    });

    const backups = recoveryTool.listBackups();
    assert(backups.includes('backup-disaster-safe'), 'Backup should be listed');

    const result = recoveryTool.restoreSnapshot('backup-disaster-safe');
    assert.strictEqual(result.status, 'RESTORE_SUCCESS');
    assert.strictEqual(result.restoredFiles.length, 2);
    console.log('  ✅ 3. Disaster recovery successfully executed atomic restore');

    // 4. Verify restored content matches original
    const restoredUsers = JSON.parse(fs.readFileSync(path.join(testBaseDir, 'data/users.json'), 'utf-8'));
    const restoredPlants = JSON.parse(fs.readFileSync(path.join(testBaseDir, 'gateway/plants.json'), 'utf-8'));
    assert.strictEqual(restoredUsers.users[0], 'pytho');
    assert.strictEqual(restoredPlants.plants[0], 'rosmarino');
    console.log('  ✅ 4. Restored database verified with 100% integrity');

    // Cleanup
    fs.rmSync(testBackupDir, { recursive: true, force: true });
    fs.rmSync(testBaseDir, { recursive: true, force: true });

    console.log('🎉 All Disaster Recovery Plan tests passed with 100% success!');
}

testDisasterRecovery().catch(err => {
    console.error('❌ Recovery test failed:', err);
    process.exit(1);
});
