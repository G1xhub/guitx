# GUItx Dashboard v2.0

Ein professionelles, feature-reiches Dashboard für Cardano-Entwickler zum Überwachen von Wallets und Smart Contracts.

## 🚀 Hauptfeatures

### 📊 **Multi-Panel System**
- Unbegrenzt viele Wallet- und Contract-Panels hinzufügen
- Drag & Drop zum Neuanordnen
- Panels werden automatisch gespeichert (localStorage)
- Individuelle Refresh-Buttons pro Panel

### 🎨 **UI/UX**
- Dark/Light Mode Toggle
- Glassmorphism Design mit Blur-Effekten
- Smooth Animationen und Transitions
- Loading-Overlays (keine Layout-Shifts)
- Responsive Grid-Layout
- Vollständig responsive für Mobile

### 🔍 **Suche & Filter**
- Globale Suchleiste (TX-Hash oder Adresse)
- Transaction Filter (Datum, Betrag, Typ)
- CSV Export für gefilterte Transaktionen
- Schnellsuche in Address Book

### 📖 **Address Book**
- Adressen mit Namen speichern
- Tags für Kategorisierung
- Schnelles Laden in Panels
- Import/Export Funktionalität

### 🏷️ **Tags System**
- Panels mit Tags organisieren
- Mehrere Tags pro Panel
- Visuelle Tag-Anzeige
- Einfaches Hinzufügen/Entfernen

### 🔔 **Alerts & Notifications**
- Custom Alerts (z.B. "Balance > 1000 ADA")
- Desktop Notifications
- Sound-Effekte bei Events
- Alert Manager

### 💰 **Erweiterte Daten**
- **Balance** in ADA mit Echtzeit-Updates
- **UTXOs** Anzahl und Details
- **Tokens/NFTs** mit Namen und Menge
- **Staking Info** (Delegation, Rewards, Pool)
- **Pending Transactions** aus Mempool
- **Script Executions** für Contracts

### 📈 **Network Stats**
- Live Block Height
- Current Epoch
- TPS (Transactions per Second)
- Average Block Time
- ADA Price (CoinGecko)

### 💾 **Export/Import**
- Komplettes Backup aller Daten
- JSON Export pro Panel
- CSV Export für Transaktionen
- QR Code Generator für Adressen

### 📝 **Notes System**
- Notizen zu jedem Panel
- Persistent gespeichert
- Schneller Zugriff

### ⚙️ **Einstellungen**
- Auto-Refresh Interval konfigurierbar
- Notifications ein/aus
- Sound-Effekte ein/aus
- API Key Management

## Verwendung

1. Öffne `index.html` in einem modernen Browser
2. Klicke auf **"+ Wallet hinzufügen"** oder **"+ Contract hinzufügen"**
3. Gib eine Cardano-Adresse ein
4. Das Dashboard lädt automatisch alle Daten

### Keyboard Shortcuts
- **Strg+R**: Alle Panels refreshen
- **Enter** in Suchleiste: Suche ausführen

## 🔧 Konfiguration

Das Dashboard ist bereits mit echten Cardano APIs konfiguriert:

- **Blockfrost API** (Preprod & Mainnet)
- **Ogmios API** (Preprod)
- **Kupo API** (Preprod)
- **CoinGecko API** (ADA Price)

### Netzwerk wechseln

Klicke einfach auf **Preprod** oder **Mainnet** im Header, oder ändere in `config.js`:

```javascript
activeNetwork: 'preprod' // oder 'mainnet'
```

### Auto-Refresh anpassen

Gehe zu **Einstellungen** (⚙️) und ändere das Interval (10-300 Sekunden).

## 📱 Features im Detail

### Address Book
1. Klicke auf 📖 im Header
2. Füge Adressen mit Namen hinzu
3. Vergib Tags zur Organisation
4. Lade Adressen direkt in Panels

### Alerts
1. Öffne Settings → Alert Manager
2. Erstelle Alert mit Bedingung (z.B. "balance > 1000")
3. Erhalte Desktop-Notification wenn ausgelöst

### Transaction Filter
1. Klicke auf 🔍 in einem Panel
2. Filtere nach Datum, Betrag, Typ
3. Exportiere als CSV

### QR Codes
1. Klicke auf 📱 in einem Panel
2. QR Code wird generiert
3. Perfekt zum Teilen von Adressen

### Drag & Drop
- Panels können per Drag & Drop neu angeordnet werden
- Reihenfolge wird automatisch gespeichert

### Tags
- Klicke auf **+** neben Panel-Titel
- Füge Tags hinzu (z.B. "DEV", "PROD", "TEST")
- Klicke auf Tag zum Entfernen

### Notes
- Klicke auf 📝 in einem Panel
- Füge Notizen hinzu
- Notizen werden persistent gespeichert

### Styling anpassen

Farben und Effekte können in `styles.css` angepasst werden:
- Gradient-Farben: `.logo-icon`, `.panel-header h2`
- Animationen: `@keyframes` Blöcke
- Glassmorphism: `backdrop-filter` Eigenschaften

## 🛠️ Technologien

- **Pure Vanilla JavaScript** (keine Frameworks)
- **CSS Grid & Flexbox** für Layout
- **Glassmorphism Design**
- **CSS Animations & Transitions**
- **LocalStorage** für Persistenz
- **Fetch API** für Blockchain-Daten
- **Notifications API** für Desktop-Benachrichtigungen
- **Web Audio API** für Sound-Effekte

## 📦 Dateien

- `index.html` - Haupt-HTML
- `styles.css` - Alle Styles inkl. Theme-System
- `config.js` - API-Konfiguration
- `app.js` - Core-Funktionalität (Panels, Refresh, etc.)
- `features.js` - Erweiterte Features (Address Book, Alerts, etc.)

## 🌐 Browser-Kompatibilität

- Chrome/Edge 88+
- Firefox 94+
- Safari 15.4+

## 🔐 Sicherheit

- Alle API-Keys sind in `config.js` konfigurierbar
- Keine Daten werden an externe Server gesendet (außer Blockchain-APIs)
- Alle Daten werden lokal im Browser gespeichert
- Keine Wallet-Integration = Keine Private Keys

## 🚧 Roadmap

- [ ] WebSocket Integration für Live-Updates
- [ ] Wallet Connect Integration
- [ ] Multi-Sig Support
- [ ] Advanced Charts (Balance History)
- [ ] Plutus Script Debugger
- [ ] Cross-Chain Support (Milkomeda, Hydra)
- [ ] Mobile App (PWA)

## 🤝 Contributing

Contributions sind willkommen! Öffne ein Issue oder Pull Request.

## 📄 Lizenz

MIT License - Frei verwendbar für alle Zwecke

---

**GUItx Dashboard - Entwickelt für die Cardano Developer Community** 💙

Made with ₳ and ❤️
