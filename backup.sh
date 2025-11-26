#!/bin/bash

# Automatisch backup script voor KSA Buitenlands Kamp project
# Maakt snapshots van belangrijke bestanden elke X minuten

BACKUP_DIR="./.backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="backup_${TIMESTAMP}"

# Maak backup directory aan als die niet bestaat
mkdir -p "${BACKUP_DIR}"

# Lijst van belangrijke directories en bestanden om te backuppen
SOURCE_DIRS=(
    "src"
    "public"
    "index.html"
    "package.json"
    "vite.config.ts"
    "tailwind.config.js"
    "tsconfig.json"
)

echo "📦 Backup maken: ${BACKUP_NAME}"

# Kopieer alle belangrijke bestanden
for item in "${SOURCE_DIRS[@]}"; do
    if [ -e "$item" ]; then
        cp -r "$item" "${BACKUP_DIR}/${BACKUP_NAME}/" 2>/dev/null || true
    fi
done

# Maak een metadata bestand met timestamp en git info
DATE_STR=$(date +"%Y-%m-%d %H:%M:%S")
cat > "${BACKUP_DIR}/${BACKUP_NAME}/.backup_meta" << EOF
timestamp=${TIMESTAMP}
date="${DATE_STR}"
git_commit=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
git_branch=$(git branch --show-current 2>/dev/null || echo "unknown")
EOF

echo "✅ Backup voltooid: ${BACKUP_NAME}"

# Verwijder oude backups (houd laatste 100)
cd "${BACKUP_DIR}"
ls -t | tail -n +101 | xargs rm -rf 2>/dev/null || true

echo "🧹 Oude backups opgeruimd (laatste 100 behouden)"

