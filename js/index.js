(() => {
  document.documentElement.dataset.js = 'true';

  const api = window.SonicPrismPosts;
  if (!api) return;

  // Optional seeding if localStorage is empty.
  // Leave empty if you only want to manage posts via the local admin page.
  const POSTS_CONFIG = [];

  const postList = document.getElementById('postList');

  if (!postList) {
    return;
  }

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
    let posts = api.loadPosts();
    posts = api.prunePosts(posts);
    api.sortNewestFirst(posts);
    posts = seedIfEmpty(posts);

    const before = (() => {
      try {
        return localStorage.getItem(api.POSTS_KEY);
      } catch {
        return null;
      }
    })();
    const after = JSON.stringify(posts);

    if (before !== after) {
      api.savePosts(posts);
    }

    api.renderPostList(postList, posts);
  }

  loadAndRender();

  // Keep in sync with the local admin page when both are open.
  window.addEventListener('storage', (e) => {
    if (e.key === api.POSTS_KEY || e.key === api.MAX_AGE_KEY) {
      loadAndRender();
    }
  });
})();
