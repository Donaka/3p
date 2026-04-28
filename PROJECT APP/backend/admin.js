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
        document.getElementById('login-btn').addEventListener('click', () => this.login());
        document.getElementById('logout-btn').addEventListener('click', () => this.logout());
        
        document.querySelectorAll('.nav-links li').forEach(li => {
            li.addEventListener('click', (e) => {
                const tab = e.currentTarget.getAttribute('data-tab');
                this.switchTab(tab);
            });
        });

        document.getElementById('order-status-filter').addEventListener('change', () => this.loadOrders());
        document.getElementById('settings-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveSettings();
        });
        
        // Settings Listeners
        ['setting-min-delivery-price', 'setting-base-distance', 'setting-extra-km-price'].forEach(id => {
            document.getElementById(id)?.addEventListener('input', () => this.updateDeliveryPreview());
        });

        document.getElementById('map-search-btn')?.addEventListener('click', () => this.searchAddress());
        document.getElementById('map-search-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.searchAddress();
            }
        });
        document.getElementById('push-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.sendPush();
        });

        document.getElementById('push-type').addEventListener('change', (e) => {
            this.updatePushLinkOptions(e.target.value);
        });

        document.getElementById('push-link-id').addEventListener('change', (e) => {
            this.autoFillPushImage(e.target.value);
        });


        document.querySelector('.close-modal').addEventListener('click', () => this.hideModal());
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
                this.loadDashboard();
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
                this.loadDashboard();
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

    switchTab(tab) {
        this.currentTab = tab;
        document.querySelectorAll('.nav-links li').forEach(li => li.classList.remove('active'));
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
        
        document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
        document.getElementById(`${tab}-tab`).classList.add('active');

        if (tab === 'orders') {
            this.startOrderPolling();
        } else {
            this.stopOrderPolling();
        }

        switch(tab) {
            case 'dashboard': this.loadDashboard(); break;
            case 'orders': this.loadOrders(); break;
            case 'menu': this.loadMenu(); break;
            case 'settings': this.loadSettings(); break;
            case 'options': this.loadOptions(); break;
            case 'push': this.loadPushInfo(); break;
        }
    },

    async loadDashboard() {
        try {
            const stats = await this.api('/api/dashboard');
            const menu = await this.api('/api/menu');
            const settings = menu.settings;
            const tokens = await this.api('/api/device-tokens');

            document.getElementById('stat-orders-today').textContent = stats.todayOrders || 0;
            document.getElementById('stat-revenue').textContent = `${stats.todayRevenue || 0} MAD`;
            document.getElementById('stat-pending').textContent = stats.pendingOrders || 0;
            document.getElementById('stat-devices').textContent = tokens.tokens?.length || 0;

            const badge = document.getElementById('store-status-badge');
            if (badge) {
                badge.textContent = settings.isStoreOpen ? 'BOUTIQUE OUVERTE' : 'BOUTIQUE FERMÉE';
                badge.className = `badge ${settings.isStoreOpen ? 'open' : 'closed'}`;
            }
        } catch (e) {
            console.error('Dashboard load failed', e);
        }
    },

    async loadOrders(isPolling = false) {
        const status = document.getElementById('order-status-filter').value;
        const data = await this.api(`/api/orders?status=${status}`);
        
        if (isPolling && data.orders.length > this.lastOrderCount) {
            this.playOrderSound();
            this.showToast('Nouvelle commande reçue !');
        }
        this.lastOrderCount = data.orders.length;

        const tbody = document.querySelector('#orders-table tbody');
        tbody.innerHTML = '';

        data.orders.forEach(order => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>#${order.id}</td>
                <td>${order.customerName}<br><small>${order.customerPhone}</small></td>
                <td>${order.mode === 'delivery' ? '🚗' : '🥡'}</td>
                <td><strong>${order.total} MAD</strong></td>
                <td><span class="status-badge status-${order.status}">${order.status.toUpperCase()}</span></td>
                <td><button class="btn-primary btn-sm" onclick="admin.viewOrder(${order.id})">Gérer</button></td>
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
                <button class="btn-primary" style="width:100%; margin-top:20px" onclick="admin.updateOrderStatus(${id})">Mettre à jour</button>
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
        const data = await this.api('/api/menu');
        this.menu = data;
        this.renderCategories();
        if (this.menu.categories && this.menu.categories.length > 0) {
            const firstCat = this.menu.categories[0];
            this.renderProducts(firstCat.name || firstCat);
        }
    },

    renderCategories() {
        const container = document.getElementById('categories-container');
        container.innerHTML = '';
        this.menu.categories.forEach(cat => {
            const name = cat.name || cat;
            const div = document.createElement('div');
            div.className = 'category-item';
            div.innerHTML = `<span>${name}</span> <button class="btn-sm" onclick="admin.editCategory('${name}')">✏️</button>`;
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
                <img src="${p.imageUrl || 'logo-3p.png'}" class="product-img">
                <div class="product-info">
                    <h4>${p.name}</h4>
                    <p class="price">${p.price} MAD</p>
                    <p style="font-size:12px; color:var(--text-dim)">${p.desc?.substring(0, 50) || ''}...</p>
                    <div class="product-actions">
                        <button class="btn-primary btn-sm" onclick="admin.editProduct('${p.id}')">Modifier</button>
                        <button class="btn-sm" style="background:#555; color:white" onclick="admin.toggleProduct('${p.id}')">${p.available ? 'Masquer' : 'Afficher'}</button>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    },

    async loadSettings() {
        const settings = await this.api('/api/settings');
        document.getElementById('setting-store-name').value = settings.storeName || '';
        document.getElementById('setting-is-open').checked = settings.isStoreOpen;
        document.getElementById('setting-phone').value = settings.shopPhone || '';
        document.getElementById('setting-whatsapp').value = settings.shopWhatsAppNumber || '';
        document.getElementById('setting-address').value = settings.shopAddress || '';
        document.getElementById('setting-closed-message').value = settings.closedMessage || '';
        
        document.getElementById('setting-lat').value = settings.shopLatitude;
        document.getElementById('setting-lng').value = settings.shopLongitude;
        
        document.getElementById('setting-min-delivery-price').value = settings.minimumDeliveryPrice ?? 10;
        document.getElementById('setting-base-distance').value = settings.baseDeliveryDistanceKm ?? 1;
        document.getElementById('setting-extra-km-price').value = settings.extraKmPrice ?? 5;
        document.getElementById('setting-max-distance').value = settings.maxDeliveryKm || '';

        this.initMap(settings.shopLatitude, settings.shopLongitude);
        this.updateDeliveryPreview();
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
        const body = {
            storeName: document.getElementById('setting-store-name').value,
            isStoreOpen: document.getElementById('setting-is-open').checked,
            shopPhone: document.getElementById('setting-phone').value,
            shopWhatsAppNumber: document.getElementById('setting-whatsapp').value,
            shopAddress: document.getElementById('setting-address').value,
            closedMessage: document.getElementById('setting-closed-message').value,
            shopLatitude: parseFloat(document.getElementById('setting-lat').value),
            shopLongitude: parseFloat(document.getElementById('setting-lng').value),
            minimumDeliveryPrice: parseFloat(document.getElementById('setting-min-delivery-price').value),
            baseDeliveryDistanceKm: parseFloat(document.getElementById('setting-base-distance').value),
            extraKmPrice: parseFloat(document.getElementById('setting-extra-km-price').value),
            maxDeliveryKm: parseFloat(document.getElementById('setting-max-distance').value) || null
        };
        await this.api('/api/settings', 'PUT', body);
        alert('Paramètres enregistrés !');
    },

    async loadPushInfo() {
        const data = await this.api('/api/device-tokens');
        document.getElementById('push-device-count').textContent = `${data.tokens.length} appareils enregistrés`;
    },

    async sendPush() {
        const btn = document.querySelector('.btn-push');
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
                <button type="button" class="btn-primary" style="width:100%" onclick="admin.saveNewProduct()">Ajouter le produit</button>
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
                <button type="button" class="btn-primary" style="width:100%" onclick="admin.updateProduct('${id}')">Enregistrer</button>
                <button type="button" style="width:100%; margin-top:10px; background:#500" onclick="admin.deleteProduct('${id}')">Supprimer</button>
            </form>
        `);
    },

    async updateProduct(id) {
        const body = {
            name: document.getElementById('p-name').value,
            price: parseFloat(document.getElementById('p-price').value),
            desc: document.getElementById('p-desc').value,
            imageUrl: document.getElementById('p-img').value
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
                <button type="button" class="btn-primary" style="width:100%" onclick="admin.saveNewCategory()">Ajouter</button>
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
                <button type="button" class="btn-primary" style="width:100%" onclick="admin.updateCategory('${encodeURIComponent(catName)}')">Enregistrer</button>
                <button type="button" style="width:100%; margin-top:10px; background:#500" onclick="admin.deleteCategory('${encodeURIComponent(catName)}')">Supprimer</button>
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
        try {
            const data = await this.api('/api/options');
            const menu = await this.api('/api/menu');
            this.allProducts = menu.products;
            this.renderOptions(data.groups);
        } catch (e) {
            console.error('Failed to load options', e);
        }
    },

    renderOptions(groups) {
        const container = document.getElementById('options-container');
        if (!groups || groups.length === 0) {
            container.innerHTML = '<p class="empty-msg">Aucun groupe d\'options défini.</p>';
            return;
        }

        container.innerHTML = groups.map(group => `
            <div class="option-group-card" id="group-${group.id}">
                <div class="option-group-header">
                    <div class="option-group-info">
                        <h3>${group.name}</h3>
                        <div class="option-group-badges">
                            ${group.required ? '<span class="badge status-badge status-new">OBLIGATOIRE</span>' : '<span class="badge-outline">OPTIONNEL</span>'}
                            <span class="badge-outline">Min: ${group.minSelect}</span>
                            <span class="badge-outline">Max: ${group.maxSelect}</span>
                        </div>
                    </div>
                    <div class="option-group-actions">
                        <button class="btn-sm" onclick="admin.showEditOptionGroupModal(${group.id})">✏️ Modifier</button>
                        <button class="btn-sm btn-primary" onclick="admin.showAddOptionItemModal(${group.id})">+ Option</button>
                        <button class="btn-sm" style="background:#500; color:white" onclick="admin.deleteOptionGroup(${group.id})">🗑️</button>
                    </div>
                </div>
                <div class="option-group-content">
                    <div class="option-items-list">
                        ${group.items.length > 0 ? group.items.map(item => `
                            <div class="option-item-row">
                                <div class="option-item-info">
                                    ${item.imageUrl ? `<img src="${item.imageUrl}" class="option-item-img">` : ''}
                                    <span class="option-item-name">${item.name}</span>
                                    <span class="option-item-price">+ ${item.price} MAD</span>
                                    ${!item.available ? '<span class="status-badge status-cancelled">INDISPONIBLE</span>' : ''}
                                </div>
                                <div class="option-item-actions">
                                    <button class="btn-sm" onclick="admin.showEditOptionItemModal(${group.id}, ${item.id})">✏️</button>
                                    <button class="btn-sm" style="background:#500; color:white" onclick="admin.deleteOptionItem(${item.id})">🗑️</button>
                                </div>
                            </div>
                        `).join('') : '<p class="empty-msg">Aucune option dans ce groupe.</p>'}
                    </div>
                    
                    <div class="affected-products">
                        <h4>Produits affectés</h4>
                        <div class="product-tag-list" id="assigned-products-${group.id}">
                            ${this.renderAssignedProducts(group.id)}
                            <button class="btn-sm" onclick="admin.showAssignProductModal(${group.id})">+ Affecter</button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    },

    renderAssignedProducts(groupId) {
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
                <button type="button" class="btn-primary" style="width:100%" onclick="admin.saveOptionGroup()">Enregistrer le groupe</button>
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
                <button type="button" class="btn-primary" style="width:100%" onclick="admin.saveOptionGroup(${id})">Mettre à jour</button>
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
                <button type="button" class="btn-primary" style="width:100%" onclick="admin.saveOptionItem(${groupId})">Ajouter l'option</button>
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
                <button type="button" class="btn-primary" style="width:100%" onclick="admin.saveOptionItem(${groupId}, ${itemId})">Mettre à jour</button>
                <button type="button" style="width:100%; margin-top:10px; background:#555; color:white" onclick="admin.toggleOptionItem(${itemId}, ${!item.available})">${item.available ? 'Rendre Indisponible' : 'Rendre Disponible'}</button>
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
                <button type="button" class="btn-primary" style="width:100%" onclick="admin.assignOptionGroup(${groupId})">Affecter</button>
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
    }
};

admin.init();
