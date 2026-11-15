// Run through agent-browser eval --stdin in an isolated QA session with museum open.
(async () => {
  const pause = () => new Promise(resolve => setTimeout(resolve, 20));
  const click = async selector => {
    const item = document.querySelector(selector);
    if (!item || item.disabled) throw Error(`Unavailable: ${selector}`);
    item.click(); await pause();
  };
  const checked = [];
  for (const room of ['materials', 'heritage', 'masters']) {
    await click(`[data-museum-room="${room}"]`);
    for (;;) {
      const ids = [...document.querySelectorAll('[data-museum-exhibit]')].map(e => e.dataset.museumExhibit);
      for (const id of ids) {
        await click(`[data-museum-exhibit="${id}"]`);
        const first = document.querySelector('.museum-chapter p')?.textContent;
        if (!first) throw Error(`Missing story: ${id}`);
        await click('[data-story-page="1"]');
        const second = document.querySelector('.museum-chapter p')?.textContent;
        if (!second || second === first) throw Error(`Page did not turn: ${id}`);
        await click('[data-story-page="-1"]');
        if (document.querySelector('.museum-chapter p').textContent !== first) throw Error(`Back page lost: ${id}`);
        await click('[data-museum-section="material"]');
        if (!document.querySelector('.museum-summary')?.textContent) throw Error(`Missing description: ${id}`);
        await click('[data-museum-section="notes"]');
        if (document.querySelectorAll('.museum-observation-list li').length !== 3) throw Error(`Missing observations: ${id}`);
        const links = [...document.querySelectorAll('.museum-references a')];
        if (!links.length || links.some(a => !a.href.startsWith('https://'))) throw Error(`Source missing: ${id}`);
        const canvas = document.querySelector('.museum-art-window canvas');
        const pixels = canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
        let visible = 0; for (let i=3;i<pixels.length;i+=4) if(pixels[i]) visible++;
        if (visible < 1000) throw Error(`Empty illustration: ${id}`);
        const dialog = document.querySelector('dialog[open]');
        if (dialog.scrollWidth > dialog.clientWidth + 2) throw Error(`Horizontal overflow: ${id}`);
        checked.push({id, sources:links.length, visiblePixels:visible});
        await click('[data-museum-back]');
      }
      const next = document.querySelector('[data-museum-page="1"]');
      if (!next || next.disabled) break;
      await click('[data-museum-page="1"]');
    }
  }
  if (checked.length !== 28 || new Set(checked.map(e=>e.id)).size !== 28) throw Error(`Expected 28 unique exhibits: ${checked.length}`);
  await click('[data-museum-guide]');
  if (document.querySelectorAll('.museum-learning-pages section').length !== 4) throw Error('Guide incomplete');
  if (![...document.querySelectorAll('.museum-references a')].some(a=>a.href.includes('tongji.edu.cn'))) throw Error('Course credit missing');
  return {checked:checked.length, stories:checked.length*2, guideLenses:4, exhibits:checked};
})()
