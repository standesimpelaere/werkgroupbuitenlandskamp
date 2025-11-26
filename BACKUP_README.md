# 🔄 Automatisch Backup Systeem

Dit backup systeem maakt automatisch snapshots van je code elke paar minuten, zodat je op elk moment terug kunt gaan naar een eerdere versie.

## 📋 Beschikbare Commando's

### 1. Handmatig een backup maken
```bash
./backup.sh
```

### 2. Alle backups bekijken
```bash
./list-backups.sh
```

Dit toont alle beschikbare backups met timestamp en git informatie.

### 3. Een backup terugzetten
```bash
./restore-backup.sh backup_20251126_023340
```

**⚠️ Let op:** Dit overschrijft je huidige bestanden! Zorg dat je eerst een backup maakt.

### 4. Automatisch backups maken (elke X minuten)
```bash
# Standaard: elke 5 minuten
node auto-backup.js

# Of specifiek interval (bijv. elke 2 minuten)
node auto-backup.js 2
```

Druk `Ctrl+C` om te stoppen.

## 📁 Backup Locatie

Backups worden opgeslagen in: `.backups/`

Elke backup heeft:
- Een timestamp naam (bijv. `backup_20251126_023340`)
- Alle belangrijke bestanden en directories
- Een `.backup_meta` bestand met metadata

## 🔧 Wat wordt gebackupt?

- `src/` - Alle source code
- `public/` - Publieke bestanden
- `index.html`
- `package.json`
- `vite.config.ts`
- `tailwind.config.js`
- `tsconfig.json`

## 💡 Tips

1. **Start automatisch backup** wanneer je begint met werken:
   ```bash
   node auto-backup.js 5 &
   ```

2. **Bekijk backups** voordat je terugzet:
   ```bash
   ./list-backups.sh
   ```

3. **Maak een backup** voordat je grote wijzigingen maakt:
   ```bash
   ./backup.sh
   ```

## 🗑️ Opschoning

Het systeem houdt automatisch de laatste 100 backups. Oudere backups worden automatisch verwijderd.

## ⚠️ Belangrijk

- Backups worden **niet** naar git gecommit (staan in `.gitignore`)
- Backups zijn **lokaal** op je computer
- Maak regelmatig git commits voor belangrijke wijzigingen



