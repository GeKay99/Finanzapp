// --- STATE VARIABLES ---
const productDB = [
    { name: "iPhone 16", price: 949, cat: "Handy" },
    { name: "iPhone 16 Pro", price: 1199, cat: "Handy" },
    { name: "Samsung S24", price: 899, cat: "Handy" },
    { name: "PlayStation 5", price: 549, cat: "Gaming" },
    { name: "Nintendo Switch", price: 349, cat: "Gaming" },
    { name: "AirPods Pro", price: 279, cat: "Audio" },
    { name: "MacBook Air", price: 1299, cat: "Laptop" },
    { name: "GoPro Hero 12", price: 399, cat: "Kamera" }
];

let cartItemCount = 0;
let salaryData = { month: {}, year: {} };
let currentSalaryMode = 'month';
let salaryChartInstance = null;
let dreamChartInstance = null;

// --- INITIALIZATION ---
window.onload = function() {
    if(localStorage.getItem('income')) document.getElementById('w-income').value = localStorage.getItem('income');
    if(localStorage.getItem('expenses')) document.getElementById('w-expenses').value = localStorage.getItem('expenses');
    checkFixCosts();
}

function saveToLocal() {
    localStorage.setItem('income', document.getElementById('w-income').value);
    localStorage.setItem('expenses', document.getElementById('w-expenses').value);
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

// --- WORKER / CART LOGIC ---
const searchInput = document.getElementById('product-search');
const suggestionsBox = document.getElementById('suggestions');
const cartList = document.getElementById('cart-list');

searchInput.addEventListener('input', function() {
    const query = this.value.toLowerCase();
    suggestionsBox.innerHTML = ''; 
    if (query.length < 1) { suggestionsBox.style.display = 'none'; return; }
    const matches = productDB.filter(p => p.name.toLowerCase().includes(query));
    if (matches.length > 0) {
        suggestionsBox.style.display = 'block';
        matches.forEach(product => {
            const div = document.createElement('div');
            div.className = 'suggestion-item';
            div.innerHTML = `<span><span class="suggestion-cat">${product.cat}</span>${product.name}</span><span style="font-weight:bold">${product.price} €</span>`;
            div.onclick = () => addCartRow(product.name, product.price, 0); 
            suggestionsBox.appendChild(div);
        });
    } else { suggestionsBox.style.display = 'none'; }
});

document.addEventListener('click', function(e) { if (e.target !== searchInput) suggestionsBox.style.display = 'none'; });

function addManualItem() { addCartRow("Manuelles Produkt", 0, 0); }
function addFromTicker(name, price) { switchTab('worker'); addCartRow(name, price, 0); }

function addCartRow(name, price, resell) {
    cartItemCount++;
    const rowId = 'cart-item-' + cartItemCount;
    const div = document.createElement('div');
    div.className = 'cart-row';
    div.id = rowId;
    div.innerHTML = `
        <div class="input-with-label"><span class="input-label-tiny">Produkt</span><input type="text" class="cart-input cart-input-name" value="${name}"></div>
        <div class="input-with-label"><span class="input-label-tiny">Preis</span><input type="number" class="cart-input cart-input-price" value="${price}" oninput="calcWorker()"></div>
        <div class="input-with-label"><span class="input-label-tiny">Wiederverkauf</span><input type="number" class="cart-input cart-input-resell" value="${resell}" oninput="calcWorker()"></div>
        <button class="btn-remove" onclick="removeCartRow('${rowId}')">×</button>
    `;
    cartList.appendChild(div);
    document.getElementById('cart-area').style.display = 'block';
    searchInput.value = ''; suggestionsBox.style.display = 'none'; calcWorker();
}

function removeCartRow(id) { 
    document.getElementById(id).remove(); 
    if(document.getElementById('cart-list').children.length === 0) {
        document.getElementById('cart-area').style.display = 'none';
    }
    calcWorker(); 
}

function checkFixCosts() {
    const income = parseFloat(document.getElementById('w-income').value) || 0;
    const expenses = parseFloat(document.getElementById('w-expenses').value) || 0;
    const feedbackBox = document.getElementById('fixcost-feedback');
    if(income <= 0 || expenses <= 0) { feedbackBox.style.display = 'none'; return; }
    const ratio = (expenses / income) * 100;
    feedbackBox.style.display = 'flex';
    if (ratio > 50) {
        const diff = (ratio - 50).toFixed(1);
        feedbackBox.className = 'feedback-bad';
        feedbackBox.innerHTML = `<span>⚠️ Fixkosten ${diff}% über Idealwert (50%).</span>`;
    } else {
        feedbackBox.className = 'feedback-good';
        feedbackBox.innerHTML = `<span>✅ Vorbildliche Fixkosten.</span>`;
    }
}

function calcWorker() {
    const income = parseFloat(document.getElementById('w-income').value) || 0;
    const expenses = parseFloat(document.getElementById('w-expenses').value) || 0;
    
    let totalPrice = 0; let totalResell = 0;
    document.querySelectorAll('.cart-input-price').forEach(input => { totalPrice += parseFloat(input.value) || 0; });
    document.querySelectorAll('.cart-input-resell').forEach(input => { totalResell += parseFloat(input.value) || 0; });

    document.getElementById('total-price-display').innerText = totalPrice.toLocaleString('de-DE', {minimumFractionDigits: 2}) + ' €';
    const effectiveTotal = Math.max(0, totalPrice - totalResell);
    document.getElementById('total-effective-display').innerText = effectiveTotal.toLocaleString('de-DE', {minimumFractionDigits: 2}) + ' €';

    checkFixCosts();
    if(income <= 0) return;

    const disposable = income - expenses;
    document.getElementById('w-result-container').style.display = 'block';

    const baseWage = income / 173.33;
    let realWage = 0; let totalHours = 0; let totalDays = 0;

    if (disposable <= 0) {
        document.getElementById('val-wage-base').innerText = baseWage.toFixed(2) + " €";
        document.getElementById('val-wage-real').innerText = "0,00 €";
        document.getElementById('val-hours').innerText = "∞";
        document.getElementById('val-days').innerText = "∞";
        document.getElementById('w-cpu-text').innerText = "Unbezahlbar";
    } else {
        realWage = disposable / 173.33;
        totalHours = effectiveTotal / realWage;
        totalDays = totalHours / 8; 

        document.getElementById('val-wage-base').innerText = baseWage.toFixed(2) + " €";
        document.getElementById('val-wage-real').innerText = realWage.toFixed(2) + " €";
        document.getElementById('val-hours').innerText = Math.round(totalHours);
        document.getElementById('val-days').innerText = totalDays.toFixed(1);

        const years = parseFloat(document.getElementById('w-years').value) || 1;
        const freq = parseFloat(document.getElementById('w-freq').value) || 1;
        const totalUses = years * freq;
        const cpu = effectiveTotal / totalUses;
        document.getElementById('w-cpu-text').innerText = cpu.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
    }
}

// --- DREAMER LOGIK ---
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

    renderChart(labels, dataProduct, dataETF);
    const analysisEl = document.getElementById('chart-analysis');
    if(overtakeYear !== -1 && overtakeYear < years) {
        analysisEl.innerHTML = `<strong style="color:var(--success)">Glückwunsch!</strong><br>Bereits im <strong>Jahr ${overtakeYear}</strong> schlägt dein Depot den Preis.`;
    } else if (etfVal > productVal) {
        analysisEl.innerHTML = `<strong style="color:var(--success)">Ziel erreicht!</strong><br>Depot: ${etfVal.toLocaleString('de-DE',{maximumFractionDigits:0})}€ vs. Kosten: ${productVal.toLocaleString('de-DE',{maximumFractionDigits:0})}€.`;
    } else {
        analysisEl.innerHTML = `<strong>Knapp.</strong><br>Inflation frisst Rendite auf.`;
    }
}

function renderChart(labels, dataProduct, dataETF) {
    const ctx = document.getElementById('dreamChart').getContext('2d');
    if(dreamChartInstance) dreamChartInstance.destroy();
    dreamChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                { label: 'Produkt Preis (Rot)', data: dataProduct, borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', tension: 0.3, fill: false },
                { label: 'ETF Depot (Grün)', data: dataETF, borderColor: '#22c55e', backgroundColor: 'rgba(34, 197, 94, 0.1)', tension: 0.3, fill: true }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
    });
}

// --- SALARY CALCULATOR LOGIC ---
function toggleKvInput() {
    const type = document.getElementById('s-kv-type').value;
    const group = document.getElementById('kv-rate-group');
    if(type === 'pkv') {
        group.style.opacity = '0.5'; 
        document.getElementById('s-kv-add').disabled = true;
    } else {
        group.style.opacity = '1';
        document.getElementById('s-kv-add').disabled = false;
    }
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

    // SOCIAL
    const bbgKv = 5175; const bbgRv = 7550; 
    const baseKv = Math.min(monthlyBrutto, bbgKv);
    const baseRv = Math.min(monthlyBrutto, bbgRv);
    const rv = baseRv * 0.093;
    const av = baseRv * 0.013;
    
    let kv = 0;
    if(kvType === 'gkv') {
        const totalKvRate = 14.6 + kvAddRate;
        kv = baseKv * (totalKvRate / 100 / 2);
    }

    let pvRateAN = 0.017;
    if(state === 'sn') pvRateAN = 0.022;
    if(kids === 0 && age >= 23) pvRateAN += 0.006;
    if(kids >= 2) {
        const discount = (Math.min(kids, 5) - 1) * 0.0025;
        pvRateAN = Math.max(0, pvRateAN - discount);
    }
    const pv = baseKv * pvRateAN;
    const socialTotal = rv + av + kv + pv;

    // TAX
    let taxFactor = 1.0;
    if(taxClass === 3) taxFactor = 0.62; 
    if(taxClass === 5) taxFactor = 1.75; 
    if(taxClass === 6) taxFactor = 1.95; 
    if(taxClass === 2) taxFactor = 0.95; 

    let taxable = Math.max(0, monthlyBrutto - socialTotal - 100); 
    let tax = 0;
    const basicAllowance = 1000; 
    
    if (taxable > basicAllowance) {
        let overflow = taxable - basicAllowance;
        let rate = 0.14 + (Math.min(overflow, 5000) / 5000) * 0.28; 
        if(overflow > 5000) rate = 0.42; 
        tax = overflow * rate * taxFactor;
    }

    let soli = 0;
    if(tax > 1450 && kids < 1) soli = tax * 0.055;

    let church = 0;
    if(churchActive) {
        const churchRate = (state === 'by' || state === 'bw') ? 0.08 : 0.09;
        church = tax * churchRate;
    }

    const taxTotal = tax + soli + church;
    const netto = monthlyBrutto - socialTotal - taxTotal;
    const realNetto = Math.max(0, netto - fixCostsMonth);

    // SAVE DATA
    salaryData.month = {
        brutto: monthlyBrutto, tax: tax, soliChurch: soli + church, kv: kv, pv: pv, rv: rv, av: av, netto: netto, realNetto: realNetto,
        socialSum: socialTotal, taxSum: taxTotal
    };

    salaryData.year = {
        brutto: monthlyBrutto * 12, tax: tax * 12, soliChurch: (soli + church) * 12, kv: kv * 12, pv: pv * 12, rv: rv * 12, av: av * 12, netto: netto * 12, realNetto: realNetto * 12,
        socialSum: socialTotal * 12, taxSum: taxTotal * 12
    };

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
    
    let html = `
        <tr><th>Position</th><th style="text-align:right">Betrag</th></tr>
        <tr><td>Brutto-Lohn</td><td style="text-align:right">${data.brutto.toLocaleString('de-DE', {minimumFractionDigits:2})} €</td></tr>
        <tr><td>Lohnsteuer</td><td style="text-align:right" class="deduction-val">- ${data.tax.toLocaleString('de-DE', {minimumFractionDigits:2})} €</td></tr>
        <tr><td>Soli / Kirchensteuer</td><td style="text-align:right" class="deduction-val">- ${data.soliChurch.toLocaleString('de-DE', {minimumFractionDigits:2})} €</td></tr>
        <tr><td>Krankenversicherung</td><td style="text-align:right" class="deduction-val">- ${data.kv.toLocaleString('de-DE', {minimumFractionDigits:2})} €</td></tr>
        <tr><td>Pflegeversicherung</td><td style="text-align:right" class="deduction-val">- ${data.pv.toLocaleString('de-DE', {minimumFractionDigits:2})} €</td></tr>
        <tr><td>Rentenversicherung</td><td style="text-align:right" class="deduction-val">- ${data.rv.toLocaleString('de-DE', {minimumFractionDigits:2})} €</td></tr>
        <tr><td>Arbeitslosenvers.</td><td style="text-align:right" class="deduction-val">- ${data.av.toLocaleString('de-DE', {minimumFractionDigits:2})} €</td></tr>
        <tr class="total-row"><td>Netto-Lohn</td><td style="text-align:right">${data.netto.toLocaleString('de-DE', {minimumFractionDigits:2})} €</td></tr>
    `;

    if(document.getElementById('s-fixcosts').value > 0) {
        html += `<tr class="real-netto-row"><td>✨ Verfügbar (Real)</td><td style="text-align:right">${data.realNetto.toLocaleString('de-DE', {minimumFractionDigits:2})} €</td></tr>`;
    }

    table.innerHTML = html;

    const ctx = document.getElementById('salaryChart').getContext('2d');
    if(salaryChartInstance) salaryChartInstance.destroy();

    salaryChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Netto', 'Steuern', 'Sozialabgaben'],
            datasets: [{
                data: [data.netto, data.taxSum, data.socialSum],
                backgroundColor: ['#22c55e', '#ef4444', '#f59e0b'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let val = context.raw.toLocaleString('de-DE', {minimumFractionDigits:2});
                            let percentage = ((context.raw / data.brutto) * 100).toFixed(1);
                            return `${context.label}: ${val} € (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}