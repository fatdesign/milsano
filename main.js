document.addEventListener('DOMContentLoaded', async () => {
    // --- White-Label Hydration ---
    const hydrateUI = () => {
        if (typeof SETTINGS === 'undefined') return;

        const root = document.documentElement;
        if (SETTINGS.theme) {
            Object.entries(SETTINGS.theme).forEach(([key, value]) => {
                const varName = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
                root.style.setProperty(varName, value);
            });
        }
    };

    hydrateUI();

    // Navbar Scroll Effect
    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // Reveal on Scroll
    const reveals = document.querySelectorAll('.reveal');
    const revealOnScroll = () => {
        const windowHeight = window.innerHeight;
        reveals.forEach(reveal => {
            const revealTop = reveal.getBoundingClientRect().top;
            if (revealTop < windowHeight - 100) {
                reveal.classList.add('active');
            }
        });
    };

    window.addEventListener('scroll', revealOnScroll);
    revealOnScroll();

    // Preloader Removal
    window.addEventListener('load', () => {
        const preloader = document.getElementById('preloader');
        if (preloader) {
            setTimeout(() => {
                preloader.classList.add('fade-out');
                setTimeout(() => {
                    preloader.style.display = 'none';
                }, 800);
            }, 1000);
        }
    });

    // --- Digital Menu Logic ---
    const menuApp = document.getElementById('menu-app');
    const categoryList = document.getElementById('category-list');
    const menuTypeBtns = document.querySelectorAll('.menu-type-btn');
    const langBtns = document.querySelectorAll('.lang-btn');

    let currentMenuType = 'mittag';
    let currentLang = localStorage.getItem('milsano_lang') || 'de';
    let cart = JSON.parse(localStorage.getItem('milsano_cart') || '[]');

    const updateCartUI = () => {
        const cartCount = document.getElementById('cart-count');
        const cartToggle = document.getElementById('cart-toggle');
        const cartItemsContainer = document.getElementById('cart-items');
        const cartTotalPrice = document.getElementById('cart-total-price');

        if (!cartCount || !cartToggle || !cartItemsContainer || !cartTotalPrice) return;

        const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
        cartCount.textContent = totalItems;

        if (totalItems > 0) {
            cartToggle.classList.remove('hidden');
        } else {
            cartToggle.classList.add('hidden');
            document.getElementById('cart-drawer').classList.remove('active');
        }

        if (totalItems === 0) {
            cartItemsContainer.innerHTML = '<p class="empty-msg">Deine Liste ist leer.</p>';
            cartTotalPrice.textContent = '€ 0.00';
            return;
        }

        let total = 0;
        cartItemsContainer.innerHTML = cart.map((item, index) => {
            const itemPrice = parseFloat(item.price.replace(',', '.'));
            total += itemPrice * item.qty;
            return `
                <div class="cart-item">
                    <div class="cart-item-info">
                        <span class="cart-item-name">${item.name}</span>
                        <span class="cart-item-price">€ ${item.price}</span>
                    </div>
                    <div class="qty-controls">
                        <button class="qty-btn" onclick="updateCartItemCount(${index}, -1)">-</button>
                        <span class="qty-val">${item.qty}</span>
                        <button class="qty-btn" onclick="updateCartItemCount(${index}, 1)">+</button>
                    </div>
                </div>
            `;
        }).join('');

        cartTotalPrice.textContent = `€ ${total.toFixed(2)}`;
        localStorage.setItem('milsano_cart', JSON.stringify(cart));
    };

    window.updateCartItemCount = (index, delta) => {
        cart[index].qty += delta;
        if (cart[index].qty <= 0) cart.splice(index, 1);
        renderMenu(currentLang);
        updateCartUI();
    };

    window.addToCart = (itemName, itemPrice) => {
        const existing = cart.find(i => i.name === itemName);
        if (existing) {
            existing.qty += 1;
        } else {
            cart.push({ name: itemName, price: itemPrice, qty: 1 });
        }
        renderMenu(currentLang);
        updateCartUI();
    };

    window.removeFromCart = (itemName) => {
        const existing = cart.find(i => i.name === itemName);
        if (existing) {
            existing.qty -= 1;
            if (existing.qty <= 0) {
                cart = cart.filter(i => i.name !== itemName);
            }
        }
        renderMenu(currentLang);
        updateCartUI();
    };

    const fetchMenu = async (type) => {
        const menuFile = type === 'abend' ? 'menu-abend.json' : 'menu.json';
        try {
            const res = await fetch(`./${menuFile}?t=${Date.now()}`);
            return await res.json();
        } catch (e) {
            console.error('Menu load error:', e);
            return null;
        }
    };

    const renderMenu = async (lang) => {
        const menuData = await fetchMenu(currentMenuType);
        if (!menuData) {
            menuApp.innerHTML = '<p class="text-center">Speisekarte konnte nicht geladen werden.</p>';
            return;
        }

        menuApp.innerHTML = '';
        categoryList.innerHTML = '';

        menuData.categories.forEach((cat, catIdx) => {
            const catName = cat.name[lang] || cat.name['de'];

            // Ribbon List
            const li = document.createElement('li');
            li.innerHTML = `<a href="#${cat.id}">${catName}</a>`;
            categoryList.appendChild(li);

            // Section
            const section = document.createElement('section');
            section.id = cat.id;
            section.className = 'menu-section';

            let itemsHtml = '';
            cat.items.forEach((item, idx) => {
                const itemName = item.name[lang] || item.name['de'];
                const itemDesc = item.desc ? (item.desc[lang] || item.desc['de']) : '';
                const cartItem = cart.find(i => i.name === itemName);
                const qty = cartItem ? cartItem.qty : 0;
                const isSoldOut = item.isSoldOut === true;

                itemsHtml += `
                    <div class="menu-item ${isSoldOut ? 'is-sold-out' : ''}">
                        <div class="item-header">
                            <span class="item-name">${itemName} ${isSoldOut ? '<span class="sold-out-badge">AUSVERKAUFT</span>' : ''}</span>
                            <span class="item-price">€ ${item.price}</span>
                        </div>
                        ${itemDesc ? `<p class="item-desc">${itemDesc}</p>` : ''}
                        
                        <div class="item-actions-row">
                            <div class="qty-controls">
                                <button class="qty-btn" onclick="removeFromCart('${itemName.replace(/'/g, "\\'")}')" ${isSoldOut ? 'disabled' : ''}>-</button>
                                <span class="qty-val">${qty}</span>
                                <button class="qty-btn" onclick="addToCart('${itemName.replace(/'/g, "\\'")}', '${item.price}')" ${isSoldOut ? 'disabled' : ''}>+</button>
                            </div>
                        </div>
                    </div>
                `;
            });

            let dividerHtml = '';
            if (catIdx > 0) {
                dividerHtml = `
                    <div class="section-divider">
                        <span class="line"></span>
                        <span class="icon">🔥</span>
                        <span class="line"></span>
                    </div>
                `;
            }

            section.innerHTML = `
                ${dividerHtml}
                <h2 class="section-title">${catName}</h2>
                <div class="items-grid">${itemsHtml}</div>
            `;
            menuApp.appendChild(section);
        });

        // Category Highlight logic
        const navObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.getAttribute('id');
                    document.querySelectorAll('.ribbon-list a').forEach(a => {
                        const isActive = a.getAttribute('href') === `#${id}`;
                        a.classList.toggle('active', isActive);
                        if (isActive) {
                            a.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                        }
                    });
                }
            });
        }, { rootMargin: '-20% 0px -70% 0px' });

        document.querySelectorAll('.menu-section').forEach(s => navObserver.observe(s));
        
        // Re-attach smooth scroll for new links
        attachSmoothScroll();
    };

    const attachSmoothScroll = () => {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const targetId = this.getAttribute('href');
                const target = document.querySelector(targetId);
                if (target) {
                    window.scrollTo({
                        top: target.offsetTop - 100,
                        behavior: 'smooth'
                    });
                }
            });
        });
    };

    // Event Listeners for Controls
    menuTypeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            menuTypeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentMenuType = btn.dataset.type;
            renderMenu(currentLang);
        });
    });

    langBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            langBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentLang = btn.dataset.lang;
            localStorage.setItem('milsano_lang', currentLang);
            renderMenu(currentLang);
        });
    });

    // Cart Drawer Listeners
    const cartDrawer = document.getElementById('cart-drawer');
    const cartToggle = document.getElementById('cart-toggle');
    const closeCart = document.getElementById('close-cart');
    const clearCartBtn = document.getElementById('clear-cart');

    if (cartToggle) cartToggle.onclick = () => cartDrawer.classList.add('active');
    if (closeCart) closeCart.onclick = () => cartDrawer.classList.remove('active');
    if (clearCartBtn) clearCartBtn.onclick = () => {
        if (confirm('Liste wirklich leeren?')) {
            cart = [];
            renderMenu(currentLang);
            updateCartUI();
        }
    };

    // Initial Load
    renderMenu(currentLang);
    updateCartUI();

    // Reservation Form Handling
    const resForm = document.getElementById('reservation-form');
    const successModal = document.getElementById('success-modal');
    const closeModal = document.getElementById('close-modal');

    if (resForm) {
        resForm.addEventListener('submit', (e) => {
            e.preventDefault();
            successModal.classList.add('active');
            resForm.reset();
        });
    }

    if (closeModal) {
        closeModal.addEventListener('click', () => {
            successModal.classList.remove('active');
        });
    }

    window.addEventListener('click', (e) => {
        if (e.target === successModal) {
            successModal.classList.remove('active');
        }
    });
});
