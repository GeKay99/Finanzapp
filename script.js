// --- STATE VARIABLES ---
const productDB = [
    { name: "iPhone 16", price: 949, cat: "Handy", link: "https://www.apple.com/de/iphone/" },
    { name: "iPhone 16 Pro", price: 1199, cat: "Handy", link: "https://www.apple.com/de/iphone/" },
    { name: "Samsung S24", price: 899, cat: "Handy", link: "https://www.samsung.com/de/smartphones/" },
    { name: "Samsung S24 Ultra", price: 1449, cat: "Handy", link: "#" },
    { name: "Google Pixel 8", price: 799, cat: "Handy", link: "#" },
    { name: "PlayStation 5", price: 549, cat: "Gaming", link: "https://www.playstation.com/" },
    { name: "Nintendo Switch", price: 349, cat: "Gaming", link: "https://www.nintendo.de/" },
    { name: "Xbox Series X", price: 499, cat: "Gaming", link: "#" },
    { name: "AirPods Pro", price: 279, cat: "Audio", link: "https://www.apple.com/de/airpods/" },
    { name: "Sony WH-1000XM5", price: 349, cat: "Audio", link: "#" },
    { name: "MacBook Air", price: 1299, cat: "Laptop", link: "https://www.apple.com/de/mac/" },
    { name: "MacBook Pro 14", price: 1999, cat: "Laptop", link: "#" },
    { name: "iPad Air", price: 699, cat: "Tablet", link: "https://www.apple.com/de/ipad/" },
    { name: "GoPro Hero 12", price: 399, cat: "Kamera", link: "https://gopro.com/" },
    { name: "Dyson V15", price: 699, cat: "Haushalt", link: "https://www.dyson.de/" },
    { name: "Thermomix TM6", price: 1399, cat: "Haushalt", link: "#" }
];

let cartItemCount = 0;
let salaryData = { month: {}, year: {} };
let currentSalaryMode = 'month';
let salaryChartInstance = null;
let dreamChartInstance = null;
let myLists = JSON.parse(localStorage.getItem('myLists')) || [];
let currentListId = null;

// Modal State
let selectedCatalogItems = [];
let currentCategory = 'all';
let catalogSource = 'home'; // 'home' or 'list'

// --- INITIALIZATION ---
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
};

function saveToLocal() {
    const inc = document.getElementById('w-income').value;
    const exp = document.getElementById('w-expenses').value;
    localStorage.setItem('income', inc);
    localStorage.setItem('expenses', exp);
    if(document.getElementById('list-income-input')) document.getElementById('list-income-input').value = inc;
    if(document.getElementById('list-expenses-input')) document.getElementById('list-expenses-input').value = exp;
}

// --- VIEW NAVIGATION ---
function switchView(viewName, btn) {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    if(btn) btn.classList.add('active');
    document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active-view'));
    document.getElementById('view-' + viewName).classList.add('active-view');
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    const btns = document.querySelectorAll('.tab-btn');
    if(tabName === 'worker') btns[0].classList.add('active'); else btns[1].classList.add('active');
    document.querySelectorAll('.content-section').forEach(el => el.classList.remove('active'));
    document.getElementById(tabName).classList.add('active');
    const sidebarBench = document.getElementById('sidebar-benchmark');
    const sidebarChart = document.getElementById('sidebar-chart');
    if(tabName === 'worker') { sidebarBench.style.display = 'flex'; sidebarChart.style.display = 'none'; }
    else { sidebarBench.style.display = 'none'; sidebarChart.style.display = 'flex'; }
}

// --- CATALOG MODAL LOGIC (NEU & UNIFIED) ---
function openCatalogModal(source) {
    catalogSource = source; // Save where we came from
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
        // Add to Home Cart
        selectedCatalogItems.forEach(p => {
            addCartRow(p.name, p.price, 0);
        });
    } else {
        // Add to List
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

// --- WORKER FUNCTIONS ---
function addManualItem() { addCartRow("Manuelles Produkt", 0, 0); }
function addFromTicker(name, price) { switchTab('worker'); addCartRow(name, price, 0); }

function addCartRow(name, price, resell) {
    cartItemCount++;
    const rowId = 'cart-item-' + cartItemCount;
    const div = document.createElement('div');
    div.className = 'cart-row';
    div.id = rowId;
    div.innerHTML = `<div class="input-with-label"><span class="input-label-tiny">Produkt</span><input type="text" class="cart-input cart-input-name" value="${name}"></div><div class="input-with-label"><span class="input-label-tiny">Preis</span><input type="number" class="cart-input cart-input-price" value="${price}" oninput="calcWorker()"></div><div class="input-with-label"><span class="input-label-tiny">Wiederverkauf</span><input type="number" class="cart-input cart-input-resell" value="${resell}" oninput="calcWorker()"></div><button class="btn-remove" onclick="removeCartRow('${rowId}')">×</button>`;
    document.getElementById('cart-list').appendChild(div);
    document.getElementById('cart-area').style.display = 'block';
    calcWorker();
}

function removeCartRow(id) {
    document.getElementById(id).remove();
    if(document.getElementById('cart-list').children.length === 0) document.getElementById('cart-area').style.display = 'none';
    calcWorker();
}

function calcWorker() {
    const income = parseFloat(document.getElementById('w-income').value) || 0;
    const expenses = parseFloat(document.getElementById('w-expenses').value) || 0;
    let totalPrice = 0; let totalResell = 0;
    document.querySelectorAll('.cart-input-price').forEach(i => totalPrice += parseFloat(i.value)||0);
    document.querySelectorAll('.cart-input-resell').forEach(i => totalResell += parseFloat(i.value)||0);
    
    document.getElementById('total-price-display').innerText = totalPrice.toLocaleString('de-DE',{minimumFractionDigits:2}) + ' €';
    const effective = Math.max(0, totalPrice - totalResell);
    document.getElementById('total-effective-display').innerText = effective.toLocaleString('de-DE',{minimumFractionDigits:2}) + ' €';
    
    checkFixCosts();
    if(income <= 0) return;
    
    const disposable = Math.max(0, income - expenses);
    document.getElementById('w-result-container').style.display = 'block';
    
    const hourly = disposable / 173.33;
    if(disposable <= 0) {
        document.getElementById('val-hours').innerText = "∞";
        document.getElementById('val-days').innerText = "∞";
        document.getElementById('w-cpu-text').innerText = "Unbezahlbar";
    } else {
        const hours = effective / hourly;
        document.getElementById('val-wage-real').innerText = hourly.toFixed(2) + ' €';
        document.getElementById('val-hours').innerText = Math.round(hours);
        document.getElementById('val-days').innerText = (hours/8).toFixed(1);
        
        const years = parseFloat(document.getElementById('w-years').value) || 1;
        const freq = parseFloat(document.getElementById('w-freq').value) || 1;
        const cpu = effective / (years * freq);
        document.getElementById('w-cpu-text').innerText = cpu.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
    }
    document.getElementById('val-wage-base').innerText = (income/173.33).toFixed(2) + ' €';
}

function checkFixCosts() {
    const inc = parseFloat(document.getElementById('w-income').value)||0;
    const exp = parseFloat(document.getElementById('w-expenses').value)||0;
    const box = document.getElementById('fixcost-feedback');
    if(!box) return;
    if(inc <= 0 || exp <= 0) { box.style.display='none'; return; }
    box.style.display = 'flex';
    const ratio = (exp/inc)*100;
    if(ratio > 50) { box.className='feedback-bad'; box.innerHTML='<span>⚠️ Fixkosten ' + ratio.toFixed(0) + '% (Ideal: <50%).</span>'; }
    else { box.className='feedback-good'; box.innerHTML='<span>✅ Vorbildliche Fixkosten.</span>'; }
}

// --- DREAMER CALC ---
function setDream(val) { document.getElementById('d-price').value = val; }
function calcDream() { 
    const currentPrice = parseFloat(document.getElementById('d-price').value) || 0;
    const years = parseInt(document.getElementById('d-years').value) || 5;
    const appreciation = parseFloat(document.getElementById('d-appreciation').value) || 0;
    if(currentPrice <= 0) return;
    document.getElementById('d-result-container').style.display = 'block';
    document.getElementById('chart-placeholder').style.display = 'none';
    document.getElementById('dreamChart').style.display = 'block';
    document.getElementById('chart-analysis').style.display = 'block';
    const months = years * 12;
    const monthlySave = currentPrice / months; 
    document.getElementById('d-rate').innerText = monthlySave.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' }) + " / Mo";
    const labels = []; const dataProduct = []; const dataETF = [];
    let productVal = currentPrice; let etfVal = 0;
    const annualInvest = monthlySave * 12; const etfRate = 0.07; let overtakeYear = -1;
    for (let i = 0; i <= years; i++) {
        labels.push("Jahr " + i);
        productVal = currentPrice * Math.pow(1 + (appreciation/100), i);
        dataProduct.push(productVal);
        if(i === 0) etfVal = 0; else etfVal = (etfVal * (1 + etfRate)) + annualInvest;
        dataETF.push(etfVal);
        if(i > 0 && etfVal > productVal && overtakeYear === -1) overtakeYear = i;
    }
    const ctx = document.getElementById('dreamChart').getContext('2d');
    if(dreamChartInstance) dreamChartInstance.destroy();
    dreamChartInstance = new Chart(ctx, {
        type: 'line',
        data: { labels: labels, datasets: [{ label: 'Produkt Preis (Rot)', data: dataProduct, borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', tension: 0.3, fill: false }, { label: 'ETF Depot (Grün)', data: dataETF, borderColor: '#22c55e', backgroundColor: 'rgba(34, 197, 94, 0.1)', tension: 0.3, fill: true }] },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
    });
    const analysisEl = document.getElementById('chart-analysis');
    if(overtakeYear !== -1 && overtakeYear < years) analysisEl.innerHTML = `<strong style="color:var(--success)">Glückwunsch!</strong><br>Bereits im <strong>Jahr ${overtakeYear}</strong> schlägt dein Depot den Preis.`;
    else analysisEl.innerHTML = `<strong>Knapp.</strong><br>Inflation frisst Rendite auf.`;
}

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