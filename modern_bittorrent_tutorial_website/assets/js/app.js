(() => {
  const qs = (selector, root = document) => root.querySelector(selector);
  const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];

  const body = document.body;
  const menuButton = qs('.menu-button');
  const scrim = qs('.sidebar-scrim');

  function setNav(open) {
    body.classList.toggle('nav-open', open);
    menuButton?.setAttribute('aria-expanded', String(open));
    if (scrim) scrim.hidden = !open;
  }
  menuButton?.addEventListener('click', () => setNav(!body.classList.contains('nav-open')));
  scrim?.addEventListener('click', () => setNav(false));
  qsa('.chapter-link').forEach(link => link.addEventListener('click', () => setNav(false)));

  const themeButton = qs('.theme-button');
  themeButton?.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('torrent-theme', next); } catch (_) {}
  });

  const progress = qs('.reading-progress span');
  const backToTop = qs('.back-to-top');
  function updateScrollUi() {
    const max = document.documentElement.scrollHeight - innerHeight;
    const ratio = max > 0 ? Math.min(scrollY / max, 1) : 0;
    if (progress) progress.style.width = `${ratio * 100}%`;
    backToTop?.classList.toggle('visible', scrollY > 700);
  }
  addEventListener('scroll', updateScrollUi, { passive: true });
  updateScrollUi();
  backToTop?.addEventListener('click', () => scrollTo({ top: 0, behavior: 'smooth' }));

  qsa('.copy-code').forEach(button => {
    button.addEventListener('click', async () => {
      const code = qs('code', button.closest('.code-block'));
      if (!code) return;
      try {
        await navigator.clipboard.writeText(code.innerText.replace(/\u00a0/g, ' '));
        button.textContent = 'Copied';
      } catch (_) {
        const range = document.createRange();
        range.selectNodeContents(code);
        const selection = getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        document.execCommand('copy');
        selection.removeAllRanges();
        button.textContent = 'Copied';
      }
      setTimeout(() => { button.textContent = 'Copy'; }, 1500);
    });
  });

  const tocRoot = qs('#page-toc-list');
  const headings = qsa('.article-content h2, .article-content h3');
  if (tocRoot && headings.length) {
    headings.forEach(heading => {
      const link = document.createElement('a');
      link.href = `#${heading.id}`;
      link.textContent = heading.textContent;
      link.className = heading.tagName === 'H3' ? 'toc-h3' : 'toc-h2';
      tocRoot.appendChild(link);
    });
    const links = qsa('a', tocRoot);
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (!visible.length) return;
      links.forEach(link => link.classList.toggle('active', link.hash === `#${visible[0].target.id}`));
    }, { rootMargin: '-15% 0px -72% 0px', threshold: [0, 1] });
    headings.forEach(heading => observer.observe(heading));
  } else {
    qs('.page-toc')?.remove();
  }

  const overlay = qs('.search-overlay');
  const input = qs('.search-field input');
  const resultsRoot = qs('.search-results');
  const searchButtons = qsa('.search-button');
  const closeSearch = qs('.close-search');
  let selectedIndex = 0;

  function openSearch() {
    if (!overlay) return;
    overlay.hidden = false;
    body.style.overflow = 'hidden';
    selectedIndex = 0;
    requestAnimationFrame(() => input?.focus());
    renderResults(input?.value || '');
  }
  function hideSearch() {
    if (!overlay) return;
    overlay.hidden = true;
    body.style.overflow = '';
  }
  searchButtons.forEach(button => button.addEventListener('click', openSearch));
  closeSearch?.addEventListener('click', hideSearch);
  overlay?.addEventListener('click', event => { if (event.target === overlay) hideSearch(); });

  function escapeRegExp(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function escapeHtml(value) {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }
  function highlighted(text, terms) {
    let result = escapeHtml(text);
    terms.forEach(term => {
      if (!term) return;
      const safeTerm = escapeHtml(term);
      result = result.replace(new RegExp(`(${escapeRegExp(safeTerm)})`, 'ig'), '<mark>$1</mark>');
    });
    return result;
  }
  function snippet(item, terms) {
    const lower = item.content.toLowerCase();
    let position = -1;
    for (const term of terms) {
      const found = lower.indexOf(term);
      if (found !== -1 && (position === -1 || found < position)) position = found;
    }
    if (position === -1) return item.excerpt;
    const start = Math.max(0, position - 60);
    const end = Math.min(item.content.length, position + 150);
    return `${start ? '…' : ''}${item.content.slice(start, end).replace(/\s+/g, ' ')}${end < item.content.length ? '…' : ''}`;
  }
  function scoreItem(item, terms) {
    const title = item.title.toLowerCase();
    const sections = item.sections.map(s => s.title.toLowerCase()).join(' ');
    const content = item.content.toLowerCase();
    let score = 0;
    for (const term of terms) {
      if (title.includes(term)) score += 30;
      if (sections.includes(term)) score += 16;
      if (content.includes(term)) score += 5;
    }
    return score;
  }
  function renderResults(value) {
    if (!resultsRoot) return;
    const terms = value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const items = window.TUTORIAL_SEARCH || [];
    let results = terms.length
      ? items.map(item => ({ item, score: scoreItem(item, terms) })).filter(x => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 14).map(x => x.item)
      : items.slice(0, 10);
    selectedIndex = Math.min(selectedIndex, Math.max(results.length - 1, 0));
    if (!results.length) {
      resultsRoot.innerHTML = '<div class="search-empty">No matching chapter was found. Try a shorter term.</div>';
      return;
    }
    resultsRoot.innerHTML = results.map((item, index) => {
      const badge = item.badge;
      const desc = terms.length ? snippet(item, terms) : item.excerpt;
      return `<a class="search-result ${index === selectedIndex ? 'selected' : ''}" href="${item.filename}"><span class="search-result-badge">${badge}</span><span><strong>${highlighted(item.title, terms)}</strong><small>${highlighted(desc, terms)}</small></span></a>`;
    }).join('');
  }
  input?.addEventListener('input', event => { selectedIndex = 0; renderResults(event.target.value); });
  input?.addEventListener('keydown', event => {
    const links = qsa('.search-result', resultsRoot);
    if (event.key === 'ArrowDown') {
      event.preventDefault(); selectedIndex = Math.min(selectedIndex + 1, links.length - 1); renderResults(input.value);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault(); selectedIndex = Math.max(selectedIndex - 1, 0); renderResults(input.value);
    } else if (event.key === 'Enter' && links[selectedIndex]) {
      event.preventDefault(); links[selectedIndex].click();
    }
  });
  addEventListener('keydown', event => {
    const typing = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName);
    if (event.key === '/' && !typing) { event.preventDefault(); openSearch(); }
    if (event.key === 'Escape') { hideSearch(); setNav(false); }
  });
})();
