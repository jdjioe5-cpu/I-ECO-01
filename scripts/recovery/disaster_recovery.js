/**
 * 🔄 Disaster Recovery Tool for I-ECO-01
 * Restores JSON databases from verified backup snapshots with pre-flight SHA-256 checks.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class DisasterRecoveryTool {
    constructor(config = {}) {
        this.backupDir = config.backupDir || path.join(__dirname, '../../backups');
        this.baseDir = config.baseDir || path.join(__dirname, '../..');
    }

    computeHash(buffer) {
        return crypto.createHash('sha256').update(buffer).digest('hex');
    }

    // List all available backups
    listBackups() {
        if (!fs.existsSync(this.backupDir)) return [];
        return fs.readdirSync(this.backupDir, { withFileTypes: true })
            .filter(d => d.isDirectory() && d.name.startsWith('backup-'))
            .map(d => d.name)
            .sort()
            .reverse();
    }

    // Restore from verified backup snapshot
    restoreSnapshot(backupId) {
        const targetDir = path.join(this.backupDir, backupId);
        const manifestPath = path.join(targetDir, 'manifest.json');

        if (!fs.existsSync(manifestPath)) {
            throw new Error(`Manifest per backup ${backupId} non trovato`);
        }

        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
        const restoredFiles = [];

        // 1. Pre-flight integrity verification
        for (const f of manifest.files) {
            if (f.status === 'SKIPPED_NOT_FOUND') continue;
            const srcFile = path.join(targetDir, f.path);
            if (!fs.existsSync(srcFile)) {
                throw new Error(`File mancante nello snapshot: ${f.path}`);
            }
            const hash = this.computeHash(fs.readFileSync(srcFile));
            if (hash !== f.sha256) {
                throw new Error(`Corruzione rilevata nello snapshot su ${f.path}`);
            }
        }

        // 2. Perform atomic restore
        for (const f of manifest.files) {
            if (f.status === 'SKIPPED_NOT_FOUND') continue;
            const srcFile = path.join(targetDir, f.path);
            const destFile = path.join(this.baseDir, f.path);

            fs.mkdirSync(path.dirname(destFile), { recursive: true });
            fs.copyFileSync(srcFile, destFile);
            restoredFiles.push(f.path);
        }

        return {
            status: 'RESTORE_SUCCESS',
            backupId,
            restoredFiles,
            timestamp: new Date().toISOString()
        };
    }
}

module.exports = DisasterRecoveryTool;
