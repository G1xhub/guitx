// ==================== UTXO VISUALIZER ====================

class UTXOVisualizer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.utxos = [];
        this.bubbles = [];
        this.hoveredBubble = null;
        this.selectedBubbles = [];
        this.animationFrame = null;
        
        this.setupCanvas();
        this.setupEventListeners();
    }
    
    setupCanvas() {
        // Set canvas size
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = 500;
        
        // Handle retina displays
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.ctx.scale(dpr, dpr);
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
    }
    
    setupEventListeners() {
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        window.addEventListener('resize', () => this.setupCanvas());
    }
    
    async loadUTXOs(address) {
        if (!address || address.trim() === '') {
            throw new Error('Keine Adresse angegeben');
        }
        
        try {
            const utxos = await blockfrostRequest(`/addresses/${address}/utxos`);
            this.utxos = utxos;
            this.createBubbles();
            this.startAnimation();
            return utxos;
        } catch (error) {
            console.error('Error loading UTXOs:', error);
            throw error;
        }
    }
    
    createBubbles() {
        const width = this.canvas.offsetWidth;
        const height = this.canvas.offsetHeight;
        
        this.bubbles = this.utxos.map((utxo, index) => {
            const amount = parseInt(utxo.amount[0].quantity) / 1000000;
            
            // Calculate bubble size (logarithmic scale)
            const minRadius = 15;
            const maxRadius = 80;
            const radius = Math.min(maxRadius, minRadius + Math.log10(amount + 1) * 15);
            
            // Random position (avoid edges)
            const x = radius + Math.random() * (width - radius * 2);
            const y = radius + Math.random() * (height - radius * 2);
            
            // Calculate age in days
            const blockTime = utxo.block_time || Date.now() / 1000;
            const ageInDays = (Date.now() / 1000 - blockTime) / 86400;
            
            // Color based on age
            const color = this.getColorForAge(ageInDays);
            
            return {
                utxo,
                x,
                y,
                radius,
                amount,
                age: ageInDays,
                color,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                selected: false
            };
        });
    }
    
    getColorForAge(days) {
        if (days < 1) return '#00ff88'; // Green - Fresh
        if (days < 7) return '#ffd700'; // Yellow - Recent
        if (days < 30) return '#ff8c00'; // Orange - Old
        return '#ff4444'; // Red - Very old
    }
    
    startAnimation() {
        const animate = () => {
            this.update();
            this.draw();
            this.animationFrame = requestAnimationFrame(animate);
        };
        animate();
    }
    
    stopAnimation() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
    }
    
    update() {
        const width = this.canvas.offsetWidth;
        const height = this.canvas.offsetHeight;
        
        this.bubbles.forEach(bubble => {
            // Update position
            bubble.x += bubble.vx;
            bubble.y += bubble.vy;
            
            // Bounce off walls
            if (bubble.x - bubble.radius < 0 || bubble.x + bubble.radius > width) {
                bubble.vx *= -1;
                bubble.x = Math.max(bubble.radius, Math.min(width - bubble.radius, bubble.x));
            }
            if (bubble.y - bubble.radius < 0 || bubble.y + bubble.radius > height) {
                bubble.vy *= -1;
                bubble.y = Math.max(bubble.radius, Math.min(height - bubble.radius, bubble.y));
            }
            
            // Damping
            bubble.vx *= 0.99;
            bubble.vy *= 0.99;
        });
    }
    
    draw() {
        const width = this.canvas.offsetWidth;
        const height = this.canvas.offsetHeight;
        
        // Clear canvas
        this.ctx.clearRect(0, 0, width, height);
        
        // Draw bubbles
        this.bubbles.forEach(bubble => {
            this.drawBubble(bubble);
        });
        
        // Draw tooltip
        if (this.hoveredBubble) {
            this.drawTooltip(this.hoveredBubble);
        }
    }
    
    drawBubble(bubble) {
        const ctx = this.ctx;
        const isHovered = this.hoveredBubble === bubble;
        const isSelected = bubble.selected;
        
        // Shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 4;
        
        // Bubble
        ctx.beginPath();
        ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
        
        // Gradient fill
        const gradient = ctx.createRadialGradient(
            bubble.x - bubble.radius / 3,
            bubble.y - bubble.radius / 3,
            0,
            bubble.x,
            bubble.y,
            bubble.radius
        );
        
        const color = bubble.color;
        gradient.addColorStop(0, color + '80');
        gradient.addColorStop(1, color + '40');
        
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Border
        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = isHovered || isSelected ? '#a855f7' : color;
        ctx.lineWidth = isHovered || isSelected ? 3 : 2;
        ctx.stroke();
        
        // Amount text
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.max(10, bubble.radius / 3)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${bubble.amount.toFixed(1)} ₳`, bubble.x, bubble.y);
        
        // Selection indicator
        if (isSelected) {
            ctx.beginPath();
            ctx.arc(bubble.x, bubble.y, bubble.radius + 5, 0, Math.PI * 2);
            ctx.strokeStyle = '#a855f7';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }
    
    drawTooltip(bubble) {
        const ctx = this.ctx;
        const padding = 10;
        const lineHeight = 18;
        
        const lines = [
            `Amount: ${bubble.amount.toFixed(6)} ₳`,
            `Age: ${Math.floor(bubble.age)} days`,
            `TX: ${bubble.utxo.tx_hash.substring(0, 16)}...`,
            `Index: ${bubble.utxo.output_index}`
        ];
        
        // Calculate tooltip size
        ctx.font = '12px monospace';
        const maxWidth = Math.max(...lines.map(line => ctx.measureText(line).width));
        const tooltipWidth = maxWidth + padding * 2;
        const tooltipHeight = lines.length * lineHeight + padding * 2;
        
        // Position tooltip
        let tooltipX = bubble.x + bubble.radius + 10;
        let tooltipY = bubble.y - tooltipHeight / 2;
        
        // Keep tooltip in bounds
        if (tooltipX + tooltipWidth > this.canvas.offsetWidth) {
            tooltipX = bubble.x - bubble.radius - tooltipWidth - 10;
        }
        if (tooltipY < 0) tooltipY = 0;
        if (tooltipY + tooltipHeight > this.canvas.offsetHeight) {
            tooltipY = this.canvas.offsetHeight - tooltipHeight;
        }
        
        // Draw tooltip background
        ctx.fillStyle = 'rgba(18, 18, 18, 0.95)';
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight, 8);
        ctx.fill();
        ctx.stroke();
        
        // Draw tooltip text
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        lines.forEach((line, i) => {
            ctx.fillText(line, tooltipX + padding, tooltipY + padding + i * lineHeight);
        });
    }
    
    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        this.hoveredBubble = null;
        
        for (const bubble of this.bubbles) {
            const dx = x - bubble.x;
            const dy = y - bubble.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < bubble.radius) {
                this.hoveredBubble = bubble;
                this.canvas.style.cursor = 'pointer';
                return;
            }
        }
        
        this.canvas.style.cursor = 'default';
    }
    
    handleClick(e) {
        if (this.hoveredBubble) {
            this.hoveredBubble.selected = !this.hoveredBubble.selected;
            
            if (this.hoveredBubble.selected) {
                this.selectedBubbles.push(this.hoveredBubble);
            } else {
                this.selectedBubbles = this.selectedBubbles.filter(b => b !== this.hoveredBubble);
            }
            
            this.updateSelectionInfo();
        }
    }
    
    updateSelectionInfo() {
        const totalSelected = this.selectedBubbles.reduce((sum, b) => sum + b.amount, 0);
        const countElement = document.getElementById('utxo-selected-count');
        const amountElement = document.getElementById('utxo-selected-amount');
        
        if (countElement) {
            countElement.textContent = this.selectedBubbles.length;
        }
        if (amountElement) {
            amountElement.textContent = totalSelected.toFixed(2);
        }
    }
    
    clearSelection() {
        this.selectedBubbles.forEach(bubble => bubble.selected = false);
        this.selectedBubbles = [];
        this.updateSelectionInfo();
    }
    
    exportImage() {
        const link = document.createElement('a');
        link.download = `utxo-visualization-${Date.now()}.png`;
        link.href = this.canvas.toDataURL();
        link.click();
    }
    
    destroy() {
        this.stopAnimation();
        this.canvas.removeEventListener('mousemove', this.handleMouseMove);
        this.canvas.removeEventListener('click', this.handleClick);
    }
}

// Global instance
let utxoVisualizer = null;

function openUTXOVisualizer(address) {
    if (!address || address.trim() === '') {
        showNotification('Bitte zuerst eine Adresse eingeben', 'error');
        return;
    }
    
    const modal = createModal('UTXO Visualizer', `
        <div class="utxo-visualizer-container">
            <div class="utxo-viz-header">
                <div class="utxo-stats">
                    <div class="utxo-stat">
                        <span class="stat-label">Total UTXOs:</span>
                        <span class="stat-value" id="utxo-total-count">-</span>
                    </div>
                    <div class="utxo-stat">
                        <span class="stat-label">Total Amount:</span>
                        <span class="stat-value" id="utxo-total-amount">-</span>
                    </div>
                    <div class="utxo-stat">
                        <span class="stat-label">Selected:</span>
                        <span class="stat-value" id="utxo-selected-count">0</span>
                    </div>
                    <div class="utxo-stat">
                        <span class="stat-label">Selected Amount:</span>
                        <span class="stat-value" id="utxo-selected-amount">0.00</span>
                    </div>
                </div>
                <div class="utxo-legend">
                    <div class="legend-item"><span class="legend-color" style="background: #00ff88;"></span> < 1 day</div>
                    <div class="legend-item"><span class="legend-color" style="background: #ffd700;"></span> 1-7 days</div>
                    <div class="legend-item"><span class="legend-color" style="background: #ff8c00;"></span> 7-30 days</div>
                    <div class="legend-item"><span class="legend-color" style="background: #ff4444;"></span> > 30 days</div>
                </div>
            </div>
            
            <canvas id="utxoCanvas" class="utxo-canvas"></canvas>
            
            <div class="utxo-actions">
                <button onclick="utxoVisualizer.clearSelection()" class="btn-secondary">Clear Selection</button>
                <button onclick="utxoVisualizer.exportImage()" class="btn-secondary">Export PNG</button>
                <button onclick="closeUTXOVisualizer()" class="btn-primary">Close</button>
            </div>
        </div>
    `, 'utxo-modal');
    
    // Initialize visualizer
    setTimeout(async () => {
        utxoVisualizer = new UTXOVisualizer('utxoCanvas');
        
        try {
            showNotification('Loading UTXOs...', 'info');
            const utxos = await utxoVisualizer.loadUTXOs(address);
            
            // Update stats
            const totalAmount = utxos.reduce((sum, utxo) => {
                return sum + parseInt(utxo.amount[0].quantity) / 1000000;
            }, 0);
            
            document.getElementById('utxo-total-count').textContent = utxos.length;
            document.getElementById('utxo-total-amount').textContent = totalAmount.toFixed(2) + ' ₳';
            
            showNotification(`Loaded ${utxos.length} UTXOs`, 'success');
        } catch (error) {
            showNotification('Failed to load UTXOs', 'error');
        }
    }, 100);
}

function closeUTXOVisualizer() {
    if (utxoVisualizer) {
        utxoVisualizer.destroy();
        utxoVisualizer = null;
    }
    closeModal();
}
