// --- SUPABASE CLOUD CONNECTION ---
const supabaseUrl = 'https://kujpcsvwxarfwbcysvqy.supabase.co';

const supabaseKey = 'sb_publishable_4vedTjIP-xPf8Q4tcxEQEw_thjA8vcQ';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// --- DOM ELEMENTS ---
const loginView = document.getElementById('login-view');
const dashboardView = document.getElementById('dashboard-view');
const loginForm = document.getElementById('login-form');
const logoutBtn = document.getElementById('logout-btn');
const addKitForm = document.getElementById('add-kit-form');
const inventoryList = document.getElementById('admin-inventory-list');

// --- 1. AUTHENTICATION STATE ---
async function checkSession() {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
        console.error("Session error:", error.message);
    }

    if (session) {
        if (loginView) {
            loginView.classList.add('hidden');
            loginView.style.display = 'none';
        }
        if (dashboardView) {
            dashboardView.classList.remove('hidden');
            dashboardView.style.display = 'block';
        }
        loadAdminInventory();
    } else {
        if (loginView) {
            loginView.classList.remove('hidden');
            loginView.style.display = 'flex';
        }
        if (dashboardView) {
            dashboardView.classList.add('hidden');
            dashboardView.style.display = 'none';
        }
    }
}

// --- 2. LOGIN & LOGOUT ---
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('admin-email').value.trim();
        const password = document.getElementById('admin-password').value;
        const loginBtn = loginForm.querySelector('.submit-btn');
        const errorMsg = document.getElementById('login-error');

        loginBtn.textContent = "Verifying...";
        loginBtn.disabled = true;
        if (errorMsg) errorMsg.style.display = 'none';

        const { data, error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            if (errorMsg) {
                errorMsg.textContent = "Access Denied: " + error.message;
                errorMsg.style.display = 'block';
            } else {
                alert("Access Denied: " + error.message);
            }
        } else if (data?.session) {
            await checkSession();
        }

        loginBtn.textContent = "Authorize Access";
        loginBtn.disabled = false;
    });
}

if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        await supabase.auth.signOut();
        checkSession();
    });
}

// --- 3. FETCH LIVE INVENTORY ---
async function loadAdminInventory() {
    if (!inventoryList) return;
    inventoryList.innerHTML = '<p style="text-align: center; color: #9CA3AF; padding: 20px;">Fetching drops...</p>';

    const { data, error } = await supabase
        .from('kits')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        inventoryList.innerHTML = `<p style="color: #ef4444; text-align: center;">Error: ${error.message}</p>`;
        return;
    }

    if (!data || data.length === 0) {
        inventoryList.innerHTML = '<p style="text-align: center; color: #9CA3AF; padding: 20px;">No kits in the catalog yet.</p>';
        return;
    }

    inventoryList.innerHTML = data.map(kit => `
        <div class="inventory-item" id="row-${kit.id}">
            <img src="${kit.image_url || 'https://via.placeholder.com/50'}" class="inv-img" alt="Kit Image">
            <div class="inv-details">
                <h4>${kit.name}</h4>
                <p>₦${Number(kit.price).toLocaleString()}</p>
            </div>
            <button onclick="deleteKit('${kit.id}')" class="delete-btn">Remove</button>
        </div>
    `).join('');
}

// --- 4. SECURE PUSH WITH IMAGE STORAGE ---
if (addKitForm) {
    addKitForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        const nameInput = document.getElementById('kit-name').value;
        const priceInput = document.getElementById('kit-price').value;
        const imageFile = document.getElementById('kit-image').files[0];
        const submitBtn = this.querySelector('.submit-btn');

        if (!imageFile) {
            alert("Please select an image file first.");
            return;
        }

        submitBtn.textContent = "Uploading Image...";
        submitBtn.disabled = true;

        try {
            const fileExt = imageFile.name.split('.').pop();
            const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('kit-images')
                .upload(uniqueFileName, imageFile);

            if (uploadError) throw new Error("Image Upload Failed: " + uploadError.message);

            submitBtn.textContent = "Saving to Database...";

            const { data: { publicUrl } } = supabase.storage
                .from('kit-images')
                .getPublicUrl(uniqueFileName);

            const { error: dbError } = await supabase
                .from('kits')
                .insert([{ name: nameInput, price: parseInt(priceInput, 10), image_url: publicUrl }]);

            if (dbError) throw new Error("Database Save Failed: " + dbError.message);

            const successMsg = document.getElementById('success-message');
            if (successMsg) {
                successMsg.classList.remove('hidden');
                setTimeout(() => successMsg.classList.add('hidden'), 3000);
            }
            this.reset();
            loadAdminInventory();
        } catch (err) {
            alert(err.message);
        } finally {
            submitBtn.textContent = "Deploy to Store";
            submitBtn.disabled = false;
        }
    });
}

// --- 5. SECURE DATABASE DELETE ---
window.deleteKit = async (id) => {
    if (!confirm("Are you sure you want to permanently delete this kit?")) return;

    const row = document.getElementById(`row-${id}`);
    const btn = row.querySelector('.delete-btn');
    btn.textContent = "Removing...";
    btn.disabled = true;

    const { error } = await supabase
        .from('kits')
        .delete()
        .eq('id', id);

    if (error) {
        alert("Failed to delete: " + error.message);
        btn.textContent = "Remove";
        btn.disabled = false;
    } else {
        loadAdminInventory();
    }
};

// Boot up
checkSession();