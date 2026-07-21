/**
 * header.js
 * ------------------------------------------------------------------
 * បង្កើត <header> ទាំងមូល (Brand, Hamburger, Desktop Navbar + Dropdown,
 * Sign Up / Profile button) ដោយប្រើ JavaScript សុទ្ធ, ចាក់បញ្ចូលទៅក្នុង
 * <header id="header"></header> ។ ទម្រង់ UI/UX ត្រូវបានរក្សាទុក ១០០%
 * ដូចកូដ HTML ដើម គ្រាន់តែផ្លាស់ទីតក្កវិជ្ជាទៅ JS ។
 *
 * ត្រូវការ: nav-data.js (SITE, navIcons, navSections) ត្រូវផ្ទុកមុន file នេះ។
 * ------------------------------------------------------------------
 */

/** បើក/បិទ Mobile Sidebar (ប្រើរួមគ្នាដោយ header.js, sidebar.js) */
function toggleSidebar(force) {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    const isOpen = typeof force === 'boolean' ? force : !sidebar?.classList.contains('sidebar-open');

    sidebar?.classList.toggle('sidebar-open', isOpen);
    overlay?.classList.toggle('hidden', !isOpen);
    document.querySelector('.hamburger-btn')?.classList.toggle('rotate', isOpen);
}

function createHeaderNavItem(section) {
    const item = document.createElement('div');
    item.className = 'nav-item';
    item.innerHTML = `${section.icon}<span>${section.label}</span>
        <svg class="svg-drop" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="#ffffff"><path d="M11.9999 13.1714L16.9497 8.22168L18.3639 9.63589L11.9999 15.9999L5.63599 9.63589L7.0502 8.22168L11.9999 13.1714Z"></path></svg>`;

    const drop = document.createElement('div');
    drop.className = 'drop';
    section.items.forEach((entry) => {
        const li = document.createElement('li');
        li.innerHTML = `${entry.icon}<span>${entry.label}</span>`;
        li.addEventListener('click', (event) => {
            event.stopPropagation();
            if (entry.external) {
                window.open(entry.href, '_blank', 'noopener,noreferrer');
                return;
            }
            window.location.href = entry.href;
        });
        drop.appendChild(li);
    });

    item.appendChild(drop);
    return item;
}

function buildDesktopNavbar() {
    const nav = document.createElement('nav');
    nav.className = 'desktop-navbar';

    const home = document.createElement('div');
    home.className = 'nav-item';
    home.innerHTML = navIcons.home + ' <span>ទំព័រដើម</span>';
    home.addEventListener('click', () => { window.location.href = '/'; });
    nav.appendChild(home);

    navSections.forEach((section) => {
        nav.appendChild(createHeaderNavItem(section));
    });

    return nav;
}

function buildHeader() {
    const header = document.getElementById('header');
    if (!header) return;
    header.className = 'header';

    const container = document.createElement('div');
    container.className = 'header-container';

    // --- Branding ---
    const headerLeft = document.createElement('div');
    headerLeft.className = 'header-left';
    headerLeft.innerHTML = `
        <div class="brand">
            <div class="brand-icon"><img src="${SITE.logo}" alt="logo" width="150px"></div>
        </div>
    `;
    container.appendChild(headerLeft);

    // --- Hamburger (mobile) ---
    const hamburger = document.createElement('button');
    hamburger.className = 'hamburger-btn';
    hamburger.setAttribute('aria-label', 'Toggle menu');
    hamburger.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="30" height="30" fill="rgba(255,255,255,1)"><path d="M16 18V20H5V18H16ZM21 11V13H3V11H21ZM19 4V6H8V4H19Z"></path></svg>`;
    hamburger.addEventListener('click', () => toggleSidebar());
    container.appendChild(hamburger);

    // --- Desktop Navigation ---
    container.appendChild(buildDesktopNavbar());

    // --- Sign Up / Login button (Profile injects itself here via app.js) ---
    const loginBtn = document.createElement('button');
    loginBtn.id = 'loginBtn';
    loginBtn.className = 'login-btn';
    loginBtn.innerHTML = `${navIcons.user} បង្កើតគណនី`;
    loginBtn.addEventListener('click', () => { window.location.href = '/register.html'; });
    container.appendChild(loginBtn);

    header.appendChild(container);
}

document.addEventListener('DOMContentLoaded', buildHeader);
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('overlay')?.addEventListener('click', () => toggleSidebar(false));
});
