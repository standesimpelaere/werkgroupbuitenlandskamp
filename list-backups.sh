#!/bin/bash

# Script om alle beschikbare backups te tonen

BACKUP_DIR="./.backups"

if [ ! -d "$BACKUP_DIR" ]; then
    echo "❌ Geen backup directory gevonden"
    exit 1
fi

echo "📋 Beschikbare backups:"
echo ""

cd "$BACKUP_DIR"

# Sorteer op timestamp (nieuwste eerst)
for backup in $(ls -t); do
    if [ -f "$backup/.backup_meta" ]; then
        # Source de metadata veilig
        if source "$backup/.backup_meta" 2>/dev/null; then
            echo "🕐 $backup"
            if [ -n "$date" ]; then
                echo "   Datum: $date"
            else
                # Fallback: parse timestamp uit naam
                timestamp=$(echo "$backup" | sed 's/backup_//')
                year=${timestamp:0:4}
                month=${timestamp:4:2}
                day=${timestamp:6:2}
                hour=${timestamp:9:2}
                min=${timestamp:11:2}
                sec=${timestamp:13:2}
                echo "   Datum: ${year}-${month}-${day} ${hour}:${min}:${sec}"
            fi
            echo "   Git commit: ${git_commit:-unknown}"
            echo ""
        fi
    fi
done

