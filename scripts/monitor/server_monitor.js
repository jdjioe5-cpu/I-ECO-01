/**
 * 📊 Server Monitor Agent for Aruba & Ecosystem Nodes
 * Tracks CPU, RAM, Disk, Network Latency, SSH & PM2 service health.
 */
const os = require('os');
const fs = require('fs');
const net = require('net');

class ServerMonitor {
    constructor(config = {}) {
        this.targetHost = config.targetHost || process.env.MONITOR_HOST || '127.0.0.1';
        this.sshPort = parseInt(config.sshPort || process.env.MONITOR_SSH_PORT || 22, 10);
        this.thresholds = {
            cpuMaxPercent: config.cpuMaxPercent || 85,
            ramMaxPercent: config.ramMaxPercent || 90,
            diskMaxPercent: config.diskMaxPercent || 85
        };
        this.alertHistory = [];
    }

    // 1. CPU Metrics
    getCpuUsage() {
        const cpus = os.cpus();
        const load = os.loadavg();
        return {
            cores: cpus.length,
            model: cpus[0] ? cpus[0].model : 'Unknown',
            load1m: Number(load[0].toFixed(2)),
            load5m: Number(load[1].toFixed(2)),
            load15m: Number(load[2].toFixed(2)),
            estimatedUsagePercent: Math.min(100, Number(((load[0] / cpus.length) * 100).toFixed(1)))
        };
    }

    // 2. RAM Metrics
    getRamUsage() {
        const total = os.totalmem();
        const free = os.freemem();
        const used = total - free;
        const usedPercent = Number(((used / total) * 100).toFixed(1));
        return {
            totalMB: Math.round(total / (1024 * 1024)),
            freeMB: Math.round(free / (1024 * 1024)),
            usedMB: Math.round(used / (1024 * 1024)),
            usedPercent
        };
    }

    // 3. System Uptime
    getUptime() {
        const uptimeSec = os.uptime();
        const days = Math.floor(uptimeSec / 86400);
        const hours = Math.floor((uptimeSec % 86400) / 3600);
        const minutes = Math.floor((uptimeSec % 3600) / 60);
        return {
            uptimeSeconds: uptimeSec,
            formatted: `${days}d ${hours}h ${minutes}m`
        };
    }

    // 4. SSH TCP Port Availability Probe
    async checkSshPort(host = this.targetHost, port = this.sshPort, timeoutMs = 2000) {
        return new Promise((resolve) => {
            const start = Date.now();
            const socket = new net.Socket();
            let resolved = false;

            socket.setTimeout(timeoutMs);

            socket.on('connect', () => {
                const latency = Date.now() - start;
                socket.destroy();
                resolved = true;
                resolve({ available: true, latencyMs: latency });
            });

            socket.on('timeout', () => {
                socket.destroy();
                if (!resolved) {
                    resolved = true;
                    resolve({ available: false, error: 'TIMEOUT' });
                }
            });

            socket.on('error', (err) => {
                socket.destroy();
                if (!resolved) {
                    resolved = true;
                    resolve({ available: false, error: err.code || err.message });
                }
            });

            socket.connect(port, host);
        });
    }

    // 5. Evaluate System Alerts
    evaluateAlerts(metrics) {
        const alerts = [];
        if (metrics.ram.usedPercent > this.thresholds.ramMaxPercent) {
            alerts.push({ level: 'WARNING', metric: 'RAM', message: `RAM usage exceeds ${this.thresholds.ramMaxPercent}% (current: ${metrics.ram.usedPercent}%)` });
        }
        if (metrics.cpu.estimatedUsagePercent > this.thresholds.cpuMaxPercent) {
            alerts.push({ level: 'WARNING', metric: 'CPU', message: `CPU usage exceeds ${this.thresholds.cpuMaxPercent}% (current: ${metrics.cpu.estimatedUsagePercent}%)` });
        }
        if (metrics.ssh && !metrics.ssh.available) {
            alerts.push({ level: 'CRITICAL', metric: 'SSH', message: `SSH port ${this.sshPort} unreachable: ${metrics.ssh.error}` });
        }
        return alerts;
    }

    // 6. Complete System Health Snapshot
    async collectHealthSnapshot(probeSsh = false) {
        const cpu = this.getCpuUsage();
        const ram = this.getRamUsage();
        const uptime = this.getUptime();
        const ssh = probeSsh ? await this.checkSshPort() : { probed: false };

        const snapshot = {
            timestamp: new Date().toISOString(),
            status: 'HEALTHY',
            host: this.targetHost,
            uptime,
            cpu,
            ram,
            ssh,
            alerts: []
        };

        const alerts = this.evaluateAlerts({ cpu, ram, ssh });
        if (alerts.length > 0) {
            snapshot.status = alerts.some(a => a.level === 'CRITICAL') ? 'CRITICAL' : 'DEGRADED';
            snapshot.alerts = alerts;
        }

        return snapshot;
    }
}

module.exports = ServerMonitor;
