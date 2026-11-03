/**
 * MarketTrack – Frontend JavaScript Application
 * Interacts with Spring Boot REST API (/api/products) using modern async/await Fetch API.
 * Manages dynamic Chart.js visualizations, CRUD operations, live KPI metrics, and low-stock alerts.
 */

// API Base URL (relative path works automatically locally and on cloud platforms like Render)
const API_BASE_URL = '/api/products';

// Global state
let productsData = [];
let activeFilter = 'all'; // 'all' or 'low-stock'
let revenueProfitChart = null;
let stockDistributionChart = null;

// DOM Elements
const productTableBody = document.getElementById('productTableBody');
const emptyState = document.getElementById('emptyState');
const searchInput = document.getElementById('searchInput');
const productModal = document.getElementById('productModal');
const productForm = document.getElementById('productForm');
const modalTitle = document.getElementById('modalTitle');
const modalBadgeIcon = document.getElementById('modalBadgeIcon');
const openAddModalBtn = document.getElementById('openAddModalBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelModalBtn = document.getElementById('cancelModalBtn');
const alertBanner = document.getElementById('alertBanner');
const bannerLowStockCount = document.getElementById('bannerLowStockCount');
const viewLowStockBtn = document.getElementById('viewLowStockBtn');
const filterAllBtn = document.getElementById('filterAllBtn');
const filterLowStockBtn = document.getElementById('filterLowStockBtn');
const resetFilterBtn = document.getElementById('resetFilterBtn');
const navLowStock = document.getElementById('navLowStock');
const navLowStockBadge = document.getElementById('navLowStockBadge');
const toastContainer = document.getElementById('toastContainer');

// KPI Elements
const kpiRevenue = document.getElementById('kpiRevenue');
const kpiProfit = document.getElementById('kpiProfit');
const kpiInventoryValue = document.getElementById('kpiInventoryValue');
const kpiProducts = document.getElementById('kpiProducts');
const kpiLowStock = document.getElementById('kpiLowStock');

// Form inputs
const inputId = document.getElementById('productId');
const inputName = document.getElementById('productName');
const inputPurchase = document.getElementById('purchasePrice');
const inputSelling = document.getElementById('sellingPrice');
const inputInitial = document.getElementById('initialStock');
const inputSold = document.getElementById('soldQuantity');

// Preview Elements
const previewRemaining = document.getElementById('previewRemaining');
const previewUnitProfit = document.getElementById('previewUnitProfit');
const previewEstProfit = document.getElementById('previewEstProfit');

// Mobile Sidebar Toggle
const menuToggleBtn = document.getElementById('menuToggleBtn');
const mobileCloseBtn = document.getElementById('mobileCloseBtn');
const sidebar = document.getElementById('sidebar');

// ==========================================================
// Initialization & Event Listeners
// ==========================================================
document.addEventListener('DOMContentLoaded', () => {
    fetchProducts();
    setupEventListeners();
});

function setupEventListeners() {
    // Open Add Modal
    openAddModalBtn.addEventListener('click', () => openModal());

    // Close Modal
    closeModalBtn.addEventListener('click', closeModal);
    cancelModalBtn.addEventListener('click', closeModal);
    productModal.addEventListener('click', (e) => {
        if (e.target === productModal) closeModal();
    });

    // Form Submit (Create / Update)
    productForm.addEventListener('submit', handleFormSubmit);

    // Live preview calculations on input
    [inputPurchase, inputSelling, inputInitial, inputSold].forEach(input => {
        input.addEventListener('input', updateFormPreview);
    });

    // Live Search
    searchInput.addEventListener('input', (e) => {
        renderTable(filterProducts(e.target.value, activeFilter));
    });

    // Filters
    filterAllBtn.addEventListener('click', () => setFilter('all'));
    filterLowStockBtn.addEventListener('click', () => setFilter('low-stock'));
    if (resetFilterBtn) {
        resetFilterBtn.addEventListener('click', () => {
            searchInput.value = '';
            setFilter('all');
        });
    }

    // Low stock nav / banner clicks
    navLowStock.addEventListener('click', (e) => {
        e.preventDefault();
        setFilter('low-stock');
        document.getElementById('inventory').scrollIntoView({ behavior: 'smooth' });
    });

    viewLowStockBtn.addEventListener('click', () => {
        setFilter('low-stock');
        document.getElementById('inventory').scrollIntoView({ behavior: 'smooth' });
    });

    // Mobile Sidebar
    if (menuToggleBtn) {
        menuToggleBtn.addEventListener('click', () => sidebar.classList.add('open'));
    }
    if (mobileCloseBtn) {
        mobileCloseBtn.addEventListener('click', () => sidebar.classList.remove('open'));
    }
}

// ==========================================================
// REST API Data Fetching
// ==========================================================

/**
 * Fetch all products from Spring Boot backend
 */
async function fetchProducts() {
    try {
        const response = await fetch(API_BASE_URL);
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
        
        productsData = await response.json();
        updateDashboard(productsData);
    } catch (error) {
        console.error('Error fetching inventory:', error);
        showToast('Failed to load products from server.', 'danger');
    }
}

/**
 * Refresh KPIs, Charts, Table and Low Stock alerts
 */
function updateDashboard(products) {
    calculateKPIs(products);
    renderTable(filterProducts(searchInput.value, activeFilter));
    renderCharts(products);
    updateLowStockAlerts(products);
}

// ==========================================================
// KPI & Calculations
// ==========================================================
function calculateKPIs(products) {
    let totalRevenue = 0;
    let totalProfit = 0;
    let totalInventoryValue = 0;
    let lowStockCount = 0;

    products.forEach(p => {
        totalRevenue += p.salesRevenue || 0;
        totalProfit += p.netProfit || 0;
        totalInventoryValue += p.inventoryValue || 0;
        if (p.lowStock || p.remainingStock < 5) {
            lowStockCount++;
        }
    });

    kpiRevenue.textContent = formatCurrency(totalRevenue);
    kpiProfit.textContent = formatCurrency(totalProfit);
    kpiInventoryValue.textContent = formatCurrency(totalInventoryValue);
    kpiProducts.textContent = products.length.toString();
    kpiLowStock.textContent = lowStockCount.toString();
}

function updateLowStockAlerts(products) {
    const lowStockCount = products.filter(p => (p.lowStock || p.remainingStock < 5)).length;

    navLowStockBadge.textContent = lowStockCount;
    if (lowStockCount > 0) {
        navLowStockBadge.style.display = 'inline-block';
        alertBanner.style.display = 'flex';
        bannerLowStockCount.textContent = lowStockCount;
    } else {
        navLowStockBadge.style.display = 'none';
        alertBanner.style.display = 'none';
    }
}

// ==========================================================
// Table Rendering & Filters
// ==========================================================
function setFilter(filterType) {
    activeFilter = filterType;
    if (filterType === 'all') {
        filterAllBtn.classList.add('active');
        filterLowStockBtn.classList.remove('active');
    } else {
        filterAllBtn.classList.remove('active');
        filterLowStockBtn.classList.add('active');
    }
    renderTable(filterProducts(searchInput.value, activeFilter));
}

function filterProducts(searchTerm, filterType) {
    let filtered = [...productsData];

    if (filterType === 'low-stock') {
        filtered = filtered.filter(p => (p.lowStock || p.remainingStock < 5));
    }

    if (searchTerm && searchTerm.trim() !== '') {
        const term = searchTerm.toLowerCase().trim();
        filtered = filtered.filter(p => p.name.toLowerCase().includes(term));
    }

    return filtered;
}

function renderTable(products) {
    productTableBody.innerHTML = '';

    if (products.length === 0) {
        emptyState.style.display = 'block';
        return;
    } else {
        emptyState.style.display = 'none';
    }

    products.forEach(p => {
        const isLow = p.lowStock || p.remainingStock < 5;
        const tr = document.createElement('tr');
        if (isLow) tr.classList.add('row-low-stock');

        tr.innerHTML = `
            <td><strong>#${p.id}</strong></td>
            <td><strong>${escapeHtml(p.name)}</strong></td>
            <td>${formatCurrency(p.purchasePrice)}</td>
            <td>${formatCurrency(p.sellingPrice)}</td>
            <td>${p.initialStock}</td>
            <td>${p.soldQuantity}</td>
            <td>
                <strong>${p.remainingStock}</strong>
                ${isLow ? '<span class="badge badge-warning" style="margin-left: 6px;"><i class="fa-solid fa-triangle-exclamation"></i> Low</span>' : ''}
            </td>
            <td>${formatCurrency(p.salesRevenue)}</td>
            <td class="${p.netProfit >= 0 ? 'text-green' : 'text-danger'}">
                <strong>${formatCurrency(p.netProfit)}</strong>
            </td>
            <td class="text-center">
                ${isLow 
                    ? `<span class="badge badge-warning"><i class="fa-solid fa-circle-exclamation"></i> Reorder</span>`
                    : `<span class="badge badge-success"><i class="fa-solid fa-circle-check"></i> In Stock</span>`
                }
            </td>
            <td class="text-center">
                <div class="action-btn-group">
                    <button class="action-btn edit-btn" title="Edit Product" onclick="openEditModal(${p.id})">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button class="action-btn delete-btn" title="Delete Product" onclick="deleteProduct(${p.id}, '${escapeHtml(p.name)}')">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        productTableBody.appendChild(tr);
    });
}

// ==========================================================
// Modal & Form Handling (CRUD)
// ==========================================================
function openModal(editProduct = null) {
    productForm.reset();
    if (editProduct) {
        modalTitle.textContent = 'Edit Product';
        modalBadgeIcon.innerHTML = '<i class="fa-solid fa-pen-to-square"></i>';
        inputId.value = editProduct.id;
        inputName.value = editProduct.name;
        inputPurchase.value = editProduct.purchasePrice;
        inputSelling.value = editProduct.sellingPrice;
        inputInitial.value = editProduct.initialStock;
        inputSold.value = editProduct.soldQuantity;
    } else {
        modalTitle.textContent = 'Add New Product';
        modalBadgeIcon.innerHTML = '<i class="fa-solid fa-plus"></i>';
        inputId.value = '';
    }
    updateFormPreview();
    productModal.classList.add('open');
    inputName.focus();
}

function closeModal() {
    productModal.classList.remove('open');
}

window.openEditModal = function(id) {
    const product = productsData.find(p => p.id === id);
    if (product) openModal(product);
};

function updateFormPreview() {
    const buyPrice = parseFloat(inputPurchase.value) || 0;
    const sellPrice = parseFloat(inputSelling.value) || 0;
    const initial = parseInt(inputInitial.value) || 0;
    const sold = parseInt(inputSold.value) || 0;

    const remaining = Math.max(0, initial - sold);
    const unitProfit = sellPrice - buyPrice;
    const estProfit = sold * unitProfit;

    previewRemaining.textContent = `${remaining} units`;
    previewUnitProfit.textContent = formatCurrency(unitProfit);
    previewEstProfit.textContent = formatCurrency(estProfit);

    if (remaining < 5 && initial > 0) {
        previewRemaining.style.color = '#d97706';
    } else {
        previewRemaining.style.color = 'inherit';
    }
}

async function handleFormSubmit(e) {
    e.preventDefault();

    const id = inputId.value;
    const payload = {
        name: inputName.value.trim(),
        purchasePrice: parseFloat(inputPurchase.value),
        sellingPrice: parseFloat(inputSelling.value),
        initialStock: parseInt(inputInitial.value),
        soldQuantity: parseInt(inputSold.value)
    };

    if (payload.soldQuantity > payload.initialStock) {
        showToast('Sold quantity cannot exceed initial stock!', 'warning');
        return;
    }

    try {
        let response;
        if (id) {
            // PUT: Update Product
            response = await fetch(`${API_BASE_URL}/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } else {
            // POST: Create Product
            response = await fetch(API_BASE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        }

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'Server rejected the request.');
        }

        closeModal();
        showToast(id ? 'Product updated successfully!' : 'Product added successfully!', 'success');
        await fetchProducts(); // Refresh data
    } catch (error) {
        console.error('Save error:', error);
        showToast(error.message || 'Failed to save product.', 'danger');
    }
}

window.deleteProduct = async function(id, name) {
    if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Failed to delete product.');

        showToast(`"${name}" was deleted.`, 'success');
        await fetchProducts();
    } catch (error) {
        console.error('Delete error:', error);
        showToast('Could not delete product.', 'danger');
    }
};

// ==========================================================
// Chart.js Data Visualizations
// ==========================================================
function renderCharts(products) {
    renderRevenueProfitChart(products);
    renderStockDistributionChart(products);
}

function renderRevenueProfitChart(products) {
    const ctx = document.getElementById('revenueProfitChart').getContext('2d');
    
    // Sort or take top 6 products by revenue for clean visual display
    const topProducts = [...products].sort((a, b) => b.salesRevenue - a.salesRevenue).slice(0, 7);
    const labels = topProducts.map(p => p.name.length > 14 ? p.name.substring(0, 14) + '...' : p.name);
    const revenues = topProducts.map(p => p.salesRevenue || 0);
    const profits = topProducts.map(p => p.netProfit || 0);

    if (revenueProfitChart) {
        revenueProfitChart.destroy();
    }

    revenueProfitChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels.length ? labels : ['No Data'],
            datasets: [
                {
                    label: 'Sales Revenue ($)',
                    data: revenues.length ? revenues : [0],
                    backgroundColor: 'rgba(99, 102, 241, 0.85)',
                    borderColor: 'rgb(99, 102, 241)',
                    borderWidth: 1,
                    borderRadius: 6
                },
                {
                    label: 'Net Profit ($)',
                    data: profits.length ? profits : [0],
                    backgroundColor: 'rgba(16, 185, 129, 0.85)',
                    borderColor: 'rgb(16, 185, 129)',
                    borderWidth: 1,
                    borderRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        boxWidth: 12,
                        font: { family: 'Inter', size: 12, weight: '500' }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${formatCurrency(context.raw)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '$' + value;
                        }
                    },
                    grid: {
                        color: 'rgba(226, 232, 240, 0.7)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

function renderStockDistributionChart(products) {
    const ctx = document.getElementById('stockDistributionChart').getContext('2d');

    const totalSold = products.reduce((acc, p) => acc + (p.soldQuantity || 0), 0);
    const totalRemaining = products.reduce((acc, p) => acc + (p.remainingStock || 0), 0);

    if (stockDistributionChart) {
        stockDistributionChart.destroy();
    }

    const hasData = totalSold > 0 || totalRemaining > 0;

    stockDistributionChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: hasData ? ['Units Remaining', 'Units Sold'] : ['No Stock Recorded'],
            datasets: [{
                data: hasData ? [totalRemaining, totalSold] : [1],
                backgroundColor: hasData 
                    ? ['rgba(59, 130, 246, 0.85)', 'rgba(16, 185, 129, 0.85)']
                    : ['#e2e8f0'],
                borderWidth: 2,
                borderColor: '#ffffff',
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        boxWidth: 12,
                        padding: 16,
                        font: { family: 'Inter', size: 12, weight: '500' }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            if (!hasData) return 'No data';
                            return `${context.label}: ${context.raw} units`;
                        }
                    }
                }
            }
        }
    });
}

// ==========================================================
// Helpers & Utilities
// ==========================================================
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount || 0);
}

function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconClass = 'fa-circle-info';
    if (type === 'success') iconClass = 'fa-circle-check';
    if (type === 'danger') iconClass = 'fa-circle-xmark';
    if (type === 'warning') iconClass = 'fa-triangle-exclamation';

    toast.innerHTML = `
        <i class="fa-solid ${iconClass}"></i>
        <span>${escapeHtml(message)}</span>
    `;

    toastContainer.appendChild(toast);

    setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 3000);
}

