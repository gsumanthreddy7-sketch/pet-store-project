'use strict';

// ================= IMAGE MAPPING =================
function getProductImage(product) {
  const CATEGORY_IMAGE_MAP = {
    "Dog Food": "/static/images/dog.jpg",
    "Cat Food": "/static/images/cat.jpg",
    "Medicine": "/static/images/medicine.jpg",
    "Accessories": "/static/images/grooming.jpg",
    "Grooming": "/static/images/grooming.jpg",
    "Birds & Small": "/static/images/cat.jpg"
  };

  return CATEGORY_IMAGE_MAP[product.category] || "/static/images/dog.jpg";
}

function getFallbackImage(category) {
  return "/static/images/dog.jpg";
}

// ================= GLOBAL DATA =================
let allProducts = [];
let activeFilter = '';
let cart = JSON.parse(localStorage.getItem('cart') || '[]');

// ================= INIT =================
document.addEventListener('DOMContentLoaded', () => {
  fetchProducts();
  updateCartBadge();
  syncUserNav();
});

// ================= USER NAV =================
async function syncUserNav() {
  const chip       = document.getElementById('user-chip');
  const avatar     = document.getElementById('user-avatar');
  const nameEl     = document.getElementById('user-name');
  const logoutBtn  = document.getElementById('logout-btn');

  if (!chip) return;

  try {
    const response = await fetch('/api/session');
    if (!response.ok) throw new Error('session check failed');

    const data = await response.json();
    if (data.is_user && data.user) {
      const uname = data.user.username || 'User';
      if (chip) chip.style.display = 'flex';
      if (avatar) avatar.textContent = uname[0].toUpperCase();
      if (nameEl) nameEl.textContent = uname;
      if (logoutBtn) logoutBtn.style.display = 'inline-flex';
    }
  } catch (error) {}
}

// ================= LOGOUT =================
async function logoutUser() {
  try {
    await fetch('/api/user/logout', { method: 'POST' });
  } catch (error) {
    console.warn('[store.js] logout failed:', error);
  }
  window.location.href = '/login';
}
window.logoutUser = logoutUser;

async function logoutFromStore() {
  return logoutUser();
}
window.logoutFromStore = logoutFromStore;

// ================= FETCH PRODUCTS =================
async function fetchProducts() {
  const grid = document.getElementById('products');
  grid.innerHTML = '<div class="empty">Loading products...</div>';

  try {
    const response = await fetch('/api/products');

    if (!response.ok) {
      if (response.status === 403) {
        window.location.href = '/login';
        return;
      }
      throw new Error(`Server returned ${response.status}`);
    }

    allProducts = await response.json();

    if (!Array.isArray(allProducts)) {
      throw new Error('Invalid product data');
    }

    applyFilters();

  } catch (err) {
    grid.innerHTML = `
      <div class="empty">
        Could not load products.<br>
        <small>${err.message}</small>
      </div>`;
  }
}

// ================= FILTER =================
function setFilter(cat) {
  activeFilter = cat;

  document.querySelectorAll('.filter-btn')
    .forEach(b => b.classList.remove('active'));

  const map = {
    'Dog Food': 'f-dog',
    'Cat Food': 'f-cat',
    'Medicine': 'f-med',
    'Accessories': 'f-acc',
    'Grooming': 'f-grm',
    'Birds & Small': 'f-bird',
  };

  const btn = document.getElementById(cat ? map[cat] : 'f-all');
  if (btn) btn.classList.add('active');

  applyFilters();
}

// ================= APPLY FILTER =================
function applyFilters() {
  const searchEl = document.getElementById('search');
  const query = searchEl ? searchEl.value.toLowerCase().trim() : '';

  let list = activeFilter
    ? allProducts.filter(p => p.category === activeFilter)
    : [...allProducts];

  if (query) {
    list = list.filter(p =>
      p.name.toLowerCase().includes(query) ||
      (p.brand || '').toLowerCase().includes(query)
    );
  }

  renderGrid(list);
}

// ================= RENDER =================
function renderGrid(list) {
  const grid = document.getElementById('products');

  if (!list.length) {
    grid.innerHTML = '<div class="empty">No products found.</div>';
    return;
  }

  grid.innerHTML = list.map(p => {
    const oos = p.stock === 0;
    const image = getProductImage(p);
    const fallback = getFallbackImage(p.category);

    return `
      <div class="product">
        <img src="${image}" 
             onerror="this.src='${fallback}'"
             alt="${xh(p.name)}">
             
        <span class="cat-tag">${xh(p.category)}</span>
        <h3>${xh(p.name)}</h3>
        <div class="brand">${xh(p.brand || '')}</div>
        <div class="price">Rs ${p.price.toLocaleString('en-IN')}</div>
        <div class="stock">${oos ? 'Out of stock' : 'In stock: ' + p.stock}</div>

        <button onclick="addToCart(${p.id}, '${xa(p.name)}', ${p.price})"
          ${oos ? 'disabled' : ''}>
          ${oos ? 'Out of Stock' : 'Add to Cart'}
        </button>
      </div>`;
  }).join('');
}

// ================= CART =================
function addToCart(id, name, price) {
  const i = cart.findIndex(x => x.id === id);

  if (i > -1) cart[i].qty++;
  else cart.push({ id, name, price, qty: 1 });

  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartBadge();
  showToast(`Added: ${name}`);
}

function updateCartBadge() {
  const total = cart.reduce((s, i) => s + i.qty, 0);
  const badge = document.getElementById('cart-count');
  if (badge) badge.textContent = total || '';
}

// ================= TOAST =================
function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;

  t.textContent = msg;
  t.style.opacity = '1';

  clearTimeout(window._t);
  window._t = setTimeout(() => t.style.opacity = '0', 2000);
}

// ================= SAFE TEXT =================
function xh(s) {
  return String(s || '')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

function xa(s) {
  return String(s || '')
    .replace(/'/g,"\\'")
    .replace(/"/g,'&quot;');
}