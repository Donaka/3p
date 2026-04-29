const admin = {
    password: localStorage.getItem('3p_admin_password') || '',
    tokens: [],
    currentTab: 'dashboard',
    map: null,
    shopMarker: null,

    init() {
        this.bindEvents();
        if (this.password) {
            this.checkAuth();
        } else {
            this.showScreen('login-screen');
        }
    },

    bindEvents() {
        document.getElementById('login-btn')?.addEventListener('click', () => this.login());
        document.getElementById('logout-btn')?.addEventListener('click', () => this.logout());
        
        document.querySelectorAll('.nav-links li').forEach(li => {
            li.addEventListener('click', (e) => {
                const tab = e.currentTarget.getAttribute('data-tab');
                this.openTab(tab);
            });
        });

        document.querySelector('.close-modal')?.addEventListener('click', () => this.hideModal());
    },

    setText(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    },

    setVal(id, value) {
        const el = document.getElementById(id);
        if (el) el.value = value ?? '';
    },

    setCheck(id, value) {
        const el = document.getElementById(id);
        if (el) el.checked = !!value;
    },

    async api(path, method = 'GET', body = null) {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'x-admin-password': this.password
            }
        };
        if (body) options.body = JSON.stringify(body);

        try {
            const response = await fetch(path, options);
            
            if (response.status === 401 && !path.includes('/check')) {
                this.logout();
                return;
            }

            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            }

            const text = await response.text();
            if (!response.ok) {
                throw new Error(text || `Error ${response.status}`);
            }
            return text;
        } catch (e) {
            console.error('API Error:', path, e);
            if (!path.includes('/check')) {
                this.showToast(`Erreur API: ${e.message}`, 'error');
            }
            throw e;
        }
    },

    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    },

    playOrderSound() {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'); 
        audio.play().catch(e => console.log('Audio blocked:', e));
    },

    orderPollingInterval: null,
    lastOrderCount: 0,

    startOrderPolling() {
        if (this.orderPollingInterval) return;
        this.orderPollingInterval = setInterval(() => this.loadOrders(true), 10000);
    },

    stopOrderPolling() {
        if (this.orderPollingInterval) {
            clearInterval(this.orderPollingInterval);
            this.orderPollingInterval = null;
        }
    },

    async login() {
        const pwd = document.getElementById('admin-password').value;
        try {
            const res = await fetch('/api/admin/check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: pwd })
            });
            const data = await res.json();
            if (data.ok) {
                this.password = pwd;
                localStorage.setItem('3p_admin_password', pwd);
                this.showScreen('main-screen');
                this.openTab('dashboard');
            } else {
                alert('Mot de passe incorrect');
            }
        } catch (e) {
            alert('Erreur de connexion');
        }
    },

    logout() {
        this.password = '';
        localStorage.removeItem('3p_admin_password');
        this.showScreen('login-screen');
    },

    async checkAuth() {
        try {
            const data = await this.api('/api/admin/check', 'POST', { password: this.password });
            if (data.ok) {
                this.showScreen('main-screen');
                this.openTab('dashboard');
            } else {
                this.logout();
            }
        } catch (e) {
            this.logout();
        }
    },

    showScreen(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(id).classList.add('active');
    },

    openTab(tab) {
        this.currentTab = tab;
        document.querySelectorAll('.nav-links li').forEach(li => li.classList.remove('active'));
        const navItem = document.querySelector(`[data-tab="${tab}"]`);
        if (navItem) navItem.classList.add('active');
        
        console.log("Opening tab:", tab);
        
        const mainContent = document.querySelector('main.content');
        
        if (tab === 'orders') {
            this.startOrderPolling();
        } else {
            this.stopOrderPolling();
        }

        // Render tab skeleton/header immediately
        switch(tab) {
            case 'dashboard': mainContent.innerHTML = this.renderDashboardTab(); break;
            case 'orders': mainContent.innerHTML = this.renderOrdersTab(); break;
            case 'menu': mainContent.innerHTML = this.renderMenuTab(); break;
            case 'settings': mainContent.innerHTML = this.renderSettingsTab(); break;
            case 'options': mainContent.innerHTML = this.renderOptionsTab(); break;
            case 'push': mainContent.innerHTML = this.renderNotificationsTab(); break;
        }

        // Re-bind events for the new HTML
        this.bindTabEvents(tab);

        // Load data
        switch(tab) {
            case 'dashboard': this.loadDashboard(); break;
            case 'orders': this.loadOrders(); break;
            case 'menu': this.loadMenu(); break;
            case 'settings': this.loadSettings(); break;
            case 'options': this.loadOptions(); break;
            case 'push': this.loadPushInfo(); break;
        }
    },

    bindTabEvents(tab) {
        if (tab === 'orders') {
            document.getElementById('order-status-filter')?.addEventListener('change', () => this.loadOrders());
        }
        if (tab === 'settings') {
            document.getElementById('settings-form')?.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveSettings();
            });
            ['setting-min-delivery-price', 'setting-base-distance', 'setting-extra-km-price'].forEach(id => {
                document.getElementById(id)?.addEventListener('input', () => this.updateDeliveryPreview());
            });
            document.getElementById('map-search-btn')?.addEventListener('click', () => this.searchAddress());
            document.getElementById('map-search-input')?.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') { e.preventDefault(); this.searchAddress(); }
            });
        }
        if (tab === 'push') {
            document.getElementById('push-form')?.addEventListener('submit', (e) => {
                e.preventDefault();
                this.sendPush();
            });
            document.getElementById('push-type')?.addEventListener('change', (e) => {
                this.updatePushLinkOptions(e.target.value);
            });
        }
    },

    renderDashboardTab() {
        return `
            <header class="tab-header">
                <h1>Tableau de bord</h1>
                <div id="store-status-badge" class="badge">Chargement...</div>
            </header>
            <div class="stats-grid">
                <div class="stat-card"><h3>Commandes (Aujourd'hui)</h3><p id="stat-orders-today">0</p></div>
                <div class="stat-card"><h3>Chiffre d'affaires</h3><p id="stat-revenue">0 MAD</p></div>
                <div class="stat-card"><h3>Commandes en attente</h3><p id="stat-pending">0</p></div>
                <div class="stat-card"><h3>Appareils enregistrés</h3><p id="stat-devices">0</p></div>
            </div>
        `;
    },

    renderOrdersTab() {
        return `
            <header class="tab-header">
                <h1>Gestion des Commandes</h1>
                <div class="filters">
                    <select id="order-status-filter">
                        <option value="">Tous les statuts</option>
                        <option value="new">Nouvelles</option>
                        <option value="accepted">Acceptées</option>
                        <option value="preparing">En préparation</option>
                        <option value="ready">Prêtes</option>
                        <option value="delivered">Livrées</option>
                        <option value="cancelled">Annulées</option>
                    </select>
                </div>
            </header>
            <div class="table-container">
                <table id="orders-table">
                    <thead><tr><th>ID</th><th>Client</th><th>Mode</th><th>Total</th><th>Statut</th><th>Action</th></tr></thead>
                    <tbody></tbody>
                </table>
            </div>
        `;
    },

    renderMenuTab() {
        return `
            <header class="tab-header">
                <h1>Menu & Produits</h1>
                <div class="header-actions">
                    <button class="primary-btn" onclick="admin.showAddCategoryModal()">+ Catégorie</button>
                    <button class="primary-btn" onclick="admin.showAddProductModal()">+ Produit</button>
                </div>
            </header>
            <div class="menu-manager">
                <div class="categories-list" id="categories-container"></div>
                <div class="products-list" id="products-container"></div>
            </div>
        `;
    },

    renderSettingsTab() {
        // We'll keep this simplified for now but ensure it has all IDs
        return `
            <header class="tab-header"><h1>Paramètres du Restaurant</h1></header>
            <form id="settings-form" class="admin-form">
                <div class="settings-grid">
                    <div class="form-section">
                        <h3>Informations Boutique</h3>
                        <div class="form-row"><label>Nom de la boutique</label><input type="text" id="setting-store-name"></div>
                        <div class="form-row"><label>Boutique Ouverte (Manuel)</label><input type="checkbox" id="setting-is-open"></div>
                        <div class="form-row"><label>Téléphone</label><input type="text" id="setting-phone"></div>
                        <div class="form-row"><label>WhatsApp</label><input type="text" id="setting-whatsapp"></div>
                        <div class="form-row"><label>Adresse</label><textarea id="setting-address"></textarea></div>
                        <div class="form-row"><label>Message de fermeture</label><textarea id="setting-closed-message"></textarea></div>
                    </div>
                    <div class="form-section">
                        <h3>Horaires automatiques</h3>
                        <div class="form-row"><label>Activer auto-schedule</label><input type="checkbox" id="setting-auto-schedule"></div>
                        <div class="form-row"><label>Ouverture</label><input type="time" id="setting-opening-time"></div>
                        <div class="form-row"><label>Fermeture</label><input type="time" id="setting-closing-time"></div>
                        <div class="form-row"><label>Fuseau horaire</label><select id="setting-timezone"><option value="Africa/Casablanca">Maroc</option><option value="UTC">UTC</option></select></div>
                        <div class="status-preview">Statut actuel: <div id="setting-computed-status" class="badge">--</div></div>
                    </div>
                    <div class="form-section">
                        <h3>Localisation GPS</h3>
                        <div class="map-search-container"><input type="text" id="map-search-input"><button type="button" id="map-search-btn">🔍</button></div>
                        <div id="shop-map" style="height:300px; background:#222; border-radius:10px; margin:10px 0;"></div>
                        <div class="coord-inputs"><input type="number" id="setting-lat" step="any"><input type="number" id="setting-lng" step="any"></div>
                    </div>
                    <div class="form-section">
                        <h3>Livraison</h3>
                        <div class="form-row"><label>Prix Min</label><input type="number" id="setting-min-delivery-price"></div>
                        <div class="form-row"><label>Base (km)</label><input type="number" id="setting-base-distance"></div>
                        <div class="form-row"><label>Prix extra (MAD/km)</label><input type="number" id="setting-extra-km-price"></div>
                        <div class="form-row"><label>Max (km)</label><input type="number" id="setting-max-distance"></div>
                        <div class="delivery-preview"><table><thead><tr><th>Dist</th><th>Prix</th></tr></thead><tbody id="delivery-preview-body"></tbody></table></div>
                    </div>
                    <div class="form-section">
                        <h3>Images Hero Accueil</h3>
                        <div id="hero-images-container" class="hero-manager">
                            <p class="empty-msg">Chargement...</p>
                        </div>
                        <button type="button" class="secondary-btn" style="width:100%; margin-top:10px;" onclick="admin.showAddHeroModal()">+ Ajouter une image hero</button>
                    </div>
                </div>
                <button type="submit" class="primary-btn" style="width:100%; margin-top:20px;">🚀 Enregistrer les paramètres</button>
            </form>
        `;
    },

    renderOptionsTab() {
        return `
            <header class="tab-header">
                <h1>Gestion des Options</h1>
                <div class="header-actions">
                    <button class="primary-btn" onclick="admin.showAddOptionGroupModal()">+ Ajouter un Groupe</button>
                </div>
            </header>
            <div id="options-container" class="options-manager"><p class="empty-msg">Chargement des options...</p></div>
        `;
    },

    renderNotificationsTab() {
        return `
            <header class="tab-header">
                <h1>Notifications Push</h1>
                <p id="push-device-count">Chargement des appareils...</p>
            </header>
            <form id="push-form" class="admin-form">
                <div class="form-row"><label>Titre</label><input type="text" id="push-title" placeholder="Titre"></div>
                <div class="form-row"><label>Message</label><textarea id="push-body" placeholder="Message"></textarea></div>
                <div class="form-row"><label>Son 3P</label><input type="checkbox" id="push-custom-sound" checked></div>
                <div class="form-row"><label>Cible</label><select id="push-target"><option value="ALL">Tous</option></select></div>
                <div class="form-row"><label>Image URL</label><input type="url" id="push-image-url"></div>
                <div class="form-row"><label>Type</label><select id="push-type"><option value="home">Accueil</option><option value="product">Produit</option><option value="category">Catégorie</option><option value="order">Commande</option></select></div>
                <div class="form-row" id="push-link-container" style="display:none;"><label>Cible spécifique</label><div id="push-link-select-wrapper"></div></div>
                <button type="submit" id="send-push-btn" class="primary-btn" style="width:100%; margin-top:20px;">🚀 Envoyer la notification</button>
            </form>
        `;
    },

    async loadDashboard() {
        try {
            const stats = await this.api('/api/dashboard');
            const menu = await this.api('/api/menu');
            const settings = menu.settings;
            const tokens = await this.api('/api/device-tokens');

            this.setText('stat-orders-today', stats.todayOrders || 0);
            this.setText('stat-revenue', `${stats.todayRevenue || 0} MAD`);
            this.setText('stat-pending', stats.pendingOrders || 0);
            this.setText('stat-devices', tokens.tokens?.length || 0);

            const badge = document.getElementById('store-status-badge');
            if (badge) {
                const isOpen = settings.autoScheduleEnabled ? settings.computedIsStoreOpen : settings.isStoreOpen;
                const isAuto = settings.autoScheduleEnabled;
                badge.textContent = isOpen 
                    ? (isAuto ? 'OUVERT (AUTO)' : 'BOUTIQUE OUVERTE') 
                    : (isAuto ? 'FERMÉ (AUTO)' : 'BOUTIQUE FERMÉE');
                badge.className = `badge ${isOpen ? 'open' : 'closed'}`;
            }
        } catch (e) {
            console.error('Dashboard load failed', e);
        }
    },

    async loadOrders(isPolling = false) {
        const filterEl = document.getElementById('order-status-filter');
        const status = filterEl ? filterEl.value : '';
        const data = await this.api(`/api/orders?status=${status}`);
        
        if (isPolling && data.orders.length > this.lastOrderCount) {
            this.playOrderSound();
            this.showToast('Nouvelle commande reçue !');
        }
        this.lastOrderCount = data.orders.length;

        const tbody = document.querySelector('#orders-table tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        data.orders.forEach(order => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>#${order.id}</td>
                <td>${order.customerName}<br><small>${order.customerPhone}</small></td>
                <td>${order.mode === 'delivery' ? '🚗' : '🥡'}</td>
                <td><strong>${order.total} MAD</strong></td>
                <td><span class="status-badge status-${order.status}">${order.status.toUpperCase()}</span></td>
                <td><button class="primary-btn btn-sm" onclick="admin.viewOrder(${order.id})">Gérer</button></td>
            `;
            tbody.appendChild(tr);
        });
    },

    async viewOrder(id) {
        const order = await this.api(`/api/orders/${id}`);
        let itemsHtml = order.items.map(i => `<li>${i.quantity}x ${i.productName} (${i.lineTotal} MAD)</li>`).join('');
        
        let locationHtml = '';
        if (order.mode === 'delivery' && order.latitude && order.longitude) {
            locationHtml = `
                <p><strong>Distance:</strong> ${order.distanceKm || 0} km</p>
                <p><strong>Frais Livraison:</strong> ${order.deliveryFee || 0} MAD</p>
                <p><strong>Position GPS:</strong> ${order.latitude}, ${order.longitude} ${order.locationAccuracy ? `(±${Math.round(order.locationAccuracy)}m)` : ''}</p>
                <p><strong>Google Maps:</strong> <a href="https://www.google.com/maps/search/?api=1&query=${order.latitude},${order.longitude}" target="_blank">Ouvrir dans Maps</a></p>
            `;
        }

        this.showModal(`Détails Commande #${id}`, `
            <div class="order-details">
                <p><strong>Client:</strong> ${order.customerName}</p>
                <p><strong>Téléphone:</strong> ${order.customerPhone}</p>
                <p><strong>Adresse:</strong> ${order.address || 'N/A'}</p>
                ${locationHtml}
                <hr style="margin:15px 0; border:0; border-top:1px solid var(--border)">
                <ul style="margin-bottom:15px">${itemsHtml}</ul>
                <p><strong>TOTAL:</strong> ${order.total} MAD</p>
                <hr style="margin:15px 0; border:0; border-top:1px solid var(--border)">
                <label>Changer le statut:</label>
                <select id="update-order-status" style="margin-top:10px">
                    <option value="new" ${order.status === 'new' ? 'selected' : ''}>Nouveau</option>
                    <option value="accepted" ${order.status === 'accepted' ? 'selected' : ''}>Accepté</option>
                    <option value="preparing" ${order.status === 'preparing' ? 'selected' : ''}>En préparation</option>
                    <option value="ready" ${order.status === 'ready' ? 'selected' : ''}>Prêt</option>
                    <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Livré</option>
                    <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Annulé</option>
                </select>
                <button class="primary-btn" style="width:100%; margin-top:20px" onclick="admin.updateOrderStatus(${id})">Mettre à jour</button>
            </div>
        `);
    },

    async updateOrderStatus(id) {
        const status = document.getElementById('update-order-status').value;
        await this.api(`/api/orders/${id}/status`, 'PATCH', { status });
        this.hideModal();
        this.loadOrders();
    },

    async loadMenu() {
        console.log("Loading menu...");
        try {
            const data = await this.api('/api/menu');
            this.menu = data;
            this.renderCategories();
            if (this.menu?.categories?.length > 0) {
                const firstCat = this.menu.categories[0];
                this.renderProducts(firstCat.name || firstCat);
            }
        } catch (e) {
            console.error("Failed to load menu", e);
            this.showToast("Erreur de chargement du menu", "error");
        }
    },

    renderCategories() {
        const container = document.getElementById('categories-container');
        container.innerHTML = '';
        this.menu.categories.forEach(cat => {
            const name = cat.name || cat;
            const div = document.createElement('div');
            div.className = 'category-item';
            div.innerHTML = `<span>${name}</span> <button class="secondary-btn btn-sm icon-btn" onclick="admin.editCategory('${name}')">✏️</button>`;
            div.onclick = (e) => {
                if (e.target.tagName === 'BUTTON') return;
                document.querySelectorAll('.category-item').forEach(i => i.classList.remove('active'));
                div.classList.add('active');
                this.renderProducts(name);
            };
            container.appendChild(div);
        });
    },

    renderProducts(categoryName) {
        const container = document.getElementById('products-container');
        container.innerHTML = '';
        const products = this.menu.products.filter(p => p.category === categoryName);
        
        products.forEach(p => {
            const card = document.createElement('div');
            card.className = 'product-card';
            card.innerHTML = `
                <img src="${p.thumbnailUrl || p.imageUrl || 'logo-3p.png'}" class="product-img">
                <div class="product-info">
                    <h4>${p.name}</h4>
                    <p class="price">${p.price} MAD</p>
                    <p style="font-size:12px; color:var(--text-dim)">${p.desc?.substring(0, 50) || ''}...</p>
                    <div class="product-actions">
                        <button class="primary-btn btn-sm" onclick="admin.editProduct('${p.id}')">Modifier</button>
                        <button class="secondary-btn btn-sm" onclick="admin.toggleProduct('${p.id}')">${p.available ? 'Masquer' : 'Afficher'}</button>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    },
    async loadSettings() {
        console.log("Loading settings...");
        try {
            const settings = await this.api('/api/settings');
            this.setVal('setting-store-name', settings.storeName);
            this.setCheck('setting-is-open', settings.manualIsStoreOpen);
            this.setVal('setting-phone', settings.shopPhone);
            this.setVal('setting-whatsapp', settings.shopWhatsAppNumber);
            this.setVal('setting-address', settings.shopAddress);
            this.setVal('setting-closed-message', settings.closedMessage);
            
            this.setVal('setting-lat', settings.shopLatitude);
            this.setVal('setting-lng', settings.shopLongitude);
            
            this.setVal('setting-min-delivery-price', settings.minimumDeliveryPrice ?? 10);
            this.setVal('setting-base-distance', settings.baseDeliveryDistanceKm ?? 1);
            this.setVal('setting-extra-km-price', settings.extraKmPrice ?? 5);
            this.setVal('setting-max-distance', settings.maxDeliveryKm);

            // Auto Hours
            this.setCheck('setting-auto-schedule', settings.autoScheduleEnabled);
            this.setVal('setting-opening-time', settings.openingTime || '11:00');
            this.setVal('setting-closing-time', settings.closingTime || '03:00');
            this.setVal('setting-timezone', settings.timezone || 'Africa/Casablanca');
            
            this.updateComputedStatusPreview(settings);

            if (document.getElementById('shop-map')) {
                this.initMap(settings.shopLatitude, settings.shopLongitude);
            }
            this.renderHeroImagesList(settings.heroImages || []);
            
            this.updateDeliveryPreview();
        } catch (e) {
            console.error("Failed to load settings", e);
            this.showToast("Erreur de chargement des paramètres", "error");
        }
    },

    initMap(lat, lng) {
        if (this.map) {
            this.map.setView([lat, lng], 13);
            if (this.shopMarker) this.shopMarker.setLatLng([lat, lng]);
            return;
        }

        this.map = L.map('shop-map').setView([lat, lng], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);

        this.shopMarker = L.marker([lat, lng], { draggable: true }).addTo(this.map);
        
        this.shopMarker.on('dragend', () => {
            const pos = this.shopMarker.getLatLng();
            document.getElementById('setting-lat').value = pos.lat.toFixed(7);
            document.getElementById('setting-lng').value = pos.lng.toFixed(7);
        });

        this.map.on('click', (e) => {
            this.shopMarker.setLatLng(e.latlng);
            document.getElementById('setting-lat').value = e.latlng.lat.toFixed(7);
            document.getElementById('setting-lng').value = e.latlng.lng.toFixed(7);
        });

        // Small delay to fix gray map issue in hidden tabs
        setTimeout(() => this.map.invalidateSize(), 200);
    },

    async searchAddress() {
        const query = document.getElementById('map-search-input').value;
        if (!query) return;
        
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
            const data = await res.json();
            if (data.length > 0) {
                const { lat, lon } = data[0];
                const newLat = parseFloat(lat);
                const newLng = parseFloat(lon);
                this.map.setView([newLat, newLng], 16);
                this.shopMarker.setLatLng([newLat, newLng]);
                document.getElementById('setting-lat').value = newLat.toFixed(7);
                document.getElementById('setting-lng').value = newLng.toFixed(7);
            } else {
                alert('Adresse non trouvée');
            }
        } catch (e) {
            console.error('Search error', e);
        }
    },

    updateComputedStatusPreview(settings) {
        const badge = document.getElementById('setting-computed-status');
        if (!badge) return;
        
        const isOpen = settings.computedIsStoreOpen;
        badge.textContent = isOpen ? 'OUVERT' : 'FERMÉ';
        badge.className = `badge ${isOpen ? 'open' : 'closed'}`;
    },

    updateDeliveryPreview() {
        const minPrice = parseFloat(document.getElementById('setting-min-delivery-price').value) || 0;
        const baseDist = parseFloat(document.getElementById('setting-base-distance').value) || 0;
        const extraPrice = parseFloat(document.getElementById('setting-extra-km-price').value) || 0;
        
        const tbody = document.getElementById('delivery-preview-body');
        tbody.innerHTML = '';
        
        const testDistances = [0.5, 1, 1.5, 2, 3, 5, 10];
        testDistances.forEach(d => {
            let price = minPrice;
            if (d > baseDist) {
                price = minPrice + Math.ceil(d - baseDist) * extraPrice;
            }
            
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${d} km</td><td><strong>${price} MAD</strong></td>`;
            tbody.appendChild(tr);
        });
    },
    async saveSettings() {
          const settings = {
            storeName: this.getVal('setting-store-name'),
            isStoreOpen: document.getElementById('setting-is-open').checked,
            shopPhone: this.getVal('setting-phone'),
            shopWhatsAppNumber: this.getVal('setting-whatsapp'),
            shopAddress: this.getVal('setting-address'),
            closedMessage: this.getVal('setting-closed-message'),
            shopLatitude: parseFloat(this.getVal('setting-lat')),
            shopLongitude: parseFloat(this.getVal('setting-lng')),
            minimumDeliveryPrice: parseFloat(this.getVal('setting-min-delivery-price')),
            baseDeliveryDistanceKm: parseFloat(this.getVal('setting-base-distance')),
            extraKmPrice: parseFloat(this.getVal('setting-extra-km-price')),
            maxDeliveryKm: parseFloat(this.getVal('setting-max-distance')),
            autoScheduleEnabled: document.getElementById('setting-auto-schedule').checked,
            openingTime: this.getVal('setting-opening-time'),
            closingTime: this.getVal('setting-closing-time'),
            timezone: this.getVal('setting-timezone'),
            heroImages: this.currentHeroImages || []
        };
        await this.api('/api/settings', 'PUT', settings);
        this.showToast('Paramètres enregistrés !');
        this.loadSettings();
    },

    async loadPushInfo() {
        console.log("Loading notifications info...");
        try {
            const data = await this.api('/api/device-tokens');
            const count = data?.tokens?.length || 0;
            const countEl = document.getElementById('push-device-count');
            if (countEl) countEl.textContent = `${count} appareils enregistrés`;
            
            // Also load menu to populate link targets
            if (!this.menu) await this.loadMenu();
        } catch (e) {
            console.error("Failed to load push info", e);
            const countEl = document.getElementById('push-device-count');
            if (countEl) countEl.textContent = "Erreur de chargement des appareils.";
        }
    },

    updatePushLinkOptions(type) {
        const container = document.getElementById('push-link-container');
        const selectContainer = document.getElementById('push-link-select-wrapper');
        
        if (!['product', 'category', 'order'].includes(type)) {
            container.style.display = 'none';
            return;
        }

        container.style.display = 'block';
        
        if (type === 'order') {
            selectContainer.innerHTML = '<input type="text" id="push-link-id" placeholder="ID de la commande" class="form-control">';
        } else {
            let options = '<option value="">-- Choisir --</option>';
            if (type === 'product' && this.menu?.products) {
                this.menu.products.forEach(p => {
                    options += `<option value="${p.id}">${p.name}</option>`;
                });
            } else if (type === 'category' && this.menu?.categories) {
                this.menu.categories.forEach(c => {
                    const name = c.name || c;
                    options += `<option value="${name}">${name}</option>`;
                });
            }
            selectContainer.innerHTML = `<select id="push-link-id" onchange="admin.autoFillPushImage(this.value)">${options}</select>`;
        }
    },

    autoFillPushImage(id) {
        const type = document.getElementById('push-type').value;
        const imgInput = document.getElementById('push-image-url');
        
        if (type === 'product' && this.menu?.products) {
            const p = this.menu.products.find(x => String(x.id) === String(id));
            if (p?.imageUrl) imgInput.value = p.imageUrl;
        }
    },

    async sendPush() {
        const btn = document.getElementById('send-push-btn');
        btn.disabled = true;
        btn.textContent = 'Envoi en cours...';

        const payload = {
            title: document.getElementById('push-title').value,
            message: document.getElementById('push-body').value,
            imageUrl: document.getElementById('push-image-url').value,
            customerId: document.getElementById('push-target').value,
            type: document.getElementById('push-type').value,
            id: document.getElementById('push-link-id').value,
            useCustomSound: document.getElementById('push-custom-sound').checked
        };

        // Map type to the keys expected by /api/notify
        if (payload.type === 'product') payload.linkedProductId = payload.id;
        if (payload.type === 'category') payload.linkedCategoryId = payload.id;
        if (payload.type === 'order') payload.orderId = payload.id;

        try {
            const res = await this.api('/api/notify', 'POST', payload);
            alert(`Envoyé ! Succès: ${res.count}, Échecs: ${res.failureCount}`);
        } catch (e) {
            alert('Erreur d\'envoi');
        } finally {
            btn.disabled = false;
            btn.textContent = '🚀 Envoyer la notification';
        }
    },

    showModal(title, bodyHtml) {
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-body').innerHTML = bodyHtml;
        document.getElementById('modal-overlay').style.display = 'flex';
    },

    hideModal() {
        document.getElementById('modal-overlay').style.display = 'none';
    },

    showAddProductModal() {
        this.showModal('Ajouter un produit', `
            <form id="add-product-form" class="admin-form">
                <div class="form-row"><label>Nom</label><input type="text" id="p-name" required></div>
                <div class="form-row"><label>Catégorie</label><select id="p-cat">${this.menu.categories.map(c => `<option value="${c.name || c}">${c.name || c}</option>`).join('')}</select></div>
                <div class="form-row"><label>Prix (MAD)</label><input type="number" id="p-price" required></div>
                <div class="form-row"><label>Description</label><textarea id="p-desc"></textarea></div>
                <div class="form-row"><label>Image URL</label><input type="text" id="p-img"></div>
                <div class="form-row"><label>Thumbnail URL (Optimisée)</label><input type="text" id="p-thumb" placeholder="Optionnel"></div>
                <button type="button" class="primary-btn" style="width:100%" onclick="admin.saveNewProduct()">Ajouter le produit</button>
            </form>
        `);
    },

    async saveNewProduct() {
        const body = {
            name: document.getElementById('p-name').value,
            category: document.getElementById('p-cat').value,
            price: parseFloat(document.getElementById('p-price').value),
            desc: document.getElementById('p-desc').value,
            imageUrl: document.getElementById('p-img').value,
            thumbnailUrl: document.getElementById('p-thumb').value,
            available: true
        };
        await this.api('/api/menu/product', 'POST', body);
        this.hideModal();
        this.loadMenu();
    },

    async editProduct(id) {
        const p = this.menu.products.find(x => x.id === id);
        this.showModal(`Modifier ${p.name}`, `
            <form class="admin-form">
                <div class="form-row"><label>Nom</label><input type="text" id="p-name" value="${p.name}"></div>
                <div class="form-row"><label>Prix</label><input type="number" id="p-price" value="${p.price}"></div>
                <div class="form-row"><label>Description</label><textarea id="p-desc">${p.desc || ''}</textarea></div>
                <div class="form-row"><label>Image URL</label><input type="text" id="p-img" value="${p.imageUrl || ''}"></div>
                <div class="form-row"><label>Thumbnail URL</label><input type="text" id="p-thumb" value="${p.thumbnailUrl || ''}"></div>
                <button type="button" class="primary-btn" style="width:100%" onclick="admin.updateProduct('${id}')">Enregistrer</button>
                <button type="button" class="danger-btn" style="width:100%; margin-top:10px" onclick="admin.deleteProduct('${id}')">Supprimer</button>
            </form>
        `);
    },

    async updateProduct(id) {
        const body = {
            name: document.getElementById('p-name').value,
            price: parseFloat(document.getElementById('p-price').value),
            desc: document.getElementById('p-desc').value,
            imageUrl: document.getElementById('p-img').value,
            thumbnailUrl: document.getElementById('p-thumb').value
        };
        await this.api(`/api/menu/product/${id}`, 'PUT', body);
        this.hideModal();
        this.loadMenu();
    },

    async deleteProduct(id) {
        if (!confirm('Supprimer ce produit ?')) return;
        await this.api(`/api/menu/product/${id}`, 'DELETE');
        this.hideModal();
        this.loadMenu();
    },

    async toggleProduct(id) {
        const p = this.menu.products.find(x => x.id === id);
        await this.api(`/api/menu/product/${id}`, 'PUT', { available: !p.available });
        this.loadMenu();
    },

    showAddCategoryModal() {
        this.showModal('Ajouter une catégorie', `
            <form class="admin-form">
                <div class="form-row"><label>Nom</label><input type="text" id="c-name" required></div>
                <div class="form-row"><label>Image URL</label><input type="text" id="c-img"></div>
                <button type="button" class="primary-btn" style="width:100%" onclick="admin.saveNewCategory()">Ajouter</button>
            </form>
        `);
    },

    async saveNewCategory() {
        const body = {
            name: document.getElementById('c-name').value,
            imageUrl: document.getElementById('c-img').value
        };
        await this.api('/api/menu/category', 'POST', body);
        this.hideModal();
        this.loadMenu();
    },

    editCategory(name) {
        const cat = this.menu.categories.find(c => (c.name || c) === name);
        const catName = typeof cat === 'object' ? cat.name : cat;
        const catImg = typeof cat === 'object' ? (cat.imageUrl || '') : '';

        this.showModal(`Modifier Catégorie: ${catName}`, `
            <form class="admin-form">
                <div class="form-row"><label>Nom de la catégorie</label><input type="text" id="c-edit-name" value="${catName}"></div>
                <div class="form-row"><label>Image URL</label><input type="text" id="c-edit-img" value="${catImg}"></div>
                <button type="button" class="primary-btn" style="width:100%" onclick="admin.updateCategory('${encodeURIComponent(catName)}')">Enregistrer</button>
                <button type="button" class="danger-btn" style="width:100%; margin-top:10px" onclick="admin.deleteCategory('${encodeURIComponent(catName)}')">Supprimer</button>
            </form>
        `);
    },

    async updateCategory(oldName) {
        const body = {
            name: document.getElementById('c-edit-name').value,
            imageUrl: document.getElementById('c-edit-img').value
        };
        await this.api(`/api/menu/category/${oldName}`, 'PUT', body);
        this.hideModal();
        this.loadMenu();
    },

    async deleteCategory(name) {
        if (!confirm('Supprimer cette catégorie et tous ses produits ?')) return;
        await this.api(`/api/menu/category/${name}`, 'DELETE');
        this.hideModal();
        this.loadMenu();
    },

    async loadOptions() {
        console.log("Loading options...");
        const container = document.getElementById('options-container');
        if (container) container.innerHTML = '<p class="empty-msg">Chargement des options...</p>';

        try {
            const data = await this.api('/api/options');
            const menu = await this.api('/api/menu');
            this.allProducts = menu?.products || [];
            this.renderOptions(data?.groups || []);
        } catch (e) {
            console.error('Failed to load options', e);
            if (container) container.innerHTML = '<p class="empty-msg" style="color:var(--danger)">Erreur de chargement. Vérifiez l’API.</p>';
        }
    },

    renderOptions(groups) {
        const container = document.getElementById('options-container');
        if (!groups || groups.length === 0) {
            container.innerHTML = '<p class="empty-msg">Aucun groupe d\'options défini.</p>';
            return;
        }

        container.innerHTML = (groups || []).map(group => `
            <div class="option-group-card" id="group-${group.id}">
                <div class="option-group-header">
                    <div class="option-group-info">
                        <h3>${group.name}</h3>
                        <div class="option-group-badges">
                            ${group.required ? '<span class="badge status-badge status-new">OBLIGATOIRE</span>' : '<span class="badge-outline">OPTIONNEL</span>'}
                            <span class="badge-outline">Min: ${group.minSelect || 0}</span>
                            <span class="badge-outline">Max: ${group.maxSelect || 1}</span>
                        </div>
                    </div>
                    <div class="option-group-actions">
                        <button class="secondary-btn btn-sm icon-btn" onclick="admin.showEditOptionGroupModal(${group.id})">✏️</button>
                        <button class="primary-btn btn-sm" onclick="admin.showAddOptionItemModal(${group.id})">+ Option</button>
                        <button class="danger-btn btn-sm icon-btn" onclick="admin.deleteOptionGroup(${group.id})">🗑️</button>
                    </div>
                </div>
                <div class="option-group-content">
                    <div class="option-items-list">
                        ${(group.items || []).length > 0 ? group.items.map(item => `
                            <div class="option-item-row">
                                <div class="option-item-info">
                                    ${item.imageUrl ? `<img src="${item.imageUrl}" class="option-item-img">` : ''}
                                    <span class="option-item-name">${item.name}</span>
                                    <span class="option-item-price">+ ${item.price} MAD</span>
                                    ${!item.available ? '<span class="status-badge status-cancelled">INDISPONIBLE</span>' : ''}
                                </div>
                                <div class="option-item-actions">
                                    <button class="secondary-btn btn-sm icon-btn" onclick="admin.showEditOptionItemModal(${group.id}, ${item.id})">✏️</button>
                                    <button class="danger-btn btn-sm icon-btn" onclick="admin.deleteOptionItem(${item.id})">🗑️</button>
                                </div>
                            </div>
                        `).join('') : '<p class="empty-msg">Aucune option dans ce groupe.</p>'}
                    </div>
                    
                    <div class="affected-products">
                        <h4>Produits affectés</h4>
                        <div class="product-tag-list" id="assigned-products-${group.id}">
                            ${this.renderAssignedProducts(group.id)}
                            <button class="primary-btn btn-sm" onclick="admin.showAssignProductModal(${group.id})">+ Affecter</button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    },

    renderAssignedProducts(groupId) {
        if (!this.allProducts) return '';
        const assigned = this.allProducts.filter(p => p.options?.some(o => Number(o.id) === Number(groupId)));
        return assigned.map(p => `
            <div class="product-tag">
                ${p.name}
                <span class="remove-tag" onclick="admin.unassignOptionGroup('${p.id}', ${groupId})">&times;</span>
            </div>
        `).join('');
    },

    showAddOptionGroupModal() {
        this.showModal('Ajouter un Groupe d\'Options', `
            <form id="add-option-group-form" class="admin-form">
                <div class="form-row"><label>Nom du groupe (ex: CHOIX SAUCE)</label><input type="text" id="og-name" required></div>
                <div class="form-row">
                    <label>Obligatoire</label>
                    <div class="toggle-container">
                        <input type="checkbox" id="og-required">
                        <span class="toggle-slider"></span>
                    </div>
                </div>
                <div class="form-row"><label>Sélections Min</label><input type="number" id="og-min" value="0"></div>
                <div class="form-row"><label>Sélections Max</label><input type="number" id="og-max" value="1"></div>
                <div class="form-row"><label>Ordre d'affichage</label><input type="number" id="og-sort" value="0"></div>
                <button type="button" class="primary-btn" style="width:100%" onclick="admin.saveOptionGroup()">Enregistrer le groupe</button>
            </form>
        `);
    },

    async saveOptionGroup(id = null) {
        const body = {
            name: document.getElementById('og-name').value,
            required: document.getElementById('og-required').checked,
            minSelect: parseInt(document.getElementById('og-min').value),
            maxSelect: parseInt(document.getElementById('og-max').value),
            sortOrder: parseInt(document.getElementById('og-sort').value)
        };
        
        if (id) {
            await this.api(`/api/options/groups/${id}`, 'PUT', body);
        } else {
            await this.api('/api/options/groups', 'POST', body);
        }
        this.hideModal();
        this.loadOptions();
    },

    async showEditOptionGroupModal(id) {
        const data = await this.api('/api/options');
        const group = data.groups.find(g => g.id === id);
        this.showModal('Modifier le Groupe', `
            <form class="admin-form">
                <div class="form-row"><label>Nom du groupe</label><input type="text" id="og-name" value="${group.name}"></div>
                <div class="form-row">
                    <label>Obligatoire</label>
                    <div class="toggle-container">
                        <input type="checkbox" id="og-required" ${group.required ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </div>
                </div>
                <div class="form-row"><label>Sélections Min</label><input type="number" id="og-min" value="${group.minSelect}"></div>
                <div class="form-row"><label>Sélections Max</label><input type="number" id="og-max" value="${group.maxSelect}"></div>
                <div class="form-row"><label>Ordre d'affichage</label><input type="number" id="og-sort" value="${group.sortOrder}"></div>
                <button type="button" class="primary-btn" style="width:100%" onclick="admin.saveOptionGroup(${id})">Mettre à jour</button>
            </form>
        `);
    },

    async deleteOptionGroup(id) {
        if (!confirm('Supprimer ce groupe et toutes ses options ?')) return;
        await this.api(`/api/options/groups/${id}`, 'DELETE');
        this.loadOptions();
    },

    showAddOptionItemModal(groupId) {
        this.showModal('Ajouter une Option', `
            <form class="admin-form">
                <div class="form-row"><label>Nom de l'option (ex: Sauce BBQ)</label><input type="text" id="oi-name" required></div>
                <div class="form-row"><label>Prix Supplémentaire (MAD)</label><input type="number" id="oi-price" value="0"></div>
                <div class="form-row"><label>Image URL</label><input type="text" id="oi-img"></div>
                <div class="form-row"><label>Ordre d'affichage</label><input type="number" id="oi-sort" value="0"></div>
                <button type="button" class="primary-btn" style="width:100%" onclick="admin.saveOptionItem(${groupId})">Ajouter l'option</button>
            </form>
        `);
    },

    async saveOptionItem(groupId, itemId = null) {
        const body = {
            name: document.getElementById('oi-name').value,
            price: parseFloat(document.getElementById('oi-price').value),
            imageUrl: document.getElementById('oi-img').value,
            sortOrder: parseInt(document.getElementById('oi-sort').value)
        };
        
        if (itemId) {
            await this.api(`/api/options/items/${itemId}`, 'PUT', body);
        } else {
            await this.api(`/api/options/groups/${groupId}/items`, 'POST', body);
        }
        this.hideModal();
        this.loadOptions();
    },

    async showEditOptionItemModal(groupId, itemId) {
        const data = await this.api('/api/options');
        const group = data.groups.find(g => g.id === groupId);
        const item = group.items.find(i => i.id === itemId);
        this.showModal('Modifier l\'Option', `
            <form class="admin-form">
                <div class="form-row"><label>Nom de l'option</label><input type="text" id="oi-name" value="${item.name}"></div>
                <div class="form-row"><label>Prix Supplémentaire</label><input type="number" id="oi-price" value="${item.price}"></div>
                <div class="form-row"><label>Image URL</label><input type="text" id="oi-img" value="${item.imageUrl || ''}"></div>
                <div class="form-row"><label>Ordre d'affichage</label><input type="number" id="oi-sort" value="${item.sortOrder}"></div>
                <button type="button" class="primary-btn" style="width:100%" onclick="admin.saveOptionItem(${groupId}, ${itemId})">Mettre à jour</button>
                <button type="button" class="secondary-btn" style="width:100%; margin-top:10px" onclick="admin.toggleOptionItem(${itemId}, ${!item.available})">${item.available ? 'Rendre Indisponible' : 'Rendre Disponible'}</button>
            </form>
        `);
    },

    async toggleOptionItem(id, available) {
        await this.api(`/api/options/items/${id}`, 'PUT', { available });
        this.hideModal();
        this.loadOptions();
    },

    async deleteOptionItem(id) {
        if (!confirm('Supprimer cette option ?')) return;
        await this.api(`/api/options/items/${id}`, 'DELETE');
        this.loadOptions();
    },

    showAssignProductModal(groupId) {
        const unassigned = this.allProducts.filter(p => !p.options?.some(o => Number(o.id) === Number(groupId)));
        this.showModal('Affecter à des Produits', `
            <div class="admin-form">
                <div class="form-row">
                    <label>Sélectionner un produit</label>
                    <select id="assign-product-id">
                        ${unassigned.map(p => `<option value="${p.id}">${p.name} (${p.category})</option>`).join('')}
                    </select>
                </div>
                <button type="button" class="primary-btn" style="width:100%" onclick="admin.assignOptionGroup(${groupId})">Affecter</button>
            </div>
        `);
    },

    async assignOptionGroup(groupId) {
        const productId = document.getElementById('assign-product-id').value;
        await this.api('/api/options/assign', 'POST', { productId, groupId });
        this.hideModal();
        this.loadOptions();
    },

    async unassignOptionGroup(productId, groupId) {
        if (!confirm('Retirer ce groupe d\'option de ce produit ?')) return;
        await this.api('/api/options/assign', 'DELETE', { productId, groupId });
        this.loadOptions();
    },

    renderHeroImagesList(images) {
        this.currentHeroImages = images || [];
        const container = document.getElementById('hero-images-container');
        if (!container) return;
        
        if (this.currentHeroImages.length === 0) {
            container.innerHTML = '<p class="empty-msg">Aucune image hero configurée</p>';
            return;
        }

        container.innerHTML = this.currentHeroImages.map((img, index) => `
            <div class="hero-card" style="display:flex; align-items:center; gap:12px; margin-bottom:12px; padding:12px; border:1px solid var(--border); border-radius:10px; background:var(--surface-light)">
                <img src="${img.imageUrl}" style="width:60px; height:40px; object-fit:cover; border-radius:4px">
                <div style="flex-grow:1">
                    <div style="font-weight:600">${img.title || 'Sans titre'}</div>
                    <div style="font-size:11px; color:var(--text-dim)">${img.subtitle || ''}</div>
                </div>
                <div class="hero-actions" style="display:flex; gap:8px">
                    <button class="secondary-btn btn-sm" onclick="admin.editHero(${index})">✏️</button>
                    <button class="danger-btn btn-sm" onclick="admin.deleteHero(${index})">🗑️</button>
                </div>
            </div>
        `).join('');
    },

    showAddHeroModal() {
        this.showHeroModal();
    },

    editHero(index) {
        this.showHeroModal(index);
    },

    deleteHero(index) {
        if (confirm('Supprimer cette image hero ?')) {
            this.currentHeroImages.splice(index, 1);
            this.renderHeroImagesList(this.currentHeroImages);
        }
    },

    showHeroModal(index = null) {
        const isEdit = index !== null;
        const hero = isEdit ? this.currentHeroImages[index] : { imageUrl: '', title: '', subtitle: '', actionType: 'none', active: true };
        
        this.showModal(`${isEdit ? 'Modifier' : 'Ajouter'} Image Hero`, `
            <form id="hero-form" class="admin-form">
                <div class="form-row">
                    <label>URL Image</label>
                    <input type="text" id="hero-url" value="${hero.imageUrl}" required>
                </div>
                <div class="form-row">
                    <label>Titre</label>
                    <input type="text" id="hero-title" value="${hero.title || ''}">
                </div>
                <div class="form-row">
                    <label>Sous-titre</label>
                    <input type="text" id="hero-subtitle" value="${hero.subtitle || ''}">
                </div>
                <div class="form-row">
                    <label>Action</label>
                    <select id="hero-action">
                        <option value="none" ${hero.actionType === 'none' ? 'selected' : ''}>Aucune</option>
                        <option value="product" ${hero.actionType === 'product' ? 'selected' : ''}>Produit</option>
                        <option value="category" ${hero.actionType === 'category' ? 'selected' : ''}>Catégorie</option>
                    </select>
                </div>
                <div class="form-row">
                    <label>ID Cible (Product ID / Category Name)</label>
                    <input type="text" id="hero-target" value="${hero.productId || hero.categoryId || ''}">
                </div>
                <button type="submit" class="primary-btn" style="width:100%">${isEdit ? 'Mettre à jour' : 'Ajouter'}</button>
            </form>
        `);
        
        document.getElementById('hero-form').onsubmit = (e) => {
            e.preventDefault();
            const newHero = {
                imageUrl: document.getElementById('hero-url').value,
                title: document.getElementById('hero-title').value,
                subtitle: document.getElementById('hero-subtitle').value,
                actionType: document.getElementById('hero-action').value,
                active: true
            };
            
            const target = document.getElementById('hero-target').value;
            if (newHero.actionType === 'product') newHero.productId = target;
            if (newHero.actionType === 'category') newHero.categoryId = target;

            if (isEdit) {
                this.currentHeroImages[index] = newHero;
            } else {
                this.currentHeroImages.push(newHero);
            }
            
            this.renderHeroImagesList(this.currentHeroImages);
            this.hideModal();
        };
    }
};

admin.init();
