# Roadmap Kladblok

Dit bestand bevat een overzicht van alle roadmap data voor referentie tijdens het herontwerpen van de Werkgroep pagina.

---

## WAVES (Golven)

**Wave 1** - Order: 1
**Wave 2** - Order: 2
**Wave 3** - Order: 3
**Wave 4** - Order: 4

---

## THEMA'S

1. **Campings**
   - Kleur: Blauw (#3b82f6)
   - Icoon: camping

2. **Vervoer**
   - Kleur: Groen (#10b981)
   - Icoon: directions_bus

3. **Activiteiten**
   - Kleur: Oranje (#f59e0b)
   - Icoon: sports_soccer

4. **Voeding**
   - Kleur: Rood (#ef4444)
   - Icoon: restaurant

5. **Administratie**
   - Kleur: Paars (#8b5cf6)
   - Icoon: description

6. **Communicatie**
   - Kleur: Cyan (#06b6d4)
   - Icoon: chat

7. **Algemeen**
   - Kleur: Grijs (#6b7280)
   - Icoon: folder

---

## INITIËLE TAKEN / ROADMAP ITEMS

### 1. Informeren verblijfplaats Neurenberg
- **Categorie:** Accommodatie
- **Prioriteit:** Middel
- **Status:** Te doen
- **Toegewezen aan:** Niemand
- **Beschrijving:** Onderzoek en contact opnemen met mogelijke campings in de omgeving van Neurenberg. Prijzen, beschikbaarheid en faciliteiten vergelijken.

### 2. Informeren verblijfplaats Bratislava
- **Categorie:** Accommodatie
- **Prioriteit:** Middel
- **Status:** Te doen
- **Toegewezen aan:** Niemand
- **Beschrijving:** Onderzoek en contact opnemen met mogelijke campings in de omgeving van Bratislava. Prijzen, beschikbaarheid en faciliteiten vergelijken.

### 3. Informeren verblijfplaats Frymburk
- **Categorie:** Accommodatie
- **Prioriteit:** Hoog
- **Status:** Te doen
- **Toegewezen aan:** Niemand
- **Beschrijving:** Onderzoek en contact opnemen met mogelijke campings in de omgeving van Frymburk. Prijzen, beschikbaarheid en faciliteiten vergelijken. Let op: Camp Vresna heeft slechts 60 plekken beschikbaar!

### 4. Meerprijs dubbele bemanning checken
- **Categorie:** Transport
- **Prioriteit:** Middel
- **Status:** Te doen
- **Toegewezen aan:** Niemand
- **Beschrijving:** Voor de nachtritten (2 chauffeurs).

### 5. Busmaatschappij vastleggen en voorschot betalen
- **Categorie:** Transport
- **Prioriteit:** Hoog
- **Status:** Mee bezig
- **Toegewezen aan:** Louis
- **Beschrijving:** Offertes vergelijken en definitieve keuze maken.

### 6. Gedetailleerde activiteitendagboeken uitwerken
- **Categorie:** Activiteiten
- **Prioriteit:** Middel
- **Status:** Te doen
- **Toegewezen aan:** Niemand
- **Beschrijving:** Per dagdeel uitwerken wat we gaan doen.

### 7. Menu samenstellen en boodschappenlijst maken
- **Categorie:** Voeding
- **Prioriteit:** Middel
- **Status:** Te doen
- **Toegewezen aan:** Victor
- **Beschrijving:** Rekening houden met allergieën en budget.

### 8. Inschrijvingsformulier openstellen
- **Categorie:** Communicatie
- **Prioriteit:** Hoog
- **Status:** Klaar
- **Toegewezen aan:** Michiel
- **Beschrijving:** Via de website en mail naar ouders.

### 9. Medische fiches verzamelen
- **Categorie:** Administratie
- **Prioriteit:** Laag
- **Status:** Te doen
- **Toegewezen aan:** Tim
- **Beschrijving:** Zorgen dat alles digitaal in orde is.

---

## TEAM LEDEN

- Louis
- Michiel
- Tim
- Douwe
- Victor
- Stan

---

## CATEGORIE MAPPING

Hoe taken categorieën worden omgezet naar thema's:

- Accommodatie → Campings
- Transport → Vervoer
- Activiteiten → Activiteiten
- Voeding → Voeding
- Administratie → Administratie
- Communicatie → Communicatie
- Algemeen → Algemeen

---

## LANDEN

De applicatie ondersteunt drie landen:
- Nederland
- België
- Frankrijk

---

## DATABASE TABELLEN OVERZICHT

### werkgroep_roadmap_waves
Bevat de waves (golven) met:
- Naam
- Start datum
- Eind datum
- Volgorde

### werkgroep_roadmap_items
Bevat alle roadmap items (taken) met:
- Titel en beschrijving
- Wave waar het bij hoort
- Thema
- Status (Te doen, Mee bezig, Klaar)
- Toegewezen persoon
- Deadline
- Notities
- Tussenstappen
- Land (Nederland, België, Frankrijk)

### werkgroep_roadmap_themes
Bevat alle thema's met:
- Naam
- Icoon
- Kleur
- Volgorde

### werkgroep_theme_notes
Notities per thema per land:
- Thema
- Land
- Inhoud

### werkgroep_theme_contributions
Bijdragen (logging) per thema per land:
- Thema
- Land
- Inhoud
- Auteur

### werkgroep_theme_attachments
Bijlagen per thema per land:
- Thema
- Land
- Naam
- Type (bestand of link)
- URL
- Grootte

---

## HUIDIGE FUNCTIONALITEIT

### Tabs in Werkgroep pagina
1. **Roadmap** - Overzicht van waves en thema's
2. **Huidige Wave** (voorheen "Takenlijst") - Toont alleen items van de huidige wave
3. **Accommodaties** - Accommodatie opties per locatie
4. **Dossiers** - Persoonlijke dossiers per teamlid

### Roadmap Views
- **Waves View**: Items gegroepeerd per wave
- **Themes View**: Items gegroepeerd per thema

### Theme Panel (Slide-out)
- Opent bij klikken op een roadmap item
- Desktop: rechts uitklappen
- Mobile: onderaan uitklappen
- Per land (Nederland, België, Frankrijk):
  - Notities
  - Bijdragen (logging)
  - Bijlagen (links en bestanden)

### Sortering Opties
- Persoon
- Status
- Thema
- Datum

---

## STATUS MOGELIJKHEDEN

- Te doen
- Mee bezig
- Klaar

---

## PRIORITEIT MOGELIJKHEDEN

- Hoog
- Middel
- Laag
