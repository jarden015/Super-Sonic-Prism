(() => {
  document.documentElement.dataset.js = 'true';

  // Logo spin on hover: track mouse position relative to logo center
  const logoImg = document.querySelector('.middle-layer > img');
  if (logoImg) {
    let logoCenterX = 0;
    let logoCenterY = 0;
    let isLogoHover = false;
    let delayRemaining = 0;
    let currentAmount = 0;
    let cycleProgressMs = 0;
    let rafId = 0;
    let lastFrameAt = 0;

    function parseCssTimeToMs(raw) {
      const value = String(raw ?? '').trim();
      if (!value) return 0;
      if (value.endsWith('ms')) return Number.parseFloat(value) || 0;
      if (value.endsWith('s')) return (Number.parseFloat(value) || 0) * 1000;
      const num = Number.parseFloat(value);
      return Number.isFinite(num) ? num * 1000 : 0;
    }

    function parseCssAngleToDeg(raw) {
      const value = String(raw ?? '').trim();
      if (!value) return 0;
      if (value.endsWith('deg')) return Number.parseFloat(value) || 0;
      const num = Number.parseFloat(value);
      return Number.isFinite(num) ? num : 0;
    }

    function readLogoColorVars() {
      const rootStyles = getComputedStyle(document.documentElement);
      const hueStart = parseCssAngleToDeg(rootStyles.getPropertyValue('--logo-color-hue-start'));
      const hueEnd = parseCssAngleToDeg(rootStyles.getPropertyValue('--logo-color-hue-end'));
      return {
        delayMs: parseCssTimeToMs(rootStyles.getPropertyValue('--logo-color-delay')),
        inMs: parseCssTimeToMs(rootStyles.getPropertyValue('--logo-color-in-duration')),
        outMs: parseCssTimeToMs(rootStyles.getPropertyValue('--logo-color-out-duration')),
        cycleMs: Math.max(1, parseCssTimeToMs(rootStyles.getPropertyValue('--logo-color-cycle-duration'))),
        hueStart,
        hueEnd,
        hueRange: hueEnd - hueStart,
        sepia: Number.parseFloat(rootStyles.getPropertyValue('--logo-color-sepia')) || 0,
        saturation: Number.parseFloat(rootStyles.getPropertyValue('--logo-color-saturation')) || 1,
        brightness: Number.parseFloat(rootStyles.getPropertyValue('--logo-color-brightness')) || 1,
        contrast: Number.parseFloat(rootStyles.getPropertyValue('--logo-color-contrast')) || 1
      };
    }

    function buildFilter(vars, amount, hueDeg) {
      const t = Math.max(0, Math.min(1, amount));
      const sepiaStrength = Math.max(0, Math.min(1, vars.sepia));
      const sepia = sepiaStrength * t;
      const saturation = 1 + (vars.saturation - 1) * t;
      const brightness = 1 + (vars.brightness - 1) * t;
      const contrast = 1 + (vars.contrast - 1) * t;

      // Pre-darken bright pixels so they can accept color tint better (especially for purple/blue),
      // then re-brighten after tinting. This prevents bright whites from staying white-ish at all hues.
      const preDarken = 0.7 * t;
      const postBrighten = (1 / 0.7) * t;
      const finalBrightness = 1 - preDarken + (brightness - 1) * t + (postBrighten - t);
      
      return `brightness(${1 - preDarken}) contrast(${contrast}) sepia(${sepia}) hue-rotate(${hueDeg}deg) saturate(${saturation}) brightness(${finalBrightness})`;
    }

    function ensureRaf() {
      if (rafId) return;
      lastFrameAt = performance.now();
      rafId = requestAnimationFrame(tick);
    }

    function tick(now) {
      rafId = 0;
      const dt = Math.min(50, Math.max(0, now - lastFrameAt)); // Cap dt to avoid jumps
      lastFrameAt = now;

      const vars = readLogoColorVars();

      // Determine target amount and speed
      let targetAmount;
      let speedMs;

      if (isLogoHover) {
        // Hovering: wait for delay, then fade in to 1
        if (delayRemaining > 0) {
          delayRemaining = Math.max(0, delayRemaining - dt);
          targetAmount = 0;
          speedMs = vars.inMs;
        } else {
          targetAmount = 1;
          speedMs = vars.inMs;
        }
      } else {
        // Not hovering: fade out to 0
        targetAmount = 0;
        speedMs = vars.outMs;
      }

      // Smoothly move currentAmount toward target
      if (currentAmount !== targetAmount) {
        const maxDelta = dt / Math.max(1, speedMs);
        if (currentAmount < targetAmount) {
          currentAmount = Math.min(targetAmount, currentAmount + maxDelta);
        } else {
          currentAmount = Math.max(targetAmount, currentAmount - maxDelta);
        }
      }

      // Always cycle hue when there's any color (keeps it smooth during fade-out too)
      if (currentAmount > 0) {
        cycleProgressMs = (cycleProgressMs + dt) % vars.cycleMs;
      }
      const hueDeg = vars.hueStart + vars.hueRange * (cycleProgressMs / vars.cycleMs);

      // Apply filter
      if (currentAmount <= 0.001) {
        logoImg.style.removeProperty('filter');
        currentAmount = 0;
      } else {
        logoImg.style.setProperty('filter', buildFilter(vars, currentAmount, hueDeg), 'important');
      }

      // Continue animation if needed
      if (isLogoHover || currentAmount > 0 || delayRemaining > 0) {
        rafId = requestAnimationFrame(tick);
      }
    }

    function updateLogoCenterPosition() {
      const rect = logoImg.getBoundingClientRect();
      logoCenterX = rect.left + rect.width / 2;
      logoCenterY = rect.top + rect.height / 2;
    }

    updateLogoCenterPosition();
    window.addEventListener('resize', updateLogoCenterPosition);

    document.addEventListener('mousemove', (e) => {
      const spinRadius = parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--logo-spin-radius')
      );
      const distX = e.clientX - logoCenterX;
      const distY = e.clientY - logoCenterY;
      const distance = Math.sqrt(distX * distX + distY * distY);

      const nextHover = distance <= spinRadius;
      if (nextHover === isLogoHover) return;
      isLogoHover = nextHover;

      if (isLogoHover) {
        // Only apply delay if starting from zero (fresh hover)
        if (currentAmount <= 0.001) {
          const vars = readLogoColorVars();
          delayRemaining = vars.delayMs;
          cycleProgressMs = 0;
        }
        // If currentAmount > 0 (resuming from fade-out), no delay, just reverse direction
      }
      // When exiting hover, direction just reverses naturally

      ensureRaf();

      logoImg.classList.toggle('logo-spinning', isLogoHover);
      document.body?.classList.toggle('logo-hover', isLogoHover);
    });
  }

  const api = window.SonicPrismPosts;
  if (!api) return;

  // Optional seeding if localStorage is empty.
  // Leave empty if you only want to manage posts via the local admin page.
  const POSTS_CONFIG = [];

  const postList = document.getElementById('postList');

  if (!postList) {
    return;
  }

  // Ensure mouse wheel scroll works inside the feed even when the page itself is non-scrollable.
  const postBox = postList.closest?.('.post-box') || postList;
  api.enableWheelScroll?.(postBox, postList);

  function seedIfEmpty(currentPosts) {
    if (currentPosts.length || !POSTS_CONFIG.length) return currentPosts;

    const seeded = POSTS_CONFIG.map((cfg) => {
      const blocks = [];
      if (Array.isArray(cfg.blocks)) {
        for (const block of cfg.blocks) {
          if (block?.type === 'text' && typeof block.content === 'string' && block.content.trim()) {
            blocks.push({ type: 'text', text: block.content.trim() });
          }
          if (block?.type === 'image' && typeof block.url === 'string') {
            const src = api.normalizeImageSource(block.url);
            if (src) blocks.push({ type: 'image', src });
          }
          if (block?.type === 'embed' && typeof block.url === 'string') {
            const src = api.normalizeHttpUrl(block.url);
            if (src) blocks.push({ type: 'iframe', src });
          }
        }
      }
      return {
        id: crypto.randomUUID?.() ?? String(Date.now()),
        createdAt: Date.now(),
        blocks
      };
    });

    return seeded;
  }

  function loadAndRender() {
    // Try loading from data/posts.json (Git-tracked file, works on GitHub Pages)
    fetch('/data/posts.json', { cache: 'no-store' })
      .then(res => res.ok ? res.json() : null)
      .then(jsonPosts => {
        let posts = Array.isArray(jsonPosts) ? jsonPosts : null;
        
        // Fall back to localStorage if file doesn't exist or is invalid
        if (!posts) {
          posts = api.loadPosts();
        }

        posts = api.prunePosts(posts);
        api.sortNewestFirst(posts);
        posts = seedIfEmpty(posts);

        api.renderPostList(postList, posts);
      })
      .catch(() => {
        // Fall back to localStorage if fetch fails
        let posts = api.loadPosts();
        posts = api.prunePosts(posts);
        api.sortNewestFirst(posts);
        posts = seedIfEmpty(posts);
        api.renderPostList(postList, posts);
      });
  }

  loadAndRender();

  // Keep in sync with the local admin page when both are open.
  window.addEventListener('storage', (e) => {
    if (e.key === api.POSTS_KEY || e.key === api.MAX_AGE_KEY) {
      loadAndRender();
    }
  });
})();
