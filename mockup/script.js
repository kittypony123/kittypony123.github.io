// RFShop Mockup Interactive Features
class RFShopDemo {
    constructor() {
        this.init();
        this.bindEvents();
        this.setupFilters();
        this.setupSearch();
        this.setupModal();
    }

    init() {
        // Initialize cart
        this.cart = [];
        this.updateCartCount();

        // Initialize filters state
        this.activeFilters = {
            connector: ['sma'],
            impedance: ['50'],
            gender: [],
            frequency: 6,
            price: { min: null, max: null },
            quickFilters: ['in-stock']
        };

        // Sample product data for demonstration
        this.products = [
            {
                id: 1,
                name: 'SMA Male Connector, 50Ω, RG316 Cable',
                sku: 'SMA-M-316-50',
                price: 8.50,
                image: 'https://via.placeholder.com/250x250',
                specs: ['50Ω', 'DC-6GHz', 'Male'],
                connector: 'sma',
                gender: 'male',
                impedance: '50',
                frequency: 6,
                inStock: true,
                badges: ['in-stock']
            },
            {
                id: 2,
                name: 'SMA Female Jack, Panel Mount, 50Ω',
                sku: 'SMA-F-PM-50',
                price: 12.30,
                image: 'https://via.placeholder.com/250x250',
                specs: ['50Ω', 'DC-18GHz', 'Female'],
                connector: 'sma',
                gender: 'female',
                impedance: '50',
                frequency: 18,
                inStock: true,
                badges: ['in-stock', 'popular']
            },
            {
                id: 3,
                name: 'SMA Male Right Angle Connector, 50Ω',
                sku: 'SMA-M-RA-50',
                price: 15.75,
                image: 'https://via.placeholder.com/250x250',
                specs: ['50Ω', 'DC-12GHz', 'Right Angle'],
                connector: 'sma',
                gender: 'male',
                impedance: '50',
                frequency: 12,
                inStock: true,
                lowStock: true,
                badges: ['low-stock']
            },
            {
                id: 4,
                name: 'SMA 50Ω Terminator Load, 2W',
                sku: 'SMA-TERM-50-2W',
                price: 18.90,
                image: 'https://via.placeholder.com/250x250',
                specs: ['50Ω', '2W', 'DC-18GHz'],
                connector: 'sma',
                impedance: '50',
                frequency: 18,
                inStock: true,
                badges: ['in-stock']
            },
            {
                id: 5,
                name: 'SMA Male to BNC Female Adapter',
                sku: 'AD-SMABNC-MF',
                price: 22.40,
                image: 'https://via.placeholder.com/250x250',
                specs: ['50Ω', 'Adapter', 'SMA-BNC'],
                connector: 'sma',
                gender: 'adapter',
                impedance: '50',
                frequency: 6,
                inStock: true,
                badges: ['in-stock']
            },
            {
                id: 6,
                name: 'SMA Cable Assembly, Male to Male, 1m',
                sku: 'SMA-MM-1000',
                price: 28.50,
                image: 'https://via.placeholder.com/250x250',
                specs: ['50Ω', '1 Metre', 'RG58'],
                connector: 'sma',
                gender: 'male',
                impedance: '50',
                frequency: 3,
                inStock: true,
                badges: ['in-stock']
            }
        ];

        this.filteredProducts = [...this.products];
    }

    bindEvents() {
        // Mobile navigation toggle
        const navToggle = document.querySelector('.nav-toggle');
        const navMenu = document.querySelector('.nav-menu');

        if (navToggle) {
            navToggle.addEventListener('click', () => {
                navMenu.classList.toggle('active');
            });
        }

        // Filter toggles
        document.querySelectorAll('.filter-toggle').forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                const section = e.target.closest('.filter-section');
                section.classList.toggle('expanded');
            });
        });

        // View toggle
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
                e.target.closest('.view-btn').classList.add('active');

                const view = e.target.closest('.view-btn').dataset.view;
                this.toggleView(view);
            });
        });

        // Quantity controls
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('qty-btn')) {
                this.handleQuantityChange(e);
            }
            if (e.target.classList.contains('add-to-cart-btn')) {
                this.handleAddToCart(e);
            }
        });

        // Help button
        const helpBtn = document.querySelector('.help-btn');
        if (helpBtn) {
            helpBtn.addEventListener('click', () => {
                this.openModal('help-modal');
            });
        }

        // Modal close
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.closeModal(e.target.closest('.modal').id);
            });
        });

        // Sort functionality
        const sortSelect = document.querySelector('.sort-select');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.sortProducts(e.target.value);
            });
        }

        // Demo category navigation
        document.querySelectorAll('[data-category]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigateToCategory(e.target.dataset.category);
            });
        });
    }

    setupFilters() {
        // Checkbox filters
        document.querySelectorAll('.filter-checkbox input').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                this.handleFilterChange(e);
            });
        });

        // Quick filters
        document.querySelectorAll('.filter-tag').forEach(tag => {
            tag.addEventListener('click', (e) => {
                e.target.classList.toggle('active');
                this.updateQuickFilters();
            });
        });

        // Frequency range slider
        const freqSlider = document.getElementById('freq-range');
        if (freqSlider) {
            freqSlider.addEventListener('input', (e) => {
                const value = e.target.value;
                document.getElementById('freq-value').textContent = `${value} GHz`;
                this.activeFilters.frequency = parseInt(value);
                this.applyFilters();
            });
        }

        // Price inputs
        document.querySelectorAll('.price-input').forEach(input => {
            input.addEventListener('input', () => {
                this.updatePriceFilters();
            });
        });

        // Clear filters
        const clearBtn = document.querySelector('.clear-filters');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearAllFilters();
            });
        }
    }

    setupSearch() {
        const searchInput = document.getElementById('main-search');
        const suggestions = document.getElementById('search-suggestions');

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const query = e.target.value.trim();
                if (query.length > 2) {
                    this.showSearchSuggestions(query);
                } else {
                    suggestions.style.display = 'none';
                }
            });

            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.performSearch(e.target.value);
                }
            });
        }

        // Search button
        const searchBtn = document.querySelector('.search-btn');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                this.performSearch(searchInput.value);
            });
        }
    }

    setupModal() {
        // Wizard navigation
        document.querySelectorAll('.wizard-option').forEach(option => {
            option.addEventListener('click', (e) => {
                this.handleWizardStep(e);
            });
        });

        // Close modal on backdrop click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal.id);
                }
            });
        });
    }

    handleFilterChange(e) {
        const checkbox = e.target;
        const filterType = checkbox.name;
        const value = checkbox.value;

        if (!this.activeFilters[filterType]) {
            this.activeFilters[filterType] = [];
        }

        if (checkbox.checked) {
            if (!this.activeFilters[filterType].includes(value)) {
                this.activeFilters[filterType].push(value);
            }
        } else {
            this.activeFilters[filterType] = this.activeFilters[filterType].filter(v => v !== value);
        }

        this.applyFilters();
        this.updateFilterCounts();
    }

    updateQuickFilters() {
        const activeTags = document.querySelectorAll('.filter-tag.active');
        this.activeFilters.quickFilters = Array.from(activeTags).map(tag => tag.dataset.filter);
        this.applyFilters();
    }

    updatePriceFilters() {
        const minInput = document.querySelector('.price-input[placeholder*="Min"]');
        const maxInput = document.querySelector('.price-input[placeholder*="Max"]');

        this.activeFilters.price = {
            min: minInput.value ? parseFloat(minInput.value) : null,
            max: maxInput.value ? parseFloat(maxInput.value) : null
        };

        this.applyFilters();
    }

    applyFilters() {
        this.filteredProducts = this.products.filter(product => {
            // Connector type filter
            if (this.activeFilters.connector.length > 0) {
                if (!this.activeFilters.connector.includes(product.connector)) {
                    return false;
                }
            }

            // Gender filter
            if (this.activeFilters.gender.length > 0) {
                if (!this.activeFilters.gender.includes(product.gender)) {
                    return false;
                }
            }

            // Impedance filter
            if (this.activeFilters.impedance.length > 0) {
                if (!this.activeFilters.impedance.includes(product.impedance)) {
                    return false;
                }
            }

            // Frequency filter
            if (product.frequency > this.activeFilters.frequency) {
                return false;
            }

            // Price filter
            if (this.activeFilters.price.min && product.price < this.activeFilters.price.min) {
                return false;
            }
            if (this.activeFilters.price.max && product.price > this.activeFilters.price.max) {
                return false;
            }

            // Quick filters
            if (this.activeFilters.quickFilters.includes('in-stock') && !product.inStock) {
                return false;
            }

            return true;
        });

        this.renderProducts();
        this.updateResultsCount();
    }

    renderProducts() {
        const grid = document.getElementById('products-grid');
        if (!grid) return;

        grid.innerHTML = this.filteredProducts.map(product => this.createProductCard(product)).join('');
    }

    createProductCard(product) {
        const badges = product.badges ? product.badges.map(badge =>
            `<span class="badge ${badge.replace(' ', '-')}">${badge.replace('-', ' ').toUpperCase()}</span>`
        ).join('') : '';

        return `
            <div class="product-card" data-product-id="${product.id}">
                <div class="product-image">
                    <img src="${product.image}" alt="${product.name}">
                    <div class="product-badges">
                        ${badges}
                    </div>
                </div>
                <div class="product-info">
                    <h3 class="product-title">${product.name}</h3>
                    <p class="product-sku">SKU: ${product.sku}</p>
                    <div class="product-specs">
                        ${product.specs.map(spec => `<span class="spec">${spec}</span>`).join('')}
                    </div>
                    <div class="product-price">
                        <span class="price">£${product.price.toFixed(2)}</span>
                        <span class="price-ex-vat">£${(product.price * 0.833).toFixed(2)} ex VAT</span>
                    </div>
                    <div class="product-actions">
                        <div class="quantity-selector">
                            <button class="qty-btn minus" data-product-id="${product.id}">-</button>
                            <input type="number" value="1" min="1" class="qty-input" data-product-id="${product.id}">
                            <button class="qty-btn plus" data-product-id="${product.id}">+</button>
                        </div>
                        <button class="add-to-cart-btn" data-product-id="${product.id}">Add to Cart</button>
                    </div>
                </div>
            </div>
        `;
    }

    handleQuantityChange(e) {
        const productId = e.target.dataset.productId;
        const qtyInput = document.querySelector(`.qty-input[data-product-id="${productId}"]`);
        let currentQty = parseInt(qtyInput.value);

        if (e.target.classList.contains('plus')) {
            qtyInput.value = currentQty + 1;
        } else if (e.target.classList.contains('minus') && currentQty > 1) {
            qtyInput.value = currentQty - 1;
        }
    }

    handleAddToCart(e) {
        const productId = parseInt(e.target.dataset.productId);
        const qtyInput = document.querySelector(`.qty-input[data-product-id="${productId}"]`);
        const quantity = parseInt(qtyInput.value);

        const product = this.products.find(p => p.id === productId);
        if (product) {
            this.addToCart(product, quantity);
            this.showAddToCartFeedback(e.target);
        }
    }

    addToCart(product, quantity) {
        const existingItem = this.cart.find(item => item.id === product.id);

        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            this.cart.push({ ...product, quantity });
        }

        this.updateCartCount();
    }

    updateCartCount() {
        const cartCount = document.querySelector('.cart-count');
        if (cartCount) {
            const totalItems = this.cart.reduce((sum, item) => sum + item.quantity, 0);
            cartCount.textContent = totalItems;
        }
    }

    showAddToCartFeedback(button) {
        const originalText = button.textContent;
        button.textContent = 'Added!';
        button.style.background = '#28a745';

        setTimeout(() => {
            button.textContent = originalText;
            button.style.background = '';
        }, 1500);
    }

    updateResultsCount() {
        const countElement = document.querySelector('.results-count');
        if (countElement) {
            countElement.textContent = `Showing 1-${Math.min(12, this.filteredProducts.length)} of ${this.filteredProducts.length} results`;
        }

        const productCountElement = document.querySelector('.product-count');
        if (productCountElement) {
            productCountElement.textContent = `${this.filteredProducts.length} products`;
        }
    }

    updateFilterCounts() {
        // Update filter counts in checkboxes
        document.querySelectorAll('.filter-checkbox').forEach(checkbox => {
            const input = checkbox.querySelector('input');
            const filterType = input.name;
            const value = input.value;

            const count = this.products.filter(product => {
                if (filterType === 'connector') return product.connector === value;
                if (filterType === 'gender') return product.gender === value;
                if (filterType === 'impedance') return product.impedance === value;
                return true;
            }).length;

            const label = checkbox.textContent.split('(')[0].trim();
            checkbox.innerHTML = `
                <input type="checkbox" name="${filterType}" value="${value}" ${input.checked ? 'checked' : ''}>
                <span class="checkmark"></span>
                ${label} (${count})
            `;
        });
    }

    clearAllFilters() {
        // Reset active filters
        this.activeFilters = {
            connector: [],
            impedance: [],
            gender: [],
            frequency: 18,
            price: { min: null, max: null },
            quickFilters: []
        };

        // Reset UI
        document.querySelectorAll('.filter-checkbox input').forEach(input => {
            input.checked = false;
        });

        document.querySelectorAll('.filter-tag').forEach(tag => {
            tag.classList.remove('active');
        });

        document.getElementById('freq-range').value = 18;
        document.getElementById('freq-value').textContent = '18 GHz';

        document.querySelectorAll('.price-input').forEach(input => {
            input.value = '';
        });

        this.applyFilters();
    }

    sortProducts(sortType) {
        switch (sortType) {
            case 'price-low':
                this.filteredProducts.sort((a, b) => a.price - b.price);
                break;
            case 'price-high':
                this.filteredProducts.sort((a, b) => b.price - a.price);
                break;
            case 'name':
                this.filteredProducts.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'stock':
                this.filteredProducts.sort((a, b) => b.inStock - a.inStock);
                break;
            default:
                // Relevance - original order
                this.filteredProducts = [...this.products.filter(p => this.filteredProducts.find(fp => fp.id === p.id))];
        }

        this.renderProducts();
    }

    toggleView(view) {
        const grid = document.getElementById('products-grid');
        if (view === 'list') {
            grid.classList.add('list-view');
        } else {
            grid.classList.remove('list-view');
        }
    }

    showSearchSuggestions(query) {
        const suggestions = document.getElementById('search-suggestions');
        const mockSuggestions = [
            'SMA Male Connector',
            'SMA Female Jack',
            'SMA Cable Assembly',
            'SMA to BNC Adapter',
            'SMA Terminator'
        ].filter(s => s.toLowerCase().includes(query.toLowerCase()));

        if (mockSuggestions.length > 0) {
            suggestions.innerHTML = mockSuggestions
                .map(s => `<div class="suggestion">${s}</div>`)
                .join('');
            suggestions.style.display = 'block';
        }
    }

    performSearch(query) {
        if (query.trim()) {
            // In a real implementation, this would filter products by search query
            console.log('Searching for:', query);
            document.getElementById('search-suggestions').style.display = 'none';

            // Mock search result
            this.showSearchFeedback(`Searching for "${query}"...`);
        }
    }

    showSearchFeedback(message) {
        const categoryHeader = document.querySelector('.category-header .category-info h1');
        if (categoryHeader) {
            const originalText = categoryHeader.textContent;
            categoryHeader.textContent = message;
            setTimeout(() => {
                categoryHeader.textContent = originalText;
            }, 2000);
        }
    }

    navigateToCategory(category) {
        // Mock category navigation
        const categoryNames = {
            'sma': 'SMA Connectors',
            'bnc': 'BNC Connectors',
            'n-type': 'N-Type Connectors',
            'tnc': 'TNC Connectors'
        };

        const categoryName = categoryNames[category] || 'Connectors';
        const categoryTitle = document.querySelector('.category-header h1');
        if (categoryTitle) {
            categoryTitle.textContent = categoryName;
        }

        // Update breadcrumb
        const breadcrumbActive = document.querySelector('.breadcrumb-list .active');
        if (breadcrumbActive) {
            breadcrumbActive.textContent = categoryName;
        }

        // Close mobile menu if open
        document.querySelector('.nav-menu').classList.remove('active');
    }

    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    handleWizardStep(e) {
        // Mock wizard functionality
        const option = e.target.closest('.wizard-option');
        const value = option.dataset.value;

        // Highlight selection
        option.style.background = '#e8f4fd';
        option.style.borderColor = '#1e3c72';

        setTimeout(() => {
            this.closeModal('help-modal');
            this.showWizardResult(value);
        }, 500);
    }

    showWizardResult(selection) {
        const recommendations = {
            'test-equipment': 'Based on your selection, we recommend SMA connectors for test equipment applications.',
            'antenna': 'For antenna connections, consider our SMA or N-Type connectors depending on frequency.',
            'cable': 'For cable assemblies, we offer pre-made solutions or custom configurations.'
        };

        const message = recommendations[selection] || 'Thank you for using our connector finder!';
        alert(message); // In real implementation, this would be a proper notification
    }
}

// Initialize the demo when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new RFShopDemo();

    // Add some demo interactions
    console.log('RFShop Mockup Demo Loaded');
    console.log('Try the following features:');
    console.log('- Use the filters to narrow down products');
    console.log('- Click "Help Me Choose" for guided selection');
    console.log('- Add products to cart');
    console.log('- Try the mobile responsive design');
});

// Add smooth scrolling to category links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Add loading states for better UX feedback
function addLoadingState(element) {
    element.classList.add('loading');
    setTimeout(() => {
        element.classList.remove('loading');
    }, 1000);
}

// Export for potential external use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RFShopDemo;
}