// Mobile navigation toggle. The nav stays visible if this script never runs.
const button = document.querySelector('.menu-toggle');
const nav = document.getElementById('site-nav');

if (button && nav) {
  const setOpen = (open) => button.setAttribute('aria-expanded', String(open));
  button.hidden = false;
  button.addEventListener('click', () => setOpen(button.getAttribute('aria-expanded') !== 'true'));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && button.getAttribute('aria-expanded') === 'true') {
      setOpen(false);
      button.focus();
    }
  });
}
