# PWA Setup - Klaar! 🎉

Je app is nu geconfigureerd als Progressive Web App (PWA). Vrienden kunnen de app installeren op hun telefoon zonder App Store!

## ✅ Wat is al gedaan:

1. ✅ PWA manifest geconfigureerd
2. ✅ Service Worker toegevoegd (offline functionaliteit)
3. ✅ Automatische updates geconfigureerd
4. ✅ Cache strategie voor Supabase en fonts

## 📱 Hoe vrienden de app installeren:

### Op iPhone (Safari):
1. Open de app in Safari
2. Tik op de **deel knop** (vierkant met pijl omhoog)
3. Scroll naar beneden en tik **"Toevoegen aan beginscherm"**
4. Tik **"Toevoegen"**
5. App verschijnt op home screen!

### Op Android (Chrome):
1. Open de app in Chrome
2. Er verschijnt een **banner** "Toevoegen aan beginscherm"
3. Of: Menu (3 puntjes) → **"Toevoegen aan beginscherm"**
4. Tik **"Toevoegen"**
5. App verschijnt op home screen!

## 🎨 Iconen toevoegen (Optioneel maar aanbevolen):

De app werkt zonder iconen, maar voor een professionele uitstraling:

### Methode 1: Gebruik de Icon Generator
1. Open `public/create-icons.html` in je browser
2. Klik op "Download 512x512" en "Download 192x192"
3. Plaats beide bestanden in `public/` folder

### Methode 2: Online Tool
1. Ga naar [PWA Asset Generator](https://www.pwabuilder.com/imageGenerator)
2. Upload een 512x512 PNG met je logo
3. Download en plaats `icon-192.png` en `icon-512.png` in `public/`

### Methode 3: Handmatig
- Maak 2 PNG bestanden:
  - `public/icon-192.png` (192x192 pixels)
  - `public/icon-512.png` (512x512 pixels)
- Gebruik je logo of een eenvoudige afbeelding

**Na het toevoegen van iconen:**
```bash
npm run build
```

## 🚀 Deploy naar Netlify:

De PWA werkt het beste via HTTPS (vereist voor service workers):

1. Push naar GitHub
2. Deploy op Netlify (automatisch via GitHub)
3. Vrienden kunnen de app installeren vanaf de live URL

## ✨ Voordelen van PWA:

- ✅ **Geen App Store nodig** - Direct installeren vanaf website
- ✅ **Werkt offline** - Basis functionaliteit blijft werken zonder internet
- ✅ **Automatische updates** - Vrienden krijgen altijd de nieuwste versie
- ✅ **Werkt op iPhone en Android** - Eén codebase voor alle platforms
- ✅ **Geen verloopdatum** - Apps blijven werken (geen 7-dagen limiet!)

## 🔧 Testen:

1. Run `npm run dev`
2. Open in browser (lokaal werkt service worker alleen via HTTPS, maar installatie werkt wel)
3. Test installatie op je telefoon via Netlify URL

## 📝 Notities:

- Service Workers werken alleen via HTTPS (of localhost voor development)
- Na deploy op Netlify werkt alles perfect
- Vrienden kunnen de app installeren door de URL te bezoeken
- Updates worden automatisch gedownload wanneer beschikbaar

