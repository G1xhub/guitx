// ==================== TRANSACTION BUILDER ====================

const TxBuilder = {
    inputs: [],
    outputs: [],
    collateral: [],
    metadata: {},
    validityStart: null,
    validityEnd: null,
    requiredSigners: [],
    certificates: [],
    withdrawals: [],
    
    init() {
        this.loadFromStorage();
        this.render();
    },
    
    reset() {
        this.inputs = [];
        this.outputs = [];
        this.collateral = [];
        this.metadata = {};
        this.validityStart = null;
        this.validityEnd = null;
        this.requiredSigners = [];
        this.certificates = [];
        this.withdrawals = [];
        this.saveToStorage();
        this.render();
    },
    
    addInput(utxo, isCollateral = false) {
        const input = {
            id: Date.now(),
            txHash: utxo.tx_hash || '',
            outputIndex: utxo.output_index || 0,
            address: utxo.address || '',
            amount: utxo.amount || [],
            selected: false
        };
        
        if (isCollateral) {
            this.collateral.push(input);
        } else {
            this.inputs.push(input);
        }
        this.saveToStorage();
        this.render();
    },
    
    removeCollateral(id) {
        this.collateral = this.collateral.filter(input => input.id !== id);
        this.saveToStorage();
        this.render();
    },
    
    addMetadataLabel() {
        const label = prompt('Enter metadata label (e.g., 721 for NFTs):');
        if (label && !isNaN(label)) {
            this.metadata[label] = {};
            this.saveToStorage();
            this.render();
        }
    },
    
    updateMetadata(label, value) {
        try {
            this.metadata[label] = JSON.parse(value);
            this.saveToStorage();
            this.render();
        } catch (e) {
            showNotification('Invalid JSON format', 'error');
        }
    },
    
    removeMetadataLabel(label) {
        delete this.metadata[label];
        this.saveToStorage();
        this.render();
    },
    
    addRequiredSigner() {
        const signer = prompt('Enter public key hash or address:');
        if (signer && signer.trim()) {
            this.requiredSigners.push({
                id: Date.now(),
                value: signer.trim()
            });
            this.saveToStorage();
            this.render();
        }
    },
    
    removeRequiredSigner(id) {
        this.requiredSigners = this.requiredSigners.filter(s => s.id !== id);
        this.saveToStorage();
        this.render();
    },
    
    removeInput(id) {
        this.inputs = this.inputs.filter(input => input.id !== id);
        this.saveToStorage();
        this.render();
    },
    
    addOutput() {
        this.outputs.push({
            id: Date.now(),
            address: '',
            amount: 0,
            assets: []
        });
        this.saveToStorage();
        this.render();
    },
    
    removeOutput(id) {
        this.outputs = this.outputs.filter(output => output.id !== id);
        this.saveToStorage();
        this.render();
    },
    
    updateOutput(id, field, value) {
        const output = this.outputs.find(o => o.id === id);
        if (output) {
            output[field] = value;
            this.saveToStorage();
            this.render();
        }
    },
    
    calculateFee() {
        // Simplified fee calculation
        const baseSize = 200; // Base transaction size
        const inputSize = this.inputs.length * 180;
        const outputSize = this.outputs.length * 160;
        const totalSize = baseSize + inputSize + outputSize;
        
        // Fee: 0.155381 ADA per 1000 bytes (Cardano mainnet)
        const feePerByte = 0.000155381;
        return Math.ceil(totalSize * feePerByte * 1000000); // in lovelace
    },
    
    getTotalInput() {
        return this.inputs.reduce((sum, input) => {
            const lovelace = input.amount.find(a => a.unit === 'lovelace');
            return sum + (lovelace ? parseInt(lovelace.quantity) : 0);
        }, 0);
    },
    
    getTotalOutput() {
        return this.outputs.reduce((sum, output) => {
            return sum + (output.amount * 1000000);
        }, 0);
    },
    
    isValid() {
        if (this.inputs.length === 0) return { valid: false, error: 'No inputs selected' };
        if (this.outputs.length === 0) return { valid: false, error: 'No outputs defined' };
        
        const totalIn = this.getTotalInput();
        const totalOut = this.getTotalOutput();
        const fee = this.calculateFee();
        
        if (totalIn < totalOut + fee) {
            return { valid: false, error: `Insufficient funds. Need ${((totalOut + fee - totalIn) / 1000000).toFixed(2)} more ADA` };
        }
        
        // Check if all outputs have valid addresses
        for (const output of this.outputs) {
            if (!output.address || output.address.trim() === '') {
                return { valid: false, error: 'All outputs must have an address' };
            }
            if (output.amount <= 0) {
                return { valid: false, error: 'All outputs must have an amount > 0' };
            }
        }
        
        return { valid: true };
    },
    
    getTxJSON() {
        const tx = {
            inputs: this.inputs.map(input => ({
                txHash: input.txHash,
                outputIndex: input.outputIndex,
                address: input.address,
                amount: input.amount
            })),
            outputs: this.outputs.map(output => ({
                address: output.address,
                amount: output.amount,
                assets: output.assets
            })),
            fee: this.calculateFee()
        };
        
        // Optional fields
        if (this.collateral.length > 0) {
            tx.collateral = this.collateral.map(input => ({
                txHash: input.txHash,
                outputIndex: input.outputIndex
            }));
        }
        
        if (Object.keys(this.metadata).length > 0) {
            tx.metadata = this.metadata;
        }
        
        if (this.validityStart) {
            tx.validityStart = this.validityStart;
        }
        
        if (this.validityEnd) {
            tx.validityEnd = this.validityEnd;
        }
        
        if (this.requiredSigners.length > 0) {
            tx.requiredSigners = this.requiredSigners.map(s => s.value);
        }
        
        if (this.certificates.length > 0) {
            tx.certificates = this.certificates;
        }
        
        if (this.withdrawals.length > 0) {
            tx.withdrawals = this.withdrawals;
        }
        
        return tx;
    },
    
    exportJSON() {
        const validation = this.isValid();
        if (!validation.valid) {
            showNotification(validation.error, 'error');
            return;
        }
        
        const tx = this.getTxJSON();
        
        const blob = new Blob([JSON.stringify(tx, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cardano-tx-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        showNotification('Transaction exported', 'success');
    },
    
    copyJSON() {
        const json = JSON.stringify(this.getTxJSON(), null, 2);
        navigator.clipboard.writeText(json).then(() => {
            showNotification('JSON copied to clipboard', 'success');
        }).catch(() => {
            showNotification('Failed to copy JSON', 'error');
        });
    },
    
    saveToStorage() {
        localStorage.setItem('tx-builder-state', JSON.stringify({
            inputs: this.inputs,
            outputs: this.outputs,
            collateral: this.collateral,
            metadata: this.metadata,
            validityStart: this.validityStart,
            validityEnd: this.validityEnd,
            requiredSigners: this.requiredSigners
        }));
    },
    
    loadFromStorage() {
        const saved = localStorage.getItem('tx-builder-state');
        if (saved) {
            try {
                const state = JSON.parse(saved);
                this.inputs = state.inputs || [];
                this.outputs = state.outputs || [];
                this.collateral = state.collateral || [];
                this.metadata = state.metadata || {};
                this.validityStart = state.validityStart;
                this.validityEnd = state.validityEnd;
                this.requiredSigners = state.requiredSigners || [];
            } catch (e) {
                console.error('Error loading TX builder state:', e);
            }
        }
    },
    
    render() {
        const container = document.getElementById('txBuilderContent');
        if (!container) return;
        
        const totalIn = this.getTotalInput() / 1000000;
        const totalOut = this.getTotalOutput() / 1000000;
        const fee = this.calculateFee() / 1000000;
        const change = totalIn - totalOut - fee;
        const validation = this.isValid();
        
        container.innerHTML = `
            <div class="tx-builder-layout">
                <!-- Left Column: Inputs -->
                <div class="tx-builder-column">
                    <div class="tx-builder-section">
                        <div class="tx-section-header">
                            <h3>Inputs (UTXOs)</h3>
                            <button class="btn-secondary" onclick="openUTXOSelector()">+ Add UTXO</button>
                        </div>
                        
                        <div class="tx-items-list">
                            ${this.inputs.length === 0 ? `
                                <div class="tx-empty-state">
                                    <div class="empty-icon">◯</div>
                                    <div class="empty-text">No inputs selected</div>
                                    <div class="empty-subtext">Add UTXOs from your wallets</div>
                                </div>
                            ` : this.inputs.map(input => `
                                <div class="tx-item input-item">
                                    <div class="tx-item-header">
                                        <span class="tx-item-label">Input #${input.outputIndex}</span>
                                        <button class="icon-btn-small" onclick="TxBuilder.removeInput(${input.id})" title="Remove">×</button>
                                    </div>
                                    <div class="tx-item-content">
                                        <div class="tx-item-field">
                                            <span class="field-label">TX Hash:</span>
                                            <span class="field-value mono">${formatTxHash(input.txHash)}</span>
                                        </div>
                                        <div class="tx-item-field">
                                            <span class="field-label">Address:</span>
                                            <span class="field-value mono">${formatAddress(input.address)}</span>
                                        </div>
                                        <div class="tx-item-field">
                                            <span class="field-label">Amount:</span>
                                            <span class="field-value amount">${(parseInt(input.amount.find(a => a.unit === 'lovelace')?.quantity || 0) / 1000000).toFixed(2)} ₳</span>
                                        </div>
                                        ${input.amount.length > 1 ? `
                                            <div class="tx-item-field">
                                                <span class="field-label">Assets:</span>
                                                <span class="field-value">+${input.amount.length - 1} tokens</span>
                                            </div>
                                        ` : ''}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                        
                        <div class="tx-summary-box">
                            <div class="summary-item">
                                <span class="summary-label">Total Input:</span>
                                <span class="summary-value">${totalIn.toFixed(2)} ₳</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Center Column: Transaction Flow -->
                <div class="tx-builder-center">
                    <div class="tx-flow-arrow">→</div>
                    <div class="tx-fee-display">
                        <div class="fee-label">Estimated Fee</div>
                        <div class="fee-amount">${fee.toFixed(6)} ₳</div>
                    </div>
                </div>
                
                <!-- Right Column: Outputs -->
                <div class="tx-builder-column">
                    <div class="tx-builder-section">
                        <div class="tx-section-header">
                            <h3>Outputs</h3>
                            <button class="btn-secondary" onclick="TxBuilder.addOutput()">+ Add Output</button>
                        </div>
                        
                        <div class="tx-items-list">
                            ${this.outputs.length === 0 ? `
                                <div class="tx-empty-state">
                                    <div class="empty-icon">◯</div>
                                    <div class="empty-text">No outputs defined</div>
                                    <div class="empty-subtext">Add recipients and amounts</div>
                                </div>
                            ` : this.outputs.map((output, index) => `
                                <div class="tx-item output-item">
                                    <div class="tx-item-header">
                                        <span class="tx-item-label">Output #${index + 1}</span>
                                        <button class="icon-btn-small" onclick="TxBuilder.removeOutput(${output.id})" title="Remove">×</button>
                                    </div>
                                    <div class="tx-item-content">
                                        <div class="tx-item-field">
                                            <label class="field-label">Address:</label>
                                            <input type="text" 
                                                   class="tx-input" 
                                                   placeholder="addr1..." 
                                                   value="${output.address}"
                                                   onchange="TxBuilder.updateOutput(${output.id}, 'address', this.value)">
                                        </div>
                                        <div class="tx-item-field">
                                            <label class="field-label">Amount (ADA):</label>
                                            <input type="number" 
                                                   class="tx-input" 
                                                   placeholder="0.00" 
                                                   step="0.000001"
                                                   value="${output.amount}"
                                                   onchange="TxBuilder.updateOutput(${output.id}, 'amount', parseFloat(this.value))">
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                        
                        <div class="tx-summary-box">
                            <div class="summary-item">
                                <span class="summary-label">Total Output:</span>
                                <span class="summary-value">${totalOut.toFixed(2)} ₳</span>
                            </div>
                            ${change > 0 ? `
                                <div class="summary-item change">
                                    <span class="summary-label">Change:</span>
                                    <span class="summary-value">${change.toFixed(6)} ₳</span>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Advanced Options -->
            <div class="tx-advanced-section">
                <div class="tx-advanced-header" onclick="toggleAdvancedOptions()">
                    <h3>Advanced Options</h3>
                    <span class="toggle-arrow" id="advancedToggle">▼</span>
                </div>
                
                <div class="tx-advanced-content" id="advancedContent" style="display: none;">
                    <div class="tx-advanced-grid">
                        <!-- Collateral -->
                        <div class="tx-advanced-box">
                            <div class="advanced-box-header">
                                <h4>Collateral</h4>
                                <button class="btn-small" onclick="openCollateralSelector()">+ Add</button>
                            </div>
                            <div class="advanced-box-content">
                                ${this.collateral.length === 0 ? `
                                    <div class="advanced-empty">No collateral UTXOs</div>
                                ` : this.collateral.map(col => `
                                    <div class="advanced-item">
                                        <span class="advanced-item-text">${formatTxHash(col.txHash)}#${col.outputIndex}</span>
                                        <button class="icon-btn-small" onclick="TxBuilder.removeCollateral(${col.id})">×</button>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        
                        <!-- Validity Interval -->
                        <div class="tx-advanced-box">
                            <div class="advanced-box-header">
                                <h4>Validity Interval</h4>
                            </div>
                            <div class="advanced-box-content">
                                <div class="advanced-field">
                                    <label>Start Slot:</label>
                                    <input type="number" 
                                           class="tx-input-small" 
                                           placeholder="Optional"
                                           value="${this.validityStart || ''}"
                                           onchange="TxBuilder.validityStart = this.value ? parseInt(this.value) : null; TxBuilder.saveToStorage(); TxBuilder.render();">
                                </div>
                                <div class="advanced-field">
                                    <label>End Slot (TTL):</label>
                                    <input type="number" 
                                           class="tx-input-small" 
                                           placeholder="Optional"
                                           value="${this.validityEnd || ''}"
                                           onchange="TxBuilder.validityEnd = this.value ? parseInt(this.value) : null; TxBuilder.saveToStorage(); TxBuilder.render();">
                                </div>
                            </div>
                        </div>
                        
                        <!-- Required Signers -->
                        <div class="tx-advanced-box">
                            <div class="advanced-box-header">
                                <h4>Required Signers</h4>
                                <button class="btn-small" onclick="TxBuilder.addRequiredSigner()">+ Add</button>
                            </div>
                            <div class="advanced-box-content">
                                ${this.requiredSigners.length === 0 ? `
                                    <div class="advanced-empty">No required signers</div>
                                ` : this.requiredSigners.map(signer => `
                                    <div class="advanced-item">
                                        <span class="advanced-item-text mono">${formatAddress(signer.value)}</span>
                                        <button class="icon-btn-small" onclick="TxBuilder.removeRequiredSigner(${signer.id})">×</button>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        
                        <!-- Metadata -->
                        <div class="tx-advanced-box full-width">
                            <div class="advanced-box-header">
                                <h4>Metadata</h4>
                                <button class="btn-small" onclick="TxBuilder.addMetadataLabel()">+ Add Label</button>
                            </div>
                            <div class="advanced-box-content">
                                ${Object.keys(this.metadata).length === 0 ? `
                                    <div class="advanced-empty">No metadata</div>
                                ` : Object.entries(this.metadata).map(([label, value]) => `
                                    <div class="metadata-item">
                                        <div class="metadata-header">
                                            <span class="metadata-label">Label: ${label}</span>
                                            <button class="icon-btn-small" onclick="TxBuilder.removeMetadataLabel('${label}')">×</button>
                                        </div>
                                        <textarea 
                                            class="metadata-input" 
                                            placeholder='{"key": "value"}'
                                            onchange="TxBuilder.updateMetadata('${label}', this.value)"
                                        >${JSON.stringify(value, null, 2)}</textarea>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Bottom Actions -->
            <div class="tx-builder-actions">
                <div class="tx-validation">
                    ${validation.valid ? `
                        <div class="validation-success">✓ Transaction is valid</div>
                    ` : `
                        <div class="validation-error">⚠ ${validation.error}</div>
                    `}
                </div>
                
                <div class="tx-action-buttons">
                    <button class="btn-secondary" onclick="TxBuilder.reset()">Reset</button>
                    <button class="btn-secondary" onclick="TxBuilder.exportJSON()">Export JSON</button>
                    <button class="btn-primary" onclick="showTxPreview()" ${!validation.valid ? 'disabled' : ''}>Preview TX</button>
                </div>
            </div>
            
            <!-- TX Data Display -->
            ${this.inputs.length > 0 || this.outputs.length > 0 ? `
                <div class="tx-data-display">
                    <div class="tx-data-header">
                        <span class="tx-data-title">Transaction JSON</span>
                        <button class="btn-copy" onclick="TxBuilder.copyJSON()" title="Copy to clipboard">📋 Copy</button>
                    </div>
                    <pre class="tx-data-code"><code>${JSON.stringify(this.getTxJSON(), null, 2)}</code></pre>
                </div>
            ` : ''}
        `;
    }
};

// UTXO Selector Modal
function openUTXOSelector() {
    const modal = createModal('Select UTXOs', `
        <div class="utxo-selector">
            <div class="utxo-selector-header">
                <div class="wallet-selector">
                    <label>Select Wallet:</label>
                    <select id="walletSelect" onchange="loadWalletUTXOs(this.value)">
                        <option value="">-- Select a wallet --</option>
                        ${walletPanels.map(panel => `
                            <option value="${panel.address}">${formatAddress(panel.address)}</option>
                        `).join('')}
                    </select>
                </div>
            </div>
            
            <div id="utxoList" class="utxo-list">
                <div class="loading-message">Select a wallet to load UTXOs</div>
            </div>
        </div>
    `, 'utxo-selector-modal');
}

async function loadWalletUTXOs(address) {
    if (!address) return;
    
    const listDiv = document.getElementById('utxoList');
    listDiv.innerHTML = '<div class="loading-message">Loading UTXOs...</div>';
    
    try {
        const utxos = await blockfrostRequest(`/addresses/${address}/utxos`);
        
        if (utxos.length === 0) {
            listDiv.innerHTML = '<div class="loading-message">No UTXOs found</div>';
            return;
        }
        
        listDiv.innerHTML = utxos.map(utxo => {
            const lovelace = utxo.amount.find(a => a.unit === 'lovelace');
            const amount = lovelace ? parseInt(lovelace.quantity) / 1000000 : 0;
            
            return `
                <div class="utxo-selector-item" onclick="selectUTXO('${address}', '${utxo.tx_hash}', ${utxo.output_index})">
                    <div class="utxo-info">
                        <div class="utxo-hash">${formatTxHash(utxo.tx_hash)}#${utxo.output_index}</div>
                        <div class="utxo-amount">${amount.toFixed(2)} ₳</div>
                    </div>
                    ${utxo.amount.length > 1 ? `<div class="utxo-assets">+${utxo.amount.length - 1} assets</div>` : ''}
                </div>
            `;
        }).join('');
        
    } catch (error) {
        listDiv.innerHTML = `<div class="error-message">Error loading UTXOs: ${error.message}</div>`;
    }
}

async function selectUTXO(address, txHash, outputIndex) {
    try {
        const utxos = await blockfrostRequest(`/addresses/${address}/utxos`);
        const utxo = utxos.find(u => u.tx_hash === txHash && u.output_index === outputIndex);
        
        if (utxo) {
            utxo.address = address;
            TxBuilder.addInput(utxo);
            closeModal();
            showNotification('UTXO added to transaction', 'success');
        }
    } catch (error) {
        showNotification('Error adding UTXO', 'error');
    }
}

function showTxPreview() {
    const validation = TxBuilder.isValid();
    if (!validation.valid) {
        showNotification(validation.error, 'error');
        return;
    }
    
    const totalIn = TxBuilder.getTotalInput() / 1000000;
    const totalOut = TxBuilder.getTotalOutput() / 1000000;
    const fee = TxBuilder.calculateFee() / 1000000;
    const change = totalIn - totalOut - fee;
    
    const modal = createModal('Transaction Preview', `
        <div class="tx-preview">
            <div class="preview-section">
                <h4>Summary</h4>
                <div class="preview-stats">
                    <div class="preview-stat">
                        <span class="stat-label">Inputs:</span>
                        <span class="stat-value">${TxBuilder.inputs.length}</span>
                    </div>
                    <div class="preview-stat">
                        <span class="stat-label">Outputs:</span>
                        <span class="stat-value">${TxBuilder.outputs.length}</span>
                    </div>
                    <div class="preview-stat">
                        <span class="stat-label">Total In:</span>
                        <span class="stat-value">${totalIn.toFixed(6)} ₳</span>
                    </div>
                    <div class="preview-stat">
                        <span class="stat-label">Total Out:</span>
                        <span class="stat-value">${totalOut.toFixed(6)} ₳</span>
                    </div>
                    <div class="preview-stat">
                        <span class="stat-label">Fee:</span>
                        <span class="stat-value">${fee.toFixed(6)} ₳</span>
                    </div>
                    <div class="preview-stat">
                        <span class="stat-label">Change:</span>
                        <span class="stat-value">${change.toFixed(6)} ₳</span>
                    </div>
                </div>
            </div>
            
            <div class="preview-warning">
                ⚠️ This is a preview only. To submit this transaction, you need to sign it with a wallet.
            </div>
        </div>
    `, 'tx-preview-modal');
}

// Initialize TX Builder when page loads
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('txBuilderContent')) {
        TxBuilder.init();
    }
});




// Advanced Options Toggle
function toggleAdvancedOptions() {
    const content = document.getElementById('advancedContent');
    const toggle = document.getElementById('advancedToggle');
    
    if (content.style.display === 'none') {
        content.style.display = 'block';
        toggle.textContent = '▲';
    } else {
        content.style.display = 'none';
        toggle.textContent = '▼';
    }
}

// Collateral Selector
function openCollateralSelector() {
    const modal = createModal('Select Collateral UTXO', `
        <div class="utxo-selector">
            <div class="utxo-selector-header">
                <div class="wallet-selector">
                    <label>Select Wallet:</label>
                    <select id="collateralWalletSelect" onchange="loadCollateralUTXOs(this.value)">
                        <option value="">-- Select a wallet --</option>
                        ${walletPanels.map(panel => `
                            <option value="${panel.address}">${formatAddress(panel.address)}</option>
                        `).join('')}
                    </select>
                </div>
                <div class="collateral-note">
                    ℹ️ Collateral is required for smart contract transactions. Select a pure ADA UTXO (5-10 ADA recommended).
                </div>
            </div>
            
            <div id="collateralUtxoList" class="utxo-list">
                <div class="loading-message">Select a wallet to load UTXOs</div>
            </div>
        </div>
    `, 'collateral-selector-modal');
}

async function loadCollateralUTXOs(address) {
    if (!address) return;
    
    const listDiv = document.getElementById('collateralUtxoList');
    listDiv.innerHTML = '<div class="loading-message">Loading UTXOs...</div>';
    
    try {
        const utxos = await blockfrostRequest(`/addresses/${address}/utxos`);
        
        // Filter for pure ADA UTXOs (no tokens)
        const pureAdaUtxos = utxos.filter(utxo => utxo.amount.length === 1);
        
        if (pureAdaUtxos.length === 0) {
            listDiv.innerHTML = '<div class="loading-message">No pure ADA UTXOs found (required for collateral)</div>';
            return;
        }
        
        listDiv.innerHTML = pureAdaUtxos.map(utxo => {
            const lovelace = utxo.amount.find(a => a.unit === 'lovelace');
            const amount = lovelace ? parseInt(lovelace.quantity) / 1000000 : 0;
            
            return `
                <div class="utxo-selector-item ${amount >= 5 && amount <= 10 ? 'recommended' : ''}" 
                     onclick="selectCollateral('${address}', '${utxo.tx_hash}', ${utxo.output_index})">
                    <div class="utxo-info">
                        <div class="utxo-hash">${formatTxHash(utxo.tx_hash)}#${utxo.output_index}</div>
                        <div class="utxo-amount">${amount.toFixed(2)} ₳</div>
                    </div>
                    ${amount >= 5 && amount <= 10 ? '<div class="utxo-badge">Recommended</div>' : ''}
                </div>
            `;
        }).join('');
        
    } catch (error) {
        listDiv.innerHTML = `<div class="error-message">Error loading UTXOs: ${error.message}</div>`;
    }
}

async function selectCollateral(address, txHash, outputIndex) {
    try {
        const utxos = await blockfrostRequest(`/addresses/${address}/utxos`);
        const utxo = utxos.find(u => u.tx_hash === txHash && u.output_index === outputIndex);
        
        if (utxo) {
            utxo.address = address;
            TxBuilder.addInput(utxo, true); // true = collateral
            closeModal();
            showNotification('Collateral UTXO added', 'success');
        }
    } catch (error) {
        showNotification('Error adding collateral', 'error');
    }
}
