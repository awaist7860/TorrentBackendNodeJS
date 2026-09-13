const sidebar = document.querySelector('#sidebar');
const menuToggle = document.querySelector('#menuToggle');
const backToTop = document.querySelector('#backToTop');
const searchInput = document.querySelector('#searchInput');
const navLinks = [...document.querySelectorAll('.nav a')];
const sections = [...document.querySelectorAll('.section')];

menuToggle.addEventListener('click', () => sidebar.classList.toggle('open'));
navLinks.forEach((link) => link.addEventListener('click', () => sidebar.classList.remove('open')));

for (const pre of document.querySelectorAll('pre')) {
  const button = document.createElement('button');
  button.className = 'copy-btn';
  button.textContent = 'Copy';
  button.addEventListener('click', async () => {
    const code = pre.querySelector('code')?.innerText ?? '';
    await navigator.clipboard.writeText(code);
    button.textContent = 'Copied';
    setTimeout(() => (button.textContent = 'Copy'), 1400);
  });
  pre.appendChild(button);
}

const observer = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    navLinks.forEach((link) => link.classList.toggle('active', link.getAttribute('href') === `#${entry.target.id}`));
  }
}, { rootMargin: '-40% 0px -55% 0px', threshold: 0 });
sections.forEach((section) => observer.observe(section));

window.addEventListener('scroll', () => {
  backToTop.style.display = window.scrollY > 700 ? 'block' : 'none';
});
backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

searchInput.addEventListener('input', () => {
  const query = searchInput.value.trim().toLowerCase();
  sections.forEach((section) => {
    const match = !query || section.innerText.toLowerCase().includes(query);
    section.classList.toggle('hidden', !match);
  });
  navLinks.forEach((link) => {
    const target = document.querySelector(link.getAttribute('href'));
    link.classList.toggle('hidden', target?.classList.contains('hidden'));
  });
});
