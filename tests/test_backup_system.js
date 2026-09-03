const assert = require('assert');
const path = require('path');
const fs = require('fs');
const BackupManager = require('../scripts/backup/backup_manager');

async function testBackupSystem() {
    console.log('🧪 Starting Backup System Automated Validation Tests...');

    const testBackupDir = path.join(__dirname, 'temp_backups');
    const testBaseDir = path.join(__dirname, 'temp_data_source');

    // Create temporary mock source files
    fs.mkdirSync(path.join(testBaseDir, 'data'), { recursive: true });
    fs.mkdirSync(path.join(testBaseDir, 'gateway'), { recursive: true });
    fs.writeFileSync(path.join(testBaseDir, 'data/users.json'), JSON.stringify({ users: ['alice', 'bob'] }));
    fs.writeFileSync(path.join(testBaseDir, 'gateway/plants.json'), JSON.stringify({ plants: ['basilico', 'salvia'] }));

    const manager = new BackupManager({
        backupDir: testBackupDir,
        baseDir: testBaseDir,
        retentionDays: 30,
        targetPaths: ['data/users.json', 'gateway/plants.json']
    });

    // 1. Create Backup
    const manifest = await manager.createBackup('backup-test-run');
    assert.strictEqual(manifest.status, 'SUCCESS');
    assert.strictEqual(manifest.files.filter(f => f.sha256).length, 2);
    console.log(`  ✅ 1. Backup created successfully with ${manifest.files.length} items`);

    // 2. Verify SHA-256 Checksum Integrity
    const verification = manager.verifyBackup('backup-test-run');
    assert.strictEqual(verification.valid, true);
    assert.strictEqual(verification.verifiedFiles, 2);
    console.log('  ✅ 2. SHA-256 cryptographic checksum verification PASSED');

    // 3. Test Corruption Detection
    const userBackupFile = path.join(testBackupDir, 'backup-test-run/data/users.json');
    fs.appendFileSync(userBackupFile, 'tampered_data');
    const corruptedCheck = manager.verifyBackup('backup-test-run');
    assert.strictEqual(corruptedCheck.valid, false);
    assert(corruptedCheck.error.includes('Checksum mismatch'));
    console.log('  ✅ 3. Tampering and corruption correctly detected via SHA-256 mismatch');

    // 4. Test 30-Day Rotation
    const oldBackupDir = path.join(testBackupDir, 'backup-old-2025');
    fs.mkdirSync(oldBackupDir, { recursive: true });
    // Set mtime to 35 days ago
    const pastTime = (Date.now() - 35 * 24 * 60 * 60 * 1000) / 1000;
    fs.utimesSync(oldBackupDir, pastTime, pastTime);

    const rotated = manager.rotateOldBackups();
    assert.strictEqual(rotated, 1);
    assert.strictEqual(fs.existsSync(oldBackupDir), false);
    console.log('  ✅ 4. 30-day retention policy rotation correctly pruned obsolete archive');

    // Cleanup
    fs.rmSync(testBackupDir, { recursive: true, force: true });
    fs.rmSync(testBaseDir, { recursive: true, force: true });

    console.log('🎉 All Backup System tests passed with 100% success!');
}

testBackupSystem().catch(err => {
    console.error('❌ Backup test failed:', err);
    process.exit(1);
});
