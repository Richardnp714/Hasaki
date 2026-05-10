/* ============================================================
   Hasaki — shared client-side shopping logic (prototype)
   No backend; state persists via localStorage.
   ============================================================ */

(function () {
  const STORE = {
    cart: 'hasaki-cart',
    wishlist: 'hasaki-wishlist',
    lang: 'hasaki-lang',
  };

  // ---------- formatters ----------
  const money = (n) => '$' + (Math.round(n * 100) / 100).toFixed(2);

  // ---------- toast ----------
  let toastTimer;
  function toast(msg) {
    let t = document.getElementById('hasaki-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'hasaki-toast';
      t.style.cssText =
        'position:fixed;left:50%;bottom:24px;transform:translate(-50%,16px);' +
        'background:#0a0a0a;color:#f5f1ea;padding:12px 22px;font-size:13px;' +
        'letter-spacing:.05em;z-index:200;opacity:0;transition:all .35s cubic-bezier(.2,.7,.2,1);' +
        'box-shadow:0 12px 32px rgba(0,0,0,.25);max-width:90vw;';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    requestAnimationFrame(() => {
      t.style.opacity = '1';
      t.style.transform = 'translate(-50%,0)';
    });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      t.style.opacity = '0';
      t.style.transform = 'translate(-50%,16px)';
    }, 2400);
  }

  // ---------- cart ----------
  const Cart = {
    load() {
      try { return JSON.parse(localStorage.getItem(STORE.cart) || '[]'); }
      catch { return []; }
    },
    save(items) {
      localStorage.setItem(STORE.cart, JSON.stringify(items));
      this.updateBadge();
      this.updatePreview();
    },
    add(product) {
      const items = this.load();
      const ex = items.find((i) => i.id === product.id);
      if (ex) ex.qty += 1;
      else items.push({ ...product, qty: 1 });
      this.save(items);
      toast('Added · ' + product.name);
    },
    remove(id) {
      this.save(this.load().filter((i) => i.id !== id));
      this.renderPage();
    },
    setQty(id, qty) {
      const items = this.load();
      const item = items.find((i) => i.id === id);
      if (!item) return;
      if (qty < 1) return this.remove(id);
      item.qty = qty;
      this.save(items);
      this.renderPage();
    },
    count() { return this.load().reduce((s, i) => s + i.qty, 0); },
    subtotal() { return this.load().reduce((s, i) => s + i.price * i.qty, 0); },

    updateBadge() {
      const count = this.count();
      document.querySelectorAll('[data-cart-count]').forEach((el) => {
        el.textContent = count;
        el.style.display = count === 0 ? 'none' : '';
      });
    },

    updatePreview() {
      const list = document.querySelector('[data-cart-preview]');
      if (!list) return;
      const items = this.load();
      const headerCount = document.querySelector('[data-cart-preview-count]');
      const subEl = document.querySelector('[data-cart-preview-subtotal]');
      const ckBtn = document.querySelector('[data-cart-preview-checkout]');

      if (headerCount) headerCount.textContent = items.length + ' ' + (items.length === 1 ? 'item' : 'items');
      if (subEl) subEl.textContent = money(this.subtotal());
      if (ckBtn) ckBtn.textContent = 'Checkout · ' + money(this.subtotal());

      if (!items.length) {
        list.innerHTML =
          '<li class="px-5 py-8 text-center text-sm text-ink/55">Your bag is empty</li>';
        return;
      }

      list.innerHTML = items.map((it) => `
        <li class="flex items-start gap-3 px-5 py-4">
          <a href="cart.html" class="relative w-16 h-20 bg-cream shrink-0 overflow-hidden block">
            ${it.image ? `<img src="${it.image}" alt="" loading="lazy" class="absolute inset-0 w-full h-full object-cover" />` : ''}
          </a>
          <div class="flex-1 min-w-0">
            <p class="text-[10px] tracking-[0.2em] uppercase text-ink/50">${it.brand || ''}</p>
            <h3 class="text-sm font-medium leading-snug mt-0.5">${it.name}</h3>
            <div class="flex items-center justify-between mt-2">
              <span class="text-xs text-ink/60">Qty ${it.qty}${it.size ? ' · ' + it.size : ''}</span>
              <span class="text-sm font-medium">${money(it.price * it.qty)}</span>
            </div>
          </div>
          <button data-cart-remove="${it.id}" aria-label="Remove" class="text-ink/35 hover:text-ink shrink-0 mt-1">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-3.5 h-3.5 stroke-2"><path d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </li>
      `).join('');
    },

    renderPage() {
      const root = document.querySelector('[data-cart-render]');
      if (!root) return;
      const items = this.load();
      const sub = this.subtotal();
      const tax = +(sub * 0.0825).toFixed(2);
      const ship = sub > 35 ? 0 : (sub > 0 ? 5.99 : 0);
      const total = sub + tax + ship;

      // Update sidebar totals
      const setText = (sel, txt) => document.querySelectorAll(sel).forEach((e) => { e.textContent = txt; });
      setText('[data-cart-subtotal]', money(sub));
      setText('[data-cart-shipping]', ship === 0 && sub > 0 ? 'FREE' : (sub === 0 ? '—' : money(ship)));
      setText('[data-cart-tax]', money(tax));
      setText('[data-cart-total]', money(total));
      setText('[data-cart-count-line]', items.length === 0
        ? 'Your bag is empty'
        : `${items.length} ${items.length === 1 ? 'item' : 'items'} · ${ship === 0 && sub > 0 ? 'Free shipping unlocked · ' : ''}3 free samples included`);

      // Render items
      root.innerHTML = items.length === 0
        ? `<div class="py-16 text-center border-y border-ink/10">
             <p class="serif text-3xl tracking-tightest mb-3">Your bag is empty.</p>
             <p class="text-ink/60 text-sm mb-6">Browse our bestsellers and find something to love.</p>
             <a href="index.html" class="inline-flex items-center gap-2 bg-ink text-bone px-7 py-3 text-[11px] tracking-[0.25em] uppercase hover:bg-hasaki transition">Continue shopping →</a>
           </div>`
        : items.map((it) => `
            <article class="grid grid-cols-[120px_1fr] md:grid-cols-[160px_1fr] gap-5 md:gap-7 pb-6 border-b border-ink/10">
              <a href="index.html" class="relative aspect-[4/5] bg-blush overflow-hidden">
                ${it.image ? `<img src="${it.image}" alt="${it.name}" class="absolute inset-0 w-full h-full object-cover" />` : ''}
              </a>
              <div class="flex flex-col">
                <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
                  <div>
                    <p class="text-[11px] tracking-[0.2em] uppercase text-ink/50">${it.brand || ''}</p>
                    <h2 class="serif text-xl md:text-2xl tracking-tightest leading-[1] mt-1">${it.name}</h2>
                    <p class="text-xs text-ink/55 mt-2">${it.size ? it.size : ''}</p>
                  </div>
                  <p class="font-bold text-lg md:text-xl">${money(it.price * it.qty)}</p>
                </div>
                <div class="mt-auto pt-5 flex flex-wrap items-center gap-4">
                  <div class="inline-flex items-stretch border border-ink/15">
                    <button data-cart-dec="${it.id}" aria-label="Decrease" class="qty-btn">−</button>
                    <span class="px-4 grid place-items-center min-w-[44px] text-sm font-medium">${it.qty}</span>
                    <button data-cart-inc="${it.id}" aria-label="Increase" class="qty-btn">+</button>
                  </div>
                  <button data-cart-remove="${it.id}" class="ulink text-[11px] tracking-[0.2em] uppercase text-ink/65">Remove</button>
                </div>
              </div>
            </article>
          `).join('');
    },
  };

  // expose for debug
  window.HasakiCart = Cart;

  // ---------- wishlist ----------
  const Wishlist = {
    load() { try { return JSON.parse(localStorage.getItem(STORE.wishlist) || '[]'); } catch { return []; } },
    save(arr) { localStorage.setItem(STORE.wishlist, JSON.stringify(arr)); },
    has(id) { return this.load().includes(id); },
    toggle(id) {
      const list = this.load();
      const idx = list.indexOf(id);
      if (idx >= 0) { list.splice(idx, 1); this.save(list); return false; }
      list.push(id); this.save(list); return true;
    },
  };

  // ---------- DOM bindings ----------
  function init() {
    Cart.updateBadge();
    Cart.updatePreview();

    // Add to bag (homepage product cards & sets)
    document.querySelectorAll('[data-add-to-cart]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const card = btn.closest('[data-product]');
        if (!card) return;
        Cart.add({
          id: card.dataset.product,
          brand: card.dataset.brand || '',
          name: card.dataset.name || 'Product',
          price: parseFloat(card.dataset.price) || 0,
          image: card.dataset.image || '',
          size: card.dataset.size || '',
        });
      });
    });

    // Cart page: increment / decrement / remove (event delegation)
    document.addEventListener('click', (e) => {
      const inc = e.target.closest('[data-cart-inc]');
      const dec = e.target.closest('[data-cart-dec]');
      const rm = e.target.closest('[data-cart-remove]');
      if (inc) {
        const id = inc.dataset.cartInc;
        const item = Cart.load().find((i) => i.id === id);
        if (item) Cart.setQty(id, item.qty + 1);
      } else if (dec) {
        const id = dec.dataset.cartDec;
        const item = Cart.load().find((i) => i.id === id);
        if (item) Cart.setQty(id, item.qty - 1);
      } else if (rm) {
        Cart.remove(rm.dataset.cartRemove);
        toast('Removed');
      }
    });

    // Wishlist toggle
    document.querySelectorAll('[data-wishlist]').forEach((btn) => {
      const id = btn.dataset.wishlist;
      if (Wishlist.has(id)) {
        btn.style.background = 'rgba(157,42,77,0.95)';
        btn.style.color = '#f5f1ea';
      }
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const nowFav = Wishlist.toggle(id);
        if (nowFav) {
          btn.style.background = 'rgba(157,42,77,0.95)';
          btn.style.color = '#f5f1ea';
          toast('Added to wishlist');
        } else {
          btn.style.background = '';
          btn.style.color = '';
          toast('Removed from wishlist');
        }
      });
    });

    // Search
    const searchInput = document.querySelector('[data-search-input]');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase().trim();
        document.querySelectorAll('[data-product]').forEach((card) => {
          const hay = (card.dataset.name + ' ' + (card.dataset.brand || '')).toLowerCase();
          card.style.display = !q || hay.includes(q) ? '' : 'none';
        });
      });
    }

    // Filter buttons (bestsellers tabs)
    document.querySelectorAll('[data-filter]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const cat = btn.dataset.filter;
        document.querySelectorAll('[data-filter]').forEach((b) => {
          b.classList.remove('bg-ink', 'text-bone');
          b.classList.add('border', 'border-ink/20');
        });
        btn.classList.add('bg-ink', 'text-bone');
        btn.classList.remove('border', 'border-ink/20');
        document.querySelectorAll('[data-filter-target]').forEach((card) => {
          const c = card.dataset.category;
          card.style.display = cat === 'all' || c === cat ? '' : 'none';
        });
      });
    });

    // Newsletter forms
    document.querySelectorAll('form[data-newsletter], section.bg-cream form, footer form').forEach((f) => {
      f.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = f.querySelector('input[type="email"]');
        if (input && input.value) {
          toast('Subscribed · ' + input.value);
          input.value = '';
        }
      });
    });

    // Promo apply
    document.querySelectorAll('[data-promo-apply]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const inp = btn.parentElement.querySelector('input');
        if (!inp || !inp.value) return toast('Enter a promo code');
        const code = inp.value.toUpperCase().trim();
        const valid = ['LIPLOVE', 'WELCOME10', 'HASAKI'];
        if (valid.includes(code)) {
          toast('Code applied · ' + code);
        } else {
          toast('Invalid code');
        }
      });
    });

    // Place order on checkout
    const placeBtn = document.querySelector('[data-place-order]');
    if (placeBtn) {
      placeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        // Persist mock order
        const order = {
          id: 'HSK-' + Date.now().toString(36).toUpperCase(),
          items: Cart.load(),
          total: Cart.subtotal(),
          when: new Date().toISOString(),
        };
        sessionStorage.setItem('hasaki-order', JSON.stringify(order));
        // Empty cart
        localStorage.removeItem(STORE.cart);
        // Redirect
        window.location.href = 'thanks.html';
      });
    }

    // Render cart page if applicable
    Cart.renderPage();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
