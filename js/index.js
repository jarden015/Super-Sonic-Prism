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

  let posts = api.loadPosts();
  posts = api.prunePosts(posts);
  api.sortNewestFirst(posts);

  // Initialize posts from config if storage is empty
  if (!posts.length && POSTS_CONFIG.length) {
    posts = POSTS_CONFIG.map((cfg) => {
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
      return { id: crypto.randomUUID?.() ?? String(Date.now()), createdAt: Date.now(), blocks };
    });

    posts = api.prunePosts(posts);
    api.sortNewestFirst(posts);
    api.savePosts(posts);
  } else {
    api.savePosts(posts);
  }

  api.renderPostList(postList, posts);
})();
