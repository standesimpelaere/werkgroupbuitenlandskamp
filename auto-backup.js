#!/usr/bin/env node

/**
 * Automatisch backup script dat elke X minuten een backup maakt
 * Gebruik: node auto-backup.js [interval_in_minuten]
 * Standaard: elke 5 minuten
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const INTERVAL_MINUTES = parseInt(process.argv[2]) || 5;
const INTERVAL_MS = INTERVAL_MINUTES * 60 * 1000;

const BACKUP_SCRIPT = path.join(__dirname, 'backup.sh');

console.log(`🔄 Automatisch backup systeem gestart`);
console.log(`   Interval: elke ${INTERVAL_MINUTES} minuten`);
console.log(`   Druk Ctrl+C om te stoppen\n`);

// Maak eerste backup direct
try {
    execSync(`bash "${BACKUP_SCRIPT}"`, { stdio: 'inherit' });
} catch (error) {
    console.error('❌ Fout bij eerste backup:', error.message);
}

// Maak daarna backups op interval
const interval = setInterval(() => {
    try {
        execSync(`bash "${BACKUP_SCRIPT}"`, { stdio: 'inherit' });
    } catch (error) {
        console.error('❌ Fout bij backup:', error.message);
    }
}, INTERVAL_MS);

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\n🛑 Backup systeem gestopt');
    clearInterval(interval);
    process.exit(0);
});



