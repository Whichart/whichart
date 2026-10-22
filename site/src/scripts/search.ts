// Client-side search over the build-time index. Matches every word typed, as a word prefix,
// across titles and synonyms; titles weigh more.
interface Item {
  title: string;
  kind: string;
  url?: string;
  text: string;
}

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

export function initSearch(input: HTMLInputElement, list: HTMLElement, items: Item[]) {
  const prepared = items.map((it) => ({ it, title: ` ${norm(it.title)}`, text: ` ${norm(it.text)}` }));

  function run(q: string) {
    const words = norm(q).split(' ').filter(Boolean);
    if (!words.length) return [];
    return prepared
      .map((p) => {
        let score = 0;
        for (const w of words) {
          if (p.title.includes(` ${w}`)) score += 3;
          else if (p.text.includes(` ${w}`)) score += 1;
          else return null;
        }
        if (p.it.kind === 'Coming soon') score -= 0.5;
        return { ...p.it, score };
      })
      .filter((x): x is Item & { score: number } => x !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  }

  function render() {
    const results = run(input.value);
    list.replaceChildren();
    list.hidden = !input.value.trim();
    if (!results.length) {
      const li = document.createElement('li');
      li.className = 'search-empty';
      li.textContent = 'Nothing yet. Try "line", "stat card" or "drop off".';
      list.append(li);
      return;
    }
    for (const r of results) {
      const li = document.createElement('li');
      const el = document.createElement(r.url ? 'a' : 'span');
      if (r.url) (el as HTMLAnchorElement).href = r.url;
      const title = document.createElement('strong');
      title.textContent = r.title;
      const kind = document.createElement('span');
      kind.className = 'tag';
      kind.textContent = r.kind;
      el.append(title, kind);
      li.append(el);
      list.append(li);
    }
  }

  input.addEventListener('input', render);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const first = list.querySelector('a');
      if (first) location.href = first.href;
    } else if (e.key === 'Escape') {
      input.value = '';
      render();
    }
  });
}
