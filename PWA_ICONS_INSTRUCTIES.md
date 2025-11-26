# PWA Iconen Maken

De PWA heeft iconen nodig voor installatie op mobiele apparaten. Volg deze stappen:

## Optie 1: Online Tool (Aanbevolen - Eenvoudigst)

1. Ga naar [PWA Asset Generator](https://www.pwabuilder.com/imageGenerator)
2. Upload een 512x512 PNG afbeelding met je logo
3. Download de gegenereerde iconen
4. Plaats `icon-192.png` en `icon-512.png` in de `public/` folder

## Optie 2: Handmatig Maken

1. Maak een 512x512 PNG afbeelding met je logo
2. Gebruik een tool zoals:
   - [ImageMagick](https://imagemagick.org): `convert icon-512.png -resize 192x192 icon-192.png`
   - Online: [ResizeImage.net](https://www.resizeimage.net)
3. Plaats beide bestanden in `public/`:
   - `public/icon-192.png` (192x192 pixels)
   - `public/icon-512.png` (512x512 pixels)

## Optie 3: Gebruik Bestaande SVG

Als je een SVG logo hebt:
1. Open [CloudConvert](https://cloudconvert.com/svg-to-png)
2. Converteer naar PNG (512x512)
3. Resize naar 192x192
4. Plaats beide in `public/`

## Tijdelijke Placeholder

Tot je echte iconen hebt, kun je de `icon.svg` in `public/` gebruiken als basis, of een eenvoudige gekleurde vierkant maken.

**Na het toevoegen van iconen:**
- Run `npm run build`
- De PWA is klaar voor gebruik!




