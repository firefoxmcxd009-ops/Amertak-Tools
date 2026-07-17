const CONFIG = {
            svgUrl: "/svg/logo.svg",
            logoWidth: 400,  // ទំហំទទឹងរបស់ Logo ពេលបង្ហាញលើ Canvas
            logoHeight: 200, // ទំហំកម្ពស់របស់ Logo ពេលបង្ហាញលើ Canvas
            particleCount: 150, 
            particleSize: 1,
            particleShape: "circle", 
            particleColor: "single",
            singleColor: "#ff3333",  // ប្ដូរទៅជាពណ៌ក្រហម (Red Logo Feature)
            hoverEnabled: false,
            hoverConfig: {
                hoverType: "roam", 
                transition: { type: "spring", stiffness: 120, damping: 18 },
                roamWidth: 0,
                roamHeight: 0,
                roamOpacity: 0.25, 
                roamShape: "rectangle",
                hideType: "scatter",
            },
            repulsionEnabled: true,
            repulsionConfig: {
                repulsionForce: 50,
                repulsionRadius: 100,
                repulsionMode: "outside",
            }
        };

        // ── Helpers ────────────────────────────────────────────────────────
        function parseColor(c) {
            if (!c) return { r: 255, g: 0, b: 0, a: 255 };
            const m = c.match(/rgba?\(\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\s*\)/);
            if (m) return { r: +m[1] | 0, g: +m[2] | 0, b: +m[3] | 0, a: m[4] != null ? Math.round(+m[4] * 255) : 255 };
            const h = c.replace("#", "");
            if (h.length >= 6) return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: h.length === 8 ? parseInt(h.slice(6, 8), 16) : 255 };
            return { r: 255, g: 0, b: 0, a: 255 };
        }

        function shuffle(a) {
            for (let i = a.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [a[i], a[j]] = [a[j], a[i]];
            }
        }

        function randomInShape(shape, bx, by, bw, bh) {
            const cx = bx + bw / 2, cy = by + bh / 2;
            if (shape === "circle") {
                const r = bw / 2;
                const a = Math.random() * Math.PI * 2;
                const d = Math.sqrt(Math.random()) * r;
                return [cx + Math.cos(a) * d, cy + Math.sin(a) * d];
            }
            return [bx + Math.random() * bw, by + Math.random() * bh];
        }

        const EASE = {
            backOut: (t) => {
                const c = 1.70158 + 1;
                return 1 + c * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2;
            },
            easeOut: (t) => 1 - (1 - t) * (1 - t),
        };

        function getTransitionParams(tr) {
            if (tr.type === "spring") {
                const k = tr.stiffness ?? 100, d = tr.damping ?? 15, m = tr.mass ?? 1;
                const durMs = Math.min(3000, Math.max(300, (d / (2 * Math.sqrt(k * m))) * 2000));
                return { easeFn: EASE.backOut, durMs };
            }
            return { easeFn: EASE.easeOut, durMs: 800 };
        }

        function mkParticle(src, x, y, idleX, idleY) {
            return {
                x, y, vx: 0, vy: 0, startX: x, startY: y, repX: 0, repY: 0,
                homeX: src.homeX, homeY: src.homeY, idleX, idleY, r: src.r, g: src.g, b: src.b, a: src.a,
                inZone: false, roamTargetX: 0, roamTargetY: 0,
                colorIdx: Math.floor(Math.random() * 10), repTargetX: 0, repTargetY: 0,
            };
        }

        // ── DOM & State ─────────────────────────────────────────────────────
        const container = document.getElementById("particle-container");
        const canvas = document.getElementById("particle-canvas");
        const ctx = canvas.getContext("2d");

        let mouse = { x: -99999, y: -99999, active: false };
        let prevMouse = { x: -99999, y: -99999 };
        let mouseSpeed = 0;
        let smoothMouse = { x: -99999, y: -99999 };

        let scene = { particles: [] };
        let dims = { W: 0, H: 0 };
        let animState = "active";
        let animStartTime = 0;
        let animTimer = null;
        let roamFadeStart = 0;
        let roamFadeFrom = 1;
        let roamFadeTo = 1;
        let logoImg = null; // រក្សាទុក Object រូបភាព SVG

        function startAnim(newState) {
            const { particles } = scene;
            const { W, H } = dims;
            const hc = CONFIG.hoverConfig;
            const { easeFn, durMs } = getTransitionParams(hc.transition);
            
            const bw = Math.max(80, hc.roamWidth || W);
            const bh = Math.max(80, hc.roamHeight || H);
            const bx = (W - bw) / 2;
            const by = (H - bh) / 2;

            particles.forEach((p) => {
                p.startX = p.x;
                p.startY = p.y;
                if (newState === "scattering" && hc.hoverType === "roam") {
                    const [tx, ty] = randomInShape(hc.roamShape, bx, by, bw, bh);
                    p.roamTargetX = tx; p.roamTargetY = ty;
                    p.idleX = tx; p.idleY = ty;
                }
            });

            const rOp = hc.roamOpacity ?? 0.5;
            if (hc.hoverType === "roam") {
                if (newState === "scattering") {
                    roamFadeStart = Date.now(); roamFadeFrom = 1; roamFadeTo = rOp;
                } else if (newState === "assembling") {
                    roamFadeStart = Date.now(); roamFadeFrom = rOp; roamFadeTo = 1;
                }
            }

            if (newState === "scattering" && hc.hoverType === "roam") {
                clearTimeout(animTimer);
                animState = "idle";
                return;
            }

            animStartTime = Date.now();
            animState = newState;
            clearTimeout(animTimer);
            const next = newState === "assembling" ? "active" : "idle";
            animTimer = setTimeout(() => {
                if (animState === newState) animState = next;
            }, durMs);
        }

        // ── Load SVG and Scan Pixels ────────────────────────────────────────
        function initParticles() {
            const hc = CONFIG.hoverConfig;
            const { W, H } = dims;
            if (!W || !H || !logoImg) return;

            clearTimeout(animTimer);
            
            // កំណត់គម្លាតស្កែន pixels ផ្អែកលើចំនួន particleCount
            const gap = Math.max(2, Math.round(250 / Math.max(1, CONFIG.particleCount)));
            const dpr = window.devicePixelRatio || 1;
            canvas.width = Math.round(W * dpr);
            canvas.height = Math.round(H * dpr);
            
            mouse = { x: -99999, y: -99999, active: false };

            const off = document.createElement("canvas");
            off.width = W; off.height = H;
            const oc = off.getContext("2d");
            
            // គូរ SVG Logo ទៅចំកណ្ដាល Canvas
            const lx = (W - CONFIG.logoWidth) / 2;
            const ly = (H - CONFIG.logoHeight) / 2;
            oc.drawImage(logoImg, lx, ly, CONFIG.logoWidth, CONFIG.logoHeight);
            
            let px;
            try { px = oc.getImageData(0, 0, W, H).data; } catch (_) { return; }

            const src = [];
            for (let y = 0; y < H; y += gap) {
                for (let x = 0; x < W; x += gap) {
                    const i = (y * W + x) * 4;
                    if (px[i + 3] >= 50) { // ចាប់យក Pixel ណាដែលមានរូបរាង SVG 
                        src.push({ homeX: x, homeY: y, r: px[i], g: px[i + 1], b: px[i + 2], a: px[i + 3] });
                    }
                }
            }

            shuffle(src);
            let particles = [];
            
            if (!CONFIG.hoverEnabled) {
                animState = "active";
                particles = src.map((p) => mkParticle(p, p.homeX, p.homeY, p.homeX, p.homeY));
            } else if (hc.hoverType === "roam") {
                const bw = Math.max(80, hc.roamWidth || W);
                const bh = Math.max(80, hc.roamHeight || H);
                const bx = (W - bw) / 2; const by = (H - bh) / 2;
                particles = src.map((p) => {
                    const [rx, ry] = randomInShape(hc.roamShape, bx, by, bw, bh);
                    const pt = mkParticle(p, rx, ry, rx, ry);
                    const [tx, ty] = randomInShape(hc.roamShape, bx, by, bw, bh);
                    pt.roamTargetX = tx; pt.roamTargetY = ty;
                    pt.vx = (Math.random() - 0.5) * 1.5; pt.vy = (Math.random() - 0.5) * 1.5;
                    return pt;
                });
                animState = "idle";
            } else {
                particles = src.map((p) => {
                    const angle = Math.random() * Math.PI * 2;
                    const d = Math.max(W, H) * 0.4;
                    const ox = p.homeX + Math.cos(angle) * d;
                    const oy = p.homeY + Math.sin(angle) * d;
                    return mkParticle(p, ox, oy, ox, oy);
                });
                animState = "idle";
            }
            scene.particles = particles;
        }

        // ── Render Loop ─────────────────────────────────────────────────────
        let idata = null, bW = 0, bH = 0;
        function draw() {
            requestAnimationFrame(draw);
            const PW = canvas.width, PH = canvas.height;
            if (!PW || !PH) return;

            const dpr = window.devicePixelRatio || 1;
            const { particles } = scene;
            if (!particles.length) return;

            if (!idata || PW !== bW || PH !== bH) {
                idata = ctx.createImageData(PW, PH); bW = PW; bH = PH;
            }
            idata.data.fill(0);
            const buf = idata.data;

            const hc = CONFIG.hoverConfig;
            const rc = CONFIG.repulsionConfig;
            
            const hitSpeed = mouseSpeed;
            mouseSpeed *= 0.88;

            if (mouse.active) {
                const lerpFactor = Math.max(0.08, 0.3 - hitSpeed * 0.006);
                if (smoothMouse.x < -9000) { smoothMouse.x = mouse.x; smoothMouse.y = mouse.y; } 
                else { smoothMouse.x += (mouse.x - smoothMouse.x) * lerpFactor; smoothMouse.y += (mouse.y - smoothMouse.y) * lerpFactor; }
            } else {
                smoothMouse.x = -99999; smoothMouse.y = -99999;
            }

            const mx = smoothMouse.x, my = smoothMouse.y;
            const ps = Math.max(1, Math.ceil((CONFIG.particleSize / 4) * dpr));
            const { easeFn, durMs } = getTransitionParams(hc.transition);
            const elapsed = Date.now() - animStartTime;
            const animT = easeFn(Math.min(1, elapsed / durMs));
            
            const bw = Math.max(80, hc.roamWidth || dims.W);
            const bh = Math.max(80, hc.roamHeight || dims.H);
            const bx = (dims.W - bw) / 2; const by = (dims.H - bh) / 2;

            const half = ps / 2;
            const drawParticle = (cx, cy, r, g, b, a, isCircle) => {
                const px0 = Math.round(cx) - (ps >> 1);
                const py0 = Math.round(cy) - (ps >> 1);
                for (let dy = 0; dy < ps; dy++) {
                    const iy = py0 + dy; if (iy < 0 || iy >= PH) continue;
                    const row = iy * PW;
                    for (let dx = 0; dx < ps; dx++) {
                        if (isCircle) {
                            const ddx = dx - half + 0.5, ddy = dy - half + 0.5;
                            if (ddx * ddx + ddy * ddy > half * half) continue;
                        }
                        const ix = px0 + dx; if (ix < 0 || ix >= PW) continue;
                        const i = (row + ix) * 4;
                        buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = a;
                    }
                }
            };

            const repCutoff = Math.max(1, rc.repulsionRadius);
            const repCutoffSq = repCutoff * repCutoff;

            for (const p of particles) {
                const isCircle = CONFIG.particleShape === "circle";

                let baseX = p.x, baseY = p.y;
                if (animState === "assembling") {
                    baseX = p.startX + (p.homeX - p.startX) * animT;
                    baseY = p.startY + (p.homeY - p.startY) * animT;
                } else if (animState === "scattering") {
                    baseX = p.startX + (p.idleX - p.startX) * animT;
                    baseY = p.startY + (p.idleY - p.startY) * animT;
                } else if (animState === "active") {
                    baseX = p.homeX; baseY = p.homeY;
                } else if (animState === "idle") {
                    if (hc.hoverType === "roam") {
                        const dtx = p.roamTargetX - p.x, dty = p.roamTargetY - p.y;
                        if (Math.sqrt(dtx * dtx + dty * dty) < 3) {
                            const [tx, ty] = randomInShape(hc.roamShape, bx, by, bw, bh);
                            p.roamTargetX = tx; p.roamTargetY = ty;
                        }
                        p.vx = (p.vx || 0) * 0.98 + (p.roamTargetX - p.x) * 0.003;
                        p.vy = (p.vy || 0) * 0.98 + (p.roamTargetY - p.y) * 0.003;
                        p.x += p.vx; p.y += p.vy;
                        baseX = p.x; baseY = p.y;
                    } else {
                        baseX = p.idleX; baseY = p.idleY;
                    }
                }

                if (CONFIG.repulsionEnabled && mouse.active) {
                    const dx = baseX - mx, dy = baseY - my;
                    const distSq = dx * dx + dy * dy;
                    if (distSq > 0 && distSq < repCutoffSq) {
                        const dist = Math.sqrt(distSq);
                        const nx = dx / dist, ny = dy / dist;
                        const falloff = 1 - dist / repCutoff;
                        const push = falloff * hitSpeed * rc.repulsionForce * 0.06;
                        p.repX += nx * push; p.repY += ny * push;
                        const targetRepX = nx * (repCutoff - dist); const targetRepY = ny * (repCutoff - dist);
                        p.repX += (targetRepX - p.repX) * 0.08; p.repY += (targetRepY - p.repY) * 0.08;
                        p.inZone = true;
                    } else { p.inZone = false; }
                } else { p.inZone = false; }

                if (!p.inZone) { p.repX *= 0.95; p.repY *= 0.95; }
                p.x = baseX + p.repX; p.y = baseY + p.repY;

                let dr, dg, db, da;
                if (animState === "active") {
                    dr = p.r; dg = p.g; db = p.b; da = p.a;
                } else if (hc.hoverType === "roam" && CONFIG.hoverEnabled) {
                    let alphaMul;
                    if (roamFadeStart === 0) { alphaMul = hc.roamOpacity ?? 0.5; } 
                    else {
                        const fadeElapsed = Date.now() - roamFadeStart;
                        const fadeT = Math.min(1, Math.max(0, fadeElapsed / durMs));
                        alphaMul = roamFadeFrom + (roamFadeTo - roamFadeFrom) * easeFn(fadeT);
                    }
                    dr = p.r; dg = p.g; db = p.b; da = Math.round(p.a * alphaMul);
                } else if (hc.hoverType === "hide" && CONFIG.hoverEnabled) {
                    let alphaMul = (animState === "idle") ? 0 : (animState === "assembling") ? animT : (animState === "scattering") ? 1 - animT : 1;
                    dr = p.r; dg = p.g; db = p.b; da = Math.round(p.a * alphaMul);
                } else {
                    dr = p.r; dg = p.g; db = p.b; da = p.a;
                }
                if (da < 1) continue;

                if (CONFIG.particleColor === "single") {
                    const sc = parseColor(CONFIG.singleColor);
                    dr = sc.r; dg = sc.g; db = sc.b;
                }
                drawParticle(p.x * dpr, p.y * dpr, dr, dg, db, da, isCircle);
            }
            ctx.putImageData(idata, 0, 0);
        }

        // ── Event Handlers ──────────────────────────────────────────────────
        function onMouseMove(e) {
            const rect = canvas.getBoundingClientRect();
            const scaleX = dims.W / rect.width;
            const scaleY = dims.H / rect.height;
            const mx = (e.clientX - rect.left) * scaleX;
            const my = (e.clientY - rect.top) * scaleY;

            if (prevMouse.x > -9999) {
                mouseSpeed = Math.sqrt((mx - prevMouse.x)**2 + (my - prevMouse.y)**2);
            }
            prevMouse = { x: mx, y: my };
            mouse = { x: mx, y: my, active: true };

            if (CONFIG.hoverEnabled && (animState === "idle" || animState === "scattering")) {
                startAnim("assembling");
            }
        }

        function onMouseLeave() {
            mouse = { x: -99999, y: -99999, active: false };
            if (CONFIG.hoverEnabled && (animState === "assembling" || animState === "active")) {
                startAnim("scattering");
            }
        }

        // ── Preload Image & Initialization Setup ────────────────────────────
        logoImg = new Image();
        logoImg.crossOrigin = "anonymous"; 
        logoImg.src = CONFIG.svgUrl;
        logoImg.onload = () => {
            initParticles();
        };

        const ro = new ResizeObserver((entries) => {
            const r = entries[0]?.contentRect;
            if (!r) return;
            dims.W = Math.round(r.width);
            dims.H = Math.round(r.height);
            if (logoImg.complete) initParticles();
        });
        ro.observe(container);

        canvas.addEventListener("mousemove", onMouseMove);
        canvas.addEventListener("mouseleave", onMouseLeave);

        draw();