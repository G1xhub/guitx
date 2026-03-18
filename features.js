// ==================== ADVANCED FEATURES ====================

// Globale State
const AppState = {
    theme: localStorage.getItem('theme') || 'dark',
    addressBook: JSON.parse(localStorage.getItem('addressBook') || '{}'),
    tags: JSON.parse(localStorage.getItem('tags') || '{}'),
    alerts: JSON.parse(localStorage.getItem('alerts') || '[]'),
    notes: JSON.parse(localStorage.getItem('notes') || '{}'),
    settings: JSON.parse(localStorage.getItem('settings') || '{"autoRefresh": 30, "notifications": true, "sound": true}'),
    apiKeys: JSON.parse(localStorage.getItem('apiKeys') || '{}'),
    adaPrice: 0,
    lastBlockTime: 0,
    tps: 0
};

// ==================== THEME SYSTEM ====================

function toggleTheme() {
    AppState.theme = AppState.theme === 'dark' ? 'light' : 'dark';
    applyTheme();
    localStorage.setItem('theme', AppState.theme);
    showNotification(`${AppState.theme === 'dark' ? '🌙 Dark' : '☀️ Light'} Mode aktiviert`, 'success');
}

function applyTheme() {
    document.body.setAttribute('data-theme', AppState.theme);
}

// ==================== ADDRESS BOOK ====================

function openAddressBook() {
    const modal = createModal('Address Book', `
        <div class="address-book">
            <div class="address-book-header">
                <input type="text" id="abSearch" placeholder="Search..." class="search-input">
                <button onclick="addAddressBookEntry()" class="btn-primary">+ Add</button>
            </div>
            <div id="addressBookList" class="address-book-list"></div>
        </div>
    `);
    
    renderAddressBook();
}

function renderAddressBook() {
    const list = document.getElementById('addressBookList');
    if (!list) return;
    
    const entries = Object.entries(AppState.addressBook);
    
    if (entries.length === 0) {
        list.innerHTML = '<div class="empty-state-small">No entries</div>';
        return;
    }
    
    list.innerHTML = entries.map(([address, data]) => `
        <div class="address-book-item">
            <div class="ab-info">
                <div class="ab-name">${data.name}</div>
                <div class="ab-address">${formatAddress(address)}</div>
                ${data.tags ? `<div class="ab-tags">${data.tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>` : ''}
            </div>
            <div class="ab-actions">
                <button onclick="copyToClipboard('${address}')" class="icon-btn-small" title="Copy">⎘</button>
                <button onclick="loadAddressToPanel('${address}')" class="icon-btn-small" title="Load">↓</button>
                <button onclick="deleteAddressBookEntry('${address}')" class="icon-btn-small" title="Delete">×</button>
            </div>
        </div>
    `).join('');
}

function addAddressBookEntry() {
    const name = prompt('Name:');
    if (!name) return;
    
    const address = prompt('Address:');
    if (!address || !isValidCardanoAddress(address)) {
        showNotification('Invalid address', 'error');
        return;
    }
    
    const tags = prompt('Tags (comma-separated):');
    
    AppState.addressBook[address] = {
        name,
        tags: tags ? tags.split(',').map(t => t.trim()) : [],
        addedAt: Date.now()
    };
    
    localStorage.setItem('addressBook', JSON.stringify(AppState.addressBook));
    renderAddressBook();
    showNotification('Entry added', 'success');
}

function deleteAddressBookEntry(address) {
    if (!confirm('Really delete?')) return;
    delete AppState.addressBook[address];
    localStorage.setItem('addressBook', JSON.stringify(AppState.addressBook));
    renderAddressBook();
    showNotification('Entry deleted', 'success');
}

function loadAddressToPanel(address) {
    const type = address.startsWith('addr1w') || address.startsWith('addr_test1w') ? 'contract' : 'wallet';
    
    if (type === 'wallet') {
        addWalletPanel();
        const panel = walletPanels[walletPanels.length - 1];
        panel.address = address;
        savePanels();
        refreshWalletPanel(panel.id);
    } else {
        addContractPanel();
        const panel = contractPanels[contractPanels.length - 1];
        panel.address = address;
        savePanels();
        refreshContractPanel(panel.id);
    }
    
    closeModal();
    showNotification('Panel created', 'success');
}

// ==================== TAGS SYSTEM ====================

function addTagToPanel(panelId, tag) {
    if (!AppState.tags[panelId]) {
        AppState.tags[panelId] = [];
    }
    
    if (!AppState.tags[panelId].includes(tag)) {
        AppState.tags[panelId].push(tag);
        localStorage.setItem('tags', JSON.stringify(AppState.tags));
        updatePanelTags(panelId);
    }
}

function removeTagFromPanel(panelId, tag) {
    if (AppState.tags[panelId]) {
        AppState.tags[panelId] = AppState.tags[panelId].filter(t => t !== tag);
        localStorage.setItem('tags', JSON.stringify(AppState.tags));
        updatePanelTags(panelId);
    }
}

function renderPanelTags(panelId) {
    // Tags werden jetzt im Panel-Content gerendert, nicht im Header
    // Diese Funktion wird von updatePanelTags aufgerufen
}

function updatePanelTags(panelId) {
    const tags = AppState.tags[panelId] || [];
    const contentDiv = document.getElementById(`${panelId}-content`);
    if (!contentDiv) return;
    
    // Suche oder erstelle Tags-Container
    let tagsContainer = contentDiv.querySelector('.panel-tags-inline');
    if (!tagsContainer) {
        tagsContainer = document.createElement('div');
        tagsContainer.className = 'panel-tags-inline';
        // Insert as first child of content
        contentDiv.insertBefore(tagsContainer, contentDiv.firstChild);
    }
    
    tagsContainer.innerHTML = `
        <div class="tags-display">
            ${tags.length > 0 ? tags.map(tag => `
                <span class="tag-inline" onclick="removeTagFromPanel('${panelId}', '${tag}')">
                    ${tag} <span class="tag-remove">×</span>
                </span>
            `).join('') : ''}
            <button class="tag-add-inline" onclick="promptAddTagInline('${panelId}')" title="Add tag">+ Tag</button>
        </div>
    `;
}

function promptAddTagInline(panelId) {
    const tag = prompt('Add tag:');
    if (tag && tag.trim()) {
        addTagToPanel(panelId, tag.trim());
    }
}



// ==================== NOTES SYSTEM ====================

function addNoteToPanel(panelId) {
    const note = prompt('Notiz:');
    if (note) {
        AppState.notes[panelId] = note;
        localStorage.setItem('notes', JSON.stringify(AppState.notes));
        showNotification('Note saved', 'success');
    }
}

function showPanelNote(panelId) {
    const note = AppState.notes[panelId];
    if (note) {
        alert(`Notiz:\n\n${note}`);
    } else {
        addNoteToPanel(panelId);
    }
}

// ==================== ALERTS SYSTEM ====================

function openAlertsManager() {
    const modal = createModal('Alert Manager', `
        <div class="alerts-manager">
            <button onclick="createNewAlert()" class="btn-primary">+ Neuer Alert</button>
            <div id="alertsList" class="alerts-list"></div>
        </div>
    `);
    
    renderAlerts();
}

function renderAlerts() {
    const list = document.getElementById('alertsList');
    if (!list) return;
    
    if (AppState.alerts.length === 0) {
        list.innerHTML = '<div class="empty-state-small">No alerts</div>';
        return;
    }
    
    list.innerHTML = AppState.alerts.map((alert, index) => `
        <div class="alert-item">
            <div class="alert-info">
                <strong>${alert.name}</strong>
                <div class="alert-condition">${alert.condition}</div>
            </div>
            <button onclick="deleteAlert(${index})" class="icon-btn-small">🗑️</button>
        </div>
    `).join('');
}

function createNewAlert() {
    const name = prompt('Alert Name:');
    if (!name) return;
    
    const address = prompt('Adresse:');
    if (!address) return;
    
    const condition = prompt('Condition (e.g. "balance > 1000"):');
    if (!condition) return;
    
    AppState.alerts.push({
        name,
        address,
        condition,
        createdAt: Date.now()
    });
    
    localStorage.setItem('alerts', JSON.stringify(AppState.alerts));
    renderAlerts();
    showNotification('Alert created', 'success');
}

function deleteAlert(index) {
    AppState.alerts.splice(index, 1);
    localStorage.setItem('alerts', JSON.stringify(AppState.alerts));
    renderAlerts();
}

// ==================== GLOBAL SEARCH ====================

function handleGlobalSearch(event) {
    const query = event.target.value.trim();
    
    if (event.key === 'Enter' && query) {
        performGlobalSearch(query);
    }
}

async function performGlobalSearch(query) {
    showNotification('Suche...', 'info');
    
    // TX Hash?
    if (query.length === 64) {
        try {
            const tx = await blockfrostRequest(`/txs/${query}`);
            showTxDetails(query);
            return;
        } catch (e) {
            // Nicht gefunden
        }
    }
    
    // Adresse?
    if (isValidCardanoAddress(query)) {
        const type = query.includes('w') ? 'contract' : 'wallet';
        
        if (type === 'wallet') {
            addWalletPanel();
            const panel = walletPanels[walletPanels.length - 1];
            panel.address = query;
            savePanels();
            await refreshWalletPanel(panel.id);
        } else {
            addContractPanel();
            const panel = contractPanels[contractPanels.length - 1];
            panel.address = query;
            savePanels();
            await refreshContractPanel(panel.id);
        }
        
        showNotification('Panel created', 'success');
        document.getElementById('globalSearch').value = '';
        return;
    }
    
    showNotification('Nothing found', 'error');
}

// ==================== SETTINGS ====================

function openSettings() {
    const modal = createModal('Settings', `
        <div class="settings-panel">
            <div class="setting-item">
                <label>Auto-Refresh Interval (seconds)</label>
                <input type="number" id="settingAutoRefresh" value="${AppState.settings.autoRefresh}" min="10" max="300">
            </div>
            
            <div class="setting-item">
                <label>
                    <input type="checkbox" id="settingNotifications" ${AppState.settings.notifications ? 'checked' : ''}>
                    Enable Desktop Notifications
                </label>
            </div>
            
            <div class="setting-item">
                <label>
                    <input type="checkbox" id="settingSound" ${AppState.settings.sound ? 'checked' : ''}>
                    Enable Sound Effects
                </label>
            </div>
            
            <div class="setting-item">
                <label>API Key Management</label>
                <button onclick="openApiKeyManager()" class="btn-secondary">Manage API Keys</button>
            </div>
            
            <div class="setting-actions">
                <button onclick="saveSettings()" class="btn-primary">Save</button>
                <button onclick="exportAllData()" class="btn-secondary">Export All Data</button>
                <button onclick="importData()" class="btn-secondary">Import Data</button>
            </div>
        </div>
    `);
}

function saveSettings() {
    AppState.settings.autoRefresh = parseInt(document.getElementById('settingAutoRefresh').value);
    AppState.settings.notifications = document.getElementById('settingNotifications').checked;
    AppState.settings.sound = document.getElementById('settingSound').checked;
    
    localStorage.setItem('settings', JSON.stringify(AppState.settings));
    
    // Restart auto-refresh mit neuem Interval
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
    startAutoRefresh();
    
    // Request notification permission
    if (AppState.settings.notifications && Notification.permission === 'default') {
        Notification.requestPermission();
    }
    
    closeModal();
    showNotification('Settings saved', 'success');
}

// ==================== NOTIFICATIONS ====================

function sendDesktopNotification(title, body, icon = '₳') {
    if (!AppState.settings.notifications) return;
    
    if (Notification.permission === 'granted') {
        new Notification(title, {
            body,
            icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="75" font-size="75">₳</text></svg>'
        });
    }
}

function playSound(type = 'success') {
    if (!AppState.settings.sound) return;
    
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    if (type === 'success') {
        oscillator.frequency.value = 800;
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    } else if (type === 'error') {
        oscillator.frequency.value = 200;
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    }
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
}

// ==================== PRICE TRACKING ====================

async function fetchAdaPrice() {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=cardano&vs_currencies=usd');
        const data = await response.json();
        AppState.adaPrice = data.cardano.usd;
        
        const priceEl = document.getElementById('adaPrice');
        if (priceEl) {
            priceEl.textContent = `$${AppState.adaPrice.toFixed(4)}`;
        }
    } catch (error) {
        console.error('Price fetch error:', error);
    }
}

// ==================== NETWORK STATS ====================

async function updateNetworkStats() {
    try {
        const latestBlock = await blockfrostRequest('/blocks/latest');
        const prevBlock = await blockfrostRequest(`/blocks/${latestBlock.height - 1}`);
        
        // Block Time
        const blockTime = latestBlock.time - prevBlock.time;
        AppState.lastBlockTime = blockTime;
        
        const blockTimeEl = document.getElementById('blockTime');
        if (blockTimeEl) {
            blockTimeEl.textContent = `${blockTime}s`;
        }
        
        // TPS (approximation)
        const txCount = latestBlock.tx_count || 0;
        AppState.tps = (txCount / blockTime).toFixed(1);
        
        const tpsEl = document.getElementById('tps');
        if (tpsEl) {
            tpsEl.textContent = AppState.tps;
        }
    } catch (error) {
        console.error('Network stats error:', error);
    }
}

// ==================== EXPORT / IMPORT ====================

function exportAllData() {
    const data = {
        version: '2.0',
        exportedAt: new Date().toISOString(),
        wallets: walletPanels,
        contracts: contractPanels,
        addressBook: AppState.addressBook,
        tags: AppState.tags,
        alerts: AppState.alerts,
        notes: AppState.notes,
        settings: AppState.settings
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cardano-dashboard-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showNotification('Backup created', 'success');
}

function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            if (confirm('Alle aktuellen Daten werden überschrieben. Fortfahren?')) {
                // Restore data
                walletPanels = data.wallets || [];
                contractPanels = data.contracts || [];
                AppState.addressBook = data.addressBook || {};
                AppState.tags = data.tags || {};
                AppState.alerts = data.alerts || [];
                AppState.notes = data.notes || {};
                AppState.settings = data.settings || AppState.settings;
                
                // Save to localStorage
                savePanels();
                localStorage.setItem('addressBook', JSON.stringify(AppState.addressBook));
                localStorage.setItem('tags', JSON.stringify(AppState.tags));
                localStorage.setItem('alerts', JSON.stringify(AppState.alerts));
                localStorage.setItem('notes', JSON.stringify(AppState.notes));
                localStorage.setItem('settings', JSON.stringify(AppState.settings));
                
                // Reload page
                location.reload();
            }
        } catch (error) {
            showNotification('Import failed: ' + error.message, 'error');
        }
    };
    
    input.click();
}

// ==================== QR CODE GENERATOR ====================

function generateQRCode(address) {
    const modal = createModal('QR Code', `
        <div class="qr-container">
            <div id="qrcode"></div>
            <div class="qr-address">${address}</div>
            <button onclick="copyToClipboard('${address}')" class="btn-primary">Copy Address</button>
        </div>
    `);
    
    // Simple QR code using API
    const qrDiv = document.getElementById('qrcode');
    const img = document.createElement('img');
    img.src = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${address}`;
    img.style.width = '300px';
    img.style.height = '300px';
    qrDiv.appendChild(img);
}

// ==================== CLIPBOARD ====================

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showNotification('In Zwischenablage kopiert', 'success');
        playSound('success');
    }).catch(err => {
        showNotification('Copy failed', 'error');
    });
}

// ==================== MODAL HELPER ====================

function createModal(title, content) {
    const container = document.getElementById('modalContainer');
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>${title}</h3>
                <button class="close-modal" onclick="closeModal()">×</button>
            </div>
            <div class="modal-body">
                ${content}
            </div>
        </div>
    `;
    
    container.innerHTML = '';
    container.appendChild(modal);
    
    return modal;
}

function closeModal() {
    const container = document.getElementById('modalContainer');
    container.innerHTML = '';
}

// ==================== DRAG & DROP PANELS ====================

let draggedPanel = null;

function makePanelDraggable(panelElement) {
    panelElement.draggable = true;
    
    panelElement.addEventListener('dragstart', (e) => {
        draggedPanel = panelElement;
        panelElement.style.opacity = '0.5';
    });
    
    panelElement.addEventListener('dragend', (e) => {
        panelElement.style.opacity = '1';
        draggedPanel = null;
    });
    
    panelElement.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (draggedPanel && draggedPanel !== panelElement) {
            const grid = panelElement.parentElement;
            const afterElement = getDragAfterElement(grid, e.clientY);
            
            if (afterElement == null) {
                grid.appendChild(draggedPanel);
            } else {
                grid.insertBefore(draggedPanel, afterElement);
            }
        }
    });
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.panel:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// ==================== TRANSACTION FILTER ====================

function openTransactionFilter(panelId) {
    const modal = createModal('Transaction Filter', `
        <div class="tx-filter">
            <div class="filter-group">
                <label>Von Datum:</label>
                <input type="date" id="filterDateFrom">
            </div>
            <div class="filter-group">
                <label>Bis Datum:</label>
                <input type="date" id="filterDateTo">
            </div>
            <div class="filter-group">
                <label>Min. Betrag (ADA):</label>
                <input type="number" id="filterMinAmount" step="0.01">
            </div>
            <div class="filter-group">
                <label>Max. Betrag (ADA):</label>
                <input type="number" id="filterMaxAmount" step="0.01">
            </div>
            <div class="filter-group">
                <label>Typ:</label>
                <select id="filterType">
                    <option value="">Alle</option>
                    <option value="incoming">Eingehend</option>
                    <option value="outgoing">Ausgehend</option>
                </select>
            </div>
            <button onclick="applyTransactionFilter('${panelId}')" class="btn-primary">Filter anwenden</button>
            <button onclick="exportFilteredTransactions('${panelId}')" class="btn-secondary">Als CSV exportieren</button>
        </div>
    `);
}

async function exportFilteredTransactions(panelId) {
    const panel = [...walletPanels, ...contractPanels].find(p => p.id === panelId);
    if (!panel || !panel.address) return;
    
    showNotification('Exportiere Transaktionen...', 'info');
    
    try {
        const transactions = await blockfrostRequest(`/addresses/${panel.address}/transactions?count=100&order=desc`);
        
        let csv = 'Datum,Hash,Typ,Betrag (ADA),Block\n';
        
        for (const tx of transactions) {
            const txDetails = await blockfrostRequest(`/txs/${tx.tx_hash}`);
            const date = new Date(txDetails.block_time * 1000).toISOString();
            csv += `${date},${tx.tx_hash},Transaction,0,${txDetails.block_height}\n`;
        }
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transactions-${formatAddress(panel.address)}-${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        
        showNotification('CSV exported', 'success');
    } catch (error) {
        showNotification('Export failed', 'error');
    }
}

// ==================== STAKING INFO ====================

async function loadStakingInfo(address) {
    try {
        const account = await blockfrostRequest(`/addresses/${address}/total`);
        
        if (account.stake_address) {
            const stakeInfo = await blockfrostRequest(`/accounts/${account.stake_address}`);
            
            return {
                stakeAddress: account.stake_address,
                controlled: parseInt(stakeInfo.controlled_amount) / 1000000,
                rewards: parseInt(stakeInfo.rewards_sum) / 1000000,
                withdrawals: parseInt(stakeInfo.withdrawals_sum) / 1000000,
                poolId: stakeInfo.pool_id
            };
        }
    } catch (error) {
        console.error('Staking info error:', error);
    }
    
    return null;
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    applyTheme();
    fetchAdaPrice();
    updateNetworkStats();
    
    // Update price every 5 minutes
    setInterval(fetchAdaPrice, 300000);
    
    // Update network stats every 30 seconds
    setInterval(updateNetworkStats, 30000);
});


// ==================== API KEY MANAGEMENT ====================

function openApiKeyManager() {
    const hasCustomKeys = Object.keys(AppState.apiKeys).length > 0;
    
    const modal = createModal('API Key Management', `
        <div class="api-key-manager">
            <div class="api-key-info">
                <p style="color: rgba(255, 255, 255, 0.7); font-size: 13px; margin-bottom: 20px;">
                    Configure your own API keys. Keys are stored locally in your browser.
                    ${!hasCustomKeys ? '<br><strong>Note:</strong> Default keys are provided. Add your own for better rate limits.' : ''}
                </p>
            </div>
            
            <div class="api-key-section">
                <h4>Blockfrost API</h4>
                <div class="api-key-item">
                    <label>Preprod API Key</label>
                    <input type="password" id="apiKeyBlockfrostPreprod" 
                           value="${AppState.apiKeys.blockfrostPreprod || ''}" 
                           placeholder="${AppState.apiKeys.blockfrostPreprod ? '' : 'Using default key - enter your own'}" 
                           class="api-key-input">
                    <button onclick="toggleApiKeyVisibility('apiKeyBlockfrostPreprod')" class="btn-icon">◉</button>
                </div>
                <div class="api-key-item">
                    <label>Mainnet API Key</label>
                    <input type="password" id="apiKeyBlockfrostMainnet" 
                           value="${AppState.apiKeys.blockfrostMainnet || ''}" 
                           placeholder="${AppState.apiKeys.blockfrostMainnet ? '' : 'Using default key - enter your own'}" 
                           class="api-key-input">
                    <button onclick="toggleApiKeyVisibility('apiKeyBlockfrostMainnet')" class="btn-icon">◉</button>
                </div>
                <a href="https://blockfrost.io" target="_blank" class="api-link">Get Blockfrost API Key →</a>
            </div>
            
            <div class="api-key-section">
                <h4>Ogmios API</h4>
                <div class="api-key-item">
                    <label>API Key</label>
                    <input type="password" id="apiKeyOgmios" 
                           value="${AppState.apiKeys.ogmios || ''}" 
                           placeholder="${AppState.apiKeys.ogmios ? '' : 'Using default key - enter your own'}" 
                           class="api-key-input">
                    <button onclick="toggleApiKeyVisibility('apiKeyOgmios')" class="btn-icon">◉</button>
                </div>
            </div>
            
            <div class="api-key-section">
                <h4>Kupo API</h4>
                <div class="api-key-item">
                    <label>API Key</label>
                    <input type="password" id="apiKeyKupo" 
                           value="${AppState.apiKeys.kupo || ''}" 
                           placeholder="${AppState.apiKeys.kupo ? '' : 'Using default key - enter your own'}" 
                           class="api-key-input">
                    <button onclick="toggleApiKeyVisibility('apiKeyKupo')" class="btn-icon">◉</button>
                </div>
            </div>
            
            <div class="api-key-actions">
                <button onclick="saveApiKeys()" class="btn-primary">Save API Keys</button>
                ${hasCustomKeys ? '<button onclick="clearCustomApiKeys()" class="btn-secondary">Clear Custom Keys</button>' : ''}
                <button onclick="testApiKeys()" class="btn-secondary">Test Connection</button>
            </div>
        </div>
    `);
}

function toggleApiKeyVisibility(inputId) {
    const input = document.getElementById(inputId);
    if (input.type === 'password') {
        input.type = 'text';
    } else {
        input.type = 'password';
    }
}

function saveApiKeys() {
    // Get values from inputs
    const blockfrostPreprod = document.getElementById('apiKeyBlockfrostPreprod').value.trim();
    const blockfrostMainnet = document.getElementById('apiKeyBlockfrostMainnet').value.trim();
    const ogmios = document.getElementById('apiKeyOgmios').value.trim();
    const kupo = document.getElementById('apiKeyKupo').value.trim();
    
    // Save to AppState
    AppState.apiKeys = {
        blockfrostPreprod,
        blockfrostMainnet,
        ogmios,
        kupo
    };
    
    // Save to localStorage
    localStorage.setItem('apiKeys', JSON.stringify(AppState.apiKeys));
    
    // Update CONFIG
    if (blockfrostPreprod) CONFIG.blockfrost.preprod.apiKey = blockfrostPreprod;
    if (blockfrostMainnet) CONFIG.blockfrost.mainnet.apiKey = blockfrostMainnet;
    if (ogmios) CONFIG.ogmios.apiKey = ogmios;
    if (kupo) CONFIG.kupo.apiKey = kupo;
    
    closeModal();
    showNotification('API Keys saved successfully', 'success');
}

function resetApiKeys() {
    if (!confirm('Reset all API keys to default values?')) return;
    
    // Clear from localStorage
    localStorage.removeItem('apiKeys');
    AppState.apiKeys = {};
    
    // Reset inputs to default
    document.getElementById('apiKeyBlockfrostPreprod').value = 'preprodBK8iIIEzfXrzt1tTkhGcbmLNCbRNQnMx';
    document.getElementById('apiKeyBlockfrostMainnet').value = 'mainnetO1cG3YdwVUoEApkUqh9us0SQTguhmjoV';
    document.getElementById('apiKeyOgmios').value = 'ogmios1phe89589psdxsg00kh8';
    document.getElementById('apiKeyKupo').value = 'kupo1gnldyu3nnsu25pea823';
    
    showNotification('API Keys reset to default', 'success');
}

async function testApiKeys() {
    showNotification('Testing API connection...', 'info');
    
    try {
        // Test Blockfrost
        const response = await fetch(`${CONFIG.blockfrost[CONFIG.activeNetwork].url}/health`, {
            headers: {
                'project_id': CONFIG.blockfrost[CONFIG.activeNetwork].apiKey
            }
        });
        
        if (response.ok) {
            showNotification('✓ API connection successful', 'success');
            playSound('success');
        } else {
            showNotification('× API connection failed: ' + response.status, 'error');
        }
    } catch (error) {
        showNotification('× API connection error: ' + error.message, 'error');
    }
}

// Load custom API keys on startup
function loadCustomApiKeys() {
    if (AppState.apiKeys.blockfrostPreprod) {
        CONFIG.blockfrost.preprod.apiKey = AppState.apiKeys.blockfrostPreprod;
    }
    if (AppState.apiKeys.blockfrostMainnet) {
        CONFIG.blockfrost.mainnet.apiKey = AppState.apiKeys.blockfrostMainnet;
    }
    if (AppState.apiKeys.ogmios) {
        CONFIG.ogmios.apiKey = AppState.apiKeys.ogmios;
    }
    if (AppState.apiKeys.kupo) {
        CONFIG.kupo.apiKey = AppState.apiKeys.kupo;
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    loadCustomApiKeys();
});


// ==================== ENV IMPORT ====================

let envImportData = {
    addresses: [],
    selectedAddresses: new Set()
};

function openEnvImport() {
    const modal = createModal('Import from .env', `
        <div class="env-import-container">
            <div class="env-drop-zone" id="envDropZone">
                <div class="env-drop-icon">▼</div>
                <div class="env-drop-text">Drag & Drop .env file here</div>
                <div class="env-drop-subtext">or click to select file</div>
                <input type="file" id="envFileInput" accept=".env" style="display: none;">
            </div>
            
            <div id="envImportResults" style="display: none;">
                <div class="env-import-header">
                    <h4>Found Addresses</h4>
                    <label class="select-all-label">
                        <input type="checkbox" id="selectAllAddresses" onchange="toggleSelectAllAddresses()">
                        Select All
                    </label>
                </div>
                <div class="env-addresses-list" id="envAddressesList"></div>
                
                <div class="env-import-actions">
                    <button class="btn-secondary" onclick="closeModal()">Cancel</button>
                    <button class="btn-primary" onclick="importSelectedAddresses()" id="importBtn">
                        Import Selected (<span id="selectedCount">0</span>)
                    </button>
                </div>
            </div>
        </div>
    `);
    
    setupEnvDropZone();
}

function setupEnvDropZone() {
    const dropZone = document.getElementById('envDropZone');
    const fileInput = document.getElementById('envFileInput');
    
    dropZone.addEventListener('click', () => fileInput.click());
    
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });
    
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleEnvFile(files[0]);
        }
    });
    
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleEnvFile(e.target.files[0]);
        }
    });
}

async function handleEnvFile(file) {
    if (!file.name.endsWith('.env')) {
        showNotification('Please select a .env file', 'error');
        return;
    }
    
    try {
        const text = await file.text();
        const addresses = parseEnvFile(text);
        
        if (addresses.length === 0) {
            showNotification('No Cardano addresses found in file', 'warning');
            return;
        }
        
        envImportData.addresses = addresses;
        envImportData.selectedAddresses.clear();
        
        renderEnvAddressesList();
        
        document.getElementById('envDropZone').style.display = 'none';
        document.getElementById('envImportResults').style.display = 'block';
        
        showNotification(`Found ${addresses.length} address${addresses.length > 1 ? 'es' : ''}`, 'success');
    } catch (error) {
        showNotification('Error reading file: ' + error.message, 'error');
    }
}

function parseEnvFile(content) {
    const addresses = [];
    const lines = content.split('\n');
    
    // Get all existing addresses for duplicate detection
    const existingAddresses = new Set([
        ...walletPanels.map(p => p.address).filter(Boolean),
        ...contractPanels.map(p => p.address).filter(Boolean),
        ...poolPanels.map(p => p.poolId).filter(Boolean)
    ]);
    
    for (const line of lines) {
        const trimmed = line.trim();
        
        // Skip comments and empty lines
        if (!trimmed || trimmed.startsWith('#')) continue;
        
        // Parse KEY=VALUE format
        const equalIndex = trimmed.indexOf('=');
        if (equalIndex === -1) continue;
        
        const key = trimmed.substring(0, equalIndex).trim();
        let value = trimmed.substring(equalIndex + 1).trim();
        
        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        
        // Detect address type
        const addressInfo = detectAddressType(value);
        if (addressInfo) {
            addresses.push({
                key: key,
                address: value,
                type: addressInfo.type,
                typeLabel: addressInfo.label,
                icon: addressInfo.icon,
                isDuplicate: existingAddresses.has(value)
            });
        }
    }
    
    return addresses;
}

function detectAddressType(address) {
    // Wallet addresses
    if (address.startsWith('addr1') && !address.startsWith('addr1w')) {
        return { type: 'wallet', label: 'Wallet', icon: '♦' };
    }
    if (address.startsWith('addr_test1') && !address.startsWith('addr_test1w')) {
        return { type: 'wallet', label: 'Wallet (Testnet)', icon: '♦' };
    }
    
    // Contract addresses (script addresses contain 'w')
    if (address.startsWith('addr1w')) {
        return { type: 'contract', label: 'Smart Contract', icon: '◎' };
    }
    if (address.startsWith('addr_test1w')) {
        return { type: 'contract', label: 'Contract (Testnet)', icon: '◎' };
    }
    
    // Pool addresses
    if (address.startsWith('pool1')) {
        return { type: 'pool', label: 'Stake Pool', icon: '◉' };
    }
    
    // Stake addresses
    if (address.startsWith('stake1')) {
        return { type: 'stake', label: 'Staking', icon: '⊙' };
    }
    if (address.startsWith('stake_test1')) {
        return { type: 'stake', label: 'Staking (Testnet)', icon: '⊙' };
    }
    
    return null;
}

function renderEnvAddressesList() {
    const listContainer = document.getElementById('envAddressesList');
    
    if (envImportData.addresses.length === 0) {
        listContainer.innerHTML = '<div class="env-empty-state">No addresses found</div>';
        return;
    }
    
    listContainer.innerHTML = envImportData.addresses.map((item, index) => `
        <div class="env-address-item ${item.isDuplicate ? 'duplicate' : ''}" data-index="${index}">
            <input type="checkbox" 
                   class="env-address-checkbox" 
                   ${item.isDuplicate ? 'disabled' : ''}
                   ${envImportData.selectedAddresses.has(index) ? 'checked' : ''}
                   onchange="toggleAddressSelection(${index})">
            <div class="env-address-icon">${item.icon}</div>
            <div class="env-address-info">
                <div class="env-address-value">${formatAddress(item.address)}</div>
                <div class="env-address-meta">
                    <span class="env-address-type">${item.typeLabel}</span>
                    <span class="env-address-var">${item.key}</span>
                    ${item.isDuplicate ? '<span class="env-address-duplicate">Already imported</span>' : ''}
                </div>
            </div>
        </div>
    `).join('');
    
    updateSelectedCount();
}

function toggleAddressSelection(index) {
    if (envImportData.selectedAddresses.has(index)) {
        envImportData.selectedAddresses.delete(index);
    } else {
        envImportData.selectedAddresses.add(index);
    }
    updateSelectedCount();
}

function toggleSelectAllAddresses() {
    const checkbox = document.getElementById('selectAllAddresses');
    const isChecked = checkbox.checked;
    
    if (isChecked) {
        // Select all non-duplicate addresses
        envImportData.addresses.forEach((item, index) => {
            if (!item.isDuplicate) {
                envImportData.selectedAddresses.add(index);
            }
        });
    } else {
        envImportData.selectedAddresses.clear();
    }
    
    renderEnvAddressesList();
}

function updateSelectedCount() {
    const count = envImportData.selectedAddresses.size;
    document.getElementById('selectedCount').textContent = count;
    document.getElementById('importBtn').disabled = count === 0;
}

function importSelectedAddresses() {
    const selectedIndices = Array.from(envImportData.selectedAddresses);
    let importedCount = 0;
    
    selectedIndices.forEach(index => {
        const item = envImportData.addresses[index];
        
        switch (item.type) {
            case 'wallet':
            case 'stake':
                addWalletPanel();
                const walletPanel = walletPanels[walletPanels.length - 1];
                walletPanel.address = item.address;
                savePanels();
                refreshWalletPanel(walletPanel.id);
                importedCount++;
                break;
                
            case 'contract':
                addContractPanel();
                const contractPanel = contractPanels[contractPanels.length - 1];
                contractPanel.address = item.address;
                savePanels();
                refreshContractPanel(contractPanel.id);
                importedCount++;
                break;
                
            case 'pool':
                addPoolPanel();
                const poolPanel = poolPanels[poolPanels.length - 1];
                poolPanel.poolId = item.address;
                savePanels();
                refreshPoolPanel(poolPanel.id);
                importedCount++;
                break;
        }
    });
    
    closeModal();
    showNotification(`Imported ${importedCount} address${importedCount > 1 ? 'es' : ''}`, 'success');
    
    // Reset data
    envImportData.addresses = [];
    envImportData.selectedAddresses.clear();
}
