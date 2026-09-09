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

  const workflow = document.querySelector('#workflow');
  const workflowButtons = [...document.querySelectorAll('[data-workflow]')];
  workflowButtons.forEach(button => button.addEventListener('click', () => {
    const before = button.dataset.workflow === 'before';
    workflowButtons.forEach(item => {
      const selected = item === button;
      item.classList.toggle('active', selected);
      item.setAttribute('aria-pressed', String(selected));
    });
    workflow.classList.toggle('before', before);
    workflow.querySelector('.small-label').textContent = before ? 'TOOLS WITHOUT A SEQUENCE' : 'A GUIDED SEQUENCE';
    workflow.querySelector('strong').textContent = before ? 'Figure out the next step.' : 'Know what to do next.';
    workflow.querySelector('.workflow-copy p').textContent = before
      ? 'An image and a set of tools. The operator works out the order and finds the mistakes.'
      : 'Prepare the image. Get feedback. Check the result. Go back when needed.';
    workflow.querySelector('.workflow-footer span:nth-child(2)').textContent = before ? 'The sequence is up to the operator' : 'Guidance at each step';
    workflow.querySelector('.workflow-check').textContent = before ? '?' : '\u2713';
  }));

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
