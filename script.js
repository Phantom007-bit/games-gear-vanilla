// --- SUPABASE CLOUD CONNECTION ---
const supabaseUrl = 'https://kujpcsvwxarfwbcysvqy.supabase.co';
// Replace with your PUBLIC anon/publishable key (never expose sb_secret_ in frontend code)
const supabaseKey = 'sb_publishable_4vedTjIP-xPf8Q4tcxEQEw_thjA8vcQ';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// --- STATE MANAGEMENT ---
let inventory = [];
let cart = JSON.parse(localStorage.getItem('gameGearsCart')) || [];

// --- DOM ELEMENTS ---
const productGrid = document.getElementById('product-grid');
const searchBar = document.getElementById('search-bar');
const cartBtn = document.getElementById('cart-btn');
const closeCartBtn = document.getElementById('close-cart');
const cartOverlay = document.getElementById('cart-overlay');
const cartSidebar = document.getElementById('cart-sidebar');
const cartItemsContainer = document.getElementById('cart-items');
const cartFooter = document.getElementById('cart-footer');
const cartBadge = document.getElementById('cart-badge');
const cartTotalEl = document.getElementById('cart-total');
const whatsappBtn = document.getElementById('whatsapp-checkout');

function refreshIcons() {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
    }
}

// --- 1. FETCH DATA FROM CLOUD ---
async function fetchInventory() {
    if (!productGrid) return;
    productGrid.innerHTML = '<p style="text-align: center; color: #9CA3AF; grid-column: 1/-1;">Loading latest drops...</p>';

    const { data, error } = await supabase
        .from('kits')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        productGrid.innerHTML = '<p style="text-align: center; color: #ef4444; grid-column: 1/-1;">Failed to load the kit room.</p>';
        return;
    }

    inventory = data || [];
    renderProducts(inventory);
}

// --- 2. RENDER PRODUCTS (Supports Search Filtering) ---
function renderProducts(itemsToDisplay) {
    if (!productGrid) return;

    if (!itemsToDisplay || itemsToDisplay.length === 0) {
        productGrid.innerHTML = '<p style="text-align: center; color: #9CA3AF; grid-column: 1/-1;">No kits found matching your search.</p>';
        return;
    }

    productGrid.innerHTML = itemsToDisplay.map(product => `
        <div class="product-card">
            <div class="product-img-wrapper">
                <img src="${product.image_url || 'https://via.placeholder.com/300x400?text=No+Image'}" alt="${product.name}" class="product-img">
            </div>
            <div class="product-info">
                <h3>${product.name}</h3>
                <span class="product-price">₦${Number(product.price).toLocaleString()}</span>
            </div>
            <select id="size-${product.id}" class="size-select">
                <option value="S">Size: Small</option>
                <option value="M" selected>Size: Medium</option>
                <option value="L">Size: Large</option>
                <option value="XL">Size: X-Large</option>
            </select>
            <button onclick="addToCart('${product.id}')" class="add-btn">Add to Kit Room</button>
        </div>
    `).join('');

    refreshIcons();
}

// --- 3. SEARCH LISTENER ---
if (searchBar) {
    searchBar.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredKits = inventory.filter(kit => kit.name.toLowerCase().includes(searchTerm));
        renderProducts(filteredKits);
    });
}

// --- 4. CART LOGIC ---
window.addToCart = (productId) => {
    const product = inventory.find(p => String(p.id) === String(productId));
    if (!product) return;

    const sizeEl = document.getElementById(`size-${productId}`);
    const size = sizeEl ? sizeEl.value : 'M';

    const existingItem = cart.find(item => String(item.id) === String(productId) && item.size === size);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ ...product, size, quantity: 1 });
    }

    saveAndRender();
    toggleCart(true);
};

window.removeFromCart = (productId, size) => {
    cart = cart.filter(item => !(String(item.id) === String(productId) && item.size === size));
    saveAndRender();
};

function saveAndRender() {
    localStorage.setItem('gameGearsCart', JSON.stringify(cart));
    updateCartUI();
}

function updateCartUI() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    if (cartBadge) {
        cartBadge.textContent = totalItems;
        if (totalItems > 0) cartBadge.classList.remove('hidden');
        else cartBadge.classList.add('hidden');
    }

    if (cartItemsContainer && cartFooter) {
        if (cart.length === 0) {
            cartItemsContainer.innerHTML = '<p class="empty-cart">Your bag is empty.</p>';
            cartFooter.classList.add('hidden');
        } else {
            cartFooter.classList.remove('hidden');
            cartItemsContainer.innerHTML = cart.map(item => `
                <div class="cart-item">
                    <img src="${item.image_url || 'https://via.placeholder.com/60x80?text=IMG'}" class="cart-item-img" alt="${item.name}">
                    <div class="cart-item-details">
                        <h4>${item.name}</h4>
                        <p class="cart-item-meta">Size: ${item.size} | Qty: ${item.quantity}</p>
                        <div class="cart-item-bottom">
                            <span class="cart-item-price">₦${(Number(item.price) * item.quantity).toLocaleString()}</span>
                            <button onclick="removeFromCart('${item.id}', '${item.size}')" class="remove-btn" aria-label="Remove item">
                                <i data-lucide="trash-2" style="width:16px; height:16px;"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');
            refreshIcons();
        }
    }

    if (cartTotalEl) {
        const totalValue = cart.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0);
        cartTotalEl.textContent = `₦${totalValue.toLocaleString()}`;
    }
}

// --- 5. UI INTERACTIONS ---
function toggleCart(forceOpen = false) {
    if (!cartSidebar || !cartOverlay) return;
    const isOpen = cartSidebar.classList.contains('open');
    if (isOpen && !forceOpen) {
        cartSidebar.classList.remove('open');
        cartOverlay.classList.remove('open');
    } else {
        cartSidebar.classList.add('open');
        cartOverlay.classList.add('open');
    }
}

if (cartBtn) cartBtn.addEventListener('click', () => toggleCart());
if (closeCartBtn) closeCartBtn.addEventListener('click', () => toggleCart(false));
if (cartOverlay) cartOverlay.addEventListener('click', () => toggleCart(false));

// --- 6. WHATSAPP ENGINE ---
if (whatsappBtn) {
    whatsappBtn.addEventListener('click', () => {
        if (cart.length === 0) return;

        const phoneNumber = "2349027022058"; 

        let message = "🔥 *New Order from Game Gears!* 🔥\n\n";
        let grandTotal = 0;

        cart.forEach(item => {
            const lineTotal = Number(item.price) * item.quantity;
            grandTotal += lineTotal;
            message += `👕 *${item.name}*\n`;
            message += `   Size: ${item.size}\n`;
            message += `   Qty: ${item.quantity} x ₦${Number(item.price).toLocaleString()}\n\n`;
        });

        message += `💰 *Grand Total: ₦${grandTotal.toLocaleString()}*\n\n`;
        message += "Please provide payment details and delivery options!";

        const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    });
}

// Boot up the storefront
refreshIcons();
fetchInventory();
updateCartUI();