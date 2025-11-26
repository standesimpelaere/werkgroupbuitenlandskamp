#!/bin/bash

# Script om een backup terug te zetten

BACKUP_DIR="./.backups"

if [ -z "$1" ]; then
    echo "❌ Gebruik: ./restore-backup.sh <backup_naam>"
    echo ""
    echo "Voer './list-backups.sh' uit om beschikbare backups te zien"
    exit 1
fi

BACKUP_NAME="$1"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"

if [ ! -d "$BACKUP_PATH" ]; then
    echo "❌ Backup niet gevonden: $BACKUP_NAME"
    echo ""
    echo "Voer './list-backups.sh' uit om beschikbare backups te zien"
    exit 1
fi

echo "⚠️  Je staat op het punt om bestanden terug te zetten van backup: $BACKUP_NAME"
echo "   Dit overschrijft je huidige bestanden!"
echo ""
read -p "Weet je het zeker? (ja/nee): " confirm

if [ "$confirm" != "ja" ]; then
    echo "❌ Geannuleerd"
    exit 0
fi

echo "🔄 Bestanden terugzetten..."

# Herstel alle bestanden uit de backup
for item in "${BACKUP_PATH}"/*; do
    if [ -e "$item" ] && [ "$(basename "$item")" != ".backup_meta" ]; then
        item_name=$(basename "$item")
        if [ -d "$item" ]; then
            rm -rf "./$item_name"
            cp -r "$item" "./"
        else
            cp "$item" "./"
        fi
        echo "   ✅ $item_name hersteld"
    fi
done

echo ""
echo "✅ Backup hersteld: $BACKUP_NAME"



