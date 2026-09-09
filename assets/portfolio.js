(() => {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  if ('IntersectionObserver' in window && !reducedMotion.matches) {
    document.body.classList.add('motion-ready');
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.08 });
    document.querySelectorAll('.reveal').forEach(element => observer.observe(element));
    reducedMotion.addEventListener('change', () => {
      if (reducedMotion.matches) {
        observer.disconnect();
        document.body.classList.remove('motion-ready');
      }
    });
  }

  const curiosityCases = {
    switchon: {
      eyebrow: 'SWITCHON / PRODUCT MANAGEMENT',
      index: '01 / 04',
      image: 'assets/deepinspect.webp',
      mobile: 'assets/deepinspect.webp',
      alt: "DeepInspect's public product image",
      stamp: 'A PUBLIC VIEW OF THE PRODUCT',
      label: 'THE FEATURE QUESTION',
      answer: "I changed a technical feature by starting with the operator's next decision.",
      link: '#switchon',
      linkText: 'Follow the story',
      internal: true
    },
    accept: {
      eyebrow: 'ACCEPT / LIVE PRODUCT',
      index: '02 / 04',
      image: 'assets/accept-snapshot.png',
      mobile: 'assets/accept-mobile-snapshot.png',
      alt: 'The actual Accept website',
      stamp: 'A LIVE PRODUCT I MADE',
      label: 'THE PRODUCT QUESTION',
      answer: 'I wanted local buying to feel less like a negotiation marathon and more like a clear decision.',
      link: 'https://accept.yashvipulkumarshah.com',
      linkText: 'Try Accept live'
    },
    access: {
      eyebrow: 'ACCESS / LIVE PRODUCT',
      index: '03 / 04',
      image: 'assets/access-snapshot.png',
      mobile: 'assets/access-mobile-snapshot.png',
      alt: 'The actual Access website',
      stamp: 'A LIVE PRODUCT I MADE',
      label: 'THE PRODUCT QUESTION',
      answer: 'I kept coming back to the same small frustration: everyone has the photos, but nobody has the same album.',
      link: 'https://access.yashvipulkumarshah.com',
      linkText: 'Try Access live'
    },
    fitness: {
      eyebrow: 'FITNESS / DAILY USE',
      index: '04 / 04',
      image: 'assets/fitness-snapshot.png',
      mobile: 'assets/fitness-mobile-snapshot.png',
      alt: 'My actual Fitness dashboard, with weight trends and workout logs',
      stamp: 'A LIVE PRODUCT I USE',
      label: 'THE PRODUCT QUESTION',
      answer: 'I made the tracker I wanted to open tomorrow morning: close to the routine, honest about the trend, and useful quickly.',
      link: 'https://fitness.yashvipulkumarshah.com',
      linkText: 'Try Fitness live'
    }
  };

  const curiosityTabs = [...document.querySelectorAll('[data-curiosity]')];
  const curiosityPanel = document.querySelector('#curiosity-panel');
  const curiosityPreview = document.querySelector('#curiosity-preview');
  const curiosityImage = document.querySelector('#curiosity-image');
  const curiosityMobile = document.querySelector('#curiosity-mobile');
  const curiosityEyebrow = document.querySelector('#curiosity-eyebrow');
  const curiosityIndex = document.querySelector('#curiosity-index');
  const curiosityStamp = document.querySelector('#curiosity-stamp');
  const curiosityLabel = document.querySelector('#curiosity-label');
  const curiosityAnswer = document.querySelector('#curiosity-answer');
  const curiosityLink = document.querySelector('#curiosity-link');
  let curiosityTimer;

  const showCuriosity = key => {
    const selected = curiosityCases[key];
    if (!selected) return;
    curiosityTabs.forEach(tab => {
      const active = tab.dataset.curiosity === key;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      if (active) curiosityPanel.setAttribute('aria-labelledby', tab.id);
    });
    curiosityPreview.classList.add('is-changing');
    clearTimeout(curiosityTimer);
    curiosityTimer = setTimeout(() => {
      curiosityEyebrow.textContent = selected.eyebrow;
      curiosityIndex.textContent = selected.index;
      curiosityImage.src = selected.image;
      curiosityMobile.srcset = selected.mobile;
      curiosityImage.alt = selected.alt;
      curiosityStamp.textContent = selected.stamp;
      curiosityLabel.textContent = selected.label;
      curiosityAnswer.textContent = selected.answer;
      curiosityLink.href = selected.link;
      curiosityLink.textContent = selected.linkText;
      curiosityLink.append(document.createElement('svg'));
      const arrow = curiosityLink.querySelector('svg');
      arrow.className = 'icon';
      arrow.setAttribute('aria-hidden', 'true');
      arrow.innerHTML = '<use href="#i-arrow"></use>';
      if (selected.internal) {
        curiosityLink.removeAttribute('target');
        curiosityLink.removeAttribute('rel');
      } else {
        curiosityLink.target = '_blank';
        curiosityLink.rel = 'noopener noreferrer';
      }
      requestAnimationFrame(() => curiosityPreview.classList.remove('is-changing'));
    }, reducedMotion.matches ? 0 : 180);
  };

  curiosityTabs.forEach((tab, index) => {
    tab.addEventListener('click', () => showCuriosity(tab.dataset.curiosity));
    tab.addEventListener('keydown', event => {
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      let nextIndex = index;
      if (event.key === 'ArrowDown') nextIndex = (index + 1) % curiosityTabs.length;
      if (event.key === 'ArrowUp') nextIndex = (index - 1 + curiosityTabs.length) % curiosityTabs.length;
      if (event.key === 'Home') nextIndex = 0;
      if (event.key === 'End') nextIndex = curiosityTabs.length - 1;
      const nextTab = curiosityTabs[nextIndex];
      nextTab.focus();
      showCuriosity(nextTab.dataset.curiosity);
    });
  });

  document.querySelectorAll('[data-story]').forEach(button => {
    const dialog = document.getElementById(button.dataset.story);
    button.addEventListener('click', () => {
      dialog.showModal();
      dialog.scrollTop = 0;
      document.body.classList.add('dialog-open');
    });
    dialog.querySelector('.close-dialog').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    });
    dialog.addEventListener('close', () => {
      document.body.classList.remove('dialog-open');
      button.focus({ preventScroll: true });
    });
  });

  const thoughts = [
    { text: 'A marketplace starts with people.\nNot a marketplace.', source: 'FROM BOOKCHANGE' },
    { text: 'Factory tools need\na clear next step.', source: 'FROM DEEPINSPECT' },
    { text: 'The most useful feedback?\nUsing it again tomorrow.', source: 'FROM MY FITNESS TRACKER' }
  ];
  let thoughtIndex = 0;
  const thoughtText = document.querySelector('#thought-text');
  const thoughtSource = document.querySelector('#thought-source');
  thoughtText.style.whiteSpace = 'pre-line';
  document.querySelector('#next-thought').addEventListener('click', () => {
    thoughtIndex = (thoughtIndex + 1) % thoughts.length;
    thoughtText.textContent = thoughts[thoughtIndex].text;
    thoughtSource.textContent = thoughts[thoughtIndex].source;
    const content = thoughtText.parentElement;
    content.classList.remove('thought-change');
    requestAnimationFrame(() => requestAnimationFrame(() => content.classList.add('thought-change')));
  });
})();
