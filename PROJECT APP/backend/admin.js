const admin = {
    password: localStorage.getItem('3p_admin_password') || '',
    menu: null,
    orders: [],
    tokens: [],
    currentTab: 'dashboard',

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
        document.getElementById('push-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.sendPush();
        });
        document.getElementById('push-type').addEventListener('change', (e) => {
            const field = document.getElementById('push-id-field');
            if (e.target.value === 'home') field.classList.add('hidden');
            else field.classList.remove('hidden');
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

        const response = await fetch(path, options);
        if (response.status === 401) {
            this.logout();
            throw new Error('Unauthorized');
        }
        return response.json();
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

        switch(tab) {
            case 'dashboard': this.loadDashboard(); break;
            case 'orders': this.loadOrders(); break;
            case 'menu': this.loadMenu(); break;
            case 'settings': this.loadSettings(); break;
            case 'push': this.loadPushInfo(); break;
        }
    },

    async loadDashboard() {
        const stats = await this.api('/api/dashboard');
        const settings = await this.api('/api/settings');
        const tokens = await this.api('/api/device-tokens');

        document.getElementById('stat-orders-today').textContent = stats.todayOrders;
        document.getElementById('stat-revenue').textContent = `${stats.todayRevenue} MAD`;
        document.getElementById('stat-pending').textContent = stats.pendingOrders;
        document.getElementById('stat-devices').textContent = tokens.tokens.length;

        const badge = document.getElementById('store-status-badge');
        badge.textContent = settings.isStoreOpen ? 'BOUTIQUE OUVERTE' : 'BOUTIQUE FERMÉE';
        badge.className = `badge ${settings.isStoreOpen ? 'open' : 'closed'}`;
    },

    async loadOrders() {
        const status = document.getElementById('order-status-filter').value;
        const data = await this.api(`/api/orders?status=${status}`);
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
        this.menu = await this.api('/api/menu');
        this.renderCategories();
        if (this.menu.categories.length > 0) {
            this.renderProducts(this.menu.categories[0].name || this.menu.categories[0].id);
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
        document.getElementById('setting-is-open').checked = settings.isStoreOpen;
        document.getElementById('setting-closed-message').value = settings.closedMessage;
        document.getElementById('setting-whatsapp').value = settings.shopWhatsAppNumber;
        document.getElementById('setting-lat').value = settings.shopLatitude;
        document.getElementById('setting-lng').value = settings.shopLongitude;
    },

    async saveSettings() {
        const body = {
            isStoreOpen: document.getElementById('setting-is-open').checked,
            closedMessage: document.getElementById('setting-closed-message').value,
            shopWhatsAppNumber: document.getElementById('setting-whatsapp').value,
            shopLatitude: parseFloat(document.getElementById('setting-lat').value),
            shopLongitude: parseFloat(document.getElementById('setting-lng').value)
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
            customerId: document.getElementById('push-target').value,
            type: document.getElementById('push-type').value,
            id: document.getElementById('push-link-id').value
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
    }
};

admin.init();
