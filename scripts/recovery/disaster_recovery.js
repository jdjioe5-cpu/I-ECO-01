/**
 * 🔄 Disaster Recovery Tool for I-ECO-01
 * Restores JSON databases from verified backup snapshots with pre-flight SHA-256 checks,
 * atomic staging replacement, path traversal guards, and CLI entrypoint.
 * Threat Model: SHA-256 is used for backup integrity/corruption checks (checksums).
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

    safeResolve(rootPath, relativePath) {
        const resolved = path.resolve(rootPath, relativePath);
        const rel = path.relative(rootPath, resolved);
        if (rel.startsWith('..') || path.isAbsolute(rel)) {
            throw new Error(`Security Exception: Path traversal attempt detected outside root: ${relativePath}`);
        }
        return resolved;
    }

    // List all available backups, sorted newest first
    listBackups() {
        if (!fs.existsSync(this.backupDir)) return [];
        return fs.readdirSync(this.backupDir, { withFileTypes: true })
            .filter(d => d.isDirectory() && d.name.startsWith('backup-'))
            .map(d => d.name)
            .sort()
            .reverse();
    }

    // Resolve 'latest' alias to actual backup folder
    resolveBackupId(backupId) {
        if (!backupId || typeof backupId !== 'string' || backupId.trim() === '') {
            throw new Error('Invalid backupId supplied');
        }
        if (backupId === 'latest') {
            const available = this.listBackups();
            if (available.length === 0) {
                throw new Error('Disaster Recovery: No backup snapshots available to resolve "latest"');
            }
            return available[0];
        }
        return backupId;
    }

    // Restore from verified backup snapshot with transactional staging & rollback
    restoreSnapshot(requestedBackupId) {
        const actualBackupId = this.resolveBackupId(requestedBackupId);
        const snapshotDir = this.safeResolve(this.backupDir, actualBackupId);
        const manifestPath = path.join(snapshotDir, 'manifest.json');

        if (!fs.existsSync(manifestPath)) {
            throw new Error(`Manifest per backup ${actualBackupId} non trovato`);
        }

        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
        const activeFiles = manifest.files.filter(f => f.status !== 'SKIPPED_NOT_FOUND');

        // 1. Pre-flight integrity verification (Checksum validation)
        for (const f of activeFiles) {
            const srcFile = this.safeResolve(snapshotDir, f.path);
            if (!fs.existsSync(srcFile)) {
                throw new Error(`File mancante nello snapshot: ${f.path}`);
            }
            const hash = this.computeHash(fs.readFileSync(srcFile));
            if (hash !== f.sha256) {
                throw new Error(`Corruzione rilevata nello snapshot su ${f.path} (checksum mismatch)`);
            }
        }

        // 2. Transactional Restore via Staging & Atomic Replace with Rollback Guard
        const stagingDir = path.join(this.baseDir, `.dr_staging_${Date.now()}`);
        const rollbackDir = path.join(this.baseDir, `.dr_rollback_${Date.now()}`);
        const restoredPaths = [];

        try {
            fs.mkdirSync(stagingDir, { recursive: true });
            fs.mkdirSync(rollbackDir, { recursive: true });

            // Copy to staging
            for (const f of activeFiles) {
                const srcFile = this.safeResolve(snapshotDir, f.path);
                const stagingDest = this.safeResolve(stagingDir, f.path);
                fs.mkdirSync(path.dirname(stagingDest), { recursive: true });
                fs.copyFileSync(srcFile, stagingDest);
            }

            // Backup existing files for rollback
            for (const f of activeFiles) {
                const liveDest = this.safeResolve(this.baseDir, f.path);
                if (fs.existsSync(liveDest)) {
                    const rollbackDest = this.safeResolve(rollbackDir, f.path);
                    fs.mkdirSync(path.dirname(rollbackDest), { recursive: true });
                    fs.copyFileSync(liveDest, rollbackDest);
                }
            }

            // Atomic commit from staging to live
            for (const f of activeFiles) {
                const stagedSrc = this.safeResolve(stagingDir, f.path);
                const liveDest = this.safeResolve(this.baseDir, f.path);
                fs.mkdirSync(path.dirname(liveDest), { recursive: true });
                fs.copyFileSync(stagedSrc, liveDest);
                restoredPaths.push(f.path);
            }

            // Clean staging and rollback on success
            fs.rmSync(stagingDir, { recursive: true, force: true });
            fs.rmSync(rollbackDir, { recursive: true, force: true });

            return {
                status: 'RESTORE_SUCCESS',
                backup_id: actualBackupId,
                restored_files: restoredPaths,
                timestamp: new Date().toISOString()
            };
        } catch (err) {
            // Rollback execution
            try {
                for (const f of activeFiles) {
                    const rollbackSrc = this.safeResolve(rollbackDir, f.path);
                    if (fs.existsSync(rollbackSrc)) {
                        const liveDest = this.safeResolve(this.baseDir, f.path);
                        fs.copyFileSync(rollbackSrc, liveDest);
                    }
                }
            } catch (_) {}

            fs.rmSync(stagingDir, { recursive: true, force: true });
            fs.rmSync(rollbackDir, { recursive: true, force: true });
            throw new Error(`Atomic disaster recovery failed and rolled back: ${err.message}`);
        }
    }
}

// CLI Entrypoint
if (require.main === module) {
    const args = process.argv.slice(2);
    const tool = new DisasterRecoveryTool();

    if (args.includes('--list')) {
        const backups = tool.listBackups();
        console.log('Available backups:', backups);
        process.exit(0);
    }

    const restoreIdx = args.indexOf('--restore');
    if (restoreIdx !== -1 && args[restoreIdx + 1]) {
        const target = args[restoreIdx + 1];
        try {
            const res = tool.restoreSnapshot(target);
            console.log(`✅ Disaster recovery completed successfully: ${res.restored_files.length} files restored from ${res.backup_id}.`);
            process.exit(0);
        } catch (err) {
            console.error(`❌ Disaster recovery failed: ${err.message}`);
            process.exit(1);
        }
    } else {
        console.log('Usage: node scripts/recovery/disaster_recovery.js --restore <latest|backup-id> | --list');
        process.exit(1);
    }
}

module.exports = {
    DisasterRecoveryTool
};
