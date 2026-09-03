/**
 * 💾 Automated Backup Manager for I-ECO-01
 * Creates timestamped archives, computes SHA-256 checksums, and enforces 30-day retention rotation.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class BackupManager {
    constructor(config = {}) {
        this.backupDir = config.backupDir || path.join(__dirname, '../../backups');
        this.retentionDays = config.retentionDays || 30;
        this.targetPaths = config.targetPaths || [
            'data/users.json',
            'gateway/plants.json',
            'gateway/minerals/minerals.json',
            'gateway/orti-francescani/orti-francescani.json'
        ];
        this.baseDir = config.baseDir || path.join(__dirname, '../..');
    }

    // Ensure backup directory exists
    init() {
        if (!fs.existsSync(this.backupDir)) {
            fs.mkdirSync(this.backupDir, { recursive: true });
        }
    }

    // Compute SHA-256 of file buffer
    computeHash(buffer) {
        return crypto.createHash('sha256').update(buffer).digest('hex');
    }

    // Run backup cycle
    async createBackup(customName = null) {
        this.init();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupId = customName || `backup-${timestamp}`;
        const targetDir = path.join(this.backupDir, backupId);

        fs.mkdirSync(targetDir, { recursive: true });

        const manifest = {
            backupId,
            createdAt: new Date().toISOString(),
            files: [],
            totalBytes: 0,
            status: 'SUCCESS'
        };

        for (const relPath of this.targetPaths) {
            const fullSrc = path.join(this.baseDir, relPath);
            if (fs.existsSync(fullSrc)) {
                const destFile = path.join(targetDir, relPath);
                fs.mkdirSync(path.dirname(destFile), { recursive: true });

                const content = fs.readFileSync(fullSrc);
                fs.writeFileSync(destFile, content);

                const hash = this.computeHash(content);
                manifest.files.push({
                    path: relPath,
                    sizeBytes: content.length,
                    sha256: hash
                });
                manifest.totalBytes += content.length;
            } else {
                manifest.files.push({
                    path: relPath,
                    status: 'SKIPPED_NOT_FOUND'
                });
            }
        }

        // Save manifest.json inside backup
        fs.writeFileSync(path.join(targetDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

        // Enforce 30-day rotation
        const rotatedCount = this.rotateOldBackups();
        manifest.rotatedCount = rotatedCount;

        return manifest;
    }

    // Rotate backups older than retentionDays
    rotateOldBackups() {
        if (!fs.existsSync(this.backupDir)) return 0;
        const now = Date.now();
        const maxAgeMs = this.retentionDays * 24 * 60 * 60 * 1000;
        let rotated = 0;

        const entries = fs.readdirSync(this.backupDir, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.isDirectory() && entry.name.startsWith('backup-')) {
                const fullPath = path.join(this.backupDir, entry.name);
                const stats = fs.statSync(fullPath);
                if (now - stats.mtimeMs > maxAgeMs) {
                    fs.rmSync(fullPath, { recursive: true, force: true });
                    rotated++;
                }
            }
        }
        return rotated;
    }

    // Verify backup integrity via SHA-256
    verifyBackup(backupId) {
        const targetDir = path.join(this.backupDir, backupId);
        const manifestPath = path.join(targetDir, 'manifest.json');
        if (!fs.existsSync(manifestPath)) {
            return { valid: false, error: 'Manifest missing' };
        }

        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
        let verifiedCount = 0;

        for (const f of manifest.files) {
            if (f.status === 'SKIPPED_NOT_FOUND') continue;
            const fullFile = path.join(targetDir, f.path);
            if (!fs.existsSync(fullFile)) return { valid: false, error: `Missing file ${f.path}` };
            const currentHash = this.computeHash(fs.readFileSync(fullFile));
            if (currentHash !== f.sha256) {
                return { valid: false, error: `Checksum mismatch on ${f.path}` };
            }
            verifiedCount++;
        }

        return { valid: true, verifiedFiles: verifiedCount, backupId };
    }
}

module.exports = BackupManager;
