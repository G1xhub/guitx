// Globale Variablen
let walletPanels = [];
let contractPanels = [];
let poolPanels = [];
let panelIdCounter = 0;
let refreshInterval = null;

// Initialisierung
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    startAutoRefresh();
    updateNetworkStatus();
    
    // Lade gespeicherte Panels
    loadSavedPanels();
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

// Netzwerk wechseln
function switchNetwork(network) {
    CONFIG.activeNetwork = network;
    updateNetworkStatus();
    
    // Alle Panels neu laden
    walletPanels.forEach(panel => refreshWalletPanel(panel.id));
    contractPanels.forEach(panel => refreshContractPanel(panel.id));
    updateBlockchainInfo();
    
    showNotification(`Zu ${network} gewechselt`, 'success');
}

function updateNetworkStatus() {
    const network = CONFIG.activeNetwork === 'preprod' ? 'Preprod' : 'Mainnet';
    document.getElementById('networkStatus').textContent = `${network} Connected`;
    
    // Update Button-Styles
    document.getElementById('btnPreprod').classList.toggle('active', CONFIG.activeNetwork === 'preprod');
    document.getElementById('btnMainnet').classList.toggle('active', CONFIG.activeNetwork === 'mainnet');
}

// ==================== WALLET PANELS ====================

function addWalletPanel() {
    const panelId = `wallet-${panelIdCounter++}`;
    const panel = {
        id: panelId,
        type: 'wallet',
        address: null
    };
    
    walletPanels.push(panel);
    renderWalletPanel(panel);
    savePanels();
}

function renderWalletPanel(panel) {
    const grid = document.getElementById('walletsGrid');
    const panelHtml = `
        <div class="panel wallet-panel" id="${panel.id}" data-panel-id="${panel.id}">
            <div class="panel-header">
                <h3>Wallet</h3>
                <div class="panel-tags" id="${panel.id}-tags"></div>
                <div class="panel-actions">
                    <button class="icon-btn" onclick="openUTXOVisualizer('${panel.address || ''}')" title="UTXO Visualizer">◉</button>
                    <button class="icon-btn" onclick="openTransactionFilter('${panel.id}')" title="Filter">⚡</button>
                    <button class="icon-btn" onclick="showPanelNote('${panel.id}')" title="Note">✎</button>
                    <button class="icon-btn" onclick="generateQRCode('${panel.address || ''}')" title="QR Code">⊡</button>
                    <button class="icon-btn" onclick="refreshWalletPanel('${panel.id}')" title="Refresh">↻</button>
                    <button class="icon-btn" onclick="exportPanelData('${panel.id}')" title="Export">↓</button>
                    <button class="icon-btn close-btn" onclick="removePanel('${panel.id}')" title="Remove">×</button>
                </div>
            </div>
            
            <div class="address-input-container">
                <input type="text" class="address-input" 
                       placeholder="addr1... oder addr_test1..." 
                       onchange="setWalletPanelAddress('${panel.id}', this.value)"
                       value="${panel.address || ''}">
            </div>
            
            <div class="panel-content" id="${panel.id}-content">
                <div class="loading-message">Adresse eingeben...</div>
            </div>
        </div>
    `;
    
    grid.insertAdjacentHTML('beforeend', panelHtml);
    
    // Make draggable
    const panelElement = document.getElementById(panel.id);
    makePanelDraggable(panelElement);
    
    if (panel.address) {
        refreshWalletPanel(panel.id);
    } else {
        // Render tags even if no address yet
        updatePanelTags(panel.id);
    }
}

async function setWalletPanelAddress(panelId, address) {
    if (!address || address.trim() === '') return;
    
    address = address.trim();
    
    if (!isValidCardanoAddress(address)) {
        showNotification('Ungültige Wallet-Adresse', 'error');
        return;
    }
    
    const panel = walletPanels.find(p => p.id === panelId);
    if (panel) {
        panel.address = address;
        savePanels();
        await refreshWalletPanel(panelId);
        updateSectionStatusIndicators();
    }
}

async function refreshWalletPanel(panelId) {
    const panel = walletPanels.find(p => p.id === panelId);
    if (!panel || !panel.address) return;
    
    const contentDiv = document.getElementById(`${panelId}-content`);
    
    // Loading-Overlay statt Content zu ersetzen
    let loadingOverlay = contentDiv.querySelector('.loading-overlay');
    if (!loadingOverlay) {
        loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'loading-overlay';
        loadingOverlay.innerHTML = '<div class="loading-spinner">↻</div>';
        contentDiv.appendChild(loadingOverlay);
    }
    loadingOverlay.style.display = 'flex';
    
    try {
        const addressInfo = await blockfrostRequest(`/addresses/${panel.address}`);
        
        // Balance
        const balanceADA = addressInfo.amount && addressInfo.amount.length > 0 
            ? parseInt(addressInfo.amount[0].quantity) / 1000000 
            : 0;
        
        // Tokens/NFTs
        const tokens = addressInfo.amount ? addressInfo.amount.slice(1) : [];
        
        // Transaktionen
        let transactions = [];
        try {
            transactions = await blockfrostRequest(`/addresses/${panel.address}/transactions?count=5&order=desc`);
        } catch (e) {
            console.log('Keine Transaktionen');
        }
        
        // UTXOs
        let utxos = [];
        try {
            utxos = await blockfrostRequest(`/addresses/${panel.address}/utxos`);
        } catch (e) {
            console.log('Keine UTXOs');
        }
        
        // Pending
        let pendingCount = 0;
        try {
            const mempool = await blockfrostRequest(`/mempool/addresses/${panel.address}`);
            pendingCount = mempool.length;
        } catch (e) {
            // Kein Mempool
        }
        
        // Staking Info (optional)
        let stakingInfo = null;
        try {
            stakingInfo = await loadStakingInfo(panel.address);
        } catch (e) {
            console.log('Keine Staking Info verfügbar');
        }
        
        // Entferne Loading-Overlay
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
        
        // Render Content
        contentDiv.innerHTML = `
            <div class="panel-tags-inline"></div>
            <div class="address-display-small">${formatAddress(panel.address)}</div>
            
            <div class="balance-card-compact">
                <div class="balance-amount-compact">
                    <span class="amount">${balanceADA.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    <span class="currency">₳</span>
                </div>
            </div>
            
            <div class="stats-row">
                <div class="stat-compact">
                    <div class="stat-label">Transactions</div>
                    <div class="stat-value">${addressInfo.tx_count || 0}</div>
                </div>
                <div class="stat-compact">
                    <div class="stat-label">UTXOs</div>
                    <div class="stat-value">${utxos.length}</div>
                </div>
                <div class="stat-compact">
                    <div class="stat-label">Pending</div>
                    <div class="stat-value pending">${pendingCount}</div>
                </div>
                <div class="stat-compact">
                    <div class="stat-label">Assets</div>
                    <div class="stat-value">${tokens.length}</div>
                </div>
            </div>
            
            ${stakingInfo ? `
                <div class="staking-section">
                    <div class="section-title">Staking</div>
                    <div class="staking-info">
                        <div class="staking-item">
                            <span class="staking-label">Delegiert:</span>
                            <span class="staking-value">${stakingInfo.controlled.toFixed(2)} ₳</span>
                        </div>
                        <div class="staking-item">
                            <span class="staking-label">Rewards:</span>
                            <span class="staking-value">${stakingInfo.rewards.toFixed(2)} ₳</span>
                        </div>
                        ${stakingInfo.poolId ? `<div class="staking-pool">Pool: ${stakingInfo.poolId.substring(0, 12)}...</div>` : ''}
                    </div>
                </div>
            ` : ''}
            
            ${tokens.length > 0 ? `
                <div class="tokens-section">
                    <div class="section-title">Assets</div>
                    <div class="tokens-list">
                        ${tokens.slice(0, 3).map(token => `
                            <div class="token-item">
                                <span class="token-name">${formatTokenName(token.unit)}</span>
                                <span class="token-amount">${formatTokenAmount(token.quantity)}</span>
                            </div>
                        `).join('')}
                        ${tokens.length > 3 ? `<div class="token-more">+${tokens.length - 3} mehr</div>` : ''}
                    </div>
                </div>
            ` : ''}
            
            <div class="transactions-section">
                <div class="section-title">Recent Transactions</div>
                <div class="transactions-compact">
                    ${await renderWalletTransactions(panel.address, transactions)}
                </div>
            </div>
        `;
        
        // Update tags after rendering content
        updatePanelTags(panel.id);
        
    } catch (error) {
        console.error('Wallet-Panel-Fehler:', error);
        
        // Entferne Loading-Overlay
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
        
        if (error.message.includes('404') || error.message.includes('not found')) {
            contentDiv.innerHTML = `
                <div class="panel-tags-inline"></div>
                <div class="address-display-small">${formatAddress(panel.address)}</div>
                <div class="empty-state">
                    <div class="empty-icon">○</div>
                    <div class="empty-text">New Wallet</div>
                    <div class="empty-subtext">No activity yet</div>
                </div>
            `;
            updatePanelTags(panel.id);
        } else {
            contentDiv.innerHTML = `<div class="error-message">❌ ${error.message}</div>`;
        }
    }
}

async function renderWalletTransactions(address, txHashes) {
    if (!txHashes || txHashes.length === 0) {
        return '<div class="loading-message">Keine Transaktionen</div>';
    }
    
    const txElements = [];
    const displayCount = Math.min(txHashes.length, 5);
    
    for (const txHash of txHashes.slice(0, displayCount)) {
        try {
            const txDetails = await blockfrostRequest(`/txs/${txHash.tx_hash}`);
            const utxos = await blockfrostRequest(`/txs/${txHash.tx_hash}/utxos`);
            
            let netAmount = 0;
            utxos.outputs.forEach(output => {
                if (output.address === address) {
                    netAmount += parseInt(output.amount[0].quantity);
                }
            });
            utxos.inputs.forEach(input => {
                if (input.address === address) {
                    netAmount -= parseInt(input.amount[0].quantity);
                }
            });
            
            const netAmountADA = netAmount / 1000000;
            const isPositive = netAmount > 0;
            const timeAgo = getTimeAgo(txDetails.block_time);
            
            txElements.push(`
                <div class="tx-item-compact" onclick="showTxDetails('${txHash.tx_hash}')">
                    <div class="tx-icon-compact">${isPositive ? '↓' : '↑'}</div>
                    <div class="tx-info">
                        <div class="tx-hash-compact">${formatTxHash(txHash.tx_hash)}</div>
                        <div class="tx-time-compact">${timeAgo}</div>
                    </div>
                    <div class="tx-amount-compact" style="color: ${isPositive ? '#00ff88' : '#ff6b6b'}">
                        ${isPositive ? '+' : ''}${netAmountADA.toFixed(2)} ₳
                    </div>
                </div>
            `);
        } catch (e) {
            console.error('TX-Fehler:', e);
        }
    }
    
    return txElements.length > 0 ? txElements.join('') : '<div class="loading-message">Keine Transaktionen</div>';
}

// ==================== CONTRACT PANELS ====================

function addContractPanel() {
    const panelId = `contract-${panelIdCounter++}`;
    const panel = {
        id: panelId,
        type: 'contract',
        address: null
    };
    
    contractPanels.push(panel);
    renderContractPanel(panel);
    savePanels();
}

function renderContractPanel(panel) {
    const grid = document.getElementById('contractsGrid');
    const panelHtml = `
        <div class="panel contract-panel" id="${panel.id}" data-panel-id="${panel.id}">
            <div class="panel-header">
                <h3>Smart Contract</h3>
                <div class="panel-tags" id="${panel.id}-tags"></div>
                <div class="panel-actions">
                    <button class="icon-btn" onclick="openTransactionFilter('${panel.id}')" title="Filter">⚡</button>
                    <button class="icon-btn" onclick="showPanelNote('${panel.id}')" title="Note">✎</button>
                    <button class="icon-btn" onclick="generateQRCode('${panel.address || ''}')" title="QR Code">⊡</button>
                    <button class="icon-btn" onclick="refreshContractPanel('${panel.id}')" title="Refresh">↻</button>
                    <button class="icon-btn" onclick="exportPanelData('${panel.id}')" title="Export">↓</button>
                    <button class="icon-btn close-btn" onclick="removePanel('${panel.id}')" title="Remove">×</button>
                </div>
            </div>
            
            <div class="address-input-container">
                <input type="text" class="address-input" 
                       placeholder="addr1... oder addr_test1..." 
                       onchange="setContractPanelAddress('${panel.id}', this.value)"
                       value="${panel.address || ''}">
            </div>
            
            <div class="panel-content" id="${panel.id}-content">
                <div class="loading-message">Adresse eingeben...</div>
            </div>
        </div>
    `;
    
    grid.insertAdjacentHTML('beforeend', panelHtml);
    
    // Make draggable
    const panelElement = document.getElementById(panel.id);
    makePanelDraggable(panelElement);
    
    if (panel.address) {
        refreshContractPanel(panel.id);
    } else {
        // Render tags even if no address yet
        updatePanelTags(panel.id);
    }
}

async function setContractPanelAddress(panelId, address) {
    if (!address || address.trim() === '') return;
    
    address = address.trim();
    
    if (!isValidCardanoAddress(address)) {
        showNotification('Ungültige Contract-Adresse', 'error');
        return;
    }
    
    const panel = contractPanels.find(p => p.id === panelId);
    if (panel) {
        panel.address = address;
        savePanels();
        await refreshContractPanel(panelId);
        updateSectionStatusIndicators();
    }
}

async function refreshContractPanel(panelId) {
    const panel = contractPanels.find(p => p.id === panelId);
    if (!panel || !panel.address) return;
    
    const contentDiv = document.getElementById(`${panelId}-content`);
    
    // Loading-Overlay statt Content zu ersetzen
    let loadingOverlay = contentDiv.querySelector('.loading-overlay');
    if (!loadingOverlay) {
        loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'loading-overlay';
        loadingOverlay.innerHTML = '<div class="loading-spinner">↻</div>';
        contentDiv.appendChild(loadingOverlay);
    }
    loadingOverlay.style.display = 'flex';
    
    try {
        const addressInfo = await blockfrostRequest(`/addresses/${panel.address}`);
        
        // Locked Value
        const lockedValueADA = addressInfo.amount && addressInfo.amount.length > 0 
            ? parseInt(addressInfo.amount[0].quantity) / 1000000 
            : 0;
        
        // Transaktionen
        let transactions = [];
        try {
            transactions = await blockfrostRequest(`/addresses/${panel.address}/transactions?count=10&order=desc`);
        } catch (e) {
            console.log('Keine Transaktionen');
        }
        
        // UTXOs
        let utxos = [];
        try {
            utxos = await blockfrostRequest(`/addresses/${panel.address}/utxos`);
        } catch (e) {
            console.log('Keine UTXOs');
        }
        
        // Aktive Transaktionen (24h)
        const oneDayAgo = Math.floor(Date.now() / 1000) - 86400;
        const recentTxs = transactions.filter(tx => tx.block_time > oneDayAgo);
        
        // Entferne Loading-Overlay
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
        
        // Render Content
        contentDiv.innerHTML = `
            <div class="panel-tags-inline"></div>
            <div class="address-display-small">${formatAddress(panel.address)}</div>
            
            <div class="balance-card-compact contract-balance">
                <div class="balance-label-compact">Locked Value</div>
                <div class="balance-amount-compact">
                    <span class="amount">${lockedValueADA.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    <span class="currency">₳</span>
                </div>
            </div>
            
            <div class="stats-row">
                <div class="stat-compact">
                    <div class="stat-label">Total Executions</div>
                    <div class="stat-value">${addressInfo.tx_count || 0}</div>
                </div>
                <div class="stat-compact">
                    <div class="stat-label">UTXOs</div>
                    <div class="stat-value">${utxos.length}</div>
                </div>
                <div class="stat-compact">
                    <div class="stat-label">Active (24h)</div>
                    <div class="stat-value active">${recentTxs.length}</div>
                </div>
            </div>
            
            <div class="transactions-section">
                <div class="section-title">Contract Executions</div>
                <div class="transactions-compact">
                    ${await renderContractTransactions(transactions)}
                </div>
            </div>
        `;
        
        // Update tags after rendering content
        updatePanelTags(panel.id);
        
    } catch (error) {
        console.error('Contract-Panel-Fehler:', error);
        
        // Entferne Loading-Overlay
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
        
        if (error.message.includes('404') || error.message.includes('not found')) {
            contentDiv.innerHTML = `
                <div class="panel-tags-inline"></div>
                <div class="address-display-small">${formatAddress(panel.address)}</div>
                <div class="empty-state">
                    <div class="empty-icon">○</div>
                    <div class="empty-text">New Contract</div>
                    <div class="empty-subtext">No activity yet</div>
                </div>
            `;
            updatePanelTags(panel.id);
        } else {
            contentDiv.innerHTML = `<div class="error-message">❌ ${error.message}</div>`;
        }
    }
}

async function renderContractTransactions(txHashes) {
    if (!txHashes || txHashes.length === 0) {
        return '<div class="loading-message">Keine Executions</div>';
    }
    
    const txElements = [];
    const displayCount = Math.min(txHashes.length, 5);
    
    for (const txHash of txHashes.slice(0, displayCount)) {
        try {
            const txDetails = await blockfrostRequest(`/txs/${txHash.tx_hash}`);
            const timeAgo = getTimeAgo(txDetails.block_time);
            
            let executionType = 'Transaction';
            let icon = '📝';
            
            try {
                const redeemers = await blockfrostRequest(`/txs/${txHash.tx_hash}/redeemers`);
                if (redeemers.length > 0) {
                    executionType = `Script: ${redeemers[0].purpose}`;
                    icon = '⚡';
                }
            } catch (e) {
                // Keine Redeemer
            }
            
            txElements.push(`
                <div class="tx-item-compact" onclick="showTxDetails('${txHash.tx_hash}')">
                    <div class="tx-icon-compact">${icon}</div>
                    <div class="tx-info">
                        <div class="tx-hash-compact">${executionType}</div>
                        <div class="tx-time-compact">${timeAgo} • ${formatTxHash(txHash.tx_hash)}</div>
                    </div>
                    <div class="tx-status-compact success">✓</div>
                </div>
            `);
        } catch (e) {
            console.error('TX-Fehler:', e);
        }
    }
    
    return txElements.length > 0 ? txElements.join('') : '<div class="loading-message">Keine Executions</div>';
}

// ==================== PANEL MANAGEMENT ====================

function removePanel(panelId) {
    const panel = document.getElementById(panelId);
    if (panel) {
        panel.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
            panel.remove();
            walletPanels = walletPanels.filter(p => p.id !== panelId);
            poolPanels = poolPanels.filter(p => p.id !== panelId);
            contractPanels = contractPanels.filter(p => p.id !== panelId);
            savePanels();
        }, 300);
    }
}

function savePanels() {
    const data = {
        wallets: walletPanels,
        contracts: contractPanels,
        pools: poolPanels
    };
    localStorage.setItem('cardano-dashboard-panels', JSON.stringify(data));
}

function loadSavedPanels() {
    const saved = localStorage.getItem('cardano-dashboard-panels');
    let hasData = false;
    
    if (saved) {
        try {
            const data = JSON.parse(saved);
            
            if (data.wallets && data.wallets.length > 0) {
                hasData = true;
                data.wallets.forEach(panel => {
                    walletPanels.push(panel);
                    renderWalletPanel(panel);
                });
            }
            
            if (data.pools && data.pools.length > 0) {
                hasData = true;
                data.pools.forEach(panel => {
                    poolPanels.push(panel);
                    renderPoolPanel(panel);
                });
            }
            
            if (data.contracts && data.contracts.length > 0) {
                hasData = true;
                data.contracts.forEach(panel => {
                    contractPanels.push(panel);
                    renderContractPanel(panel);
                });
            }
            
            panelIdCounter = Math.max(
                ...walletPanels.map(p => parseInt(p.id.split('-')[1]) || 0),
                ...poolPanels.map(p => parseInt(p.id.split('-')[1]) || 0),
                ...contractPanels.map(p => parseInt(p.id.split('-')[1]) || 0),
                0
            ) + 1;
        } catch (e) {
            console.error('Fehler beim Laden:', e);
        }
    }
    
    // Erstelle Default-Panels beim ersten Start
    if (!hasData) {
        createDefaultPanels();
    }
}

function createDefaultPanels() {
    // Erstelle 2 Wallet-Panels
    for (let i = 0; i < 2; i++) {
        addWalletPanel();
    }
    
    // Erstelle 1 Pool-Panel
    addPoolPanel();
    
    // Erstelle 2 Contract-Panels
    for (let i = 0; i < 2; i++) {
        addContractPanel();
    }
    
    console.log('✓ Default panels created');
}

// ==================== EXPORT & TX DETAILS ====================

function exportPanelData(panelId) {
    const panel = [...walletPanels, ...poolPanels, ...contractPanels].find(p => p.id === panelId);
    if (!panel) {
        showNotification('Keine Daten zum Exportieren', 'error');
        return;
    }
    
    const data = {
        type: panel.type,
        address: panel.address || panel.poolId,
        network: CONFIG.activeNetwork,
        exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const identifier = panel.address ? formatAddress(panel.address) : (panel.poolId ? panel.poolId.substring(0, 12) : 'panel');
    a.download = `${panel.type}-${identifier}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showNotification('Daten exportiert', 'success');
}

function showTxDetails(txHash) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Transaction Details</h3>
                <button class="close-modal" onclick="this.closest('.modal').remove()">×</button>
            </div>
            <div class="modal-body">
                <div class="loading-message">Lade Details...</div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    loadTxDetails(txHash, modal);
}

async function loadTxDetails(txHash, modal) {
    try {
        const tx = await blockfrostRequest(`/txs/${txHash}`);
        const utxos = await blockfrostRequest(`/txs/${txHash}/utxos`);
        
        const modalBody = modal.querySelector('.modal-body');
        modalBody.innerHTML = `
            <div class="tx-detail-item">
                <strong>Hash:</strong>
                <code>${txHash}</code>
            </div>
            <div class="tx-detail-item">
                <strong>Block:</strong> ${tx.block_height}
            </div>
            <div class="tx-detail-item">
                <strong>Zeit:</strong> ${new Date(tx.block_time * 1000).toLocaleString('de-DE')}
            </div>
            <div class="tx-detail-item">
                <strong>Fees:</strong> ${(tx.fees / 1000000).toFixed(6)} ₳
            </div>
            <div class="tx-detail-item">
                <strong>Inputs:</strong> ${utxos.inputs.length}
            </div>
            <div class="tx-detail-item">
                <strong>Outputs:</strong> ${utxos.outputs.length}
            </div>
            <div class="tx-detail-actions">
                <a href="https://preprod.cardanoscan.io/transaction/${txHash}" target="_blank" class="btn-link">
                    🔗 CardanoScan öffnen
                </a>
            </div>
        `;
    } catch (error) {
        modal.querySelector('.modal-body').innerHTML = `<div class="error-message">Fehler: ${error.message}</div>`;
    }
}

// ==================== BLOCKCHAIN INFO ====================

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

function updateLastUpdateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('de-DE');
    document.getElementById('lastUpdate').textContent = timeString;
}

function startAutoRefresh() {
    setInterval(async () => {
        await updateBlockchainInfo();
        walletPanels.forEach(panel => {
            if (panel.address) refreshWalletPanel(panel.id);
        });
        poolPanels.forEach(panel => {
            if (panel.poolId) refreshPoolPanel(panel.id);
        });
        contractPanels.forEach(panel => {
            if (panel.address) refreshContractPanel(panel.id);
        });
    }, 30000);
}

// ==================== HELPER FUNCTIONS ====================

function isValidCardanoAddress(address) {
    const isMainnetAddr = address.startsWith('addr1');
    const isTestnetAddr = address.startsWith('addr_test1');
    const isMainnetStake = address.startsWith('stake1');
    const isTestnetStake = address.startsWith('stake_test1');
    const isScript = address.startsWith('script1');
    
    const hasValidPrefix = isMainnetAddr || isTestnetAddr || isMainnetStake || isTestnetStake || isScript;
    const hasValidLength = address.length >= 50;
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

function formatTokenName(unit) {
    if (unit === 'lovelace') return 'ADA';
    if (unit.length > 56) {
        const policyId = unit.substring(0, 56);
        const assetName = unit.substring(56);
        try {
            return assetName ? hex2a(assetName) : policyId.substring(0, 8) + '...';
        } catch (e) {
            return unit.substring(0, 12) + '...';
        }
    }
    return unit.substring(0, 12) + '...';
}

function formatTokenAmount(quantity) {
    const num = parseInt(quantity);
    if (num > 1000000) {
        return (num / 1000000).toFixed(2) + 'M';
    } else if (num > 1000) {
        return (num / 1000).toFixed(2) + 'K';
    }
    return num.toLocaleString('de-DE');
}

function hex2a(hex) {
    let str = '';
    for (let i = 0; i < hex.length; i += 2) {
        str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    }
    return str;
}

function getTimeAgo(timestamp) {
    const now = Math.floor(Date.now() / 1000);
    const diff = now - timestamp;
    
    if (diff < 60) return 'Gerade eben';
    if (diff < 3600) return `${Math.floor(diff / 60)} Min.`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} Std.`;
    return `${Math.floor(diff / 86400)} Tage`;
}

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
        z-index: 10000;
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

// Keyboard Shortcuts
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'r') {
        e.preventDefault();
        walletPanels.forEach(p => p.address && refreshWalletPanel(p.id));
        contractPanels.forEach(p => p.address && refreshContractPanel(p.id));
        updateBlockchainInfo();
    }
});

console.log('🚀 GUItx Dashboard v2.0 geladen');
console.log('💡 Drücke + um Panels hinzuzufügen');


// ==================== ALERT CHECKING ====================

function checkAlerts(address, balance) {
    AppState.alerts.forEach(alert => {
        if (alert.address === address) {
            // Simple condition parsing
            if (alert.condition.includes('balance >')) {
                const threshold = parseFloat(alert.condition.split('>')[1]);
                if (balance > threshold) {
                    sendDesktopNotification('Alert ausgelöst!', `${alert.name}: Balance ${balance.toFixed(2)} ₳`);
                    playSound('success');
                }
            }
        }
    });
}


// ==================== SECTION TOGGLE ====================

const SectionVisibility = {
    wallets: localStorage.getItem('walletsVisible') === null ? true : localStorage.getItem('walletsVisible') !== 'false',
    pools: localStorage.getItem('poolsVisible') === null ? true : localStorage.getItem('poolsVisible') !== 'false',
    contracts: localStorage.getItem('contractsVisible') === null ? true : localStorage.getItem('contractsVisible') !== 'false'
};

function toggleSection(section) {
    if (section === 'wallets') {
        SectionVisibility.wallets = !SectionVisibility.wallets;
        localStorage.setItem('walletsVisible', SectionVisibility.wallets);
    } else if (section === 'pools') {
        SectionVisibility.pools = !SectionVisibility.pools;
        localStorage.setItem('poolsVisible', SectionVisibility.pools);
    } else if (section === 'contracts') {
        SectionVisibility.contracts = !SectionVisibility.contracts;
        localStorage.setItem('contractsVisible', SectionVisibility.contracts);
    }
    updateSectionVisibility();
}

function updateSectionVisibility() {
    const walletsColumn = document.getElementById('walletsColumn');
    const poolsColumn = document.getElementById('poolsColumn');
    const contractsColumn = document.getElementById('contractsColumn');
    const toggleWalletsBtn = document.getElementById('toggleWalletsBtn');
    const togglePoolsBtn = document.getElementById('togglePoolsBtn');
    const toggleContractsBtn = document.getElementById('toggleContractsBtn');
    
    // Wallets Section
    if (SectionVisibility.wallets) {
        walletsColumn.style.display = 'flex';
        if (toggleWalletsBtn) toggleWalletsBtn.classList.add('active');
    } else {
        walletsColumn.style.display = 'none';
        if (toggleWalletsBtn) toggleWalletsBtn.classList.remove('active');
    }
    
    // Pools Section
    if (SectionVisibility.pools) {
        poolsColumn.style.display = 'flex';
        if (togglePoolsBtn) togglePoolsBtn.classList.add('active');
    } else {
        poolsColumn.style.display = 'none';
        if (togglePoolsBtn) togglePoolsBtn.classList.remove('active');
    }
    
    // Contracts Section
    if (SectionVisibility.contracts) {
        contractsColumn.style.display = 'flex';
        if (toggleContractsBtn) toggleContractsBtn.classList.add('active');
    } else {
        contractsColumn.style.display = 'none';
        if (toggleContractsBtn) toggleContractsBtn.classList.remove('active');
    }
}

// Initialize section visibility on load
document.addEventListener('DOMContentLoaded', () => {
    updateSectionVisibility();
});


// ==================== POOL PANELS ====================

function addPoolPanel() {
    const panelId = `pool-${panelIdCounter++}`;
    const panel = {
        id: panelId,
        type: 'pool',
        poolId: null
    };
    
    poolPanels.push(panel);
    renderPoolPanel(panel);
    savePanels();
}

function renderPoolPanel(panel) {
    const grid = document.getElementById('poolsGrid');
    const panelHtml = `
        <div class="panel pool-panel" id="${panel.id}" data-panel-id="${panel.id}">
            <div class="panel-header">
                <h3>Stake Pool</h3>
                <div class="panel-tags" id="${panel.id}-tags"></div>
                <div class="panel-actions">
                    <button class="icon-btn" onclick="showPanelNote('${panel.id}')" title="Note">✎</button>
                    <button class="icon-btn" onclick="refreshPoolPanel('${panel.id}')" title="Refresh">↻</button>
                    <button class="icon-btn" onclick="exportPanelData('${panel.id}')" title="Export">↓</button>
                    <button class="icon-btn close-btn" onclick="removePanel('${panel.id}')" title="Remove">×</button>
                </div>
            </div>
            
            <div class="address-input-container">
                <input type="text" class="address-input" 
                       placeholder="pool1... (Pool ID)" 
                       onchange="setPoolPanelId('${panel.id}', this.value)"
                       value="${panel.poolId || ''}">
            </div>
            
            <div class="panel-content" id="${panel.id}-content">
                <div class="loading-message">Pool ID eingeben...</div>
            </div>
        </div>
    `;
    
    grid.insertAdjacentHTML('beforeend', panelHtml);
    
    // Make draggable
    const panelElement = document.getElementById(panel.id);
    makePanelDraggable(panelElement);
    
    if (panel.poolId) {
        refreshPoolPanel(panel.id);
    } else {
        updatePanelTags(panel.id);
    }
}

async function setPoolPanelId(panelId, poolId) {
    if (!poolId || poolId.trim() === '') return;
    
    poolId = poolId.trim();
    
    if (!poolId.startsWith('pool1')) {
        showNotification('Ungültige Pool ID (muss mit pool1 beginnen)', 'error');
        return;
    }
    
    const panel = poolPanels.find(p => p.id === panelId);
    if (panel) {
        panel.poolId = poolId;
        savePanels();
        await refreshPoolPanel(panelId);
    }
}

async function refreshPoolPanel(panelId) {
    const panel = poolPanels.find(p => p.id === panelId);
    if (!panel || !panel.poolId) return;
    
    const contentDiv = document.getElementById(`${panelId}-content`);
    
    // Loading-Overlay
    let loadingOverlay = contentDiv.querySelector('.loading-overlay');
    if (!loadingOverlay) {
        loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'loading-overlay';
        loadingOverlay.innerHTML = '<div class="loading-spinner">↻</div>';
        contentDiv.appendChild(loadingOverlay);
    }
    loadingOverlay.style.display = 'flex';
    
    try {
        const poolInfo = await blockfrostRequest(`/pools/${panel.poolId}`);
        const poolMetadata = await blockfrostRequest(`/pools/${panel.poolId}/metadata`);
        
        // Pool Stats
        const activeStake = parseInt(poolInfo.active_stake) / 1000000;
        const liveStake = parseInt(poolInfo.live_stake) / 1000000;
        const liveSaturation = poolInfo.live_saturation * 100;
        const margin = poolInfo.margin_cost * 100;
        const fixedCost = parseInt(poolInfo.fixed_cost) / 1000000;
        
        // Entferne Loading-Overlay
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
        
        // Render Content
        contentDiv.innerHTML = `
            <div class="panel-tags-inline"></div>
            
            ${poolMetadata ? `
                <div class="pool-header">
                    <div class="pool-name">${poolMetadata.name || 'Unknown Pool'}</div>
                    <div class="pool-ticker">[${poolMetadata.ticker || 'N/A'}]</div>
                </div>
                ${poolMetadata.description ? `<div class="pool-description">${poolMetadata.description.substring(0, 100)}${poolMetadata.description.length > 100 ? '...' : ''}</div>` : ''}
            ` : `
                <div class="pool-header">
                    <div class="pool-name">Pool ${panel.poolId.substring(0, 12)}...</div>
                </div>
            `}
            
            <div class="stats-row">
                <div class="stat-compact">
                    <div class="stat-label">Live Stake</div>
                    <div class="stat-value">${(liveStake / 1000000).toFixed(2)}M ₳</div>
                </div>
                <div class="stat-compact">
                    <div class="stat-label">Saturation</div>
                    <div class="stat-value">${liveSaturation.toFixed(1)}%</div>
                </div>
            </div>
            
            <div class="stats-row">
                <div class="stat-compact">
                    <div class="stat-label">Blocks</div>
                    <div class="stat-value">${poolInfo.blocks_minted || 0}</div>
                </div>
                <div class="stat-compact">
                    <div class="stat-label">Delegators</div>
                    <div class="stat-value">${poolInfo.live_delegators || 0}</div>
                </div>
            </div>
            
            <div class="pool-costs">
                <div class="cost-item">
                    <span class="cost-label">Fixed Cost:</span>
                    <span class="cost-value">${fixedCost.toFixed(0)} ₳</span>
                </div>
                <div class="cost-item">
                    <span class="cost-label">Margin:</span>
                    <span class="cost-value">${margin.toFixed(2)}%</span>
                </div>
            </div>
            
            ${poolMetadata && poolMetadata.homepage ? `
                <div class="pool-links">
                    <a href="${poolMetadata.homepage}" target="_blank" class="pool-link">🔗 Website</a>
                </div>
            ` : ''}
        `;
        
        updatePanelTags(panel.id);
        
    } catch (error) {
        console.error('Pool-Panel-Fehler:', error);
        
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
        
        if (error.message.includes('404') || error.message.includes('not found')) {
            contentDiv.innerHTML = `
                <div class="panel-tags-inline"></div>
                <div class="empty-state">
                    <div class="empty-icon">○</div>
                    <div class="empty-text">Pool nicht gefunden</div>
                    <div class="empty-subtext">Überprüfe die Pool ID</div>
                </div>
            `;
            updatePanelTags(panel.id);
        } else {
            contentDiv.innerHTML = `<div class="error-message">❌ ${error.message}</div>`;
        }
    }
}


// ==================== STATUS INDICATORS ====================

function updateSectionStatusIndicators() {
    // Wallets Status
    const walletsIndicator = document.getElementById('walletsStatusIndicator');
    const hasLoadedWallets = walletPanels.some(p => p.address && p.address.trim() !== '');
    if (walletsIndicator) {
        if (hasLoadedWallets) {
            walletsIndicator.classList.add('active');
        } else {
            walletsIndicator.classList.remove('active');
        }
    }
    
    // Contracts Status
    const contractsIndicator = document.getElementById('contractsStatusIndicator');
    const hasLoadedContracts = contractPanels.some(p => p.address && p.address.trim() !== '');
    if (contractsIndicator) {
        if (hasLoadedContracts) {
            contractsIndicator.classList.add('active');
        } else {
            contractsIndicator.classList.remove('active');
        }
    }
    
    // Pools Status
    const poolsIndicator = document.getElementById('poolsStatusIndicator');
    const hasLoadedPools = poolPanels.some(p => p.poolId && p.poolId.trim() !== '');
    if (poolsIndicator) {
        if (hasLoadedPools) {
            poolsIndicator.classList.add('active');
        } else {
            poolsIndicator.classList.remove('active');
        }
    }
}
