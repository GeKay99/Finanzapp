// ==========================================
// 1. STATE VARIABLES
// ==========================================

let cartItemCount = 0;
let salaryData = { month: {}, year: {} };
let currentSalaryMode = 'month';
let salaryChartInstance = null;
let myLists = JSON.parse(localStorage.getItem('myLists')) || [];
let currentListId = null;

// Stats for Gamification
let totalStats = JSON.parse(localStorage.getItem('totalStats')) || { money: 0, time: 0 };
let currentCalcResult = { money: 0, hours: 0 };

// Modal State
let selectedCatalogItems = [];
let currentCategory = 'all';
let catalogSource = 'home'; 

// ==========================================
// 2. INITIALISIERUNG
// ==========================================

window.onload = function() {
    const savedIncome = localStorage.getItem('income');
    const savedExpenses = localStorage.getItem('expenses');
    
    if(savedIncome && document.getElementById('w-income')) document.getElementById('w-income').value = savedIncome;
    if(savedExpenses && document.getElementById('w-expenses')) document.getElementById('w-expenses').value = savedExpenses;
    
    // Sync to list view inputs
    if(savedIncome && document.getElementById('list-income-input')) document.getElementById('list-income-input').value = savedIncome;
    if(savedExpenses && document.getElementById('list-expenses-input')) document.getElementById('list-expenses-input').value = savedExpenses;

    checkFixCosts();
    renderListsNav();
    updateStatsUI(); 
    checkEmptyCartState(); 
    calcWorker(); // Initial einmal berechnen, falls Werte aus LocalStorage geladen wurden
    
    if (typeof productDB === 'undefined') {
        console.error("Fehler: products.js wurde nicht geladen!");
        alert("Datenbank Fehler: Bitte lade die Seite neu.");
    }
};

function saveToLocal() {
    const inc = document.getElementById('w-income').value;
    const exp = document.getElementById('w-expenses').value;
    localStorage.setItem('income', inc);
    localStorage.setItem('expenses', exp);
    if(document.getElementById('list-income-input')) document.getElementById('list-income-input').value = inc;
    if(document.getElementById('list-expenses-input')) document.getElementById('list-expenses-input').value = exp;
}

// --- STATS LOGIC ---
function updateStatsUI() {
    if(document.getElementById('stat-money')) document.getElementById('stat-money').innerText = totalStats.money.toLocaleString('de-DE', {minimumFractionDigits:2, maximumFractionDigits:2}) + ' €';
    if(document.getElementById('stat-time')) document.getElementById('stat-time').innerText = Math.round(totalStats.time) + ' Std';
}

function saveStats() {
    localStorage.setItem('totalStats', JSON.stringify(totalStats));
}

// --- VIEW NAVIGATION ---
function switchView(viewName, btn) {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    if(btn) btn.classList.add('active');
    document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active-view'));
    document.getElementById('view-' + viewName).classList.add('active-view');
}

// --- CATALOG MODAL LOGIC ---
function openCatalogModal(source) {
    catalogSource = source; 
    document.getElementById('catalog-modal').style.display = 'flex';
    selectedCatalogItems = [];
    currentCategory = 'all';
    document.getElementById('catalog-search-input').value = '';
    renderCatalog();
    updateFooterCount();
}

function closeCatalogModal() {
    document.getElementById('catalog-modal').style.display = 'none';
}

function filterCatalog(cat, btn) {
    currentCategory = cat;
    document.querySelectorAll('.cat-item').forEach(el => el.classList.remove('active'));
    btn.classList.add('active');
    renderCatalog();
}

function searchCatalog() {
    renderCatalog();
}

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
        
        let icon = "📦";
        if(product.cat === 'Handy') icon = "📱";
        if(product.cat === 'Gaming') icon = "🎮";
        if(product.cat === 'Audio') icon = "🎧";
        if(product.cat === 'Laptop') icon = "💻";
        if(product.cat === 'Kamera') icon = "📷";
        if(product.cat === 'Haushalt') icon = "🏠";

        div.innerHTML = `<div class="pc-check"></div><div class="pc-icon">${icon}</div><div class="pc-name">${product.name}</div><div class="pc-price">${product.price} €</div>`;
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
        selectedCatalogItems.forEach(p => { addCartRow(p.name, p.price, 0); });
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
        list.innerHTML = `
            <div class="empty-state">
                <div style="font-size: 2.5rem; opacity: 0.3; margin-bottom: 10px;">🛒</div>
                <div style="font-weight: 600; color: var(--text-light);">Dein Warenkorb ist leer</div>
                <div style="font-size: 0.8rem; color: #94a3b8;">Füge Produkte hinzu, um zu starten.</div>
            </div>
        `;
        summary.style.display = 'none';
        
    } else {
        const es = list.querySelector('.empty-state');
        if(es) es.remove();
        summary.style.display = 'flex';
    }
    // Neuberechnung triggern, damit die wage-table sichtbar bleibt/wird
    calcWorker();
}

function addManualItem() { addCartRow("Manuelles Produkt", 0, 0); }

function addCartRow(name, price, resell) {
    const list = document.getElementById('cart-list');
    const emptyState = list.querySelector('.empty-state');
    if(emptyState) list.innerHTML = '';

    cartItemCount++;
    const rowId = 'cart-item-' + cartItemCount;
    const div = document.createElement('div');
    div.className = 'cart-row';
    div.id = rowId;
    div.innerHTML = `<div class="input-with-label"><span class="input-label-tiny">Produkt</span><input type="text" class="cart-input cart-input-name" value="${name}"></div><div class="input-with-label"><span class="input-label-tiny">Preis</span><input type="number" class="cart-input cart-input-price" value="${price}" oninput="calcWorker()"></div><div class="input-with-label"><span class="input-label-tiny">Wiederverkauf</span><input type="number" class="cart-input cart-input-resell" value="${resell}" oninput="calcWorker()"></div><button class="btn-remove" onclick="removeCartRow('${rowId}')">×</button>`;
    list.appendChild(div);
    
    document.querySelector('.cart-summary').style.display = 'flex';
    
    calcWorker();
}

function removeCartRow(id) {
    document.getElementById(id).remove();
    checkEmptyCartState();
    // calcWorker wird bereits in checkEmptyCartState aufgerufen
}

function calcWorker() {
    const income = parseFloat(document.getElementById('w-income').value);
    const expenses = parseFloat(document.getElementById('w-expenses').value);
    const resultContainer = document.getElementById('w-result-container');
    
    // 1. Zuerst prüfen, ob überhaupt ein Einkommen da ist.
    if(isNaN(income) || income <= 0) {
        resultContainer.style.display = 'none';
        return;
    }

    // Einkommen da -> Container anzeigen
    resultContainer.style.display = 'block';

    // 2. Preise berechnen
    let totalPrice = 0; let totalResell = 0;
    document.querySelectorAll('.cart-input-price').forEach(i => totalPrice += parseFloat(i.value)||0);
    document.querySelectorAll('.cart-input-resell').forEach(i => totalResell += parseFloat(i.value)||0);
    
    // Prüfen ob Produkte da sind (via Empty State Check oder Summe)
    const list = document.getElementById('cart-list');
    const hasProducts = !list.querySelector('.empty-state') && list.children.length > 0;

    document.getElementById('total-price-display').innerText = totalPrice.toLocaleString('de-DE',{minimumFractionDigits:2}) + ' €';
    const effective = Math.max(0, totalPrice - totalResell);
    document.getElementById('total-effective-display').innerText = effective.toLocaleString('de-DE',{minimumFractionDigits:2}) + ' €';
    
    // 3. Stundenlohn berechnen (immer anzeigen wenn Income > 0)
    // FIX: NaN/Undefined abfangen für Expenses
    const safeExpenses = isNaN(expenses) ? 0 : expenses;

    const disposable = Math.max(0, income - safeExpenses);
    const hourly = disposable / 173.33;
    
    // FIX: Tausenderpunkte hinzufügen (toLocaleString)
    document.getElementById('val-wage-base').innerText = (income/173.33).toLocaleString('de-DE', {minimumFractionDigits:2, maximumFractionDigits:2}) + ' €';
    document.getElementById('val-wage-real').innerText = hourly.toLocaleString('de-DE', {minimumFractionDigits:2, maximumFractionDigits:2}) + ' €';
    
    // 4. Produkt-Details steuern (Hero Box, Decision Buttons)
    const productDetails = resultContainer.querySelector('.product-calc-details');
    
    if(!hasProducts) {
        // Nur Lohn anzeigen, Rest ausblenden
        if(productDetails) productDetails.style.display = 'none';
        
        // Auch den Fixkosten-Check machen, aber ohne return
        checkFixCosts();
        return; 
    } else {
        // Alles anzeigen
        if(productDetails) productDetails.style.display = 'block';
    }

    checkFixCosts();

    document.getElementById('detail-price').innerText = totalPrice.toLocaleString('de-DE',{minimumFractionDigits:2}) + ' €';
    document.getElementById('detail-effective-footer').innerText = effective.toLocaleString('de-DE',{minimumFractionDigits:2}) + ' €';

    let hours = 0;
    if(disposable <= 0) {
        document.getElementById('val-hours').innerText = "∞";
        document.getElementById('val-days').innerText = "∞";
    } else {
        hours = effective / hourly;
        document.getElementById('val-hours').innerText = Math.round(hours);
        document.getElementById('val-days').innerText = (hours/8).toFixed(1);
    }

    // Store for Decision
    currentCalcResult.money = effective;
    currentCalcResult.hours = (disposable > 0) ? hours : 0;
}

function checkFixCosts() {
    const inc = parseFloat(document.getElementById('w-income').value);
    const exp = parseFloat(document.getElementById('w-expenses').value);
    const box = document.getElementById('fixcost-feedback');
    
    if(!box) return;

    // FIX: Logik verbessert - verschwindet wenn inputs leer sind
    if(isNaN(inc) || isNaN(exp) || inc <= 0 || exp <= 0) { 
        box.style.display='none'; 
        box.className = ''; // Klasse zurücksetzen
        return; 
    }
    
    box.style.display = 'block';
    const ratio = (exp/inc)*100;
    if(ratio > 50) { box.className='feedback-bad'; box.innerHTML='<span>⚠️ Fixkosten ' + ratio.toFixed(0) + '% (Ideal: <50%).</span>'; }
    else { box.className='feedback-good'; box.innerHTML='<span>✅ Vorbildliche Fixkosten.</span>'; }
}

// --- DECISION LOGIC ---
function decisionSave() {
    if(currentCalcResult.money <= 0) { 
        alert("Warenkorb ist leer."); 
        return; 
    }
    document.getElementById('confirm-modal').style.display = 'flex';
}

function closeConfirmModal() {
    document.getElementById('confirm-modal').style.display = 'none';
}

function triggerConfetti() {
    const duration = 2000;
    if(typeof confetti === 'function') {
        confetti({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#22c55e', '#2563eb', '#facc15']
        });
    }
}

function confirmAction() {
    closeConfirmModal();
    triggerConfetti(); 

    totalStats.money += currentCalcResult.money;
    totalStats.time += currentCalcResult.hours;
    saveStats();
    updateStatsUI();

    document.getElementById('cart-list').innerHTML = '';
    checkEmptyCartState(); // Reset auf Empty State
    // calcWorker wird von checkEmptyCartState aufgerufen und versteckt dann die Produkt-Details
    currentCalcResult = { money: 0, hours: 0 };
}

function decisionBuy() {
    if(document.getElementById('cart-list').children.length === 0) { alert("Warenkorb leer."); return; }
    const list = document.getElementById('cart-list');
    if(list.querySelector('.empty-state')) { alert("Warenkorb leer."); return; }
    
    openShopModal();
}

function openShopModal() {
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
    document.getElementById('shop-modal').style.display = 'flex';
}

function closeShopModal() { document.getElementById('shop-modal').style.display = 'none'; }


// --- LISTS LOGIC ---
function createNewList() {
    const name = prompt("Name der neuen Liste:");
    if(!name) return;
    const newList = { id: Date.now(), name: name, saved: 0, items: [] };
    myLists.push(newList);
    saveLists();
    renderListsNav();
    openList(newList.id);
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
    document.getElementById('list-saved').value = list.saved;
    syncSalaryFromList(); 
    renderListItems();
    updateListCalculations();
}

function deleteCurrentList() {
    if(!confirm("Löschen?")) return;
    myLists = myLists.filter(l => l.id !== currentListId);
    saveLists();
    currentListId = null;
    document.getElementById('no-list-selected').style.display = 'block';
    document.getElementById('active-list-view').style.display = 'none';
    renderListsNav();
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
        let linkHtml = '';
        if(item.link && item.link !== "#") linkHtml = `<a href="${item.link}" target="_blank" class="btn-link">Shop ↗</a>`;
        div.innerHTML = `<span>${item.name}</span><div style="display:flex;align-items:center;gap:10px;">${linkHtml}<strong>${item.price.toFixed(2)} €</strong><button class="btn-remove" onclick="deleteListItem(${index})">×</button></div>`;
        container.appendChild(div);
    });
}

function syncSalaryFromList() {
    const inc = document.getElementById('list-income-input').value;
    const exp = document.getElementById('list-expenses-input').value;
    localStorage.setItem('income', inc);
    localStorage.setItem('expenses', exp);
    if(document.getElementById('w-income')) document.getElementById('w-income').value = inc;
    if(document.getElementById('w-expenses')) document.getElementById('w-expenses').value = exp;
    updateListCalculations();
}

function updateListCalculations() {
    const list = myLists.find(l => l.id === currentListId);
    const total = list.items.reduce((sum, item) => sum + item.price, 0);
    document.getElementById('list-total').innerText = total.toLocaleString('de-DE', {minimumFractionDigits:2}) + ' €';
    const saved = parseFloat(document.getElementById('list-saved').value) || 0;
    list.saved = saved; saveLists();
    let remaining = Math.max(0, total - saved);
    document.getElementById('list-remaining').innerText = remaining.toLocaleString('de-DE', {minimumFractionDigits:2}) + ' €';
    
    const income = parseFloat(localStorage.getItem('income')) || 0;
    const expenses = parseFloat(localStorage.getItem('expenses')) || 0;
    const disposable = Math.max(0, income - expenses);
    
    const timeEl = document.getElementById('list-work-time');
    const infoEl = document.getElementById('list-wage-info');
    
    if(income <= 0) { timeEl.innerText = "-"; infoEl.innerText = "Bitte Lohn oben eingeben."; return; }
    if(disposable <= 0) { timeEl.innerText = "Unendlich"; infoEl.innerText = "Kein freies Einkommen."; return; }
    
    const hourlyWage = disposable / 173.33;
    const hoursNeeded = remaining / hourlyWage;
    
    if (hoursNeeded > 173) { const months = (hoursNeeded / 173).toFixed(1); timeEl.innerText = `${months} Arbeitsmonate`; }
    else if (hoursNeeded > 8) { const days = (hoursNeeded / 8).toFixed(1); timeEl.innerText = `${days} Arbeitstage`; }
    else { const h = Math.floor(hoursNeeded); const m = Math.round((hoursNeeded - h) * 60); timeEl.innerText = `${h} Std ${m} Min`; }
    infoEl.innerText = `Basierend auf ${hourlyWage.toFixed(2)}€ Real-Stundenlohn`;
}

// --- SALARY CALC ---
function toggleKvInput() {
    const type = document.getElementById('s-kv-type').value;
    const group = document.getElementById('kv-rate-group');
    if(type === 'pkv') { group.style.opacity = '0.5'; document.getElementById('s-kv-add').disabled = true; } 
    else { group.style.opacity = '1'; document.getElementById('s-kv-add').disabled = false; }
}

function calculateSalary() {
    const rawBrutto = parseFloat(document.getElementById('s-brutto').value) || 0;
    const period = document.getElementById('s-period').value;
    const fixCostsMonth = parseFloat(document.getElementById('s-fixcosts').value) || 0;
    const taxClass = parseInt(document.getElementById('s-class').value);
    const state = document.getElementById('s-state').value;
    const churchActive = parseInt(document.getElementById('s-church').value) === 1;
    const age = parseInt(document.getElementById('s-age').value) || 30;
    const kids = parseFloat(document.getElementById('s-kids').value);
    const kvType = document.getElementById('s-kv-type').value;
    const kvAddRate = parseFloat(document.getElementById('s-kv-add').value) || 1.7;

    if(rawBrutto <= 0) return;

    let monthlyBrutto = (period === 'year') ? rawBrutto / 12 : rawBrutto;
    
    const baseKv = Math.min(monthlyBrutto, 5175);
    const baseRv = Math.min(monthlyBrutto, 7550);
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
    if (taxable > 1000) {
        let overflow = taxable - 1000;
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
    renderSalaryResult(currentSalaryMode);
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
    if(document.getElementById('s-fixcosts').value > 0) html += `<tr class="real-netto-row"><td>✨ Verfügbar (Real)</td><td style="text-align:right">${data.realNetto.toLocaleString('de-DE', {minimumFractionDigits:2})} €</td></tr>`;
    table.innerHTML = html;

    const ctx = document.getElementById('salaryChart').getContext('2d');
    if(salaryChartInstance) salaryChartInstance.destroy();
    salaryChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: { labels: ['Netto', 'Steuern', 'Sozialabgaben'], datasets: [{ data: [data.netto, data.taxSum, data.socialSum], backgroundColor: ['#22c55e', '#ef4444', '#f59e0b'], borderWidth: 0 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: function(context) { let val = context.raw.toLocaleString('de-DE', {minimumFractionDigits:2}); let percentage = ((context.raw / data.brutto) * 100).toFixed(1); return `${context.label}: ${val} € (${percentage}%)`; } } } } }
    });
}

// --- SMART SYNC FUNCTION (Neu) ---
function transferSalary() {
    // Hole das berechnete Netto (Monat)
    if(!salaryData.month.netto) return alert("Bitte erst Gehalt berechnen!");
    const netto = salaryData.month.netto;

    // Setze es in die Eingabefelder (Worker & LocalStorage)
    document.getElementById('w-income').value = netto.toFixed(2);
    localStorage.setItem('income', netto.toFixed(2));
    
    // Wechsle zum Home View
    switchView('home', document.querySelectorAll('.nav-btn')[0]);
    
    // Trigger Berechnung
    calcWorker();
}