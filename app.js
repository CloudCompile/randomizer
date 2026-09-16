const STORAGE_KEY = 'groupwise-state-v1';
const $ = (selector) => document.querySelector(selector);

const defaultState = () => ({ classes: [{ id: crypto.randomUUID(), name: 'My Class', students: [] }], activeId: null, results: null });
let state = loadState();
if (!state.classes?.length) state = defaultState();
if (!state.activeId || !state.classes.some(c => c.id === state.activeId)) state.activeId = state.classes[0].id;
let editingClassId = null;

function loadState() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || defaultState(); } catch { return defaultState(); } }
function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function activeClass() { return state.classes.find(c => c.id === state.activeId); }
function namesFromText(value) { return value.split('\n').map(name => name.trim()).filter(Boolean); }
function setMessage(text = '') { $('#message').textContent = text; }
function render() {
  const current = activeClass();
  $('#class-title').textContent = current.name;
  $('#roster-input').value = current.students.join('\n');
  $('#student-count').textContent = `${current.students.length} student${current.students.length === 1 ? '' : 's'}`;
  $('#class-list').innerHTML = state.classes.map(cls => `<button class="class-item ${cls.id === state.activeId ? 'active' : ''}" data-class-id="${cls.id}" type="button"><span>${escapeHtml(cls.name)}</span><small>${cls.students.length}</small></button>`).join('');
  $('#group-count').max = Math.max(1, current.students.length);
  updateSettingNote();
  if (state.results?.classId === current.id) renderGroups(state.results.groups); else clearGroups(false);
}
function escapeHtml(value) { return value.replace(/[&<>'"]/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[character])); }
function updateSettingNote() {
  const count = Number($('#group-count').value) || 1;
  const students = activeClass().students.length;
  if (!students) $('#setting-note').textContent = 'Add students to get started.';
  else if (count > students || Math.floor(students / count) < 2) $('#setting-note').textContent = 'Choose fewer groups to avoid a group of one.';
  else $('#setting-note').textContent = `Each group will have ${Math.floor(students / count)}–${Math.ceil(students / count)} students.`;
}
function openClassDialog(id = null) { editingClassId = id; $('#dialog-title').textContent = id ? 'Rename class' : 'Add a class'; $('#class-name').value = id ? activeClass().name : ''; $('#delete-class').hidden = !id || state.classes.length === 1; $('#class-dialog').showModal(); $('#class-name').focus(); }
function closeDialog() { $('#class-dialog').close(); editingClassId = null; }

$('#roster-input').addEventListener('input', event => { activeClass().students = namesFromText(event.target.value); state.results = null; saveState(); render(); });
$('#class-list').addEventListener('click', event => { const button = event.target.closest('[data-class-id]'); if (!button) return; state.activeId = button.dataset.classId; state.results = null; saveState(); render(); });
$('#add-class').addEventListener('click', () => openClassDialog());
$('#edit-class').addEventListener('click', () => openClassDialog(state.activeId));
$('#manage-class').addEventListener('click', () => openClassDialog(state.activeId));
$('#class-form').addEventListener('submit', event => {
  event.preventDefault(); const name = $('#class-name').value.trim(); if (!name) return;
  if (editingClassId) activeClass().name = name; else { const cls = { id: crypto.randomUUID(), name, students: [] }; state.classes.push(cls); state.activeId = cls.id; }
  saveState(); closeDialog(); render();
});
$('#delete-class').addEventListener('click', () => { if (!editingClassId || state.classes.length === 1 || !confirm(`Delete ${activeClass().name}?`)) return; const index = state.classes.findIndex(cls => cls.id === editingClassId); state.classes.splice(index, 1); state.activeId = state.classes[Math.max(0, index - 1)].id; state.results = null; saveState(); closeDialog(); render(); });
$('#clear-roster').addEventListener('click', () => { if (!activeClass().students.length || confirm('Clear the entire student list?')) { activeClass().students = []; state.results = null; saveState(); render(); } });
$('#remove-absent').addEventListener('click', () => { const present = prompt('Paste the names of students who are present, one per line.'); if (present === null) return; const keep = new Set(namesFromText(present).map(name => name.toLowerCase())); activeClass().students = activeClass().students.filter(name => keep.has(name.toLowerCase())); state.results = null; saveState(); render(); setMessage('Absent students were removed from this list.'); });

$('.number-control').addEventListener('click', event => { const button = event.target.closest('[data-step]'); if (!button) return; const input = $('#group-count'); input.value = Math.max(1, Number(input.value || 1) + Number(button.dataset.step)); updateSettingNote(); });
$('#group-count').addEventListener('input', updateSettingNote);
$('#randomize').addEventListener('click', () => {
  const students = [...activeClass().students]; const count = Number($('#group-count').value);
  if (!students.length) return setMessage('Add at least two students before randomizing.');
  if (!Number.isInteger(count) || count < 1 || count > students.length || Math.floor(students.length / count) < 2) return setMessage(`Use between 1 and ${Math.floor(students.length / 2)} groups for ${students.length} students.`);
  for (let i = students.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [students[i], students[j]] = [students[j], students[i]]; }
  const groups = Array.from({ length: count }, () => []); students.forEach((student, index) => groups[index % count].push(student));
  state.results = { classId: state.activeId, groups }; saveState(); setMessage(''); renderGroups(groups);
});
function renderGroups(groups) { $('#results-title').textContent = `${groups.length} balanced group${groups.length === 1 ? '' : 's'}`; $('#groups-grid').innerHTML = groups.map((group, i) => `<article class="group-card"><h3>Group ${String(i + 1).padStart(2, '0')}</h3><ol>${group.map(name => `<li>${escapeHtml(name)}</li>`).join('')}</ol></article>`).join(''); }
function clearGroups(resetTitle = true) { if (resetTitle) $('#results-title').textContent = 'Groups are waiting'; $('#groups-grid').innerHTML = '<div class="empty-results"><span>✦</span><p>Your randomized groups will appear here.</p><small>Add students and choose your group count to begin.</small></div>'; }
$('#clear-results').addEventListener('click', () => { state.results = null; saveState(); clearGroups(); });

$('#export-button').addEventListener('click', () => { const blob = new Blob([JSON.stringify({ app: 'groupwise', version: 1, classes: state.classes }, null, 2)], { type: 'application/json' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'groupwise-backup.json'; link.click(); URL.revokeObjectURL(link.href); });
$('#import-button').addEventListener('click', () => $('#import-file').click());
$('#import-file').addEventListener('change', async event => { const file = event.target.files[0]; if (!file) return; try { const data = JSON.parse(await file.text()); if (!Array.isArray(data.classes) || !data.classes.length || data.classes.some(c => typeof c.name !== 'string' || !Array.isArray(c.students))) throw new Error(); state.classes = data.classes.map(c => ({ id: c.id || crypto.randomUUID(), name: c.name.trim() || 'Untitled class', students: c.students.map(String).map(s => s.trim()).filter(Boolean) })); state.activeId = state.classes[0].id; state.results = null; saveState(); render(); setMessage('Backup imported successfully.'); } catch { setMessage('That backup file could not be imported.'); } event.target.value = ''; });
render();
