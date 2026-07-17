const DEFAULT_API_BASE = 'https://amertak-tools-f3zb.onrender.com';

function getApiBase() {
    const configuredBase = window.__AUTH_API_BASE__ || '';
    if (configuredBase) {
        return configuredBase.replace(/\/$/, '');
    }

    return DEFAULT_API_BASE;
}

const API_BASE = getApiBase();

function getApiUrl(path) {
    return `${API_BASE}${path}`;
}

function getStoredAuthToken() {
    return localStorage.getItem('authToken') || '';
}

function buildAuthHeaders(extra = {}) {
    const headers = { ...extra };
    const token = getStoredAuthToken();
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }
    return headers;
}

// toggleSidebar(), navIcons, navSections, isActiveHref(), createNavLink(),
// createSection(), createNavLabel(), renderSidebar() ត្រូវបានផ្លាស់ទីទៅ
// header.js / sidebar.js / nav-data.js (ត្រូវផ្ទុកឯកសារទាំងនោះមុន app.js)

async function logoutUser() {
    try {
        await fetch(getApiUrl('/api/auth/logout'), {
            method: 'POST',
            headers: buildAuthHeaders(),
            credentials: 'include'
        });
    } catch (error) {
        console.error('Logout failed:', error);
    } finally {
        // Clear ALL auth-related localStorage items
        localStorage.removeItem('user');
        localStorage.removeItem('authToken');
        window.location.href = '/';
    }
}

function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));
}

function renderDesktopProfile(user) {
    const headerContainer = document.querySelector('.header-container');
    const desktopNavbar = document.querySelector('.desktop-navbar');
    if (!headerContainer || !desktopNavbar) return;

    document.getElementById('desktopProfile')?.remove();
    if (!user) return;

    const profile = document.createElement('div');
    const displayName = user.name || 'User';
    const initial = (displayName || 'U').trim().charAt(0).toUpperCase();
    profile.id = 'desktopProfile';
    profile.className = 'desktop-profile';
    profile.innerHTML = `
        <button type="button" class="desktop-profile-btn" aria-label="Profile">
            <span class="desktop-profile-avatar">${escapeHtml(initial)}</span>
            <span class="desktop-profile-name">${escapeHtml(displayName)}</span>
        </button>
        <div class="desktop-profile-menu">
            <button type="button">${navIcons.logout}<span>Logout</span></button>
        </div>
    `;
    profile.querySelector('.desktop-profile-btn')?.addEventListener('click', () => {
        profile.classList.toggle('open');
    });
    profile.querySelector('.desktop-profile-menu button')?.addEventListener('click', logoutUser);
    // Insert after the desktop navbar (same position as login button)
    desktopNavbar.after(profile);
}

// Fetch user info on page load
async function fetchUserInfo() {
    try {
        const response = await fetch(getApiUrl('/api/auth/me'), {
            headers: buildAuthHeaders({ Accept: 'application/json' }),
            credentials: 'include'
        });
        if (response.ok) {
            const data = await response.json();
            if (data?.user) {
                // Preserve email if API doesn't return it but we have it stored
                const existingUser = JSON.parse(localStorage.getItem('user') || 'null');
                if (!data.user.email && existingUser?.email) {
                    data.user.email = existingUser.email;
                }
                localStorage.setItem('user', JSON.stringify(data.user));
            }
            if (data?.token || data?.accessToken || data?.authToken) {
                localStorage.setItem('authToken', data.token || data.accessToken || data.authToken);
            }
            // Hide login buttons when user is logged in
            const loginBtn = document.getElementById('loginBtn');
            const LoginBtn = document.getElementById('LoginBtn');
            if (loginBtn) {
                loginBtn.style.display = 'none';
            }
            if (LoginBtn) {
                LoginBtn.style.display = 'none';
            }
            // Re-render sidebar with user info
            renderSidebar();
            renderDesktopProfile(data.user);
        } else {
            localStorage.removeItem('user');
            localStorage.removeItem('authToken');
            // Show login buttons when not logged in
            const loginBtn = document.getElementById('loginBtn');
            const LoginBtn = document.getElementById('LoginBtn');
            if (loginBtn) {
                loginBtn.style.display = 'flex';
            }
            if (LoginBtn) {
                LoginBtn.style.display = 'inline-flex';
            }
            renderSidebar();
            renderDesktopProfile(null);
        }
    } catch (error) {
        localStorage.removeItem('user');
        localStorage.removeItem('authToken');
        console.log('Not authenticated or error fetching user');
        // Show login buttons on error
        const loginBtn = document.getElementById('loginBtn');
        const LoginBtn = document.getElementById('LoginBtn');
        if (loginBtn) {
            loginBtn.style.display = 'flex';
        }
        if (LoginBtn) {
            LoginBtn.style.display = 'inline-flex';
        }
        renderSidebar();
        renderDesktopProfile(null);
    }
}

// ចំណាំ: renderDesktopDropdowns() ត្រូវបានលុប ព្រោះ header.js ឥឡូវបង្កើត
// desktop dropdown ដោយផ្ទាល់ពី navSections ស្រាប់ (មិនចាំបាច់ parse HTML វិញទេ)

function getCurrentUser() {
    return JSON.parse(localStorage.getItem('user') || 'null');
}

function createAuthPopup() {
    if (document.getElementById('authPopup')) return;

    const popup = document.createElement('div');
    popup.id = 'authPopup';
    popup.className = 'auth-popup hidden';
    popup.innerHTML = `
        <div class="auth-popup-card">
            <button type="button" class="auth-popup-close" aria-label="Close">&times;</button>
            <div class="auth-popup-icon">${navIcons.auth}</div>
            <h3>Register or login to use the tools.</h3>
            <p>Please sign in to access the tools and save your progress.</p>
            <div class="auth-popup-actions">
                <button type="button" class="auth-popup-register">Register</button>
                <button type="button" class="auth-popup-login">Sign Up</button>
                <button type="button" class="auth-popup-close-btn">Close</button>
            </div>
        </div>
    `;

    document.body.appendChild(popup);

    popup.querySelector('.auth-popup-close')?.addEventListener('click', hideAuthPopup);
    popup.querySelector('.auth-popup-close-btn')?.addEventListener('click', hideAuthPopup);
    popup.querySelector('.auth-popup-register')?.addEventListener('click', () => {
        window.location.href = '/register.html';
    });
    popup.querySelector('.auth-popup-login')?.addEventListener('click', () => {
        window.location.href = '/register.html';
    });
    popup.addEventListener('click', (event) => {
        if (event.target === popup) {
            hideAuthPopup();
        }
    });
}

function showAuthPopup() {
    createAuthPopup();
    const popup = document.getElementById('authPopup');
    if (!popup) return;
    popup.classList.remove('hidden');
    popup.classList.add('open');
}

function hideAuthPopup() {
    const popup = document.getElementById('authPopup');
    if (!popup) return;
    popup.classList.remove('open');
    popup.classList.add('hidden');
}

// Auth tool blocker was removed — tools are now accessible without login
// Like Button Functionality
async function handleLikeClick(button) {
    const toolId = button.dataset.toolId;
    const likeCountSpan = button.querySelector('.like-count');
    const currentCount = parseInt(likeCountSpan.textContent) || 0;
    
    // Check if user is logged in
    const user = getCurrentUser();
    if (!user) {
        showAuthPopup();
        return;
    }

    const isLiked = button.classList.contains('liked');
    
    // Optimistic update
    if (isLiked) {
        // Unlike
        button.classList.remove('liked');
        likeCountSpan.textContent = Math.max(0, currentCount - 1);
    } else {
        // Like
        button.classList.add('liked');
        likeCountSpan.textContent = currentCount + 1;
    }

    try {
        const endpoint = isLiked ? 'unlike' : 'like';
        const response = await fetch(getApiUrl(`/api/tools/${toolId}/${endpoint}`), {
            method: isLiked ? 'DELETE' : 'POST',
            headers: buildAuthHeaders({
                'Content-Type': 'application/json'
            }),
            credentials: 'include'
        });

        const data = await response.json();

        if (response.ok && data.success) {
            // Update with actual count from server
            likeCountSpan.textContent = data.likes;
            if (data.likedByUser) {
                button.classList.add('liked');
            } else {
                button.classList.remove('liked');
            }
        } else {
            // Revert on error
            if (isLiked) {
                button.classList.add('liked');
                likeCountSpan.textContent = currentCount;
            } else {
                button.classList.remove('liked');
                likeCountSpan.textContent = currentCount;
            }
            
            if (data.message && !data.message.includes('already liked')) {
                console.error('Like error:', data.message);
            }
        }
    } catch (error) {
        // Revert on network error
        if (isLiked) {
            button.classList.add('liked');
            likeCountSpan.textContent = currentCount;
        } else {
            button.classList.remove('liked');
            likeCountSpan.textContent = currentCount;
        }
        console.error('Like request failed:', error);
    }
}

// Load like counts on page load
async function loadLikeCounts() {
    const likeButtons = document.querySelectorAll('.like-btn');
    if (!likeButtons.length) return;

    const promises = Array.from(likeButtons).map(async (button) => {
        const toolId = button.dataset.toolId;
        const likeCountSpan = button.querySelector('.like-count');
        
        try {
            const response = await fetch(getApiUrl(`/api/tools/${toolId}/likes`), {
                headers: buildAuthHeaders({
                    'Accept': 'application/json'
                }),
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                likeCountSpan.textContent = data.likes || 0;
                if (data.likedByUser) {
                    button.classList.add('liked');
                } else {
                    button.classList.remove('liked');
                }
            } else {
                likeCountSpan.textContent = '0';
            }
        } catch (error) {
            likeCountSpan.textContent = '0';
            console.error(`Failed to load likes for ${toolId}:`, error);
        }
    });

    await Promise.all(promises);
}

// THEME TOGGLE: toggles `MODE` class on <body>, swaps icon, persists choice
function initThemeToggle() {
    const btn = document.getElementById('toggleMode');
    const icon = document.getElementById('mode-btn');
    const body = document.body;
    if (!btn || !icon) return;

    const setTheme = (isLight) => {
        if (isLight) {
            body.classList.add('MODE');
            icon.src = '/svg/dark-mode.svg';
            icon.alt = 'Switch to dark mode';
            btn.setAttribute('aria-pressed', 'true');
        } else {
            body.classList.remove('MODE');
            icon.src = '/svg/light-mode.svg';
            icon.alt = 'Switch to light mode';
            btn.setAttribute('aria-pressed', 'false');
        }
    };

    // initialize from localStorage (default: dark mode off)
    const stored = localStorage.getItem('amertak-theme');
    setTheme(stored === 'light');

    const toggleTheme = () => {
        const isLight = !body.classList.contains('MODE');
        setTheme(isLight);
        localStorage.setItem('amertak-theme', isLight ? 'light' : 'dark');
    };

    btn.removeAttribute('onclick');
    btn.addEventListener('click', toggleTheme);
    window.toggleMode = toggleTheme;
}

// auto-init on load
document.addEventListener('DOMContentLoaded', fetchUserInfo);
document.addEventListener('DOMContentLoaded', () => renderDesktopProfile(getCurrentUser()));
document.addEventListener('DOMContentLoaded', initThemeToggle);
document.addEventListener('DOMContentLoaded', loadLikeCounts);