/**
 * sidebar.js
 * ------------------------------------------------------------------
 * បង្កើត Mobile Sidebar (<aside id="sidebar">) ទាំងមូលដោយ JavaScript សុទ្ធ។
 * ប្រើទិន្នន័យរួមគ្នាជាមួយ header.js (navSections) ពី nav-data.js។
 *
 * ត្រូវការ: nav-data.js, ហើយ toggleSidebar() ត្រូវប្រកាសនៅ header.js ។
 * ------------------------------------------------------------------
 */

function isActiveHref(href) {
    if (!href || href.startsWith('http')) return false;
    const currentPath = window.location.pathname.replace(/\/index\.html$/, '').replace(/\/$/, '') || '/';
    const normalizedHref = href.replace(/\/$/, '') || '/';
    return currentPath === normalizedHref;
}

function createNavLink(item) {
    const link = document.createElement('a');
    link.href = item.href;
    link.className = `nav-link${isActiveHref(item.href) ? ' active' : ''}`;
    link.innerHTML = `${item.icon}<span>${item.label}</span>`;
    if (item.external) {
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
    }
    link.addEventListener('click', (event) => {
        event.preventDefault();
        toggleSidebar(false);
        if (item.external) {
            window.open(item.href, '_blank', 'noopener,noreferrer');
            return;
        }
        window.location.href = item.href;
    });
    return link;
}

function createSection(section) {
    const sectionWrapper = document.createElement('div');
    sectionWrapper.className = 'nav-section';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'nav-link section-toggle';
    button.innerHTML = `${section.icon}<span>${section.label}</span><svg class="section-arrow" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 15.1716L6.34315 9.51472L7.75736 8.10051L12 12.3431L16.2426 8.10051L17.6569 9.51472L12 15.1716Z"></path></svg>`;

    const itemsWrapper = document.createElement('div');
    itemsWrapper.className = 'section-items';

    section.items.forEach((item) => {
        const itemLink = createNavLink(item);
        itemLink.classList.add('section-item');
        itemsWrapper.appendChild(itemLink);
    });

    button.addEventListener('click', () => {
        button.classList.toggle('open');
        itemsWrapper.classList.toggle('open');
    });

    // បើក Section ដោយស្វ័យប្រវត្តិ បើវាមាន route កំពុងសកម្ម
    if (section.items.some((item) => isActiveHref(item.href))) {
        button.classList.add('open');
        itemsWrapper.classList.add('open');
    }

    sectionWrapper.appendChild(button);
    sectionWrapper.appendChild(itemsWrapper);
    return sectionWrapper;
}

function renderSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    const nav = document.createElement('nav');
    nav.className = 'mobile-nav';
    nav.appendChild(createNavLink({ label: 'ទំព័រដើម', href: '/', icon: navIcons.home }));

    const user = JSON.parse(localStorage.getItem('user') || 'null');

    navSections.forEach((section) => {
        nav.appendChild(createSection(section));
    });

    if (user) {
        const profileWrapper = document.createElement('div');
        profileWrapper.className = 'user-profile-wrapper';

        const profileToggle = document.createElement('button');
        profileToggle.type = 'button';
        profileToggle.className = 'user-profile-section user-profile-toggle';
        profileToggle.innerHTML = `
            <div class="user-info">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M4 22C4 17.5817 7.58172 14 12 14C16.4183 14 20 17.5817 20 22H18C18 18.6863 15.3137 16 12 16C8.68629 16 6 18.6863 6 22H4ZM12 13C8.685 13 6 10.315 6 7C6 3.685 8.685 1 12 1C15.315 1 18 3.685 18 7C18 10.315 15.315 13 12 13ZM12 11C14.21 11 16 9.21 16 7C16 4.79 14.21 3 12 3C9.79 3 8 4.79 8 7C8 9.21 9.79 11 12 11Z"></path></svg>
                    <div class="user-name">${user.name || 'User'}</div>
                    <div class="user-email">${user.email || ''}</div>
                </div>
            </div>
            <span class="profile-arrow"></span>
        `;

        const userActions = document.createElement('div');
        userActions.className = 'user-actions';

        const logoutBtn = document.createElement('button');
        logoutBtn.type = 'button';
        logoutBtn.className = 'nav-link logout-link user-action-btn';
        logoutBtn.innerHTML = `${navIcons.logout}<span>Logout</span>`;
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logoutUser();
        });

        userActions.appendChild(logoutBtn);
        profileToggle.addEventListener('click', () => {
            profileToggle.classList.toggle('open');
            userActions.classList.toggle('open');
        });

        profileWrapper.appendChild(profileToggle);
        profileWrapper.appendChild(userActions);
        nav.appendChild(profileWrapper);
    } else {
        nav.appendChild(createNavLink({ label: 'បង្កើតគណនី', href: '/register.html', icon: navIcons.login }));
    }

    sidebar.replaceChildren(nav);
}

document.addEventListener('DOMContentLoaded', renderSidebar);
