import { initField } from './field.js';
import { cases } from './cases.js';

const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
const escape = (value) => String(value).replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const field = initField($('#ghost-field'));
$('#year').textContent = new Date().getFullYear();

// A single motion control also follows changes to the operating system preference.
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
let motionActive = !reduced.matches;
function updateMotion(active) {
  motionActive = active;
  const control = $('#motion-toggle');
  control.setAttribute('aria-pressed', String(!active));
  control.setAttribute('aria-label', `${active ? 'Pause' : 'Resume'} ambient motion`);
  $('.motion-label', control).textContent = active ? 'Motion on' : 'Motion off';
  $('.pause-icon', control).textContent = active ? 'Ⅱ' : '▷';
  window.dispatchEvent(new CustomEvent('ghosthand-motion', { detail: { active } }));
}
updateMotion(motionActive);
$('#motion-toggle').addEventListener('click', () => updateMotion(!motionActive));
reduced.addEventListener('change', event => updateMotion(!event.matches));
$('#field-mode').addEventListener('click', () => {
  const active = $('#field-mode').getAttribute('aria-pressed') !== 'true';
  $('#field-mode').setAttribute('aria-pressed',String(active));
  $('#field-mode').innerHTML = `${active ? 'Field amplified' : 'Disturb the field'} <span>↗</span>`;
  $('.hero-stage').classList.toggle('amplified',active);
  window.dispatchEvent(new CustomEvent('ghosthand-energy',{detail:{active}}));
});

const menuToggle = $('.menu-toggle');
const mobileNav = $('#mobile-nav');
function closeMenu() { menuToggle.setAttribute('aria-expanded','false'); menuToggle.setAttribute('aria-label','Open navigation'); mobileNav.hidden = true; }
menuToggle.addEventListener('click', () => {
  const open = menuToggle.getAttribute('aria-expanded') !== 'true';
  menuToggle.setAttribute('aria-expanded',String(open));
  menuToggle.setAttribute('aria-label',open ? 'Close navigation' : 'Open navigation');
  mobileNav.hidden = !open;
});
$$('a,button',mobileNav).forEach(item => item.addEventListener('click',closeMenu));
window.matchMedia('(min-width: 761px)').addEventListener('change', closeMenu);
document.addEventListener('keydown',event => { if(event.key === 'Escape') closeMenu(); });

// Filtering keeps the original project order and native keyboard behavior.
$$('[data-filter]').forEach(button => button.addEventListener('click', () => {
  const filter = button.dataset.filter;
  $$('[data-filter]').forEach(item => item.setAttribute('aria-pressed',String(item === button)));
  $$('.project').forEach(project => { project.hidden = filter !== 'all' && project.dataset.category !== filter; });
  $('#work-grid').classList.toggle('filtered',filter !== 'all');
}));

const caseDialog = $('#case-dialog');
const inquiryDialog = $('#inquiry-dialog');
let lastFocus;
function openDialog(dialog) {
  if (!document.querySelector('dialog[open]')) lastFocus = document.activeElement;
  $$('dialog[open]').forEach(open => open.close());
  dialog.showModal();
  dialog.scrollTop = 0;
  document.body.classList.add('dialog-open');
  $('.dialog-close',dialog).focus({preventScroll:true});
}
$$('dialog').forEach(dialog => {
  $('.dialog-close',dialog).addEventListener('click', () => dialog.close());
  dialog.addEventListener('click',event => {
    if(event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if(event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
  dialog.addEventListener('close',() => {
    if(!document.querySelector('dialog[open]')) {
      document.body.classList.remove('dialog-open');
      if(lastFocus?.isConnected) lastFocus.focus({preventScroll:true});
    }
  });
});

function openInquiry() { closeMenu(); openDialog(inquiryDialog); }
$$('[data-inquiry]').forEach(button => button.addEventListener('click',openInquiry));
$$('[data-case]').forEach(button => button.addEventListener('click',() => {
  const item = cases.find(entry => entry.id === button.dataset.case);
  if(!item) return;
  $('#case-content').className = 'case-content';
  $('#case-content').innerHTML = `<div class="case-kicker eyebrow">${escape(item.number)} / ${escape(item.status)}</div><h2 id="case-title">${escape(item.name)}</h2><p class="case-summary">${escape(item.title)}</p><div class="case-tags">${item.disciplines.map(tag => `<span>${escape(tag)}</span>`).join('')}</div><div class="case-section"><h3>THE CHALLENGE</h3><p>${escape(item.context)}</p></div><div class="case-section"><h3>THE APPROACH</h3><p>${escape(item.approach)}</p></div><div class="case-section"><h3>THE INTENT</h3><p>${escape(item.outcome)}</p></div><p class="case-attribution">${escape(item.note)}</p><button class="text-link" id="case-inquiry">Have a challenge like this? <span>↗</span></button>`;
  caseDialog.setAttribute('aria-labelledby','case-title');
  $('#case-inquiry').addEventListener('click',openInquiry);
  openDialog(caseDialog);
}));
inquiryDialog.setAttribute('aria-label','Start a project brief');

// Brief creation is local. The result is reviewable and never claims delivery.
const form = $('#brief-form');
let projectBrief = '';
form.addEventListener('submit', event => {
  event.preventDefault();
  if(!form.reportValidity()) return;
  const values = new FormData(form);
  const name = String(values.get('name')).trim();
  const email = String(values.get('email')).trim();
  const ambition = String(values.get('ambition')).trim();
  if(!name || !ambition) {
    const input = !name ? form.elements.name : form.elements.ambition;
    input.setCustomValidity('A little context helps. Please add your thoughts.');
    input.reportValidity();
    input.addEventListener('input',() => input.setCustomValidity(''),{once:true});
    return;
  }
  projectBrief = `GHOSTHAND STUDIO — PROJECT BRIEF\n\nFrom: ${name}\nEmail: ${email}\n\nInterested in: ${values.getAll('scope').join(', ') || 'Let’s figure it out together'}\n\nTHE AMBITION\n${ambition}\n\nFor Chris Kyser + Jesse Gawlik\nghosthand.studio`;
  $('#brief-preview').textContent = projectBrief;
  $('#email-brief').href = `mailto:hello@ghosthand.studio?subject=${encodeURIComponent(`A possibility worth exploring — ${name}`)}&body=${encodeURIComponent(projectBrief)}`;
  form.hidden = true;
  $('#brief-result').hidden = false;
  $('#copy-brief').focus({preventScroll:true});
});
$('#edit-brief').addEventListener('click',() => {
  $('#brief-result').hidden = true;
  form.hidden = false;
  form.elements.name.focus({preventScroll:true});
});
$('#copy-brief').addEventListener('click',async () => {
  try {
    await navigator.clipboard.writeText(projectBrief);
    $('#brief-status').textContent = 'Copied. Ready to share.';
  } catch {
    $('#brief-status').textContent = 'Select the brief text to copy it, or use Download .txt.';
    const range = document.createRange();
    range.selectNodeContents($('#brief-preview'));
    const selection = window.getSelection();
    selection.removeAllRanges(); selection.addRange(range);
  }
});
$('#download-brief').addEventListener('click',() => {
  const url = URL.createObjectURL(new Blob([projectBrief],{type:'text/plain;charset=utf-8'}));
  const link = document.createElement('a');
  link.href = url; link.download = 'ghosthand-project-brief.txt';
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url),1000);
  $('#brief-status').textContent = 'Your brief is ready to share.';
});

window.addEventListener('pagehide',event => { if (!event.persisted) field?.destroy(); });
