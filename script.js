// ==========================================
// 1. HELPER: FORMATIERUNG
// ==========================================

// Formatiert Eingabe beim Tippen: 1000 -> 1.000
function formatCurrencyInput(input) {
    let selectionStart = input.selectionStart;
    let originalLen = input.value.length;
    
    // Alles entfernen außer Zahlen und Komma
    let value = input.value.replace(/[^\d,]/g, '');
    
    // Aufteilen
    let parts = value.split(',');
    let integerPart = parts[0];
    let decimalPart = parts.length > 1 ? ',' + parts[1].substring(0, 2) : '';

    // Tausenderpunkte setzen
    integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

    let newValue = integerPart + decimalPart;
    input.value = newValue;

    // Cursor wiederherstellen
    let newLen = newValue.length;
    selectionStart = selectionStart + (newLen - originalLen);
    input.setSelectionRange(selectionStart, selectionStart);
}

// Wandelt "1.000,50" in 1000.50 um (für JS Berechnungen)
function parseGermanNum(str) {
    if (!str) return 0;
    if (typeof str === 'number') return str;
    // Punkte weg, Komma zu Punkt
    let cleanStr = str.toString().replace(/\./g, '').replace(',', '.');
    return parseFloat(cleanStr) || 0;
}

// ==========================================
// 1.5 HELPER: MODALS
// ==========================================
async function loadModal(modalId, filePath) {
    const modalContainer = document.getElementById('modal-container');
    if (!modalContainer) {
        console.error('Modal container not found!');
        return null;
    }
    let modal = document.getElementById(modalId);
    if (!modal) {
        try {
            const response = await fetch(filePath);
            if (!response.ok) throw new Error(`Failed to load modal: ${filePath}`);
            const html = await response.text();
            modalContainer.insertAdjacentHTML('beforeend', html);
            modal = document.getElementById(modalId);
        } catch (error) {
            console.error('Error loading modal:', error);
            alert('Fehler beim Laden eines Fensters. Bitte versuche es erneut.');
            return null;
        }
    }
    return modal;
}

// ==========================================
// 2. STATE & CONFIG
// ==========================================

let cartItemCount = 0;
let salaryData = { month: {}, year: {} };
let currentSalaryMode = 'month';
let salaryChartInstance = null;
let myLists = JSON.parse(localStorage.getItem('myLists')) || [];
let currentListId = null;

let totalStats = JSON.parse(localStorage.getItem('totalStats')) || { money: 0, time: 0 };
let currentCalcResult = { money: 0, hours: 0 };

let selectedCatalogItems = [];
let currentCategory = 'all';
let catalogSource = 'home'; 

// --- STEUERDATEN (Jahres-Logik) ---
const TAX_DATA = {
    2024: { bbgKV: 5175.00, bbgRV: 7550.00, basicAllowance: 973, kvAddAvg: 1.7 },
    2025: { bbgKV: 5512.50, bbgRV: 8050.00, basicAllowance: 1008, kvAddAvg: 2.5 },
    2026: { bbgKV: 5750.00, bbgRV: 8300.00, basicAllowance: 1050, kvAddAvg: 2.7 }
};

// ==========================================
// 3. INITIALISIERUNG
// ==========================================

window.onload = function() {
    // Handle view switching from URL hash
    const hash = window.location.hash.substring(1);
    const validViews = ['home', 'lists', 'salary'];
    let viewToLoad = 'home';
    let buttonSelector = '.nav-btn:nth-child(1)'; // Default to first button

    if (validViews.includes(hash)) {
        viewToLoad = hash;
        if (hash === 'lists') buttonSelector = '.nav-btn:nth-child(2)';
        if (hash === 'salary') buttonSelector = '.nav-btn:nth-child(3)';
    }

    // Load the view
    switchView(viewToLoad, document.querySelector(`#main-nav ${buttonSelector}`));
    
    if (typeof productDB === 'undefined') {
        console.error("Fehler: products.js wurde nicht geladen!");
        alert("Datenbank Fehler: Bitte lade die Seite neu.");
    }
};

// --- NAVIGATION ---
function toggleMobileMenu() {
    const nav = document.getElementById('main-nav');
    nav.classList.toggle('active');
}

async function switchView(viewName, btn) {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    if(btn) btn.classList.add('active');

    // Close mobile menu if open
    const nav = document.getElementById('main-nav');
    if (nav.classList.contains('active')) {
        toggleMobileMenu();
    }

    const viewContainer = document.getElementById('view-container');
    if (!viewContainer) { return console.error('View container not found!'); }

    try {
        const response = await fetch(`${viewName}.html`);
        if (!response.ok) throw new Error(`Failed to load view: ${viewName}.html`);
        
        viewContainer.innerHTML = await response.text();

        // After loading, run view-specific initializations
        const savedIncome = localStorage.getItem('income');
        const savedExpenses = localStorage.getItem('expenses');
        const savedHours = localStorage.getItem('hours');

        if (viewName === 'home') {
            if(savedIncome) { document.getElementById('w-income').value = savedIncome; formatCurrencyInput(document.getElementById('w-income')); }
            if(savedExpenses) { document.getElementById('w-expenses').value = savedExpenses; formatCurrencyInput(document.getElementById('w-expenses')); }
            if(savedHours) { document.getElementById('w-hours').value = savedHours; }
            checkEmptyCartState();
            calcWorker();
        } else if (viewName === 'lists') {
            if(savedIncome) { document.getElementById('list-income-input').value = savedIncome; formatCurrencyInput(document.getElementById('list-income-input')); }
            if(savedExpenses) { document.getElementById('list-expenses-input').value = savedExpenses; formatCurrencyInput(document.getElementById('list-expenses-input')); }
            if(savedHours) { document.getElementById('list-hours-input').value = savedHours; }
            renderListsNav();
            if (currentListId) openList(currentListId);
        }
    } catch (error) {
        console.error('Error switching view:', error);
        viewContainer.innerHTML = `<p style="color:red; text-align:center;">Error loading view. Please try again.</p>`;
    }
}

// --- CATALOG MODAL ---
async function openCatalogModal(source) {
    const modal = await loadModal('catalog-modal', 'modals/catalog.html');
    if (!modal) return;

    catalogSource = source; 
    modal.style.display = 'flex';
    selectedCatalogItems = [];
    currentCategory = 'all';
    document.getElementById('catalog-search-input').value = '';
    renderCatalog();
    updateFooterCount();
}

function closeCatalogModal() { document.getElementById('catalog-modal').style.display = 'none'; }

function filterCatalog(cat, btn) {
    currentCategory = cat;
    document.querySelectorAll('.cat-item').forEach(el => el.classList.remove('active'));
    btn.classList.add('active');
    renderCatalog();
}

function searchCatalog() { renderCatalog(); }

function renderCatalog() {
    const grid = document.getElementById('catalog-grid');
    grid.innerHTML = '';
    const query = document.getElementById('catalog-search-input').value.toLowerCase();
    
    let items = productDB.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(query);
        const matchesCat = currentCategory === 'all' || p.cat === currentCategory;
        return matchesSearch && matchesCat;
    });

    items.forEach(product => {
        const div = document.createElement('div');
        div.className = 'product-card';
        if(selectedCatalogItems.includes(product)) div.classList.add('selected');
        
        let visualContent;
        if (product.img) {
            visualContent = `
                <img src="${product.img}" alt="${product.name}" class="pc-image" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                <div class="pc-icon" style="display:none; font-size: 2.5rem; margin-bottom: 10px;">📦</div>
            `;
        } else {
            let icon = "📦";
            if(product.cat === 'Handy') icon = "📱";
            if(product.cat === 'Gaming') icon = "🎮";
            if(product.cat === 'Audio') icon = "🎧";
            if(product.cat === 'Laptop') icon = "💻";
            if(product.cat === 'Kamera') icon = "📷";
            if(product.cat === 'Haushalt') icon = "🏠";
            visualContent = `<div class="pc-icon">${icon}</div>`;
        }

        div.innerHTML = `
            <div class="pc-check"></div>
            ${visualContent}
            <div class="pc-name">${product.name}</div>
            <div class="pc-price">${product.price.toLocaleString('de-DE', {minimumFractionDigits:2})} €</div>
        `;
        div.onclick = () => toggleSelection(div, product);
        grid.appendChild(div);
    });
}

function toggleSelection(card, product) {
    if(selectedCatalogItems.includes(product)) {
        selectedCatalogItems = selectedCatalogItems.filter(p => p !== product);
        card.classList.remove('selected');
    } else {
        selectedCatalogItems.push(product);
        card.classList.add('selected');
    }
    updateFooterCount();
}

function updateFooterCount() {
    document.getElementById('selected-count').innerText = `${selectedCatalogItems.length} Produkte gewählt`;
}

function addSelectedToCart() {
    if(selectedCatalogItems.length === 0) return;
    if (catalogSource === 'home') {
        selectedCatalogItems.forEach(p => { addCartRow(p.name, p.price, 0, p.link); });
    } else {
        if(!currentListId && myLists.length > 0) openList(myLists[0].id);
        else if (myLists.length === 0) createNewList();
        const list = myLists.find(l => l.id === currentListId);
        selectedCatalogItems.forEach(p => {
            list.items.push({ name: p.name, price: p.price, link: p.link });
        });
        saveLists();
        renderListItems();
        updateListCalculations();
    }
    closeCatalogModal();
}

// --- WORKER FUNCTIONS (CART) ---
function checkEmptyCartState() {
    const list = document.getElementById('cart-list');
    const summary = document.querySelector('.cart-summary');
    const rows = list.querySelectorAll('.cart-row');
    if(rows.length === 0) {
        list.innerHTML = `<div class="empty-state"><div style="font-size: 2.5rem; opacity: 0.3; margin-bottom: 10px;">🛒</div><div style="font-weight: 600; color: var(--text-light);">Dein Warenkorb ist leer</div><div style="font-size: 0.8rem; color: #94a3b8;">Füge Produkte hinzu, um zu starten.</div></div>`;
        summary.style.display = 'none';
    } else {
        const es = list.querySelector('.empty-state');
        if(es) es.remove();
        summary.style.display = 'flex';
    }
    calcWorker();
}

function addManualItem() { addCartRow("Manuelles Produkt", 0, 0, null); }

function addCartRow(name, price, resell, link) {
    const list = document.getElementById('cart-list');
    const emptyState = list.querySelector('.empty-state');
    if(emptyState) list.innerHTML = '';
    cartItemCount++;
    const rowId = 'cart-item-' + cartItemCount;
    const div = document.createElement('div');
    div.className = 'cart-row';
    div.id = rowId;
    
    let linkHtml = '';
    if (link) {
        linkHtml = `<a href="${link}" target="_blank" title="Zum Shop" style="font-size: 1.2rem; text-decoration: none; display: inline-block; line-height: 1;">🛒</a>`;
    }

    div.innerHTML = `<div class="input-with-label"><span class="input-label-tiny">Produkt</span><input type="text" class="cart-input cart-input-name" value="${name}" onfocus="if(this.value==='Manuelles Produkt') this.value=''"></div><div class="input-with-label"><span class="input-label-tiny">Preis</span><input type="number" class="cart-input cart-input-price" value="${price}" oninput="calcWorker()"></div><div style="display: flex; gap: 10px; align-items: center; justify-content: flex-end;"><div class="input-with-label"><span class="input-label-tiny">Wiederverkauf</span><input type="number" class="cart-input cart-input-resell" value="${resell}" oninput="calcWorker()"></div><div class="cart-row-actions" style="display: flex; align-items: center; gap: 8px;">${linkHtml}<button class="btn-remove" onclick="removeCartRow('${rowId}')">×</button></div></div>`;
    list.appendChild(div);
    document.querySelector('.cart-summary').style.display = 'flex';
    calcWorker();
}

function removeCartRow(id) {
    document.getElementById(id).remove();
    checkEmptyCartState();
}

function saveToLocal() {
    const inc = document.getElementById('w-income').value;
    const exp = document.getElementById('w-expenses').value;
    const hours = document.getElementById('w-hours').value;
    localStorage.setItem('income', inc);
    localStorage.setItem('expenses', exp);
    localStorage.setItem('hours', hours);
    if(document.getElementById('list-income-input')) document.getElementById('list-income-input').value = inc;
    if(document.getElementById('list-expenses-input')) document.getElementById('list-expenses-input').value = exp;
    if(document.getElementById('list-hours-input')) document.getElementById('list-hours-input').value = hours;
}

function calcWorker() {
    // PARSE GERMAN NUM (Tausenderpunkte!)
    const income = parseGermanNum(document.getElementById('w-income').value);
    const expenses = parseGermanNum(document.getElementById('w-expenses').value);
    const wageDisplay = document.getElementById('wage-display-area');

    let hours = parseFloat(document.getElementById('w-hours').value);
    if(!hours || hours <= 0) hours = 173.33;
    
    if(income <= 0) {
        wageDisplay.style.display = 'none';
        document.getElementById('time-result-container').style.display = 'none';
        return;
    }

    wageDisplay.style.display = 'block';

    let totalPrice = 0; let totalResell = 0;
    document.querySelectorAll('.cart-input-price').forEach(i => totalPrice += parseFloat(i.value)||0);
    document.querySelectorAll('.cart-input-resell').forEach(i => totalResell += parseFloat(i.value)||0);
    
    document.getElementById('total-price-display').innerText = totalPrice.toLocaleString('de-DE',{minimumFractionDigits:2}) + ' €';
    const effective = Math.max(0, totalPrice - totalResell);
    document.getElementById('total-effective-display').innerText = effective.toLocaleString('de-DE',{minimumFractionDigits:2}) + ' €';
    
    const safeExpenses = expenses || 0;
    const disposable = Math.max(0, income - safeExpenses);
    const hourly = disposable / hours;
    
    document.getElementById('val-wage-base').innerText = (income/hours).toLocaleString('de-DE', {minimumFractionDigits:2, maximumFractionDigits:2}) + ' €';
    document.getElementById('val-wage-real').innerText = hourly.toLocaleString('de-DE', {minimumFractionDigits:2, maximumFractionDigits:2}) + ' €';
    
    const list = document.getElementById('cart-list');
    const hasProducts = !list.querySelector('.empty-state') && list.children.length > 0;
    const timeResult = document.getElementById('time-result-container');

    if(!hasProducts) {
        timeResult.style.display = 'none';
        checkFixCosts();
        return; 
    } else {
        timeResult.style.display = 'block';
    }

    checkFixCosts();

    document.getElementById('detail-price').innerText = totalPrice.toLocaleString('de-DE',{minimumFractionDigits:2}) + ' €';
    document.getElementById('detail-effective-footer').innerText = effective.toLocaleString('de-DE',{minimumFractionDigits:2}) + ' €';

    let workHoursNeeded = 0;
    if(disposable <= 0) {
        document.getElementById('val-hours').innerText = "∞";
        document.getElementById('val-days').innerText = "∞";
    } else {
        workHoursNeeded = effective / hourly;
        document.getElementById('val-hours').innerText = Math.round(workHoursNeeded);
        document.getElementById('val-days').innerText = (workHoursNeeded/8).toFixed(1);
    }

    currentCalcResult.money = effective;
    currentCalcResult.hours = (disposable > 0) ? workHoursNeeded : 0;
}

function checkFixCosts() {
    // PARSE GERMAN NUM
    const inc = parseGermanNum(document.getElementById('w-income').value);
    const exp = parseGermanNum(document.getElementById('w-expenses').value);
    const box = document.getElementById('fixcost-feedback');
    
    if(!box) return;
    if(inc <= 0 || exp <= 0) { box.style.display='none'; box.className = ''; return; }
    
    box.style.display = 'block';
    const ratio = (exp/inc)*100;
    if(ratio > 50) { box.className='feedback-bad'; box.innerHTML='<span>⚠️ Fixkosten ' + ratio.toFixed(0) + '% (Ideal: <50%).</span>'; }
    else { box.className='feedback-good'; box.innerHTML='<span>✅ Vorbildliche Fixkosten.</span>'; }
}

// --- MODALS (Decision, Lists etc.) ---
async function decisionSave() {
    if(currentCalcResult.money <= 0) { alert("Warenkorb ist leer."); return; }
    const modal = await loadModal('confirm-modal', 'modals/confirm.html');
    if (!modal) return;
    modal.style.display = 'flex';
}
function closeConfirmModal() { document.getElementById('confirm-modal').style.display = 'none'; }
async function confirmAction() {
    closeConfirmModal();
    totalStats.money += currentCalcResult.money;
    totalStats.time += currentCalcResult.hours;
    saveStats();
    await showSuccessModal();
    if(typeof confetti === 'function') confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ['#22c55e', '#2563eb', '#facc15'] });
    document.getElementById('cart-list').innerHTML = '';
    checkEmptyCartState(); 
    currentCalcResult = { money: 0, hours: 0 };
}
async function showSuccessModal() {
    const modal = await loadModal('success-modal', 'modals/success.html');
    if (!modal) return;

    document.getElementById('success-saved-current').innerText = currentCalcResult.money.toLocaleString('de-DE', {minimumFractionDigits:2}) + ' €'; 
    document.getElementById('success-total-money').innerText = totalStats.money.toLocaleString('de-DE', {minimumFractionDigits:2}) + ' €';
    document.getElementById('success-total-time').innerText = Math.round(totalStats.time) + ' Std Lebenszeit';
    modal.style.display = 'flex';
}
function closeSuccessModal() { document.getElementById('success-modal').style.display = 'none'; }
async function decisionBuy() {
    if(document.getElementById('cart-list').children.length === 0) { alert("Warenkorb leer."); return; }
    const list = document.getElementById('cart-list');
    if(list.querySelector('.empty-state')) { alert("Warenkorb leer."); return; }
    await openShopModal();
}
async function openShopModal() {
    const modal = await loadModal('shop-modal', 'modals/shop.html');
    if (!modal) return;

    const container = document.getElementById('shop-list-container');
    container.innerHTML = '';
    const cartRows = document.querySelectorAll('.cart-row');
    cartRows.forEach(row => {
        const name = row.querySelector('.cart-input-name').value;
        const price = row.querySelector('.cart-input-price').value;
        const product = productDB.find(p => p.name === name);
        let link = (product && product.link) ? product.link : "https://www.amazon.de/s?k=" + encodeURIComponent(name);
        let linkText = (product && product.link) ? "Zum Shop ↗" : "Suche auf Amazon 🔎";
        const div = document.createElement('div');
        div.className = 'shop-link-row';
        div.innerHTML = `<div><strong>${name}</strong><br><small>${price} €</small></div><a href="${link}" target="_blank" class="shop-btn-external">${linkText}</a>`;
        container.appendChild(div);
    });
    modal.style.display = 'flex';
}
function closeShopModal() { document.getElementById('shop-modal').style.display = 'none'; }

// --- LISTS ---
async function createNewList() {
    const modal = await loadModal('new-list-modal', 'modals/newList.html');
    if (!modal) return;
    modal.style.display = 'flex';
    document.getElementById('new-list-name').value = '';
    setTimeout(() => document.getElementById('new-list-name').focus(), 100);
}
function closeNewListModal() { document.getElementById('new-list-modal').style.display = 'none'; }
function saveNewListFromModal() {
    const nameInput = document.getElementById('new-list-name');
    const name = nameInput.value.trim();
    nameInput.classList.remove('input-error');
    if(!name) {
        nameInput.classList.add('input-error');
        nameInput.placeholder = "Bitte Namen eingeben!";
        nameInput.focus();
        setTimeout(() => nameInput.classList.remove('input-error'), 500);
        return;
    }
    const newList = { id: Date.now(), name: name, saved: 0, items: [] };
    myLists.push(newList);
    saveLists();
    renderListsNav();
    openList(newList.id);
    closeNewListModal();
}
function saveLists() { localStorage.setItem('myLists', JSON.stringify(myLists)); }
function renderListsNav() {
    const nav = document.getElementById('lists-nav');
    if(!nav) return;
    nav.innerHTML = '';
    myLists.forEach(list => {
        const div = document.createElement('div');
        div.className = 'list-nav-item';
        if(list.id === currentListId) div.classList.add('active');
        div.innerText = list.name;
        div.onclick = () => openList(list.id);
        nav.appendChild(div);
    });
}
function openList(id) {
    currentListId = id;
    renderListsNav();
    document.getElementById('no-list-selected').style.display = 'none';
    document.getElementById('active-list-view').style.display = 'block';
    const list = myLists.find(l => l.id === id);
    document.getElementById('current-list-title').innerText = list.name;
    const savedInput = document.getElementById('list-saved');
    savedInput.value = list.saved;
    formatCurrencyInput(savedInput);
    syncSalaryFromList(); 
    renderListItems();
    updateListCalculations();
}
async function deleteCurrentList() {
    const modal = await loadModal('delete-list-modal', 'modals/deleteList.html');
    if (!modal) return;
    modal.style.display = 'flex';
}
function closeDeleteListModal() { document.getElementById('delete-list-modal').style.display = 'none'; }
function confirmDeleteList() {
    myLists = myLists.filter(l => l.id !== currentListId);
    saveLists();
    currentListId = null;
    document.getElementById('no-list-selected').style.display = 'block';
    document.getElementById('active-list-view').style.display = 'none';
    renderListsNav();
    closeDeleteListModal();
}
function addListManualItem() {
    const list = myLists.find(l => l.id === currentListId);
    list.items.push({ name: "Manuelles Produkt", price: 0, link: null });
    saveLists();
    renderListItems();
    updateListCalculations();
}
function deleteListItem(index) {
    const list = myLists.find(l => l.id === currentListId);
    list.items.splice(index, 1);
    saveLists();
    renderListItems();
    updateListCalculations();
}
function renderListItems() {
    const container = document.getElementById('list-items-container');
    container.innerHTML = '';
    const list = myLists.find(l => l.id === currentListId);
    list.items.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'list-item-row';
        div.style.position = 'relative'; // Make it a positioning context

        let linkHtml = '';
        if(item.link && item.link !== "#") linkHtml = `<a href="${item.link}" target="_blank" title="Zum Shop" style="font-size: 1.2rem; text-decoration: none; display: inline-block; line-height: 1;">🛒</a>`;
        
        div.innerHTML = `
            <div style="position: absolute; top: 5px; right: 5px; display: flex; align-items: center; gap: 10px; z-index: 1;">
                ${linkHtml}
                <button class="btn-remove" onclick="deleteListItem(${index})">×</button>
            </div>
            <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 10px; padding-right: ${linkHtml ? '65px' : '35px'}; width: 100%; box-sizing: border-box;">
                <input type="text" class="cart-input" value="${item.name}" onfocus="if(this.value==='Manuelles Produkt') this.value=''" oninput="updateListItem(${index}, 'name', this.value)" style="flex: 1 1 120px;"><div style="display:flex; align-items:center; gap: 5px;"><input type="number" class="cart-input" value="${item.price}" oninput="updateListItem(${index}, 'price', this.value)" style="width:80px; text-align:right;"><span style="font-weight:700;">€</span></div>
            </div>`;
        container.appendChild(div);
    });
}
function updateListItem(index, field, value) {
    const list = myLists.find(l => l.id === currentListId);
    if(field === 'price') list.items[index][field] = parseFloat(value) || 0;
    else list.items[index][field] = value;
    saveLists();
    updateListCalculations();
}
function syncSalaryFromList() {
    const incInput = document.getElementById('list-income-input');
    const expInput = document.getElementById('list-expenses-input');
    const hoursInput = document.getElementById('list-hours-input');
    localStorage.setItem('income', incInput.value);
    localStorage.setItem('expenses', expInput.value);
    localStorage.setItem('hours', hoursInput.value);
    if(document.getElementById('w-income')) document.getElementById('w-income').value = incInput.value;
    if(document.getElementById('w-expenses')) document.getElementById('w-expenses').value = expInput.value;
    if(document.getElementById('w-hours')) document.getElementById('w-hours').value = hoursInput.value;
    updateListCalculations();
}
function updateListCalculations() {
    const list = myLists.find(l => l.id === currentListId);
    const total = list.items.reduce((sum, item) => sum + item.price, 0);
    document.getElementById('list-total').innerText = total.toLocaleString('de-DE', {minimumFractionDigits:2}) + ' €';
    const savedVal = parseGermanNum(document.getElementById('list-saved').value);
    list.saved = savedVal; 
    saveLists();
    let remaining = Math.max(0, total - savedVal);
    document.getElementById('list-remaining').innerText = remaining.toLocaleString('de-DE', {minimumFractionDigits:2}) + ' €';
    
    const incomeInput = document.getElementById('list-income-input');
    const income = parseGermanNum(incomeInput.value);
    const expenses = parseGermanNum(document.getElementById('list-expenses-input').value);
    
    let hours = parseFloat(document.getElementById('list-hours-input').value);
    if(!hours || hours <= 0) hours = 173.33;

    const disposable = Math.max(0, income - expenses);
    const timeEl = document.getElementById('list-work-time');
    const infoEl = document.getElementById('list-wage-info');

    timeEl.style.color = ''; // Reset color on each calculation
    incomeInput.classList.remove('input-error'); // Reset error state

    if (remaining <= 0 && total > 0) {
        timeEl.innerHTML = `🎉 Ziel erreicht!`;
        timeEl.style.color = 'var(--success)';
        infoEl.innerText = 'Herzlichen Glückwunsch!';
        if(typeof confetti === 'function') confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        return;
    }

    if(income <= 0) { 
        timeEl.innerText = "-"; 
        infoEl.innerText = "Bitte Lohn oben eingeben."; 
        incomeInput.classList.add('input-error');
        return; 
    }
    if(disposable <= 0) { timeEl.innerText = "Unendlich"; infoEl.innerText = "Kein freies Einkommen."; return; }
    const hourlyWage = disposable / hours;
    const hoursNeeded = remaining / hourlyWage;
    if (hoursNeeded > 8) { const days = (hoursNeeded / 8).toFixed(1); timeEl.innerText = `${days} Arbeitstage`; }
    else { const h = Math.floor(hoursNeeded); const m = Math.round((hoursNeeded - h) * 60); timeEl.innerText = `${h} Std ${m} Min`; }
    infoEl.innerText = `Basierend auf ${hourlyWage.toFixed(2)}€ Real-Stundenlohn`;
}

// --- SALARY CALC (JAHRES LOGIK + TAUSENDER PUNKTE) ---
function toggleKvInput() {
    const type = document.getElementById('s-kv-type').value;
    const group = document.getElementById('kv-rate-group');
    if(type === 'pkv') { group.style.opacity = '0.5'; document.getElementById('s-kv-add').disabled = true; } 
    else { group.style.opacity = '1'; document.getElementById('s-kv-add').disabled = false; }
}

function calculateSalary() {
    // 1. PARSE GERMAN NUM (Brutto + Fixkosten)
    const rawBrutto = parseGermanNum(document.getElementById('s-brutto').value);
    const fixCostsMonth = parseGermanNum(document.getElementById('s-fixcosts').value);
    
    const period = document.getElementById('s-period').value;
    const selectedYear = parseInt(document.getElementById('s-year').value) || 2025;
    
    // 2. STEUER-LOGIK (Jahre)
    const yearData = TAX_DATA[selectedYear];
    
    // Auto-Update KV-Zusatz
    const kvInput = document.getElementById('s-kv-add');
    let currentKvVal = parseFloat(kvInput.value);
    if ([1.7, 2.5, 2.7].includes(currentKvVal)) {
        kvInput.value = yearData.kvAddAvg.toFixed(1);
    }

    const taxClass = parseInt(document.getElementById('s-class').value);
    const state = document.getElementById('s-state').value;
    const churchActive = parseInt(document.getElementById('s-church').value) === 1;
    const age = parseInt(document.getElementById('s-age').value) || 30;
    const kids = parseFloat(document.getElementById('s-kids').value);
    const kvType = document.getElementById('s-kv-type').value;
    const kvAddRate = parseFloat(kvInput.value) || yearData.kvAddAvg;

    if(rawBrutto <= 0) return;

    let monthlyBrutto = (period === 'year') ? rawBrutto / 12 : rawBrutto;
    
    const baseKv = Math.min(monthlyBrutto, yearData.bbgKV);
    const baseRv = Math.min(monthlyBrutto, yearData.bbgRV);
    
    const rv = baseRv * 0.093; 
    const av = baseRv * 0.013; 
    
    let kv = (kvType === 'gkv') ? baseKv * ((14.6 + kvAddRate) / 100 / 2) : 0;
    
    let pvRateAN = (state === 'sn') ? 0.022 : 0.017;
    if(kids === 0 && age >= 23) pvRateAN += 0.006; 
    if(kids >= 2) pvRateAN = Math.max(0, pvRateAN - ((Math.min(kids, 5) - 1) * 0.0025)); 
    const pv = baseKv * pvRateAN;
    const socialTotal = rv + av + kv + pv;

    let taxFactor = 1.0;
    if(taxClass === 3) taxFactor = 0.62; if(taxClass === 5) taxFactor = 1.75; if(taxClass === 6) taxFactor = 1.95; if(taxClass === 2) taxFactor = 0.95; 
    let taxable = Math.max(0, monthlyBrutto - socialTotal - 100); 
    let tax = 0;
    // Freibetrag aus TAX_DATA
    if (taxable > yearData.basicAllowance) {
        let overflow = taxable - yearData.basicAllowance;
        let rate = 0.14 + (Math.min(overflow, 5000) / 5000) * 0.28; 
        if(overflow > 5000) rate = 0.42; 
        tax = overflow * rate * taxFactor;
    }
    let soli = (tax > 1450 && kids < 1) ? tax * 0.055 : 0; 
    let church = (churchActive) ? tax * ((state === 'by' || state === 'bw') ? 0.08 : 0.09) : 0;
    const taxTotal = tax + soli + church;
    const netto = monthlyBrutto - socialTotal - taxTotal;
    const realNetto = Math.max(0, netto - fixCostsMonth);

    salaryData.month = { brutto: monthlyBrutto, tax: tax, soliChurch: soli + church, kv: kv, pv: pv, rv: rv, av: av, netto: netto, realNetto: realNetto, socialSum: socialTotal, taxSum: taxTotal };
    salaryData.year = { brutto: monthlyBrutto * 12, tax: tax * 12, soliChurch: (soli + church) * 12, kv: kv * 12, pv: pv * 12, rv: rv * 12, av: av * 12, netto: netto * 12, realNetto: realNetto * 12, socialSum: socialTotal * 12, taxSum: taxTotal * 12 };

    document.getElementById('salary-result-wrapper').style.display = 'block';
    switchSalaryMode(period);
}

function switchSalaryMode(mode) {
    currentSalaryMode = mode;
    document.getElementById('btn-mode-month').classList.toggle('active-mode', mode === 'month');
    document.getElementById('btn-mode-year').classList.toggle('active-mode', mode === 'year');
    renderSalaryResult(mode);
}

function renderSalaryResult(mode) {
    const data = salaryData[mode];
    const table = document.getElementById('salary-table');
    let html = `<tr><th>Position</th><th style="text-align:right">Betrag</th></tr>
        <tr><td>Brutto-Lohn</td><td style="text-align:right">${data.brutto.toLocaleString('de-DE', {minimumFractionDigits:2})} €</td></tr>
        <tr><td>Lohnsteuer</td><td style="text-align:right" class="deduction-val">- ${data.tax.toLocaleString('de-DE', {minimumFractionDigits:2})} €</td></tr>
        <tr><td>Soli / Kirche</td><td style="text-align:right" class="deduction-val">- ${data.soliChurch.toLocaleString('de-DE', {minimumFractionDigits:2})} €</td></tr>
        <tr><td>Krankenversicherung</td><td style="text-align:right" class="deduction-val">- ${data.kv.toLocaleString('de-DE', {minimumFractionDigits:2})} €</td></tr>
        <tr><td>Pflegeversicherung</td><td style="text-align:right" class="deduction-val">- ${data.pv.toLocaleString('de-DE', {minimumFractionDigits:2})} €</td></tr>
        <tr><td>Rentenversicherung</td><td style="text-align:right" class="deduction-val">- ${data.rv.toLocaleString('de-DE', {minimumFractionDigits:2})} €</td></tr>
        <tr><td>Arbeitslosenvers.</td><td style="text-align:right" class="deduction-val">- ${data.av.toLocaleString('de-DE', {minimumFractionDigits:2})} €</td></tr>
        <tr class="total-row"><td>Netto-Lohn</td><td style="text-align:right">${data.netto.toLocaleString('de-DE', {minimumFractionDigits:2})} €</td></tr>`;
    
    // FIX: parseGermanNum auch hier für Check
    const fixCosts = parseGermanNum(document.getElementById('s-fixcosts').value);
    if(fixCosts > 0) html += `<tr class="real-netto-row"><td>✨ Verfügbar (Real)</td><td style="text-align:right">${data.realNetto.toLocaleString('de-DE', {minimumFractionDigits:2})} €</td></tr>`;
    
    table.innerHTML = html;

    const ctx = document.getElementById('salaryChart').getContext('2d');
    if(salaryChartInstance) salaryChartInstance.destroy();
    salaryChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: { labels: ['Netto', 'Steuern', 'Sozialabgaben'], datasets: [{ data: [data.netto, data.taxSum, data.socialSum], backgroundColor: ['#22c55e', '#ef4444', '#f59e0b'], borderWidth: 0 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: function(context) { let val = context.raw.toLocaleString('de-DE', {minimumFractionDigits:2}); let percentage = ((context.raw / data.brutto) * 100).toFixed(1); return `${context.label}: ${val} € (${percentage}%)`; } } } } }
    });
}

function transferSalary() {
    if(!salaryData.month.netto) return alert("Bitte erst Gehalt berechnen!");
    const netto = salaryData.month.netto;
    
    const formatted = netto.toLocaleString('de-DE', {minimumFractionDigits:2, maximumFractionDigits:2});
    
    document.getElementById('w-income').value = formatted;
    localStorage.setItem('income', formatted);
    
    switchView('home', document.querySelectorAll('.nav-btn')[0]);
    calcWorker();
}