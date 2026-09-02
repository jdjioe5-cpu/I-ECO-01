/**
 * 🏭 I-ECO-01 - Escrow Multisig API
 * Urban Lab - Monero Escrow System
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const { createServer } = require('http');
const { Server } = require('socket.io');
const winston = require('winston');

// Logger
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'logs/app.log' }),
        new winston.transports.Console({ format: winston.format.simple() })
    ]
});

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: { origin: process.env.CORS_ORIGIN || '*', methods: ["GET", "POST"] }
});

// ---- MIDDLEWARE ----
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---- CORS custom middleware (opzionale, ma lo teniamo) ----
app.use(require('./src/middleware/cors'));

// ---- MONGODB ----
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/urbanlab', {
    dbName: process.env.MONGODB_DB_NAME || 'urbanlab',
    serverSelectionTimeoutMS: 5000
})
.then(() => { logger.info('✅ MongoDB connesso!'); console.log('✅ MongoDB connesso!'); })
.catch(err => { logger.error('❌ MongoDB errore:', err); console.error('❌ MongoDB errore:', err); });

// ---- ROTTE ESCROW ----

// ---- WEBSOCKET INJECTION ----
app.use((req, res, next) => {
    req.io = io;
    next();
});

app.use('/api/escrow', require('./src/routes/escrowRoutes'));

// ---- HEALTH CHECK ----
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'I-ECO-01',
        timestamp: new Date().toISOString(),
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

// ---- WEBSOCKET ----
io.on('connection', (socket) => {
    logger.info(`🔌 Client connesso: ${socket.id}`);

    // Subscribe to real-time updates for a specific escrowId room
    socket.on('subscribe:escrow', (escrowId) => {
        if (escrowId) {
            socket.join(`escrow:${escrowId}`);
            logger.info(`🔌 Client ${socket.id} iscritto a stanza escrow:${escrowId}`);
            socket.emit('subscribed', { escrowId, status: 'ok' });
        }
    });

    // Unsubscribe from escrow room
    socket.on('unsubscribe:escrow', (escrowId) => {
        if (escrowId) {
            socket.leave(`escrow:${escrowId}`);
            logger.info(`🔌 Client ${socket.id} disiscritto da stanza escrow:${escrowId}`);
            socket.emit('unsubscribed', { escrowId, status: 'ok' });
        }
    });

    socket.on('disconnect', () => {
        logger.info(`🔌 Client disconnesso: ${socket.id}`);
    });
});

// ---- AVVIO ----
const PORT = process.env.PORT || 5002;
httpServer.listen(PORT, () => {
    logger.info(`🚀 Server avviato su porta ${PORT}`);
    console.log(`🚀 Server avviato su porta ${PORT}`);
    console.log(`   📊 Health: http://localhost:${PORT}/health`);
    console.log(`   🔐 Escrow: http://localhost:${PORT}/api/escrow`);
    console.log(`   🔌 WebSocket: ws://localhost:${PORT}`);
});

module.exports = { app, httpServer, io };
