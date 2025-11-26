// Application State
class TierListApp {
    constructor() {
        this.tiers = [
            { id: 'S', name: 'S', color: '#ff4757', items: [] },
            { id: 'A', name: 'A', color: '#ff6348', items: [] },
            { id: 'B', name: 'B', color: '#ffa502', items: [] },
            { id: 'C', name: 'C', color: '#eccc68', items: [] },
            { id: 'D', name: 'D', color: '#7bed9f', items: [] },
            { id: 'F', name: 'F', color: '#70a1ff', items: [] }
        ];
        this.items = [];
        this.bankItems = [];
        this.draggedItem = null;
        this.draggedTier = null;
        this.itemIdCounter = 0;
        this.tierIdCounter = 6; // Starting after S, A, B, C, D, F
        this.currentEditingTier = null;
        this.appTitle = 'Tier List Maker';

        this.init();
    }

    init() {
        this.loadFromLocalStorage();
        this.renderTitle();
        this.renderTiers();
        this.renderItemBank();
        this.attachEventListeners();
    }

    renderTitle() {
        const titleElement = document.getElementById('appTitle');
        titleElement.textContent = this.appTitle;

        titleElement.addEventListener('blur', () => {
            this.appTitle = titleElement.textContent.trim() || 'Tier List Maker';
            titleElement.textContent = this.appTitle;
            this.saveToLocalStorage();
        });

        titleElement.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                titleElement.blur();
            }
        });
    }

    attachEventListeners() {
        // Upload image button
        document.getElementById('uploadBtn').addEventListener('click', () => {
            document.getElementById('imageUpload').click();
        });

        document.getElementById('imageUpload').addEventListener('change', (e) => {
            this.handleImageUpload(e);
        });

        // Screenshot button
        document.getElementById('screenshotBtn').addEventListener('click', () => {
            this.takeScreenshot();
        });

        // Reset button
        document.getElementById('resetBtn').addEventListener('click', () => {
            this.handleReset();
        });

        // Import JSON button
        document.getElementById('importBtn').addEventListener('click', () => {
            document.getElementById('jsonImport').click();
        });

        document.getElementById('jsonImport').addEventListener('change', (e) => {
            this.handleImportJSON(e);
        });

        // Export JSON button
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportJSON();
        });

        // Invert colors button
        document.getElementById('invertColorsBtn').addEventListener('click', () => {
            this.invertColors();
        });

        // Add tier button
        document.getElementById('addTierBtn').addEventListener('click', () => {
            this.addNewTier();
        });

        // Modal close
        document.querySelector('.modal-close').addEventListener('click', () => {
            this.closeModal();
        });

        // Click outside modal to close
        document.getElementById('tierModal').addEventListener('click', (e) => {
            if (e.target.id === 'tierModal') {
                this.closeModal();
            }
        });

        // Modal inputs
        document.getElementById('modalTierName').addEventListener('input', (e) => {
            if (this.currentEditingTier) {
                const tier = this.tiers.find(t => t.id === this.currentEditingTier);
                if (tier) {
                    tier.name = e.target.value;
                    this.renderTiers();
                }
            }
        });

        document.getElementById('modalTierColor').addEventListener('input', (e) => {
            if (this.currentEditingTier) {
                const tier = this.tiers.find(t => t.id === this.currentEditingTier);
                if (tier) {
                    tier.color = e.target.value;
                    this.renderTiers();
                }
            }
        });

        document.getElementById('modalDeleteTier').addEventListener('click', () => {
            this.deleteTier(this.currentEditingTier);
        });
    }

    handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const item = {
                id: `item-${this.itemIdCounter++}`,
                imageUrl: e.target.result,
                type: 'image'
            };
            this.items.push(item);
            this.bankItems.push(item.id);
            this.renderItemBank();
            this.saveToLocalStorage();
        };
        reader.readAsDataURL(file);

        // Reset input
        event.target.value = '';
    }

    async takeScreenshot() {
        try {
            const tierContainer = document.getElementById('tierContainer');
            const canvas = await html2canvas(tierContainer, {
                backgroundColor: '#1a1a2e',
                scale: 2,
                logging: false,
                useCORS: true
            });

            // Convert canvas to blob
            canvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                a.href = url;
                a.download = `tier-list-${timestamp}.png`;
                a.click();
                URL.revokeObjectURL(url);
            });
        } catch (error) {
            console.error('Screenshot error:', error);
            alert('Failed to take screenshot. Please try again.');
        }
    }

    handleReset() {
        // Check if any items are in tiers
        const hasItemsInTiers = this.tiers.some(tier => tier.items.length > 0);

        if (hasItemsInTiers) {
            // Move all items back to bank
            if (confirm('Move all items back to Item Bank?')) {
                this.tiers.forEach(tier => {
                    this.bankItems.push(...tier.items);
                    tier.items = [];
                });
                this.renderTiers();
                this.renderItemBank();
                this.saveToLocalStorage();
            }
        } else if (this.bankItems.length > 0) {
            // Delete all items from bank
            if (confirm('Remove all items from Item Bank?')) {
                this.items = [];
                this.bankItems = [];
                this.itemIdCounter = 0;
                this.renderItemBank();
                this.saveToLocalStorage();
            }
        } else {
            alert('Nothing to reset!');
        }
    }

    exportJSON() {
        const data = {
            tiers: this.tiers,
            items: this.items,
            bankItems: this.bankItems,
            appTitle: this.appTitle,
            itemIdCounter: this.itemIdCounter,
            tierIdCounter: this.tierIdCounter
        };

        const jsonString = JSON.stringify(data, null, 2);

        // Download as file
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tier-list-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    handleImportJSON(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);

                if (data.tiers && Array.isArray(data.tiers)) {
                    this.tiers = data.tiers;
                }
                if (data.items && Array.isArray(data.items)) {
                    this.items = data.items;
                }
                if (data.bankItems && Array.isArray(data.bankItems)) {
                    this.bankItems = data.bankItems;
                }
                if (data.appTitle) {
                    this.appTitle = data.appTitle;
                }
                if (data.itemIdCounter) {
                    this.itemIdCounter = data.itemIdCounter;
                }
                if (data.tierIdCounter) {
                    this.tierIdCounter = data.tierIdCounter;
                }

                this.renderTitle();
                this.renderTiers();
                this.renderItemBank();
                this.saveToLocalStorage();
                alert('Tier list imported successfully!');
            } catch (error) {
                console.error('Import error:', error);
                alert('Failed to import JSON. Please check the file format.');
            }
        };
        reader.readAsText(file);

        // Reset input
        event.target.value = '';
    }

    invertColors() {
        // Reverse the color assignments
        const colors = this.tiers.map(t => t.color);
        colors.reverse();
        this.tiers.forEach((tier, index) => {
            tier.color = colors[index];
        });
        this.renderTiers();
        this.saveToLocalStorage();
    }

    addNewTier() {
        const newTier = {
            id: `tier-${this.tierIdCounter++}`,
            name: 'New Tier',
            color: '#808080',
            items: []
        };
        this.tiers.push(newTier);
        this.renderTiers();
        this.saveToLocalStorage();
    }

    deleteTier(tierId) {
        const tier = this.tiers.find(t => t.id === tierId);
        if (!tier) return;

        const confirmMsg = tier.items.length > 0
            ? `Delete tier "${tier.name}"? Its ${tier.items.length} item(s) will be moved to Item Bank.`
            : `Delete tier "${tier.name}"?`;

        if (confirm(confirmMsg)) {
            // Move items to bank
            this.bankItems.push(...tier.items);

            // Remove tier
            this.tiers = this.tiers.filter(t => t.id !== tierId);

            this.closeModal();
            this.renderTiers();
            this.renderItemBank();
            this.saveToLocalStorage();
        }
    }

    openTierSettings(tierId) {
        const tier = this.tiers.find(t => t.id === tierId);
        if (!tier) return;

        this.currentEditingTier = tierId;
        document.getElementById('modalTierName').value = tier.name;
        document.getElementById('modalTierColor').value = tier.color;
        document.getElementById('tierModal').style.display = 'flex';
    }

    closeModal() {
        document.getElementById('tierModal').style.display = 'none';
        this.currentEditingTier = null;
        this.saveToLocalStorage();
    }

    deleteItem(itemId) {
        // Remove from items array
        this.items = this.items.filter(item => item.id !== itemId);

        // Remove from bank
        this.bankItems = this.bankItems.filter(id => id !== itemId);

        // Remove from all tiers
        this.tiers.forEach(tier => {
            tier.items = tier.items.filter(id => id !== itemId);
        });

        this.renderTiers();
        this.renderItemBank();
        this.saveToLocalStorage();
    }

    renderTiers() {
        const container = document.getElementById('tierContainer');
        container.innerHTML = '';

        this.tiers.forEach((tier, index) => {
            const tierRow = document.createElement('div');
            tierRow.className = 'tier-row';
            tierRow.dataset.tier = tier.id;
            tierRow.draggable = true;

            // Tier drag events
            tierRow.addEventListener('dragstart', (e) => {
                // Only allow dragging from the tier label, not items
                if (e.target.classList.contains('tier-row')) {
                    this.draggedTier = tier.id;
                    tierRow.classList.add('dragging-tier');
                    e.dataTransfer.effectAllowed = 'move';
                }
            });

            tierRow.addEventListener('dragend', () => {
                tierRow.classList.remove('dragging-tier');
                this.draggedTier = null;
            });

            tierRow.addEventListener('dragover', (e) => {
                if (this.draggedTier && this.draggedTier !== tier.id) {
                    e.preventDefault();
                }
            });

            tierRow.addEventListener('drop', (e) => {
                if (this.draggedTier && this.draggedTier !== tier.id) {
                    e.preventDefault();
                    this.reorderTiers(this.draggedTier, tier.id);
                }
            });

            const tierLabel = document.createElement('div');
            tierLabel.className = 'tier-label';
            tierLabel.style.backgroundColor = tier.color;

            const nameDisplay = document.createElement('div');
            nameDisplay.className = 'tier-name-display';
            nameDisplay.textContent = tier.name;

            const settingsIcon = document.createElement('div');
            settingsIcon.className = 'settings-icon';
            settingsIcon.textContent = '⚙️';
            settingsIcon.title = 'Settings';
            settingsIcon.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openTierSettings(tier.id);
            });

            tierLabel.appendChild(nameDisplay);
            tierLabel.appendChild(settingsIcon);

            const tierItems = document.createElement('div');
            tierItems.className = 'tier-items';
            tierItems.dataset.tier = tier.id;

            // Prevent tier dragging when interacting with items area
            tierItems.addEventListener('mousedown', (e) => {
                tierRow.draggable = false;
            });

            tierItems.addEventListener('mouseup', () => {
                tierRow.draggable = true;
            });

            // Render items in this tier
            tier.items.forEach(itemId => {
                const item = this.items.find(i => i.id === itemId);
                if (item) {
                    tierItems.appendChild(this.createItemElement(item));
                }
            });

            // Add drop zone events for items
            this.addDropZoneEvents(tierItems);

            tierRow.appendChild(tierLabel);
            tierRow.appendChild(tierItems);
            container.appendChild(tierRow);
        });
    }

    reorderTiers(draggedTierId, targetTierId) {
        const draggedIndex = this.tiers.findIndex(t => t.id === draggedTierId);
        const targetIndex = this.tiers.findIndex(t => t.id === targetTierId);

        if (draggedIndex === -1 || targetIndex === -1) return;

        // Remove dragged tier
        const [draggedTier] = this.tiers.splice(draggedIndex, 1);

        // Insert at new position
        this.tiers.splice(targetIndex, 0, draggedTier);

        this.renderTiers();
        this.saveToLocalStorage();
    }

    renderItemBank() {
        const bank = document.getElementById('itemBank');
        bank.innerHTML = '';

        this.bankItems.forEach(itemId => {
            const item = this.items.find(i => i.id === itemId);
            if (item) {
                bank.appendChild(this.createItemElement(item));
            }
        });

        this.addDropZoneEvents(bank);
    }

    createItemElement(item) {
        const div = document.createElement('div');
        div.className = 'item';
        div.draggable = true;
        div.dataset.itemId = item.id;

        if (item.imageUrl) {
            const img = document.createElement('img');
            img.src = item.imageUrl;
            img.alt = 'Item';
            div.appendChild(img);
        }

        // Delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = '×';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('Delete this item?')) {
                this.deleteItem(item.id);
            }
        });
        div.appendChild(deleteBtn);

        // Drag events
        div.addEventListener('dragstart', (e) => {
            this.draggedItem = item.id;
            div.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.stopPropagation();
        });

        div.addEventListener('dragend', (e) => {
            div.classList.remove('dragging');
        });

        return div;
    }

    addDropZoneEvents(element) {
        element.addEventListener('dragover', (e) => {
            if (this.draggedItem) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                element.classList.add('drag-over');
            }
        });

        element.addEventListener('dragleave', (e) => {
            element.classList.remove('drag-over');
        });

        element.addEventListener('drop', (e) => {
            if (this.draggedItem) {
                e.preventDefault();
                e.stopPropagation();
                element.classList.remove('drag-over');

                const targetTier = element.dataset.tier;

                // Remove item from all tiers and bank
                this.bankItems = this.bankItems.filter(id => id !== this.draggedItem);
                this.tiers.forEach(tier => {
                    tier.items = tier.items.filter(id => id !== this.draggedItem);
                });

                // Add to target location
                if (targetTier === 'bank') {
                    this.bankItems.push(this.draggedItem);
                } else {
                    const tier = this.tiers.find(t => t.id === targetTier);
                    if (tier) {
                        tier.items.push(this.draggedItem);
                    }
                }

                this.draggedItem = null;
                this.renderTiers();
                this.renderItemBank();
                this.saveToLocalStorage();
            }
        });
    }

    saveToLocalStorage() {
        const data = {
            tiers: this.tiers,
            items: this.items,
            bankItems: this.bankItems,
            itemIdCounter: this.itemIdCounter,
            tierIdCounter: this.tierIdCounter,
            appTitle: this.appTitle
        };
        localStorage.setItem('tierListData', JSON.stringify(data));
    }

    loadFromLocalStorage() {
        const saved = localStorage.getItem('tierListData');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                if (data.tiers) this.tiers = data.tiers;
                if (data.items) this.items = data.items;
                if (data.bankItems) this.bankItems = data.bankItems;
                if (data.itemIdCounter) this.itemIdCounter = data.itemIdCounter;
                if (data.tierIdCounter) this.tierIdCounter = data.tierIdCounter;
                if (data.appTitle) this.appTitle = data.appTitle;
            } catch (error) {
                console.error('Error loading from localStorage:', error);
            }
        }
    }
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new TierListApp();
});
