const worksheets = [
  { title: 'Curriculum Overview', file: 'assets/curriculum1.txt' },
  { title: 'CP0507 - Motors and microcontrollers', file: 'assets/CP0507 - Motors and microconrtollers.txt' },
  { title: 'CP1972 - Sensors and microcontrollers', file: 'assets/CP1972 - Sensors and microcontrollers.txt' },
  { title: 'CP4436 - PC and web interfacing', file: 'assets/CP4436 - PC and web interfacing.txt' }
];

const listEl = document.getElementById('worksheet-list');
const titleEl = document.getElementById('worksheet-title');
const contentEl = document.getElementById('worksheet-content');

function renderList() {
  worksheets.forEach((w, idx) => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.className = 'worksheet-btn';
    btn.textContent = w.title;
    btn.addEventListener('click', () => loadWorksheet(idx));
    li.appendChild(btn);
    listEl.appendChild(li);
  });
}

async function loadWorksheet(index) {
  const w = worksheets[index];
  titleEl.textContent = w.title;
  contentEl.textContent = 'Loading...';
  try {
    const res = await fetch(w.file);
    const text = await res.text();
    contentEl.textContent = text;
  } catch (err) {
    contentEl.textContent = 'Failed to load worksheet.';
  }
}

renderList();
