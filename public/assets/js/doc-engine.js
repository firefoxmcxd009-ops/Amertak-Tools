/**
 * doc-engine.js — API Documentation Renderer
 * 
 * Reads API endpoint data from window.__API_DATA__ (defined in index.html)
 * and renders the documentation UI dynamically.
 * 
 * Features:
 * - API Categories & Endpoint List
 * - Method Badges (GET, POST, PUT, DELETE)
 * - Syntax Highlight via Highlight.js
 * - Copy Buttons with "Copied!" animation
 * - Request/Response Examples with Code Tabs
 * - Parameters Table
 * - Error Responses
 * - Code Tabs (Request / Response)
 * - Search
 * - Scroll Spy
 * - Expand/Collapse
 * - Deep Links & Anchor Navigation
 * - Line Numbers & Language Badge on every code block
 */

(function () {
    'use strict';

    const DOC_ENGINE_VERSION = '2.0.0';

    // ─── Synonym map: normalize hljs language names ───
    const LANG_SYNONYMS = {
        'js': 'javascript',
        'ts': 'typescript',
        'sh': 'bash',
        'shell': 'bash',
        'zsh': 'bash',
        'curl': 'bash',
        'py': 'python',
        'node': 'javascript',
        'http': 'http',
        'text': 'plaintext',
        'env': 'plaintext',
        'dotenv': 'plaintext',
        'none': 'plaintext',
    };

    function resolveLang(lang) {
        if (!lang) return 'plaintext';
        var l = lang.toLowerCase().trim();
        return LANG_SYNONYMS[l] || l;
    }

    function escapeHtml(str) {
        return String(str || '')
            .replace(/&/g, '&')
            .replace(/</g, '<')
            .replace(/>/g, '>')
            .replace(/"/g, '"')
            .replace(/'/g, '&#39;');
    }

    function h(tag, attrs) {
        var el = document.createElement(tag);
        if (attrs) {
            for (var key in attrs) {
                if (!attrs.hasOwnProperty(key)) continue;
                var val = attrs[key];
                if (key === 'className') el.className = val;
                else if (key === 'dataset') {
                    for (var dk in val) {
                        if (val.hasOwnProperty(dk)) el.dataset[dk] = val[dk];
                    }
                } else if (key === 'style' && typeof val === 'object') {
                    for (var sk in val) {
                        if (val.hasOwnProperty(sk)) el.style[sk] = val[sk];
                    }
                } else if (typeof val === 'function') {
                    el.addEventListener(key, val);
                } else {
                    el.setAttribute(key, val);
                }
            }
        }
        for (var i = 2; i < arguments.length; i++) {
            var child = arguments[i];
            if (child == null) continue;
            if (typeof child === 'string' || typeof child === 'number') {
                el.appendChild(document.createTextNode(child));
            } else if (child instanceof Node) {
                el.appendChild(child);
            } else if (Array.isArray(child)) {
                for (var j = 0; j < child.length; j++) {
                    var c = child[j];
                    if (c instanceof Node) el.appendChild(c);
                    else if (c != null) el.appendChild(document.createTextNode(String(c)));
                }
            }
        }
        return el;
    }

    function iconSvg(path, size) {
        size = size || 18;
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="' + size + '" height="' + size + '" fill="currentColor"><path d="' + path + '"/></svg>';
    }

    var ICONS = {
        link: 'M18.364 15.5355L16.9497 14.1213L18.364 12.7071C20.3166 10.7545 20.3166 7.58866 18.364 5.63604C16.4114 3.68342 13.2456 3.68342 11.2929 5.63604L9.87868 7.05025L8.46447 5.63604L9.87868 4.22183C12.5123 1.58816 16.8447 1.58816 19.4783 4.22183C22.112 6.8555 22.112 11.1879 19.4783 13.8216L18.364 15.5355ZM15.5355 18.364L14.1213 19.7782C11.4877 22.4118 7.15533 22.4118 4.52167 19.7782C1.888 15.1455 1.888 10.8131 4.52167 8.17946L5.63589 6.46447L7.0501 7.87868L5.63589 9.29289C3.68327 11.2455 3.68327 14.4114 5.63589 16.364C7.58851 18.3166 10.7544 18.3166 12.707 16.364L14.1212 14.9497L15.5355 16.364L14.1212 17.7782L15.5355 18.364ZM14.8284 7.75736L16.2426 9.17157L9.17157 16.2426L7.75736 14.8284L14.8284 7.75736Z',
        copy: 'M7 6V2C7 1.44772 7.44772 1 8 1H20C20.5523 1 21 1.44772 21 2V18C21 18.5523 20.5523 19 20 19H17V22C17 22.5523 16.5523 23 16 23H4C3.44772 23 3 22.5523 3 22V8C3 7.44772 3.44772 7 4 7H7V6ZM9 7H15V3H9V7ZM7 9H5V21H15V19H7V9ZM17 17H19V3H9V5H15C15.5523 5 16 5.44772 16 6V17Z',
        check: 'M10 15.1707L19.1924 5.97827L20.6066 7.39249L10 18L3.63605 11.636L5.05026 10.2218L10 15.1707Z',
        chevronDown: 'M12 15.1707L5.63589 8.80762L7.0501 7.39249L12 12.3424L16.9499 7.39249L18.3641 8.80762L12 15.1707Z',
        alert: 'M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-1-7v2h2v-2h-2zm0-8v6h2V7h-2z',
    };

    function addLineNumbers(code) {
        var lines = code.split('\n');
        var nums = [];
        for (var i = 0; i < lines.length; i++) {
            nums.push(String(i + 1));
        }
        return nums.join('\n');
    }

    // ─── Hljs facade ───
    var Hljs = {
        highlight: function(code, lang) {
            var resolved = resolveLang(lang);
            if (typeof hljs !== 'undefined') {
                try {
                    if (hljs.getLanguage(resolved)) {
                        return hljs.highlight(code, { language: resolved, ignoreIllegals: true }).value;
                    }
                    return hljs.highlightAuto(code).value;
                } catch (e) {}
            }
            return escapeHtml(code);
        }
    };

    // ─── Renderer ───
    var DocRenderer = {
        container: null,
        data: null,
        activeCategory: 'all',
        searchTerm: '',

        init: function(container, data) {
            this.container = container;
            this.data = data;
            this.activeCategory = 'all';
            this.searchTerm = '';
            this.render();
            this.bindEvents();
            this.initScrollSpy();
            this.runHighlight();
        },

        runHighlight: function() {
            if (typeof hljs !== 'undefined') {
                var blocks = this.container.querySelectorAll('pre code');
                for (var i = 0; i < blocks.length; i++) {
                    if (!blocks[i].classList.contains('hljs')) {
                        try { hljs.highlightElement(blocks[i]); } catch (e) {}
                    }
                }
            }
        },

        render: function() {
            if (!this.container || !this.data) return;
            var cats = this.renderCategories();
            var eps = this.renderEndpoints();
            this.container.innerHTML = cats + eps;
            if (this.searchTerm) this.applySearch(this.searchTerm);
            var btns = this.container.querySelectorAll('.doc-category-btn');
            for (var i = 0; i < btns.length; i++) {
                if (btns[i].dataset.category === this.activeCategory) btns[i].classList.add('active');
            }
        },

        renderCategories: function() {
            var cats = this.data.categories;
            if (!cats || cats.length <= 1) return '';
            var buttons = [
                h('button', { className: 'doc-category-btn active', dataset: { category: 'all' }, click: this.filterByCategory.bind(this, 'all') }, 'All')
            ];
            for (var i = 0; i < cats.length; i++) {
                (function(c) {
                    buttons.push(h('button', { className: 'doc-category-btn', dataset: { category: c.id }, click: function() { DocRenderer.filterByCategory(c.id); } }, c.name));
                })(cats[i]);
            }
            return h('div', { className: 'doc-categories' }, buttons).outerHTML;
        },

        renderEndpoints: function() {
            var eps = this.data.endpoints;
            if (!eps || eps.length === 0) {
                return h('p', { style: { textAlign: 'center', color: 'var(--text-dim)', padding: '40px 0' } }, 'No API endpoints found.').outerHTML;
            }
            var cards = [];
            for (var i = 0; i < eps.length; i++) {
                cards.push(this.renderEndpointCard(eps[i]));
            }
            return h('div', { className: 'doc-endpoints' }, cards).outerHTML;
        },

        renderEndpointCard: function(ep) {
            var cardClasses = ['endpoint-card'];
            if (ep.method === 'GET') cardClasses.push('success');
            else if (ep.method === 'DELETE') cardClasses.push('danger');
            else if (ep.method === 'PUT' || ep.method === 'PATCH') cardClasses.push('warning');

            var methodClass = 'method-' + ep.method.toLowerCase();
            var methodBadge = h('span', { className: 'endpoint-method ' + methodClass }, ep.method);
            var pathSpan = h('span', { className: 'endpoint-path' }, ep.fullPath || ep.path);
            var nameSpan = h('span', { className: 'endpoint-name' }, ep.name);
            var anchor = h('span', { id: ep.id, className: 'endpoint-anchor' });
            var deepLinkBtn = h('span', { className: 'endpoint-deep-link', title: 'Copy deep link', click: function(e) { DocRenderer.copyDeepLink(e, ep.id); } });
            deepLinkBtn.innerHTML = iconSvg(ICONS.link, 16);

            var header = h('div', { className: 'endpoint-header' }, methodBadge, pathSpan, nameSpan, anchor, deepLinkBtn);

            var description = '';
            if (ep.description) description = h('p', { className: 'endpoint-description' }, ep.description);

            var paramsTable = '';
            if (ep.params && ep.params.length > 0) paramsTable = this.renderParamsTable(ep.params);

            var codeTabs = '';
            if ((ep.requestExamples && ep.requestExamples.length > 0) || (ep.responseExamples && ep.responseExamples.length > 0)) {
                codeTabs = this.renderCodeTabs(ep);
            }

            var errorBlock = '';
            if (ep.errorExamples && ep.errorExamples.length > 0) {
                var errCode = ep.errorExamples[0];
                var highlighted = Hljs.highlight(errCode.code, errCode.lang);
                var detectedLang = resolveLang(errCode.lang);
                var lineNums = addLineNumbers(errCode.code);

                var codeEl = h('code', { className: 'language-' + detectedLang });
                codeEl.innerHTML = highlighted || escapeHtml(errCode.code);
                var pre = h('pre', { className: 'has-line-numbers' }, codeEl);
                var numsDiv = h('div', { className: 'line-numbers' }, lineNums);
                var codeBody = h('div', { className: 'code-block-body' }, numsDiv, pre);
                var copyBtn = this.createCopyButton(errCode.code);
                var blockWrapper = h('div', { className: 'code-block-wrapper' }, codeBody, copyBtn);

                var langBadge = h('span', { className: 'code-lang-badge' }, detectedLang.toUpperCase());
                var errHeaderSpan = h('span', null);
                errHeaderSpan.innerHTML = iconSvg(ICONS.alert, 14) + ' Error Response';
                errHeaderSpan.style.display = 'flex';
                errHeaderSpan.style.alignItems = 'center';
                errHeaderSpan.style.gap = '6px';
                var codeHeader = h('div', { className: 'code-block-header' }, errHeaderSpan, langBadge);

                var errBlock = h('div', { className: 'error-block' });
                var errTitle = h('div', { className: 'error-block-title' });
                errTitle.innerHTML = iconSvg(ICONS.alert, 16) + ' Error Response';
                errBlock.appendChild(errTitle);
                errBlock.appendChild(h('div', null, codeHeader, blockWrapper));
                errorBlock = errBlock.outerHTML;
            }

            var toggleBtn = h('button', { className: 'toggle-btn', click: function(e) { DocRenderer.toggleEndpoint(e); } });
            toggleBtn.innerHTML = iconSvg(ICONS.chevronDown, 16) + ' Toggle details';

            var bodyContent = [description, paramsTable, codeTabs];
            if (errorBlock) bodyContent.push(errorBlock);
            var bodyDiv = h('div', { className: 'endpoint-body' }, bodyContent);
            var searchStr = (ep.name || '') + ' ' + (ep.path || '') + ' ' + (ep.description || '') + ' ' + (ep.method || '');

            return h('div', { className: cardClasses.join(' '), dataset: { category: ep.category || 'api', search: searchStr } }, header, toggleBtn, bodyDiv);
        },

        renderParamsTable: function(params) {
            var headerRow = h('tr', null, h('th', null, 'Name'), h('th', null, 'Type'), h('th', null, 'Location'), h('th', null, 'Required'), h('th', null, 'Description'));
            var rows = [];
            for (var i = 0; i < params.length; i++) {
                var p = params[i];
                var required = p.required ? h('span', { className: 'param-required' }, 'Yes') : 'No';
                rows.push(h('tr', null,
                    h('td', { style: { fontWeight: 700, fontFamily: "'Share Tech', monospace" } }, p.name),
                    h('td', { className: 'param-type' }, p.type || 'string'),
                    h('td', null, p.location || '—'),
                    h('td', null, required),
                    h('td', { className: 'param-desc' }, p.description || '—')
                ));
            }
            var table = h('table', { className: 'param-table' }, headerRow, rows);
            return h('div', { className: 'param-table-wrapper' }, table).outerHTML;
        },

        renderCodeTabs: function(ep) {
            var tabs = [];
            var contents = [];
            var activeSet = false;

            if (ep.requestExamples && ep.requestExamples.length > 0) {
                var tabId = 'tab-req-' + ep.id;
                var isActive = !activeSet;
                if (isActive) activeSet = true;
                (function(ti, ia) {
                    tabs.push(h('button', { className: 'code-tab' + (ia ? ' active' : ''), dataset: { tab: ti }, click: function() { DocRenderer.switchCodeTab(ti); } }, 'Request'));
                })(tabId, isActive);
                var content = h('div', { className: 'code-tab-content' + (isActive ? ' active' : '') });
                for (var i = 0; i < ep.requestExamples.length; i++) {
                    content.appendChild(this.createCodeBlock(ep.requestExamples[i].code, ep.requestExamples[i].lang));
                }
                contents.push(content);
            }

            if (ep.responseExamples && ep.responseExamples.length > 0) {
                var tabId2 = 'tab-res-' + ep.id;
                var isActive2 = !activeSet;
                if (isActive2) activeSet = true;
                (function(ti, ia) {
                    tabs.push(h('button', { className: 'code-tab' + (ia ? ' active' : ''), dataset: { tab: ti }, click: function() { DocRenderer.switchCodeTab(ti); } }, 'Response'));
                })(tabId2, isActive2);
                var content2 = h('div', { className: 'code-tab-content' + (isActive2 ? ' active' : '') });
                for (var j = 0; j < ep.responseExamples.length; j++) {
                    content2.appendChild(this.createCodeBlock(ep.responseExamples[j].code, ep.responseExamples[j].lang));
                }
                contents.push(content2);
            }

            if (tabs.length === 0) return '';

            var tabBar = h('div', { className: 'code-tabs' }, tabs);
            var tabContainer = h('div', null, tabBar);
            for (var k = 0; k < contents.length; k++) {
                tabContainer.appendChild(contents[k]);
            }
            return h('div', { className: 'code-block-wrapper', style: { marginTop: '12px' } }, tabContainer).outerHTML;
        },

        createCodeBlock: function(code, lang) {
            var detectedLang = resolveLang(lang || 'auto');
            var highlighted = Hljs.highlight(code, detectedLang);
            var lineNums = addLineNumbers(code);

            var langBadge = h('span', { className: 'code-lang-badge' }, detectedLang.toUpperCase());
            var header = h('div', { className: 'code-block-header' }, langBadge);

            var codeEl = h('code', { className: 'language-' + detectedLang });
            codeEl.innerHTML = highlighted || escapeHtml(code);
            var pre = h('pre', { className: 'has-line-numbers' }, codeEl);
            var numsDiv = h('div', { className: 'line-numbers' }, lineNums);
            var codeBody = h('div', { className: 'code-block-body' });
            if (code.indexOf('\n') !== -1) codeBody.appendChild(numsDiv);
            codeBody.appendChild(pre);
            var copyBtn = this.createCopyButton(code);

            return h('div', { className: 'code-block-wrapper' }, header, codeBody, copyBtn);
        },

        createCopyButton: function(code) {
            var self = this;
            var btn = h('button', { className: 'copy-btn', click: function(e) { e.stopPropagation(); self.copyToClipboard(code, btn); } });
            btn.innerHTML = iconSvg(ICONS.copy, 14) + ' Copy';
            return btn;
        },

        copyToClipboard: function(text, btn) {
            var self = this;
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text).then(function() { self.showCopyFeedback(btn); }).catch(function() { self.fallbackCopy(text, btn); });
            } else {
                this.fallbackCopy(text, btn);
            }
        },

        fallbackCopy: function(text, btn) {
            var textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            try {
                document.execCommand('copy');
                this.showCopyFeedback(btn);
            } catch (e) {
                console.error('Copy failed', e);
            }
            document.body.removeChild(textarea);
        },

        showCopyFeedback: function(btn) {
            var original = btn.innerHTML;
            btn.classList.add('copied');
            btn.innerHTML = iconSvg(ICONS.check, 14) + ' Copied!';
            setTimeout(function() {
                btn.classList.remove('copied');
                btn.innerHTML = original;
            }, 2000);
        },

        copyDeepLink: function(e, id) {
            e.stopPropagation();
            var url = window.location.origin + window.location.pathname + '#' + id;
            this.copyToClipboard(url, e.currentTarget);
        },

        switchCodeTab: function(tabId) {
            var wrapper = this.container.querySelector('.code-block-wrapper');
            if (!wrapper) return;
            var tabs = wrapper.querySelectorAll('.code-tab');
            for (var i = 0; i < tabs.length; i++) { tabs[i].classList.remove('active'); }
            var contents = wrapper.querySelectorAll('.code-tab-content');
            for (var j = 0; j < contents.length; j++) { contents[j].classList.remove('active'); }
            var tab = wrapper.querySelector('[data-tab="' + tabId + '"]');
            var content = wrapper.querySelector('.' + tabId);
            if (tab) tab.classList.add('active');
            if (content) content.classList.add('active');
        },

        toggleEndpoint: function(e) {
            var btn = e.currentTarget;
            var card = btn.closest('.endpoint-card');
            var body = card.querySelector('.endpoint-body');
            if (body.classList.contains('collapsed')) {
                body.classList.remove('collapsed');
                btn.classList.remove('expanded');
                btn.innerHTML = iconSvg(ICONS.chevronDown, 16) + ' Toggle details';
            } else {
                body.classList.add('collapsed');
                btn.classList.add('expanded');
                btn.innerHTML = iconSvg(ICONS.chevronDown, 16) + ' Expand details';
            }
        },

        filterByCategory: function(categoryId) {
            this.activeCategory = categoryId;
            var btns = this.container.querySelectorAll('.doc-category-btn');
            for (var i = 0; i < btns.length; i++) {
                btns[i].classList.toggle('active', btns[i].dataset.category === categoryId);
            }
            var cards = this.container.querySelectorAll('.endpoint-card');
            for (var j = 0; j < cards.length; j++) {
                if (categoryId === 'all' || cards[j].dataset.category === categoryId) {
                    cards[j].style.display = '';
                } else {
                    cards[j].style.display = 'none';
                }
            }
        },

        search: function(query) {
            this.searchTerm = query.toLowerCase().trim();
            this.applySearch(this.searchTerm);
        },

        applySearch: function(term) {
            var cards = this.container.querySelectorAll('.endpoint-card');
            for (var i = 0; i < cards.length; i++) {
                var card = cards[i];
                if (!term) {
                    if (this.activeCategory === 'all' || card.dataset.category === this.activeCategory) {
                        card.style.display = '';
                    }
                    return;
                }
                var searchData = (card.dataset.search || '').toLowerCase();
                var matches = searchData.indexOf(term) !== -1;
                if (matches && (this.activeCategory === 'all' || card.dataset.category === this.activeCategory)) {
                    card.style.display = '';
                } else {
                    card.style.display = 'none';
                }
            }
        },

        initScrollSpy: function() {
            if (window.location.hash) {
                var id = window.location.hash.slice(1);
                setTimeout(function() {
                    var el = document.getElementById(id);
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 500);
            }
        },

        bindEvents: function() {
            window.addEventListener('hashchange', function() {
                if (window.location.hash) {
                    var id = window.location.hash.slice(1);
                    var el = document.getElementById(id);
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        }
    };

    // ─── Init ───
    function init() {
        var container = document.getElementById('doc-content');
        if (!container) return;

        var data = window.__API_DATA__;
        if (!data || !data.endpoints || !data.endpoints.length) {
            container.innerHTML = '<div style="text-align:center;padding:60px 20px;"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48" fill="var(--danger)" style="margin-bottom:16px;"><path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-1-7v2h2v-2h-2zm0-8v6h2V7h-2z"/></svg><h3 style="color:#fff;margin-bottom:8px;">No API data found</h3><p style="color:var(--text-dim);font-size:14px;">Define window.__API_DATA__ in your HTML.</p></div>';
            return;
        }

        DocRenderer.init(container, data);

        // Wire up search
        var searchInput = document.getElementById('doc-search');
        if (searchInput) {
            var debounceTimer;
            searchInput.addEventListener('input', function() {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(function() { DocRenderer.search(searchInput.value); }, 250);
            });
            searchInput.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') {
                    searchInput.value = '';
                    DocRenderer.search('');
                }
            });
        }
    }

    window.DocApp = { version: DOC_ENGINE_VERSION, renderer: DocRenderer };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();