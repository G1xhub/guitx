# Cardano Developer Dashboard

Ein modernes, symmetrisches UI für Cardano-Entwickler zum Überwachen von Wallets und Smart Contracts.

## Features

- ✨ Symmetrisches Layout mit Wallet (links) und Smart Contract (rechts)
- 🎨 Modernes Design mit Glassmorphism-Effekten
- 🔄 Live-Updates und Auto-Refresh
- 📊 Echtzeit-Transaktionsüberwachung
- 💫 Coole Animationen und Hover-Effekte
- 📱 Responsive Design

## Verwendung

1. Öffne `index.html` in einem modernen Browser
2. Das Dashboard zeigt:
   - **Links**: Wallet-Übersicht mit Balance und Transaktionen
   - **Rechts**: Smart Contract mit Locked Value und Executions
3. Klicke auf ↻ zum manuellen Refresh
4. Keyboard Shortcut: `Strg+R` für komplettes Refresh

## Verwendung mit echten Daten

Das Dashboard ist bereits mit echten Cardano APIs konfiguriert:

- **Blockfrost API** (Preprod & Mainnet)
- **Ogmios API** (Preprod)
- **Kupo API** (Preprod)

### So verwendest du das Dashboard:

1. Öffne `index.html` im Browser
2. Gib eine Wallet-Adresse (links) ein: `addr1...`
3. Gib eine Contract-Adresse (rechts) ein: `addr1...`
4. Das Dashboard lädt automatisch:
   - Balance und Transaktionen
   - Smart Contract Executions
   - Live Blockchain-Daten
5. Auto-Refresh alle 30 Sekunden

### Netzwerk wechseln

In `config.js` kannst du zwischen Preprod und Mainnet wechseln:

```javascript
activeNetwork: 'preprod' // oder 'mainnet'
```

### Styling anpassen

Farben und Effekte können in `styles.css` angepasst werden:
- Gradient-Farben: `.logo-icon`, `.panel-header h2`
- Animationen: `@keyframes` Blöcke
- Glassmorphism: `backdrop-filter` Eigenschaften

## Technologien

- Pure HTML5, CSS3, JavaScript (keine Frameworks)
- CSS Grid für symmetrisches Layout
- Glassmorphism Design
- CSS Animations & Transitions

## Browser-Kompatibilität

- Chrome/Edge 88+
- Firefox 94+
- Safari 15.4+

---

Entwickelt für die Cardano Developer Community 💙
