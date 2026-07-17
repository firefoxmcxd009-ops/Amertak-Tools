/**
 * footer.js
 * ------------------------------------------------------------------
 * បង្កើត <footer id="footer"> ទាំងមូលដោយ JavaScript សុទ្ធ, ប្រើទិន្នន័យ
 * ពី nav-data.js (footerToolLinks, footerSupportLinks, footerSocialLinks) ។
 * ------------------------------------------------------------------
 */

// yank the inner <path> markup out of a full <svg>...</svg> icon string
function extractSvgInner(svgString) {
    const match = svgString.match(/<svg[^>]*>([\s\S]*)<\/svg>/);
    return match ? match[1] : '';
}

function renderSocialIcons() {
    return footerSocialLinks.map((social, index) => `
        <a href="${social.href}" class="social-icon" data-aos="fade-up" data-aos-delay="${(index + 1) * 100}" ${social.href.startsWith('http') ? 'target="_blank" rel="noopener noreferrer"' : ''}>
            <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="rgba(255,255,255,1)">${extractSvgInner(social.icon)}</svg>
        </a>
    `).join('');
}

function renderFooterLinkColumn(links) {
    return links.map((link, index) => `
        <p data-aos="zoom-up" data-aos-delay="${(index + 1) * 100}" style="color: var(--text-dim);">
            <a class="${link.icon ? 'footer-link-with-icon' : ''}" href="${link.href}" ${link.external ? 'target="_blank" rel="noopener noreferrer"' : ''}>
                ${link.icon ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14">${extractSvgInner(link.icon)}</svg>` : ''}${link.label}
            </a>
        </p>
    `).join('');
}

// RENDER FOOTER
function renderFooter() {
    const footerEl = document.getElementById('footer');
    if (!footerEl) return;
    footerEl.className = 'footer';

    footerEl.innerHTML = `
        <div class="footer-info">
            <!-- Icons & Info -->
            <div class="sub-footer">
                <div class="social-links">
                    ${renderSocialIcons()}
                </div>
                <div class="info">
                    <img class="brand-icon" src="${SITE.logo}" data-aos="zoom" data-aos-delay="0" alt="Amertak Logo" width="100px" style="margin: auto;">
                    <p data-aos="zoom" data-aos-delay="100">Developed by: ${SITE.developer} <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="15" height="15" style="top: 3.5px; position:relative; fill:dodgerblue" fill="rgba(70,146,221,1)"><path d="M10.007 2.10377C8.60544 1.65006 7.08181 2.28116 6.41156 3.59306L5.60578 5.17023C5.51004 5.35763 5.35763 5.51004 5.17023 5.60578L3.59306 6.41156C2.28116 7.08181 1.65006 8.60544 2.10377 10.007L2.64923 11.692C2.71404 11.8922 2.71404 12.1078 2.64923 12.308L2.10377 13.993C1.65006 15.3946 2.28116 16.9182 3.59306 17.5885L5.17023 18.3942C5.35763 18.49 5.51004 18.6424 5.60578 18.8298L6.41156 20.407C7.08181 21.7189 8.60544 22.35 10.007 21.8963L11.692 21.3508C11.8922 21.286 12.1078 21.286 12.308 21.3508L13.993 21.8963C15.3946 22.35 16.9182 21.7189 17.5885 20.407L18.3942 18.8298C18.49 18.6424 18.6424 18.49 18.8298 18.3942L20.407 17.5885C21.7189 16.9182 22.35 15.3946 21.8963 13.993L21.3508 12.308C21.286 12.1078 21.286 11.8922 21.3508 11.692L21.8963 10.007C22.35 8.60544 21.7189 7.08181 20.407 6.41156L18.8298 5.60578C18.6424 5.51004 18.49 5.35763 18.3942 5.17023L17.5885 3.59306C16.9182 2.28116 15.3946 1.65006 13.993 2.10377L12.308 2.64923C12.1078 2.71403 11.8922 2.71404 11.692 2.64923L10.007 2.10377ZM6.75977 11.7573L8.17399 10.343L11.0024 13.1715L16.6593 7.51465L18.0735 8.92886L11.0024 15.9999L6.75977 11.7573Z"></path></svg></p>
                    <p data-aos="zoom" data-aos-delay="200">Website: ${SITE.website}</p>
                    <p data-aos="zoom" data-aos-delay="300">Join Discord server: <a style="color: #ff0022; text-decoration: none;" href="${SITE.discordInvite}">Click to join!</a></p>
                </div>
            </div>

            <!-- Tools Links -->
            <div class="sub-footer">
                <div class="social-links footer-link-list">
                    <h4 data-aos="zoom-up" data-aos-delay="100">Tools</h4>
                    ${renderFooterLinkColumn(footerToolLinks)}
                </div>
            </div>

            <!-- Document -->
            <div class="sub-footer">
                <div class="social-links footer-link-list">
                    <h4 data-aos="zoom-up" data-aos-delay="500">Document</h4>
                    ${renderFooterLinkColumn(footerDocument)}
                </div>
            </div>

            <!-- Support Links -->
            <div class="sub-footer">
                <div class="social-links footer-link-list">
                    <h4 data-aos="zoom-up" data-aos-delay="500">Contact Support</h4>
                    ${renderFooterLinkColumn(footerSupportLinks)}
                </div>
            </div>
        </div>
        <p class="copyright" id="copyright">© 2026 - Amertak Tools · All purchases are final</p>
    `;
}

document.addEventListener('DOMContentLoaded', renderFooter);
