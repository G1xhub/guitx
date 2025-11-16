// Globale Variablen
let currentWalletAddress = null;
let currentContractAddress = null;
let refreshInterval = null;

// Initialisierung
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    startAutoRefresh();
    updateNetworkStatus();
});

async function initializeApp() {
    try {
        await updateBlockchainInfo();
        showNotification('Dashboard geladen', 'success');
    } catch (error) {
        console.error('Initialisierungsfehler:', error);
        showNotification('Fehler beim Laden', 'error');
    }
}

// Wallet-Adresse setzen
async function setWalletAddress(address) {
    if (!address || address.trim() === '') {
        return;
    }
    
    address = address.trim();
    
    // Validierung - Akzeptiere alle Cardano-Adresstypen
    if (!isValidCardanoAddress(address)) {
        showNotification('Ungültige Wallet-Adresse', 'error');
        return;
    }
    
    currentWalletAddress = address;
    document.getElementById('walletAddress').textContent = formatAddress(address);
    document.getElementById('walletAddressInput').value = '';
    
    showNotification('Lade Wallet-Daten...', 'info');
    await refreshWallet();
}

// Contract-Adresse setzen
async function setContractAddress(address) {
    if (!address || address.trim() === '') {
        return;
    }
    
    address = address.trim();
    
    // Validierung - Akzeptiere alle Cardano-Adresstypen
    if (!isValidCardanoAddress(address)) {
        showNotification('Ungültige Contract-Adresse', 'error');
        return;
    }
    
    currentContractAddress = address;
    document.getElementById('contractAddress').textContent = formatAddress(address);
    document.getElementById('contractAddressInput').value = '';
    
    showNotification('Lade Contract-Daten...', 'info');
    await refreshContract();
}

// Wallet-Daten von Blockfrost laden
async function refreshWallet() {
    if (!currentWalletAddress) {
        showNotification('Bitte Wallet-Adresse eingeben', 'error');
        return;
    }
    
    const btn = event?.target;
    if (btn) btn.style.transform = 'rotate(360deg)';
    
    try {
        // Wallet-Info abrufen
        const addressInfo = await blockfrostRequest(`/addresses/${currentWalletAddress}`);
        
        // Balance in ADA umrechnen (Lovelace zu ADA)
        const balanceADA = parseInt(addressInfo.amount[0].quantity) / 1000000;
        document.getElementById('walletBalance').querySelector('.amount').textContent = 
            balanceADA.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        
        // Transaktionen abrufen
        const transactions = await blockfrostRequest(`/addresses/${currentWalletAddress}/transactions?count=10&order=desc`);
        document.getElementById('totalTx').textContent = addressInfo.tx_count || transactions.length;
        
        // Detaillierte Transaktionen laden
        await loadWalletTransactions(transactions.slice(0, 5));
        
        // Pending Transaktionen (Mempool)
        try {
            const mempoolTxs = await blockfrostRequest(`/mempool/addresses/${currentWalletAddress}`);
            document.getElementById('pendingTx').textContent = mempoolTxs.length || 0;
        } catch (e) {
            document.getElementById('pendingTx').textContent = 0;
        }
        
        animateNumbers();
        showNotification('Wallet aktualisiert', 'success');
        
    } catch (error) {
        console.error('Wallet-Fehler:', error);
        
        // Bessere Fehlermeldungen für Wallet
        if (error.message.includes('404') || error.message.includes('not found')) {
            // Wallet existiert noch nicht on-chain
            document.getElementById('walletBalance').querySelector('.amount').textContent = '0.00';
            document.getElementById('totalTx').textContent = '0';
            document.getElementById('pendingTx').textContent = '0';
            document.getElementById('walletTransactions').innerHTML = 
                '<div class="loading-message">✨ Neues Wallet - noch keine Transaktionen</div>';
            showNotification('Wallet bereit (noch keine Aktivität)', 'info');
            animateNumbers();
        } else if (error.message.includes('400') || error.message.includes('Invalid address')) {
            showNotification('Adresse nicht gefunden - falsches Netzwerk?', 'error');
        } else {
            showNotification(`Fehler: ${error.message}`, 'error');
        }
    } finally {
        if (btn) {
            setTimeout(() => btn.style.transform = 'rotate(0deg)', 300);
        }
    }
}

// Contract-Daten von Blockfrost laden
async function refreshContract() {
    if (!currentContractAddress) {
        showNotification('Bitte Contract-Adresse eingeben', 'error');
        return;
    }
    
    const btn = event?.target;
    if (btn) btn.style.transform = 'rotate(360deg)';
    
    try {
        // Contract-Info abrufen
        const addressInfo = await blockfrostRequest(`/addresses/${currentContractAddress}`);
        
        // Prüfe ob Adresse Guthaben hat
        if (!addressInfo.amount || addressInfo.amount.length === 0) {
            // Adresse existiert, hat aber kein Guthaben
            document.getElementById('contractBalance').querySelector('.amount').textContent = '0.00';
            document.getElementById('totalExec').textContent = '0';
            document.getElementById('activeExec').textContent = '0';
            document.getElementById('contractTransactions').innerHTML = 
                '<div class="loading-message">Keine Transaktionen gefunden (Adresse leer)</div>';
            showNotification('Contract hat kein Guthaben', 'info');
            animateNumbers();
            return;
        }
        
        // Locked Value in ADA
        const lockedValueADA = parseInt(addressInfo.amount[0].quantity) / 1000000;
        document.getElementById('contractBalance').querySelector('.amount').textContent = 
            lockedValueADA.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        
        // Transaktionen abrufen
        const transactions = await blockfrostRequest(`/addresses/${currentContractAddress}/transactions?count=20&order=desc`);
        document.getElementById('totalExec').textContent = addressInfo.tx_count || transactions.length;
        
        // Aktive Transaktionen (letzte 24h)
        const oneDayAgo = Math.floor(Date.now() / 1000) - 86400;
        const recentTxs = transactions.filter(tx => tx.block_time > oneDayAgo);
        document.getElementById('activeExec').textContent = recentTxs.length;
        
        // Detaillierte Transaktionen laden
        await loadContractTransactions(transactions.slice(0, 5));
        
        animateNumbers();
        showNotification('Contract aktualisiert', 'success');
        
    } catch (error) {
        console.error('Contract-Fehler:', error);
        
        // Bessere Fehlermeldungen
        if (error.message.includes('404') || error.message.includes('not found')) {
            // Adresse existiert noch nicht on-chain (neuer Contract)
            document.getElementById('contractBalance').querySelector('.amount').textContent = '0.00';
            document.getElementById('totalExec').textContent = '0';
            document.getElementById('activeExec').textContent = '0';
            document.getElementById('contractTransactions').innerHTML = 
                '<div class="loading-message">✨ Neuer Contract - noch keine Transaktionen</div>';
            showNotification('Contract bereit (noch keine Aktivität)', 'info');
            animateNumbers();
        } else if (error.message.includes('400') || error.message.includes('Invalid address')) {
            // 400 = Adresse ungültig oder falsches Netzwerk
            document.getElementById('contractBalance').querySelector('.amount').textContent = '0.00';
            document.getElementById('totalExec').textContent = '0';
            document.getElementById('activeExec').textContent = '0';
            document.getElementById('contractTransactions').innerHTML = 
                '<div class="loading-message">⚠️ Adresse nicht im Preprod-Netzwerk gefunden</div>';
            showNotification('Adresse nicht gefunden - falsches Netzwerk?', 'error');
        } else {
            showNotification(`Fehler: ${error.message}`, 'error');
        }
    } finally {
        if (btn) {
            setTimeout(() => btn.style.transform = 'rotate(0deg)', 300);
        }
    }
}

// Wallet-Transaktionen detailliert laden
async function loadWalletTransactions(txHashes) {
    const container = document.getElementById('walletTransactions');
    container.innerHTML = '<div class="loading-message">Lade Transaktionen...</div>';
    
    try {
        const txElements = [];
        
        for (const txHash of txHashes.slice(0, 5)) {
            try {
                const txDetails = await blockfrostRequest(`/txs/${txHash.tx_hash}`);
                const utxos = await blockfrostRequest(`/txs/${txHash.tx_hash}/utxos`);
                
                // Berechne Netto-Betrag für diese Adresse
                let netAmount = 0;
                
                // Outputs (Eingänge für Wallet)
                utxos.outputs.forEach(output => {
                    if (output.address === currentWalletAddress) {
                        netAmount += parseInt(output.amount[0].quantity);
                    }
                });
                
                // Inputs (Ausgänge vom Wallet)
                utxos.inputs.forEach(input => {
                    if (input.address === currentWalletAddress) {
                        netAmount -= parseInt(input.amount[0].quantity);
                    }
                });
                
                const netAmountADA = netAmount / 1000000;
                const isPositive = netAmount > 0;
                const timeAgo = getTimeAgo(txDetails.block_time);
                
                txElements.push(`
                    <div class="transaction-item success">
                        <div class="tx-icon">${isPositive ? '↓' : '↑'}</div>
                        <div class="tx-details">
                            <div class="tx-hash">${formatTxHash(txHash.tx_hash)}</div>
                            <div class="tx-time">${timeAgo}</div>
                        </div>
                        <div class="tx-amount" style="color: ${isPositive ? '#00ff88' : '#ff6b6b'}">
                            ${isPositive ? '+' : ''}${netAmountADA.toFixed(2)} ₳
                        </div>
                    </div>
                `);
            } catch (e) {
                console.error('TX-Detail-Fehler:', e);
            }
        }
        
        container.innerHTML = txElements.length > 0 
            ? txElements.join('') 
            : '<div class="loading-message">Keine Transaktionen gefunden</div>';
            
    } catch (error) {
        console.error('Fehler beim Laden der Transaktionen:', error);
        container.innerHTML = '<div class="loading-message">Fehler beim Laden</div>';
    }
}

// Contract-Transaktionen detailliert laden
async function loadContractTransactions(txHashes) {
    const container = document.getElementById('contractTransactions');
    container.innerHTML = '<div class="loading-message">Lade Transaktionen...</div>';
    
    try {
        const txElements = [];
        
        for (const txHash of txHashes.slice(0, 5)) {
            try {
                const txDetails = await blockfrostRequest(`/txs/${txHash.tx_hash}`);
                const timeAgo = getTimeAgo(txDetails.block_time);
                
                // Versuche Redeemer zu laden (Smart Contract Execution)
                let executionType = 'Transaction';
                try {
                    const redeemers = await blockfrostRequest(`/txs/${txHash.tx_hash}/redeemers`);
                    if (redeemers.length > 0) {
                        executionType = `Script Execution (${redeemers[0].purpose})`;
                    }
                } catch (e) {
                    // Keine Redeemer = normale Transaction
                }
                
                txElements.push(`
                    <div class="transaction-item success">
                        <div class="tx-icon">✓</div>
                        <div class="tx-details">
                            <div class="tx-hash">${executionType}</div>
                            <div class="tx-time">${timeAgo} • ${formatTxHash(txHash.tx_hash)}</div>
                        </div>
                        <div class="tx-amount">Success</div>
                    </div>
                `);
            } catch (e) {
                console.error('TX-Detail-Fehler:', e);
            }
        }
        
        container.innerHTML = txElements.length > 0 
            ? txElements.join('') 
            : '<div class="loading-message">Keine Transaktionen gefunden</div>';
            
    } catch (error) {
        console.error('Fehler beim Laden der Contract-Transaktionen:', error);
        container.innerHTML = '<div class="loading-message">Fehler beim Laden</div>';
    }
}

// Blockchain-Info aktualisieren
async function updateBlockchainInfo() {
    try {
        const latestBlock = await blockfrostRequest('/blocks/latest');
        const epoch = await blockfrostRequest('/epochs/latest');
        
        document.getElementById('blockHeight').textContent = 
            latestBlock.height.toLocaleString('de-DE');
        document.getElementById('epoch').textContent = epoch.epoch;
        
        updateLastUpdateTime();
    } catch (error) {
        console.error('Blockchain-Info-Fehler:', error);
    }
}

// Netzwerk-Status aktualisieren
function updateNetworkStatus() {
    const network = CONFIG.activeNetwork === 'preprod' ? 'Preprod' : 'Mainnet';
    document.getElementById('networkStatus').textContent = `${network} Connected`;
}

// Auto-Refresh alle 30 Sekunden
function startAutoRefresh() {
    // Blockchain-Info alle 30 Sekunden
    setInterval(async () => {
        await updateBlockchainInfo();
        
        // Wallet und Contract nur refreshen wenn Adressen gesetzt sind
        if (currentWalletAddress) {
            await refreshWallet();
        }
        if (currentContractAddress) {
            await refreshContract();
        }
    }, 30000);
}

// Letzte Aktualisierung
function updateLastUpdateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('de-DE');
    document.getElementById('lastUpdate').textContent = timeString;
}

// Zahlen-Animation
function animateNumbers() {
    const numbers = document.querySelectorAll('.stat-value, .balance-amount .amount');
    numbers.forEach(num => {
        num.style.transform = 'scale(1.1)';
        num.style.color = '#00ff88';
        setTimeout(() => {
            num.style.transform = 'scale(1)';
            num.style.color = '';
        }, 300);
    });
}

// Notification System
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    const colors = {
        success: { bg: 'rgba(0, 255, 136, 0.2)', border: 'rgba(0, 255, 136, 0.5)', text: '#00ff88' },
        error: { bg: 'rgba(255, 107, 107, 0.2)', border: 'rgba(255, 107, 107, 0.5)', text: '#ff6b6b' },
        info: { bg: 'rgba(102, 126, 234, 0.2)', border: 'rgba(102, 126, 234, 0.5)', text: '#667eea' }
    };
    
    const color = colors[type] || colors.info;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${color.bg};
        color: ${color.text};
        padding: 15px 25px;
        border-radius: 10px;
        border: 1px solid ${color.border};
        backdrop-filter: blur(10px);
        z-index: 1000;
        animation: slideInRight 0.3s ease-out;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
        font-size: 14px;
        max-width: 300px;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Helper-Funktionen
function isValidCardanoAddress(address) {
    // Cardano-Adresstypen (Bech32-kodiert):
    // Mainnet:
    //   addr1q... - Base address (payment + stake)
    //   addr1v... - Base address (script + stake)
    //   addr1w... - Enterprise address (payment only)
    //   addr1x... - Enterprise address (script only)
    //   stake1... - Stake address
    // Testnet/Preprod:
    //   addr_test1q... - Base address (payment + stake)
    //   addr_test1v... - Base address (script + stake)
    //   addr_test1w... - Enterprise address (payment only)
    //   addr_test1x... - Enterprise address (script only)
    //   stake_test1... - Stake address
    
    // Vereinfachte Validierung: Prüfe nur ob es mit addr oder stake beginnt
    const isMainnetAddr = address.startsWith('addr1');
    const isTestnetAddr = address.startsWith('addr_test1');
    const isMainnetStake = address.startsWith('stake1');
    const isTestnetStake = address.startsWith('stake_test1');
    const isScript = address.startsWith('script1');
    
    const hasValidPrefix = isMainnetAddr || isTestnetAddr || isMainnetStake || isTestnetStake || isScript;
    
    // Prüfe Mindestlänge (Cardano-Adressen sind typischerweise 58-108 Zeichen)
    const hasValidLength = address.length >= 50;
    
    // Prüfe ob nur gültige Bech32-Zeichen verwendet werden (a-z, 0-9, keine Großbuchstaben)
    const bech32Pattern = /^[a-z0-9_]+$/;
    const hasValidCharacters = bech32Pattern.test(address);
    
    return hasValidPrefix && hasValidLength && hasValidCharacters;
}

function formatAddress(address) {
    if (!address) return 'Keine Adresse';
    return `${address.substring(0, 12)}...${address.substring(address.length - 8)}`;
}

function formatTxHash(hash) {
    if (!hash) return '';
    return `${hash.substring(0, 8)}...${hash.substring(hash.length - 8)}`;
}

function getTimeAgo(timestamp) {
    const now = Math.floor(Date.now() / 1000);
    const diff = now - timestamp;
    
    if (diff < 60) return 'Gerade eben';
    if (diff < 3600) return `${Math.floor(diff / 60)} Min. her`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} Std. her`;
    return `${Math.floor(diff / 86400)} Tage her`;
}

// Keyboard Shortcuts
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'r') {
        e.preventDefault();
        if (currentWalletAddress) refreshWallet();
        if (currentContractAddress) refreshContract();
        updateBlockchainInfo();
    }
});

// CSS Animations hinzufügen
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            opacity: 0;
            transform: translateX(50px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    @keyframes slideOutRight {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(50px);
        }
    }
    
    .loading-message {
        text-align: center;
        padding: 20px;
        color: rgba(255, 255, 255, 0.5);
        font-style: italic;
    }
    
    .address-input {
        width: 100%;
        padding: 12px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        color: #fff;
        font-family: 'Courier New', monospace;
        font-size: 14px;
        transition: all 0.3s ease;
    }
    
    .address-input:focus {
        outline: none;
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(102, 126, 234, 0.5);
        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }
    
    .address-input::placeholder {
        color: rgba(255, 255, 255, 0.3);
    }
`;
document.head.appendChild(style);

console.log('🚀 Cardano Developer Dashboard mit echten APIs geladen');
console.log('💡 Netzwerk:', CONFIG.activeNetwork);
console.log('💡 Tipp: Wallet- und Contract-Adressen eingeben zum Starten');
