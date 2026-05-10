/* ============================================================
   Hasaki — shared client-side shopping logic (prototype)
   No backend; state persists via localStorage.
   ============================================================ */

(function () {
  const STORE = {
    cart: 'hasaki-cart',
    wishlist: 'hasaki-wishlist',
    lang: 'hasaki-lang',
    user: 'hasaki-user',
    promo: 'hasaki-promo',
    samples: 'hasaki-samples',
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
    save(arr) { localStorage.setItem(STORE.wishlist, JSON.stringify(arr)); this.updateBadge(); },
    has(id) { return this.load().some(it => (typeof it === 'string' ? it : it.id) === id); },
    toggle(product) {
      const id = typeof product === 'string' ? product : product.id;
      const list = this.load();
      const idx = list.findIndex(it => (typeof it === 'string' ? it : it.id) === id);
      if (idx >= 0) { list.splice(idx, 1); this.save(list); return false; }
      list.push(typeof product === 'string' ? id : product);
      this.save(list);
      return true;
    },
    items() {
      // Return rich product objects from cart-style data on the wishlist
      return this.load().filter(it => typeof it === 'object');
    },
    updateBadge() {
      const count = this.load().length;
      document.querySelectorAll('[data-wishlist-count]').forEach(el => {
        el.textContent = count;
        el.style.display = count === 0 ? 'none' : '';
      });
    },
  };
  window.HasakiWishlist = Wishlist;

  // ---------- DOM bindings ----------
  function init() {
    Cart.updateBadge();
    Cart.updatePreview();
    Wishlist.updateBadge();
    User.updateUI();
    bindModals();
    bindSamples();
    bindCheckoutValidation();
    renderCategoryPage();
    renderProductPage();

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

    // Wishlist toggle (saves full product info so wishlist page can render)
    document.querySelectorAll('[data-wishlist]').forEach((btn) => {
      const id = btn.dataset.wishlist;
      if (Wishlist.has(id)) {
        btn.style.background = 'rgba(157,42,77,0.95)';
        btn.style.color = '#f5f1ea';
      }
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const card = btn.closest('[data-product]');
        const product = card ? {
          id: card.dataset.product,
          brand: card.dataset.brand || '',
          name: card.dataset.name || '',
          price: parseFloat(card.dataset.price) || 0,
          image: card.dataset.image || '',
          size: card.dataset.size || '',
          category: card.dataset.category || '',
        } : id;
        const nowFav = Wishlist.toggle(product);
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

    // Wishlist page: remove + move to bag
    document.addEventListener('click', (e) => {
      const wrm = e.target.closest('[data-wishlist-remove]');
      const wmove = e.target.closest('[data-wishlist-move]');
      if (wrm) {
        const id = wrm.dataset.wishlistRemove;
        Wishlist.toggle(id);
        renderWishlistPage();
        toast('Removed from wishlist');
      } else if (wmove) {
        const id = wmove.dataset.wishlistMove;
        const item = Wishlist.items().find(it => it.id === id);
        if (item) {
          Cart.add(item);
          Wishlist.toggle(id);
          renderWishlistPage();
        }
      }
    });

    renderWishlistPage();

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

    // Promo apply (actually applies discount)
    document.querySelectorAll('[data-promo-apply]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const inp = btn.parentElement.querySelector('input');
        if (!inp || !inp.value) return toast('Enter a promo code');
        const code = inp.value.toUpperCase().trim();
        if (Promo.CODES[code]) {
          Promo.set(code);
          inp.value = '';
          toast('Code applied · ' + Promo.label());
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

  // ---------- promo (real discount) ----------
  const Promo = {
    CODES: { LIPLOVE: { type: 'pct', value: 20, label: '20% off' },
             WELCOME10: { type: 'pct', value: 10, label: '10% off' },
             HASAKI:    { type: 'fixed', value: 5, label: '$5 off' } },
    get() { return localStorage.getItem(STORE.promo) || ''; },
    set(code) { localStorage.setItem(STORE.promo, code); Cart.renderPage(); Cart.updatePreview(); },
    clear() { localStorage.removeItem(STORE.promo); Cart.renderPage(); },
    discountFor(subtotal) {
      const code = this.get();
      const def = this.CODES[code];
      if (!def || subtotal === 0) return 0;
      return def.type === 'pct' ? +(subtotal * def.value / 100).toFixed(2) : Math.min(def.value, subtotal);
    },
    label() { const def = this.CODES[this.get()]; return def ? `${this.get()} · ${def.label}` : ''; },
  };
  window.HasakiPromo = Promo;

  // patch Cart.renderPage to apply discount
  const _origRender = Cart.renderPage.bind(Cart);
  Cart.renderPage = function () {
    _origRender();
    const root = document.querySelector('[data-cart-render]');
    if (!root) return;
    const sub = this.subtotal();
    const disc = Promo.discountFor(sub);
    const tax = +((sub - disc) * 0.0825).toFixed(2);
    const ship = (sub - disc) > 35 ? 0 : (sub > 0 ? 5.99 : 0);
    const total = (sub - disc) + tax + ship;
    const set = (sel, txt) => document.querySelectorAll(sel).forEach(e => { e.textContent = txt; });
    set('[data-cart-shipping]', ship === 0 && sub > 0 ? 'FREE' : (sub === 0 ? '—' : money(ship)));
    set('[data-cart-tax]', money(tax));
    set('[data-cart-total]', money(total));
    // Insert/update discount line
    let discRow = document.querySelector('[data-cart-discount-row]');
    const promoLabel = Promo.label();
    if (disc > 0) {
      if (!discRow) {
        const taxRow = document.querySelector('[data-cart-tax]');
        if (taxRow && taxRow.parentElement) {
          discRow = document.createElement('div');
          discRow.setAttribute('data-cart-discount-row', '');
          discRow.className = 'flex justify-between text-hasaki';
          taxRow.parentElement.parentElement.insertBefore(discRow, taxRow.parentElement);
        }
      }
      if (discRow) {
        discRow.innerHTML = `<span>Promo · ${promoLabel}</span><span class="font-medium">−${money(disc)}</span>`;
      }
    } else if (discRow) {
      discRow.remove();
    }
  };

  // ---------- user (mock auth) ----------
  const User = {
    get() { try { return JSON.parse(localStorage.getItem(STORE.user) || 'null'); } catch { return null; } },
    set(u) { localStorage.setItem(STORE.user, JSON.stringify(u)); this.updateUI(); },
    clear() { localStorage.removeItem(STORE.user); this.updateUI(); },
    updateUI() {
      const u = this.get();
      document.querySelectorAll('[data-user-name]').forEach(el => { el.textContent = u ? u.name : ''; });
      document.querySelectorAll('[data-user-initials]').forEach(el => {
        if (u) { el.textContent = (u.name || u.email || '?').slice(0, 1).toUpperCase(); el.style.display = ''; }
        else { el.style.display = 'none'; }
      });
    },
  };
  window.HasakiUser = User;

  // ---------- modal helpers ----------
  function injectModalHTML() {
    if (document.getElementById('hasaki-modals')) return;
    const wrap = document.createElement('div');
    wrap.id = 'hasaki-modals';
    wrap.innerHTML = `
      <!-- SEARCH MODAL -->
      <div id="searchModal" class="fixed inset-0 z-[300] bg-bone hidden flex-col">
        <div class="border-b border-ink/10">
          <div class="max-w-3xl mx-auto px-6 py-5 flex items-center gap-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-5 h-5 stroke-2 text-ink/55"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
            <input id="searchInput" type="text" placeholder="Search products, brands, ingredients…" class="flex-1 bg-transparent border-0 focus:outline-none text-lg placeholder-ink/40" />
            <button data-close-search class="text-[11px] tracking-[0.25em] uppercase text-ink/65 hover:text-ink">Close</button>
          </div>
        </div>
        <div class="flex-1 overflow-y-auto">
          <div class="max-w-3xl mx-auto px-6 py-8">
            <p id="searchHint" class="text-xs tracking-[0.25em] uppercase text-ink/45 mb-5">Popular · lipstick · serum · perfume · sunscreen</p>
            <div id="searchResults" class="space-y-3"></div>
          </div>
        </div>
      </div>

      <!-- ACCOUNT MODAL -->
      <div id="acctModal" class="fixed inset-0 z-[300] bg-ink/50 backdrop-blur hidden items-center justify-center p-4">
        <div class="bg-bone w-full max-w-md p-7 md:p-9 relative" role="dialog" aria-modal="true">
          <button data-close-acct class="absolute top-4 right-4 w-8 h-8 grid place-items-center hover:bg-cream transition" aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-4 h-4 stroke-2"><path d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
          <div id="acctSignedOut">
            <p class="text-[11px] tracking-[0.3em] uppercase text-hasaki mb-3">Hasaki Member</p>
            <h2 class="serif text-3xl tracking-tightest mb-2">Welcome back.</h2>
            <p class="text-sm text-ink/65 mb-6">Sign in to access your orders, wishlist and 10% back in Hasaki Pink points.</p>
            <div class="flex gap-2 mb-6 text-[11px] tracking-[0.18em] uppercase">
              <button id="tabSignIn" class="flex-1 py-2.5 bg-ink text-bone">Sign in</button>
              <button id="tabSignUp" class="flex-1 py-2.5 border border-ink/15 hover:bg-ink hover:text-bone transition">Create account</button>
            </div>
            <form id="acctForm" class="space-y-3" novalidate>
              <input id="acctName" type="text" placeholder="Name" required style="display:none" class="block w-full bg-transparent border border-ink/15 px-4 py-3 text-sm focus:border-ink focus:outline-none" />
              <input id="acctEmail" type="email" placeholder="Email address" required class="block w-full bg-transparent border border-ink/15 px-4 py-3 text-sm focus:border-ink focus:outline-none" />
              <input id="acctPw" type="password" placeholder="Password" required class="block w-full bg-transparent border border-ink/15 px-4 py-3 text-sm focus:border-ink focus:outline-none" />
              <p id="acctErr" class="text-xs text-rose-700 hidden"></p>
              <button type="submit" id="acctSubmit" class="w-full bg-ink text-bone py-3 text-[11px] tracking-[0.25em] uppercase hover:bg-hasaki transition">Sign in →</button>
              <p class="text-[11px] text-ink/55 text-center">By continuing you agree to our Terms &amp; Privacy.</p>
            </form>
          </div>
          <div id="acctSignedIn" style="display:none">
            <p class="text-[11px] tracking-[0.3em] uppercase text-hasaki mb-3">Welcome back</p>
            <h2 class="serif text-3xl tracking-tightest mb-1">Hi, <span data-user-name>—</span></h2>
            <p class="text-sm text-ink/65 mb-6">10% back · 0 active orders · Hasaki Pink Member</p>
            <div class="space-y-2">
              <a href="cart.html" class="block w-full text-center bg-ink text-bone py-3 text-[11px] tracking-[0.25em] uppercase hover:bg-hasaki transition">Your bag</a>
              <a href="wishlist.html" class="block w-full text-center border border-ink/15 py-3 text-[11px] tracking-[0.25em] uppercase hover:bg-ink hover:text-bone transition">Wishlist</a>
              <button id="signOut" class="block w-full text-center py-3 text-[11px] tracking-[0.25em] uppercase text-ink/55 hover:text-ink">Sign out</button>
            </div>
          </div>
        </div>
      </div>

      <!-- MOBILE MENU -->
      <div id="mobileMenu" class="fixed inset-0 z-[300] bg-ink/40 hidden">
        <div class="absolute inset-y-0 left-0 w-[85%] max-w-sm bg-bone overflow-y-auto p-7">
          <button data-close-mobile class="absolute top-4 right-4 w-8 h-8 grid place-items-center" aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-4 h-4 stroke-2"><path d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
          <div class="font-logo text-hasaki text-2xl font-extrabold lowercase mb-8" style="letter-spacing:-0.04em;">hasaki<span class="text-hasakiDark">.</span></div>
          <ul class="space-y-3 serif text-2xl tracking-tightest mb-8">
            <li><a href="index.html#categories">New In</a></li>
            <li><a href="index.html#skincare">Skincare</a></li>
            <li><a href="index.html#makeup">Makeup</a></li>
            <li><a href="index.html#fragrance">Fragrance</a></li>
            <li><a href="index.html#brands">Brands</a></li>
          </ul>
          <ul class="space-y-2 text-sm border-t border-ink/10 pt-5">
            <li><a href="cart.html" class="ulink">Your bag</a></li>
            <li><a href="wishlist.html" class="ulink">Wishlist</a></li>
            <li><button data-open-account class="ulink">Sign in</button></li>
          </ul>
        </div>
      </div>
    `;
    document.body.appendChild(wrap);
  }

  function bindModals() {
    injectModalHTML();
    const sm = document.getElementById('searchModal');
    const am = document.getElementById('acctModal');
    const mm = document.getElementById('mobileMenu');
    const open = (el, disp) => { el.classList.remove('hidden'); el.style.display = disp; document.body.style.overflow = 'hidden'; };
    const close = (el) => { el.classList.add('hidden'); el.style.display = ''; document.body.style.overflow = ''; };

    // Search
    document.querySelectorAll('[data-open-search]').forEach(b => b.addEventListener('click', e => {
      e.preventDefault(); open(sm, 'flex');
      setTimeout(() => document.getElementById('searchInput').focus(), 50);
      runSearch('');
    }));
    sm.addEventListener('click', e => {
      if (e.target.closest('[data-close-search]') || e.target === sm) close(sm);
    });
    document.getElementById('searchInput').addEventListener('input', e => runSearch(e.target.value));
    // Pressing Enter navigates to category.html?q=...
    document.getElementById('searchInput').addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const q = e.target.value.trim();
        if (q) window.location.href = 'category.html?q=' + encodeURIComponent(q);
      }
    });

    // Account
    document.querySelectorAll('[data-open-account]').forEach(b => b.addEventListener('click', e => {
      e.preventDefault();
      const u = User.get();
      document.getElementById('acctSignedOut').style.display = u ? 'none' : '';
      document.getElementById('acctSignedIn').style.display = u ? '' : 'none';
      open(am, 'flex');
    }));
    am.addEventListener('click', e => { if (e.target.closest('[data-close-acct]') || e.target === am) close(am); });

    let mode = 'signin';
    const tabIn = document.getElementById('tabSignIn');
    const tabUp = document.getElementById('tabSignUp');
    const nameField = document.getElementById('acctName');
    const submitBtn = document.getElementById('acctSubmit');
    function setMode(m) {
      mode = m;
      tabIn.className = (m === 'signin' ? 'flex-1 py-2.5 bg-ink text-bone' : 'flex-1 py-2.5 border border-ink/15 hover:bg-ink hover:text-bone transition');
      tabUp.className = (m === 'signup' ? 'flex-1 py-2.5 bg-ink text-bone' : 'flex-1 py-2.5 border border-ink/15 hover:bg-ink hover:text-bone transition');
      nameField.style.display = m === 'signup' ? 'block' : 'none';
      submitBtn.textContent = m === 'signin' ? 'Sign in →' : 'Create account →';
    }
    tabIn.addEventListener('click', () => setMode('signin'));
    tabUp.addEventListener('click', () => setMode('signup'));

    document.getElementById('acctForm').addEventListener('submit', e => {
      e.preventDefault();
      const email = document.getElementById('acctEmail').value.trim();
      const pw = document.getElementById('acctPw').value;
      const name = document.getElementById('acctName').value.trim();
      const err = document.getElementById('acctErr');
      err.classList.add('hidden');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { err.textContent = 'Enter a valid email address.'; err.classList.remove('hidden'); return; }
      if (pw.length < 6) { err.textContent = 'Password must be at least 6 characters.'; err.classList.remove('hidden'); return; }
      if (mode === 'signup' && !name) { err.textContent = 'Enter your name.'; err.classList.remove('hidden'); return; }
      User.set({ email, name: name || email.split('@')[0] });
      toast(mode === 'signin' ? 'Welcome back!' : 'Account created · welcome');
      close(am);
    });
    document.getElementById('signOut').addEventListener('click', () => {
      User.clear();
      toast('Signed out');
      close(am);
    });

    // Mobile menu
    document.querySelectorAll('[data-open-mobile]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); open(mm, 'block'); }));
    mm.addEventListener('click', e => { if (e.target.closest('[data-close-mobile]') || e.target === mm) close(mm); });

    // Esc closes all
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') { close(sm); close(am); close(mm); }
    });
  }

  // ---------- search runner ----------
  // Pulls from a static catalog of products (matches the cards on the homepage)
  const CATALOG = [
    { id:'p1', brand:'Laneige', name:'Lip Sleeping Mask — Berry', price:18, image:'images/products/laneige-lip-sleeping-mask.jpg', size:'20 g', category:'skincare', rating:4.9, reviews:2841,
      tags:'lip mask hydration berry pink balm sleeping overnight',
      description: 'A creamy overnight lip mask infused with our signature berry mix and Vitamin C. Wake up to softer, smoother, fuller-looking lips. Apply a generous layer before bed and let our antioxidant berry complex work overnight.',
      benefits: ['Hydrates and softens lips overnight','Vitamin C brightens dry, dull lips','Sweet berry scent','Suitable for all skin types'],
      howTo: 'Apply a generous layer to lips before bed using the included spatula. Rinse off or wipe away in the morning. Use 2–3 nights a week, or every night for very dry lips.',
      ingredients: 'Diisostearyl Malate, Hydrogenated Polyisobutene, Phytosteryl/Isostearyl/Cetyl/Stearyl/Behenyl Dimer Dilinoleate, Tocopheryl Acetate (Vitamin E), Ascorbic Acid (Vitamin C), Vaccinium Angustifolium (Blueberry) Fruit Extract, Rubus Idaeus (Raspberry) Fruit Extract.' },
    { id:'p2', brand:'COSRX', name:'Advanced Snail 96 Mucin Power Essence', price:15, image:'images/products/cosrx-snail-essence.jpg', size:'100 ml', category:'skincare', rating:4.9, reviews:8512,
      tags:'snail mucin essence repair korean serum hydration',
      description: 'A K-beauty cult classic with 96.3% snail secretion filtrate to repair, replenish and hydrate skin. Lightweight, fragrance-free, and gentle enough for daily use on sensitive or breakout-prone skin.',
      benefits: ['96.3% snail secretion filtrate','Repairs and replenishes the skin barrier','Hydrates without heaviness','Fragrance-free, gentle for sensitive skin'],
      howTo: 'After cleansing and toning, apply a small amount and pat into skin morning and night. Follow with serum and moisturizer.',
      ingredients: 'Snail Secretion Filtrate (96.3%), Betaine, Butylene Glycol, Sodium Hyaluronate, Panthenol, Allantoin, Phenoxyethanol, Sodium Polyacrylate.' },
    { id:'p3', brand:'YSL Beauty', name:'Libre Eau de Parfum 90ml', price:135, image:'images/products/ysl-libre-edp.jpg', size:'90 ml', category:'fragrance', rating:4.8, reviews:1204,
      tags:'perfume fragrance edp floral lavender jasmine women',
      description: 'A floral lavender perfume that breaks the rules of fragrance. The bold burst of lavender essence from France meets sensual orange blossom from Morocco for a scent that\'s bright and warmly addictive.',
      benefits: ['Top notes: Mandarin Orange, Lavender, Black Currant','Heart: Orange Blossom, Jasmine','Base: Madagascar Vanilla, Cedar, Ambergris','Eau de Parfum · long-lasting'],
      howTo: 'Spray on pulse points — wrists, base of throat, behind the ears — for an all-day signature scent.',
      ingredients: 'Alcohol Denat., Parfum (Fragrance), Aqua (Water), Linalool, Limonene, Coumarin, Geraniol, Citronellol, Citral, Benzyl Alcohol.' },
    { id:'p4', brand:'La Roche-Posay', name:'Anthelios UVMune 400 SPF50+ Sunscreen', price:22, image:'images/products/laroche-anthelios.jpg', size:'50 ml', category:'skincare', rating:4.7, reviews:3915,
      tags:'sunscreen spf sunblock sun protection sensitive uv anthelios',
      description: 'Broad-spectrum SPF50+ daily sunscreen for sensitive skin. New UVMune 400 filter system protects against the longest UVA rays, fighting cell damage that causes pigmentation and aging. Lightweight, non-greasy, no white cast.',
      benefits: ['SPF50+ broad spectrum','UVA + UVB + UV-LONG protection','Lightweight, no white cast','Suitable for sensitive skin'],
      howTo: 'Apply generously as the last step of your morning routine. Reapply every 2 hours and after swimming or sweating.',
      ingredients: 'Aqua, Alcohol Denat., Diisopropyl Sebacate, C12-15 Alkyl Benzoate, Methylene Bis-Benzotriazolyl Tetramethylbutylphenol (Tinosorb M), Drometrizole Trisiloxane (Mexoryl XL), Bis-Ethylhexyloxyphenol Methoxyphenyl Triazine (Tinosorb S).' },
    { id:'p5', brand:'Dior', name:'Rouge Dior 999 Velvet Lipstick', price:52, image:'images/products/dior-rouge-999.jpg', size:'3.2 g', category:'makeup', rating:4.9, reviews:12403,
      tags:'lipstick lip rouge red velvet 999 makeup matte',
      description: 'The iconic Dior 999 in a couture velvet finish. Saturated, blurring, lightweight color in the most universally flattering red. Hydrating Floral Lip Care Oil leaves lips soft and supple for up to 16 hours.',
      benefits: ['Iconic Dior 999 red','Velvet matte finish','Up to 16-hour wear','Hydrating Floral Lip Care Oil'],
      howTo: 'Apply directly from the bullet starting at the center of the lips and working outward. Layer for more intense color.',
      ingredients: 'Ricinus Communis (Castor) Seed Oil, Caprylic/Capric Triglyceride, Octyldodecanol, Synthetic Beeswax, Carnauba Wax, Tocopherol, Helianthus Annuus Seed Oil, CI 15850, CI 15985, CI 19140.' },
    { id:'p6', brand:'Innisfree', name:'Green Tea Seed Hyaluronic Serum', price:17, image:'images/products/innisfree-green-tea.jpg', size:'50 ml', category:'skincare', rating:4.6, reviews:1729,
      tags:'serum hyaluronic green tea acid skincare moisturizer',
      description: 'A lightweight serum with 5 types of hyaluronic acid and antioxidant green tea from Jeju Island. Locks moisture into the deepest layers and gives a healthy, dewy glow. Ideal for oily and combination skin.',
      benefits: ['5 types of hyaluronic acid','Jeju green tea antioxidants','Lightweight, non-greasy','Suitable for oily / combo skin'],
      howTo: 'After cleansing and toning, apply 2–3 drops and pat into skin. Use morning and night before moisturizer.',
      ingredients: 'Camellia Sinensis (Green Tea) Leaf Extract, Glycerin, Sodium Hyaluronate, Hydrolyzed Hyaluronic Acid, Sodium Hyaluronate Crosspolymer, Hyaluronic Acid, Panthenol, Niacinamide.' },
    { id:'p7', brand:'Anessa', name:'Perfect UV Sunscreen Skincare Milk SPF50+', price:25, image:'images/products/anessa-perfect-uv.jpg', size:'60 ml', category:'skincare', rating:4.9, reviews:5612,
      tags:'sunscreen sunblock spf sun protection japanese gold uv anessa',
      description: 'Japan\'s #1 sunscreen for over 20 years. Aqua Booster Technology means the protective film actually gets stronger when it meets sweat or water. Skincare-grade hydration with 50% beauty essence, no white cast, water and sweat-proof.',
      benefits: ['SPF50+ PA++++','Aqua Booster Technology','50% beauty essence base','Water & sweat-proof'],
      howTo: 'Shake well before use. Apply liberally to face and body 15 minutes before sun exposure. Reapply every 2 hours.',
      ingredients: 'Aqua, Cyclopentasiloxane, Ethylhexyl Methoxycinnamate, Bis-Ethylhexyloxyphenol Methoxyphenyl Triazine, Diethylamino Hydroxybenzoyl Hexyl Benzoate, Camellia Sinensis Leaf Extract, Royal Jelly Extract.' },
    { id:'p8', brand:'The Ordinary', name:'Niacinamide 10% + Zinc 1% Serum', price:12, image:'images/products/the-ordinary-niacinamide.jpg', size:'30 ml', category:'skincare', rating:4.7, reviews:18247,
      tags:'niacinamide serum zinc acne pore minimalist treatment',
      description: 'A high-strength vitamin and mineral blemish formula. 10% niacinamide refines uneven skin tone and visibly reduces blemishes; 1% zinc PCA balances visible sebum activity for a clearer, more even complexion.',
      benefits: ['10% niacinamide refines tone','1% zinc balances sebum','Reduces appearance of pores','Vegan, cruelty-free'],
      howTo: 'Apply a few drops to face morning and evening before heavier creams. Avoid using with vitamin C.',
      ingredients: 'Aqua (Water), Niacinamide, Pentylene Glycol, Zinc PCA, Dimethyl Isosorbide, Tamarindus Indica Seed Gum, Xanthan Gum, Isoceteth-20, Ethoxydiglycol, Phenoxyethanol, Chlorphenesin.' },
    { id:'t1', brand:'Charlotte Tilbury', name:'Pillow Talk Lipstick', price:39, image:'images/products/charlotte-tilbury-pillow-talk.jpg', size:'3.5 g', category:'makeup', rating:4.8, reviews:9203,
      tags:'lipstick lip nude pink pillow talk makeup matte',
      description: 'Charlotte\'s award-winning nude pink lipstick — the dreamy nude pink that suits every skin tone. Matte Revolution formula floods lips with light and color and feels luxuriously hydrating.',
      benefits: ['Universally flattering nude pink','Matte Revolution hydrating formula','Lipstick Tree extract','Lasts up to 10 hours'],
      howTo: 'Glide directly from the bullet onto lips. Layer with the matching liner for fuller-looking lips.',
      ingredients: 'Ricinus Communis Seed Oil, Octyldodecanol, Hydrogenated Polyisobutene, Synthetic Wax, Microcrystalline Wax, Tocopheryl Acetate, Bixa Orellana Seed Extract.' },
    { id:'t2', brand:'Glow Recipe', name:'Watermelon Glow Niacinamide Dew Drops', price:46, image:'images/products/glow-recipe-watermelon.jpg', size:'40 ml', category:'skincare', rating:4.7, reviews:4892,
      tags:'serum drops watermelon niacinamide pink glow dewy',
      description: 'A weightless, illuminating serum with 4% niacinamide and watermelon extract. Deeply hydrates while delivering an instant lit-from-within dewy glow. Wear under or over makeup for a juicy, lit-up complexion.',
      benefits: ['4% niacinamide','Watermelon extract for hydration','Pearlescent dewy finish','Layer under or over makeup'],
      howTo: 'After serum, dispense 1–2 pumps and pat onto face for an instant glow. Mix into foundation for a luminous base.',
      ingredients: 'Aqua, Niacinamide, Citrullus Lanatus (Watermelon) Fruit Extract, Hibiscus Sabdariffa Flower Extract, Mica, Glycerin, Sodium Hyaluronate.' },
    { id:'t3', brand:'Tom Ford', name:'Black Orchid Eau de Parfum', price:185, image:'images/products/tom-ford-black-orchid.jpg', size:'50 ml', category:'fragrance', rating:4.9, reviews:6521,
      tags:'perfume fragrance edp oriental dark night unisex',
      description: 'A luxurious, sensual fragrance of rich, dark accords. Black truffle, ylang ylang, black orchid, and noble spice — Black Orchid is timelessly modern, masculine and feminine all at once.',
      benefits: ['Black truffle, ylang ylang, black orchid','Eau de Parfum · long-lasting','Dramatic, evening signature','Layer for occasion wear'],
      howTo: 'Spray on pulse points; layer with the body oil for amplified longevity.',
      ingredients: 'Alcohol Denat., Parfum (Fragrance), Aqua, Linalool, Coumarin, Eugenol, Benzyl Salicylate, Citronellol, Limonene.' },
    { id:'t4', brand:'Sulwhasoo', name:'First Care Activating Serum', price:78, image:'images/products/sulwhasoo-first-care.jpg', size:'60 ml', category:'skincare', rating:4.8, reviews:2156,
      tags:'serum korean luxe luxury anti aging essence',
      description: 'The legendary first-step serum from Korea\'s most prestigious beauty house. JAUM Balancing Complex blend of five harmonizing herbs preps skin to better receive everything that follows.',
      benefits: ['JAUM Balancing Complex herbal blend','Boosts efficacy of subsequent steps','Locks in hydration','Improves texture and luminosity'],
      howTo: 'Apply 2–3 drops as the very first step after cleansing, before toner. Pat into skin morning and night.',
      ingredients: 'Aqua, Glycerin, Butylene Glycol, Astragalus Membranaceus Root Extract, Lycium Chinense Fruit Extract, Cnidium Officinale Root Extract, Paeonia Albiflora Root Extract.' },
    { id:'t5', brand:'Maybelline', name:'Sky High Volume Mascara', price:11, image:'images/products/maybelline-sky-high.jpg', size:'7 ml', category:'makeup', rating:4.6, reviews:23104,
      tags:'mascara lashes eye lash makeup volume sky high black',
      description: 'Sky-high volumising mascara with Bamboo extract and fibers. Limitless lengths and full volumising — without clumping, smudging or stiffness. The TikTok-famous mascara that started a movement.',
      benefits: ['Bamboo extract & fibers','Builds incredible length','No clumping','Smudge & flake-resistant'],
      howTo: 'Apply from root to tip in zig-zag motion for volume and length. Layer for more drama.',
      ingredients: 'Aqua, Cera Alba, Acacia Senegal Gum, Stearic Acid, Glyceryl Stearate, Hydroxyethylcellulose, CI 77499 (Iron Oxides).' },
    { id:'t6', brand:'Jo Malone', name:'Wood Sage & Sea Salt Cologne', price:142, image:'images/products/jomalone-wood-sage.jpg', size:'100 ml', category:'fragrance', rating:4.7, reviews:3812,
      tags:'cologne perfume fragrance woody sage sea salt unisex',
      description: 'Escape the everyday. The mineral salt notes capture the windswept shores: dried sage and sea salt. Layer with our Lime Basil & Mandarin or Pomegranate Noir for a personalized fragrance.',
      benefits: ['Top: Ambrette Seeds','Heart: Sea Salt','Base: Sage','Layer-friendly cologne'],
      howTo: 'Spray onto pulse points and into hair. Layer with another Jo Malone scent for a unique signature.',
      ingredients: 'Alcohol Denat., Parfum (Fragrance), Aqua, Limonene, Linalool, Geraniol, Citronellol, Citral.' },
  ];

  // ---------- fuzzy matching helpers ----------
  function normalize(s) {
    return String(s || '').toLowerCase()
      .replace(/[^a-z0-9 ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  function singularize(w) {
    if (w.length < 4) return w;
    if (w.endsWith('ies')) return w.slice(0, -3) + 'y';
    if (w.endsWith('ses') || w.endsWith('xes') || w.endsWith('zes')) return w.slice(0, -2);
    if (w.endsWith('es') && !w.endsWith('lies')) return w.slice(0, -2);
    if (w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
    return w;
  }
  function tokenize(s) {
    return normalize(s).split(' ').filter(Boolean).map(singularize);
  }
  function levenshtein(a, b) {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    let prev = Array(b.length + 1).fill(0).map((_, i) => i);
    for (let i = 0; i < a.length; i++) {
      const cur = [i + 1];
      for (let j = 0; j < b.length; j++) {
        const cost = a[i] === b[j] ? 0 : 1;
        cur.push(Math.min(cur[j] + 1, prev[j + 1] + 1, prev[j] + cost));
      }
      prev = cur;
    }
    return prev[b.length];
  }
  function fuzzyTokenMatch(qToken, targetTokens) {
    if (!qToken) return true;
    // Exact match
    if (targetTokens.includes(qToken)) return true;
    // Substring match (e.g. "moist" inside "moisturizer")
    if (targetTokens.some(t => t.includes(qToken) || qToken.includes(t))) return true;
    // Levenshtein: allow 1 edit for ≤6 chars, 2 edits for 7+
    const allow = qToken.length <= 4 ? 1 : (qToken.length <= 8 ? 2 : 3);
    return targetTokens.some(t =>
      Math.abs(t.length - qToken.length) <= allow &&
      levenshtein(qToken, t) <= allow
    );
  }
  function fuzzyMatch(query, target) {
    const qTokens = tokenize(query);
    if (!qTokens.length) return true;
    const tTokens = tokenize(target);
    return qTokens.every(q => fuzzyTokenMatch(q, tTokens));
  }
  // Expose for other functions
  window.HasakiFuzzy = { match: fuzzyMatch, tokenize, normalize };

  function runSearch(q) {
    const root = document.getElementById('searchResults');
    const hint = document.getElementById('searchHint');
    const term = q.trim();
    if (!term) {
      hint.textContent = 'Popular · lipstick · serum · perfume · sunscreen';
      root.innerHTML = CATALOG.slice(0, 6).map(renderResult).join('');
      return;
    }
    const matches = CATALOG.filter(p =>
      fuzzyMatch(term, p.brand + ' ' + p.name + ' ' + p.tags)
    );
    hint.textContent = matches.length + ' result' + (matches.length === 1 ? '' : 's') + ' for "' + term + '"' +
      (matches.length === 0 ? '' : ' · press Enter to see all');
    root.innerHTML = matches.length === 0
      ? '<p class="text-ink/55 text-sm">No matches. Try another term — we accept misspellings and plurals.</p>'
      : matches.map(renderResult).join('');
  }
  function renderResult(p) {
    return `
      <div class="flex items-center gap-4 border border-ink/10 hover:border-ink p-3 group transition cursor-pointer" data-product="${p.id}" data-brand="${p.brand}" data-name="${p.name}" data-price="${p.price}" data-image="${p.image}" data-size="${p.size}" onclick="if(!event.target.closest('[data-add-to-cart]')) window.location.href='category.html?q=' + encodeURIComponent('${p.brand} ${p.name.split(' ')[0]}'.replace(/'/g,''));">
        <div class="w-16 h-20 bg-cream shrink-0 overflow-hidden"><img src="${p.image}" alt="" class="w-full h-full object-cover" /></div>
        <div class="flex-1 min-w-0">
          <p class="text-[10px] tracking-[0.2em] uppercase text-ink/50">${p.brand}</p>
          <p class="text-sm font-medium leading-snug">${p.name}</p>
          <p class="text-xs text-ink/55 mt-1">$${p.price} · ${p.size}</p>
        </div>
        <button data-add-to-cart class="bg-ink text-bone px-4 py-2 text-[10px] tracking-[0.2em] uppercase hover:bg-hasaki transition opacity-0 group-hover:opacity-100">+ Add</button>
      </div>`;
  }

  // ---------- category / search results page renderer ----------
  function renderCategoryPage() {
    const grid = document.getElementById('catGrid');
    if (!grid) return;
    const params = new URLSearchParams(window.location.search);
    const q = (params.get('q') || '').trim().toLowerCase();
    const cat = (params.get('cat') || '').trim().toLowerCase();
    const sortSel = document.getElementById('catSort');
    const empty = document.getElementById('catEmpty');
    const countEl = document.getElementById('catCount');
    const titleEl = document.getElementById('catTitle');
    const subEl = document.getElementById('catSub');
    const breadEl = document.getElementById('catBreadcrumb');

    // Set page heading from params
    if (q) {
      titleEl.innerHTML = 'Results for <span class="italic text-hasaki">' + escapeHtml(q) + '</span>.';
      breadEl.textContent = 'Search · ' + q;
    } else if (cat) {
      const niceMap = { skincare:'Skincare', makeup:'Makeup', fragrance:'Fragrance', body:'Body', hair:'Hair', wellness:'Wellness', new:'New In' };
      const nice = niceMap[cat] || cat.charAt(0).toUpperCase() + cat.slice(1);
      titleEl.innerHTML = 'Shop <span class="italic text-hasaki">' + escapeHtml(nice) + '</span>.';
      breadEl.textContent = nice;
      // Pre-check the matching category
      document.querySelectorAll('#filterCat .cat-check').forEach(c => { if (c.value === cat) c.checked = true; });
    } else {
      titleEl.innerHTML = 'Shop <span class="italic text-hasaki">all</span>.';
      breadEl.textContent = 'Shop';
    }

    // Build brand filter list from CATALOG
    const brandSet = [...new Set(CATALOG.map(p => p.brand))].sort();
    const brandList = document.getElementById('filterBrand');
    if (brandList && !brandList.children.length) {
      brandList.innerHTML = brandSet.map(b => `
        <li><label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" value="${escapeAttr(b)}" class="brand-check accent-[#306E51]"/> <span>${escapeHtml(b)}</span></label></li>
      `).join('');
    }

    function paint() {
      const cats = Array.from(document.querySelectorAll('.cat-check:checked')).map(c => c.value);
      const brands = Array.from(document.querySelectorAll('.brand-check:checked')).map(c => c.value);
      const priceRange = (document.querySelector('input[name="price"]:checked') || {}).value || 'all';
      const sort = sortSel.value;

      let items = CATALOG.slice();

      if (q) {
        items = items.filter(p =>
          fuzzyMatch(q, p.brand + ' ' + p.name + ' ' + (p.tags || ''))
        );
      }
      // Initial cat from URL only counts on first paint via checkbox state
      if (cats.length) items = items.filter(p => cats.includes(deriveCat(p)));
      if (brands.length) items = items.filter(p => brands.includes(p.brand));
      if (priceRange !== 'all') {
        const [lo, hi] = priceRange.endsWith('+') ? [parseFloat(priceRange), Infinity] : priceRange.split('-').map(Number);
        items = items.filter(p => p.price >= lo && p.price <= (isNaN(hi) ? Infinity : hi));
      }

      if (sort === 'price-asc') items.sort((a, b) => a.price - b.price);
      else if (sort === 'price-desc') items.sort((a, b) => b.price - a.price);
      else if (sort === 'name') items.sort((a, b) => a.name.localeCompare(b.name));

      countEl.textContent = items.length + ' product' + (items.length === 1 ? '' : 's');
      subEl.textContent = items.length === 0 ? '' : 'From $' + Math.min(...items.map(i => i.price)) + ' · ' + items.length + ' available';

      if (items.length === 0) {
        grid.innerHTML = '';
        empty.classList.remove('hidden');
        return;
      }
      empty.classList.add('hidden');

      grid.innerHTML = items.map(p => `
        <article class="pcard reveal group" data-product="${p.id}" data-brand="${p.brand}" data-name="${escapeAttr(p.name)}" data-price="${p.price}" data-image="${p.image}" data-size="${p.size}" data-category="${deriveCat(p)}">
          <div class="relative aspect-[4/5] bg-cream overflow-hidden">
            <img src="${p.image}" alt="${escapeAttr(p.name)}" loading="lazy" class="img absolute inset-0 w-full h-full object-cover" />
            <button aria-label="Save" data-wishlist="${p.id}" class="absolute top-3 right-3 w-9 h-9 rounded-full bg-bone/85 backdrop-blur grid place-items-center hover:bg-ink hover:text-bone transition">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-4 h-4 stroke-2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            </button>
            <span class="absolute bottom-3 left-3 text-[10px] tracking-[0.25em] uppercase text-ink/45">${p.size}</span>
            <div class="absolute inset-x-3 bottom-3 translate-y-full group-hover:translate-y-0 transition-transform duration-500">
              <button data-add-to-cart class="w-full bg-ink text-bone py-3 text-[11px] tracking-[0.25em] uppercase hover:bg-hasaki transition">+ Add to bag</button>
            </div>
          </div>
          <div class="pt-3.5 px-1">
            <p class="text-[11px] tracking-[0.2em] uppercase text-ink/50">${escapeHtml(p.brand)}</p>
            <h3 class="text-[15px] font-medium leading-snug mt-1.5">${escapeHtml(p.name)}</h3>
            <div class="flex items-baseline gap-2 mt-3">
              <span class="font-bold text-base">$${p.price}</span>
              ${p.size ? `<span class="text-xs text-ink/55">· ${escapeHtml(p.size)}</span>` : ''}
            </div>
          </div>
        </article>
      `).join('');

      // Re-bind add-to-cart and wishlist on the newly inserted nodes
      grid.querySelectorAll('[data-add-to-cart]').forEach(btn => {
        btn.addEventListener('click', e => {
          e.preventDefault();
          const card = btn.closest('[data-product]');
          if (!card) return;
          Cart.add({
            id: card.dataset.product, brand: card.dataset.brand, name: card.dataset.name,
            price: parseFloat(card.dataset.price), image: card.dataset.image, size: card.dataset.size,
          });
        });
      });
      grid.querySelectorAll('[data-wishlist]').forEach(btn => {
        const id = btn.dataset.wishlist;
        if (Wishlist.has(id)) { btn.style.background = 'rgba(157,42,77,0.95)'; btn.style.color = '#f5f1ea'; }
        btn.addEventListener('click', e => {
          e.preventDefault(); e.stopPropagation();
          const card = btn.closest('[data-product]');
          const product = card ? {
            id: card.dataset.product, brand: card.dataset.brand, name: card.dataset.name,
            price: parseFloat(card.dataset.price), image: card.dataset.image, size: card.dataset.size,
          } : id;
          const nowFav = Wishlist.toggle(product);
          if (nowFav) { btn.style.background = 'rgba(157,42,77,0.95)'; btn.style.color = '#f5f1ea'; toast('Added to wishlist'); }
          else { btn.style.background = ''; btn.style.color = ''; toast('Removed from wishlist'); }
        });
      });
    }

    // Filter listeners
    document.querySelectorAll('.cat-check, .brand-check, input[name="price"]').forEach(i =>
      i.addEventListener('change', paint)
    );
    sortSel.addEventListener('change', paint);
    document.getElementById('catReset').addEventListener('click', () => {
      document.querySelectorAll('.cat-check, .brand-check').forEach(c => c.checked = false);
      const allRadio = document.querySelector('input[name="price"][value="all"]');
      if (allRadio) allRadio.checked = true;
      sortSel.value = 'featured';
      paint();
    });

    paint();
  }

  function deriveCat(p) {
    if (p.category) return p.category;
    const txt = (p.brand + ' ' + p.name + ' ' + (p.tags || '')).toLowerCase();
    if (/perfume|cologne|eau de|edp|fragrance/.test(txt)) return 'fragrance';
    if (/lipstick|mascara|eyeshadow|liner|gloss|palette|makeup|rouge|pillow talk|sky high/.test(txt)) return 'makeup';
    if (/sunscreen|spf|serum|essence|cream|moisturi[sz]er|cleanser|toner|niacinamide|hyaluronic|retinol|vitamin c|skincare|snail|mucin|glow/.test(txt)) return 'skincare';
    return 'skincare';
  }

  // ---------- product detail page ----------
  function renderProductPage() {
    const root = document.querySelector('[data-product-render]');
    if (!root) return;
    const id = new URLSearchParams(window.location.search).get('id') || '';
    const p = CATALOG.find(x => x.id === id);
    if (!p) {
      root.innerHTML = `
        <div class="py-16 text-center">
          <p class="serif text-3xl tracking-tightest mb-3">Product not found.</p>
          <a href="index.html" class="inline-flex items-center gap-2 bg-ink text-bone px-7 py-3 text-[11px] tracking-[0.25em] uppercase hover:bg-hasaki transition mt-4">Browse all products →</a>
        </div>`;
      return;
    }
    document.title = p.brand + ' ' + p.name + ' — hasaki.';

    const stars = '★'.repeat(Math.round(p.rating)) + '☆'.repeat(5 - Math.round(p.rating));
    const cat = deriveCat(p);
    const similar = CATALOG.filter(x => x.id !== p.id && deriveCat(x) === cat).slice(0, 4);

    root.innerHTML = `
      <div class="grid lg:grid-cols-2 gap-10 lg:gap-16 items-start">
        <!-- Gallery -->
        <div class="lg:sticky lg:top-28">
          <div class="aspect-[4/5] bg-cream overflow-hidden">
            <img src="${escapeAttr(p.image)}" alt="${escapeAttr(p.name)}" class="w-full h-full object-cover" />
          </div>
          <div class="grid grid-cols-4 gap-2 mt-3">
            ${[0,1,2,3].map(i => `
              <div class="aspect-square bg-cream overflow-hidden ${i === 0 ? 'ring-2 ring-ink' : 'opacity-70 hover:opacity-100 transition cursor-pointer'}">
                <img src="${escapeAttr(p.image)}" alt="" class="w-full h-full object-cover" style="${i % 2 ? 'object-position:center top' : ''}" />
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Info -->
        <div data-product="${p.id}" data-brand="${escapeAttr(p.brand)}" data-name="${escapeAttr(p.name)}" data-price="${p.price}" data-image="${escapeAttr(p.image)}" data-size="${escapeAttr(p.size)}" data-category="${cat}">
          <p class="text-[11px] tracking-[0.3em] uppercase text-hasaki mb-2">${escapeHtml(p.brand)}</p>
          <h1 class="serif text-3xl md:text-5xl tracking-tightest leading-[0.95] mb-4">${escapeHtml(p.name)}</h1>
          <div class="flex items-center gap-3 text-sm mb-5">
            <span class="text-hasaki tracking-widest">${stars}</span>
            <span class="text-ink/60">${p.rating} · ${p.reviews.toLocaleString()} reviews</span>
          </div>
          <div class="flex items-baseline gap-3 mb-6">
            <span class="serif text-3xl">${'$' + p.price}</span>
            <span class="text-xs text-ink/55 uppercase tracking-[0.2em]">${escapeHtml(p.size)}</span>
          </div>

          <p class="text-ink/75 leading-relaxed mb-7">${escapeHtml(p.description)}</p>

          <!-- Quantity + add to bag -->
          <div class="flex flex-wrap items-stretch gap-3 mb-4">
            <div class="inline-flex items-stretch border border-ink/15">
              <button data-pdp-dec aria-label="Decrease" class="w-11 h-11 grid place-items-center hover:bg-ink hover:text-bone transition">−</button>
              <span data-pdp-qty class="px-5 grid place-items-center min-w-[44px] text-sm font-medium">1</span>
              <button data-pdp-inc aria-label="Increase" class="w-11 h-11 grid place-items-center hover:bg-ink hover:text-bone transition">+</button>
            </div>
            <button data-pdp-add class="flex-1 min-w-[200px] bg-ink text-bone py-3 text-[11px] tracking-[0.25em] uppercase hover:bg-hasaki transition">+ Add to bag · $${p.price}</button>
            <button data-wishlist="${p.id}" aria-label="Save" class="w-11 h-11 border border-ink/15 grid place-items-center hover:bg-ink hover:text-bone transition">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-4 h-4 stroke-2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            </button>
          </div>

          <!-- Trust micro-strip -->
          <ul class="grid grid-cols-2 gap-y-2 text-[11px] tracking-[0.2em] uppercase text-ink/55 mt-6 mb-8">
            <li class="flex items-center gap-2"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-3.5 h-3.5 stroke-2 text-hasaki"><path d="M9 12l2 2 4-4"/></svg> 100% Authentic</li>
            <li class="flex items-center gap-2"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-3.5 h-3.5 stroke-2 text-hasaki"><path d="M9 12l2 2 4-4"/></svg> Free shipping +$35</li>
            <li class="flex items-center gap-2"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-3.5 h-3.5 stroke-2 text-hasaki"><path d="M9 12l2 2 4-4"/></svg> 30-day returns</li>
            <li class="flex items-center gap-2"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-3.5 h-3.5 stroke-2 text-hasaki"><path d="M9 12l2 2 4-4"/></svg> 3 free samples</li>
          </ul>

          <!-- Accordion: Benefits / How to use / Ingredients -->
          <div class="border-t border-ink/10">
            <details class="border-b border-ink/10" open>
              <summary class="flex justify-between items-center py-5 cursor-pointer list-none">
                <span class="serif text-lg">Key benefits</span>
                <span class="text-ink/45 text-xl">+</span>
              </summary>
              <ul class="pb-5 space-y-2 text-sm text-ink/75">
                ${p.benefits.map(b => `<li class="flex items-start gap-2"><span class="text-hasaki mt-1">·</span><span>${escapeHtml(b)}</span></li>`).join('')}
              </ul>
            </details>
            <details class="border-b border-ink/10">
              <summary class="flex justify-between items-center py-5 cursor-pointer list-none">
                <span class="serif text-lg">How to use</span>
                <span class="text-ink/45 text-xl">+</span>
              </summary>
              <p class="pb-5 text-sm text-ink/75 leading-relaxed">${escapeHtml(p.howTo)}</p>
            </details>
            <details class="border-b border-ink/10">
              <summary class="flex justify-between items-center py-5 cursor-pointer list-none">
                <span class="serif text-lg">Ingredients</span>
                <span class="text-ink/45 text-xl">+</span>
              </summary>
              <p class="pb-5 text-xs text-ink/65 leading-relaxed">${escapeHtml(p.ingredients)}</p>
            </details>
            <details class="border-b border-ink/10">
              <summary class="flex justify-between items-center py-5 cursor-pointer list-none">
                <span class="serif text-lg">Reviews · ${p.reviews.toLocaleString()}</span>
                <span class="text-ink/45 text-xl">+</span>
              </summary>
              <div class="pb-5 space-y-4">
                <div class="flex items-center gap-4">
                  <div class="serif text-4xl">${p.rating}</div>
                  <div>
                    <div class="text-hasaki text-lg tracking-widest">${stars}</div>
                    <p class="text-xs text-ink/55 mt-1">${p.reviews.toLocaleString()} verified reviews</p>
                  </div>
                </div>
                <figure class="border-t border-ink/10 pt-4">
                  <p class="text-hasaki tracking-widest text-sm">★★★★★</p>
                  <blockquote class="serif italic text-base mt-1 leading-snug">"Genuinely changed my routine. Worth every dollar."</blockquote>
                  <figcaption class="text-xs text-ink/60 mt-2">— Verified buyer · Los Angeles</figcaption>
                </figure>
                <figure class="border-t border-ink/10 pt-4">
                  <p class="text-hasaki tracking-widest text-sm">★★★★★</p>
                  <blockquote class="serif italic text-base mt-1 leading-snug">"Best purchase from Hasaki this year. Repurchasing."</blockquote>
                  <figcaption class="text-xs text-ink/60 mt-2">— Verified buyer · Hanoi</figcaption>
                </figure>
              </div>
            </details>
          </div>
        </div>
      </div>

      ${similar.length ? `
      <section class="mt-16 md:mt-24">
        <div class="flex items-end justify-between mb-8">
          <h2 class="serif text-3xl md:text-5xl tracking-tightest">You might also <span class="italic text-hasaki">like</span>.</h2>
          <a href="category.html?cat=${cat}" class="ulink text-[12px] tracking-[0.18em] uppercase">See all ${cat} →</a>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-x-3 gap-y-10 md:gap-x-4">
          ${similar.map(s => `
            <article class="pcard group" data-product="${s.id}" data-brand="${escapeAttr(s.brand)}" data-name="${escapeAttr(s.name)}" data-price="${s.price}" data-image="${escapeAttr(s.image)}" data-size="${escapeAttr(s.size)}" data-category="${deriveCat(s)}">
              <a href="product.html?id=${s.id}" class="block relative aspect-[4/5] bg-cream overflow-hidden">
                <img src="${escapeAttr(s.image)}" alt="${escapeAttr(s.name)}" loading="lazy" class="w-full h-full object-cover" />
              </a>
              <div class="pt-3 px-1">
                <p class="text-[11px] tracking-[0.2em] uppercase text-ink/50">${escapeHtml(s.brand)}</p>
                <h3 class="text-[14px] font-medium leading-snug mt-1"><a href="product.html?id=${s.id}">${escapeHtml(s.name)}</a></h3>
                <div class="flex items-center gap-1.5 mt-1.5 text-[11px] text-ink/60"><span class="text-hasaki">★★★★★</span><span>${s.rating}</span></div>
                <div class="flex items-baseline justify-between mt-2.5">
                  <span class="font-bold">$${s.price}</span>
                  <button data-add-to-cart class="text-[10px] tracking-[0.2em] uppercase ulink">+ Add</button>
                </div>
              </div>
            </article>
          `).join('')}
        </div>
      </section>` : ''}
    `;

    // Set breadcrumb
    const bc = document.querySelector('[data-pdp-breadcrumb]');
    if (bc) bc.innerHTML = `<a href="index.html" class="ulink">Home</a> &nbsp;/&nbsp; <a href="category.html?cat=${cat}" class="ulink">${cat.charAt(0).toUpperCase() + cat.slice(1)}</a> &nbsp;/&nbsp; <span class="text-ink">${escapeHtml(p.brand)}</span>`;

    // Quantity + add-to-cart wiring
    let qty = 1;
    const qtyEl = root.querySelector('[data-pdp-qty]');
    const dec = root.querySelector('[data-pdp-dec]');
    const inc = root.querySelector('[data-pdp-inc]');
    const add = root.querySelector('[data-pdp-add]');
    dec.addEventListener('click', () => { if (qty > 1) { qty--; qtyEl.textContent = qty; add.textContent = `+ Add to bag · $${(p.price * qty).toFixed(2).replace(/\.00$/, '')}`; } });
    inc.addEventListener('click', () => { qty++; qtyEl.textContent = qty; add.textContent = `+ Add to bag · $${(p.price * qty).toFixed(2).replace(/\.00$/, '')}`; });
    add.addEventListener('click', () => {
      for (let i = 0; i < qty; i++) Cart.add({ id: p.id, brand: p.brand, name: p.name, price: p.price, image: p.image, size: p.size });
    });

    // Wishlist heart
    const heart = root.querySelector('[data-wishlist]');
    if (Wishlist.has(p.id)) { heart.style.background = '#9d2a4d'; heart.style.color = '#f5f1ea'; }
    heart.addEventListener('click', e => {
      e.preventDefault();
      const product = { id: p.id, brand: p.brand, name: p.name, price: p.price, image: p.image, size: p.size, category: cat };
      const nowFav = Wishlist.toggle(product);
      if (nowFav) { heart.style.background = '#9d2a4d'; heart.style.color = '#f5f1ea'; toast('Added to wishlist'); }
      else { heart.style.background = ''; heart.style.color = ''; toast('Removed from wishlist'); }
    });

    // Similar products' add-to-cart
    root.querySelectorAll('[data-add-to-cart]').forEach(b => {
      b.addEventListener('click', e => {
        e.preventDefault();
        const card = b.closest('[data-product]');
        Cart.add({ id: card.dataset.product, brand: card.dataset.brand, name: card.dataset.name, price: parseFloat(card.dataset.price), image: card.dataset.image, size: card.dataset.size });
      });
    });
  }

  // Click on a product card body (not buttons) navigates to its PDP
  document.addEventListener('click', e => {
    if (e.target.closest('button, [data-add-to-cart], [data-wishlist], [data-cart-inc], [data-cart-dec], [data-cart-remove], a, summary, input, label, select')) return;
    const card = e.target.closest('[data-product]');
    if (!card) return;
    const id = card.dataset.product;
    if (!id || id.startsWith('set-') || id.startsWith('s')) return;
    window.location.href = 'product.html?id=' + id;
  });

  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function escapeAttr(s) { return escapeHtml(s); }

  // ---------- free samples picker (cart page) ----------
  function bindSamples() {
    const btns = document.querySelectorAll('[data-sample]');
    if (!btns.length) return;
    const MAX = 3;
    let chosen = JSON.parse(localStorage.getItem(STORE.samples) || '[]');
    function paint() {
      btns.forEach(b => {
        const id = b.dataset.sample;
        const on = chosen.includes(id);
        b.classList.toggle('ring-2', on);
        b.classList.toggle('ring-hasaki', on);
        const tick = b.querySelector('[data-sample-tick]');
        if (tick) tick.style.display = on ? '' : 'none';
      });
      const status = document.querySelector('[data-sample-status]');
      if (status) status.textContent = `${chosen.length} of ${MAX} selected · 200+ to choose from`;
    }
    btns.forEach(b => {
      b.addEventListener('click', e => {
        e.preventDefault();
        const id = b.dataset.sample;
        const i = chosen.indexOf(id);
        if (i >= 0) chosen.splice(i, 1);
        else if (chosen.length < MAX) chosen.push(id);
        else return toast('You can pick up to 3 samples');
        localStorage.setItem(STORE.samples, JSON.stringify(chosen));
        paint();
      });
    });
    paint();
  }

  // ---------- checkout form validation ----------
  function bindCheckoutValidation() {
    const place = document.querySelector('[data-place-order]');
    if (!place) return;
    place.addEventListener('click', e => {
      const required = ['#email', 'input[type="email"]'];
      const fields = [
        ['#email', 'Email'],
      ];
      // Generic: any input.field marked required + email format
      const errors = [];
      const email = document.getElementById('email');
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) errors.push('Enter a valid email.');
      const inputs = document.querySelectorAll('input.field, select.field');
      let firstName, lastName, address, city, zip, cardNo;
      inputs.forEach(i => {
        const ph = i.placeholder || '';
        if (ph === 'First name' && !i.value.trim()) errors.push('First name required.');
        if (ph === 'Last name' && !i.value.trim()) errors.push('Last name required.');
        if (ph === '123 Beverly Boulevard' && !i.value.trim()) errors.push('Street address required.');
        if (ph === 'Los Angeles' && !i.value.trim()) errors.push('City required.');
        if (ph === '90210' && !i.value.trim()) errors.push('ZIP required.');
        if (ph === '•••• •••• •••• ••••' && !i.value.replace(/\s/g, '').match(/^\d{12,19}$/)) errors.push('Enter a valid card number.');
      });
      if (errors.length) {
        e.preventDefault();
        toast(errors[0]);
        // Scroll to first error
        const firstBad = document.querySelector('input.field:not([type=email])');
        if (firstBad && !firstBad.value) firstBad.focus();
        return false;
      }
      // proceed (existing handler will run)
    }, true);
  }

  function renderWishlistPage() {
    const root = document.querySelector('[data-wishlist-render]');
    if (!root) return;
    const items = Wishlist.items();
    const countEl = document.querySelector('[data-wishlist-page-count]');
    if (countEl) countEl.textContent = items.length + ' ' + (items.length === 1 ? 'item' : 'items');

    if (items.length === 0) {
      root.innerHTML = `
        <div class="py-16 text-center border-y border-ink/10">
          <p class="serif text-3xl tracking-tightest mb-3">Your wishlist is empty.</p>
          <p class="text-ink/60 text-sm mb-6">Tap the heart on any product to save it for later.</p>
          <a href="index.html" class="inline-flex items-center gap-2 bg-ink text-bone px-7 py-3 text-[11px] tracking-[0.25em] uppercase hover:bg-hasaki transition">Continue shopping →</a>
        </div>`;
      return;
    }

    root.innerHTML = `
      <div class="grid grid-cols-2 md:grid-cols-4 gap-x-3 gap-y-10 md:gap-x-4">
        ${items.map(it => `
          <article class="pcard group">
            <div class="relative aspect-[4/5] bg-cream overflow-hidden">
              ${it.image ? `<img src="${it.image}" alt="${it.name}" class="absolute inset-0 w-full h-full object-cover" />` : ''}
              <button data-wishlist-remove="${it.id}" aria-label="Remove from wishlist" class="absolute top-3 right-3 w-9 h-9 rounded-full bg-bone/85 backdrop-blur grid place-items-center hover:bg-ink hover:text-bone transition">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-3.5 h-3.5 stroke-2"><path d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
              <div class="absolute left-3 right-3 bottom-3">
                <button data-wishlist-move="${it.id}" class="w-full bg-ink text-bone py-3 text-[11px] tracking-[0.25em] uppercase hover:bg-hasaki transition">+ Move to bag</button>
              </div>
            </div>
            <div class="pt-3.5 px-1">
              <p class="text-[11px] tracking-[0.2em] uppercase text-ink/50">${it.brand || ''}</p>
              <h3 class="text-[15px] font-medium leading-snug mt-1.5">${it.name}</h3>
              <div class="flex items-baseline gap-2 mt-3">
                <span class="font-bold text-base">$${it.price}</span>
                ${it.size ? `<span class="text-xs text-ink/55">· ${it.size}</span>` : ''}
              </div>
            </div>
          </article>
        `).join('')}
      </div>`;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
