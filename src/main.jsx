import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Archive, ChevronDown, Download, FileUp, Minus, MoreHorizontal, Plus, Shuffle, Sparkles, Trash2, Users, X } from 'lucide-react';
import './styles.css';

const STORAGE_KEY = 'groupwise-state-v1';
const uid = () => crypto.randomUUID();
const initialState = () => ({ classes: [{ id: uid(), name: 'My Class', students: [] }], activeId: null, results: null });
const parseNames = value => value.split('\n').map(name => name.trim()).filter(Boolean);
const shuffle = values => { const items = [...values]; for (let i = items.length - 1; i > 0; i -= 1) { const j = Math.floor(Math.random() * (i + 1)); [items[i], items[j]] = [items[j], items[i]]; } return items; };

function loadState() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || initialState(); } catch { return initialState(); } }
function App() {
  const [state, setState] = useState(loadState);
  const [groupCount, setGroupCount] = useState(3);
  const [notice, setNotice] = useState('');
  const [dialog, setDialog] = useState(null);
  const importRef = useRef(null);
  const current = state.classes.find(item => item.id === state.activeId) || state.classes[0];
  const students = current?.students || [];
  const maxGroups = Math.floor(students.length / 2);
  const groupHint = !students.length ? 'Add students to get started.' : groupCount > maxGroups ? 'Choose fewer groups to avoid a group of one.' : `Each group will have ${Math.floor(students.length / groupCount)}–${Math.ceil(students.length / groupCount)} students.`;

  useEffect(() => { if (!state.activeId && state.classes[0]) setState(prev => ({ ...prev, activeId: prev.classes[0].id })); }, [state.activeId, state.classes]);
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }, [state]);
  useEffect(() => { if (groupCount > Math.max(1, students.length)) setGroupCount(Math.max(1, students.length)); }, [students.length, groupCount]);

  const updateCurrent = studentsNext => setState(prev => ({ ...prev, results: null, classes: prev.classes.map(item => item.id === current.id ? { ...item, students: studentsNext } : item) }));
  const randomize = () => {
    if (!students.length) return setNotice('Add at least two students before randomizing.');
    if (!Number.isInteger(groupCount) || groupCount < 1 || groupCount > maxGroups) return setNotice(`Use between 1 and ${maxGroups} groups for ${students.length} students.`);
    const groups = Array.from({ length: groupCount }, () => []); shuffle(students).forEach((student, index) => groups[index % groupCount].push(student));
    setNotice(''); setState(prev => ({ ...prev, results: { classId: current.id, groups } }));
  };
  const addClass = name => { const item = { id: uid(), name, students: [] }; setState(prev => ({ ...prev, classes: [...prev.classes, item], activeId: item.id, results: null })); };
  const renameClass = name => { setState(prev => ({ ...prev, classes: prev.classes.map(item => item.id === current.id ? { ...item, name } : item) })); };
  const deleteClass = () => { if (state.classes.length === 1) return; const index = state.classes.findIndex(item => item.id === current.id); const classes = state.classes.filter(item => item.id !== current.id); setState(prev => ({ ...prev, classes, activeId: classes[Math.max(0, index - 1)].id, results: null })); };
  const exportBackup = () => { const blob = new Blob([JSON.stringify({ app: 'groupwise', version: 1, classes: state.classes }, null, 2)], { type: 'application/json' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'groupwise-backup.json'; link.click(); URL.revokeObjectURL(link.href); };
  const importBackup = async event => { const file = event.target.files?.[0]; if (!file) return; try { const data = JSON.parse(await file.text()); if (!Array.isArray(data.classes) || !data.classes.length || data.classes.some(item => typeof item.name !== 'string' || !Array.isArray(item.students))) throw Error(); const classes = data.classes.map(item => ({ id: item.id || uid(), name: item.name.trim() || 'Untitled class', students: item.students.map(String).map(name => name.trim()).filter(Boolean) })); setState({ classes, activeId: classes[0].id, results: null }); setNotice('Backup imported successfully.'); } catch { setNotice('That backup could not be imported. Please choose a Groupwise JSON backup.'); } event.target.value = ''; };
  const result = state.results?.classId === current.id ? state.results.groups : null;
  return <>
    <header className="topbar"><a className="brand" href="/"><span className="brand-mark"><Sparkles size={18} /></span>Groupwise</a><div className="top-actions"><button className="button button-ghost" onClick={() => importRef.current?.click()}><FileUp size={15} /> Import</button><button className="button button-ghost" onClick={exportBackup}><Download size={15} /> Export</button><input ref={importRef} onChange={importBackup} type="file" accept="application/json" hidden /></div></header>
    <main className="app-shell">
      <section className="hero"><div><p className="eyebrow">CLASSROOM TOOL <span className="eyebrow-dot" /></p><h1>Make groups,<br /><em>make learning happen.</em></h1><p className="hero-copy">A calmer way to create balanced groups in seconds. Your class lists stay private in this browser.</p></div><div className="hero-decoration" aria-hidden="true"><Sparkles /><span>✦</span></div></section>
      <section className="workspace-grid">
        <aside className="panel roster-panel"><PanelHeading eyebrow="YOUR CLASSES" title="Class lists"><button className="icon-button" onClick={() => setDialog({ mode: 'add', name: '' })} aria-label="Add class"><Plus size={18} /></button></PanelHeading><div className="class-list">{state.classes.map(item => <button className={`class-item ${item.id === current.id ? 'active' : ''}`} key={item.id} onClick={() => setState(prev => ({ ...prev, activeId: item.id, results: null }))}><span>{item.name}</span><small>{item.students.length}</small></button>)}</div><div className="panel-footer"><button className="text-button" onClick={() => setDialog({ mode: 'edit', name: current.name })}>Manage current class <span>→</span></button></div></aside>
        <section className="panel students-panel"><PanelHeading eyebrow="CURRENT CLASS" title={current.name}><button className="icon-button" onClick={() => setDialog({ mode: 'edit', name: current.name })} aria-label="Manage current class"><MoreHorizontal size={18} /></button></PanelHeading><div className="student-summary"><strong><Users size={14} /> {students.length} student{students.length === 1 ? '' : 's'}</strong><span>·</span><span>{result ? 'Groups created' : 'Ready to randomize'}</span></div><div className="roster-input-wrap"><label htmlFor="roster-input">Student names</label><textarea id="roster-input" rows="9" value={students.join('\n')} onChange={event => updateCurrent(parseNames(event.target.value))} placeholder="Add one student per line…" spellCheck="false" /><p className="field-hint">One name per line · changes save automatically</p></div><div className="student-actions"><button className="button button-soft" onClick={() => { if (!students.length || window.confirm('Clear the entire student list?')) updateCurrent([]); }}>Clear list</button><button className="button button-dark" onClick={() => { const present = window.prompt('Paste the names of students who are present, one per line.'); if (present !== null) { const keep = new Set(parseNames(present).map(name => name.toLowerCase())); updateCurrent(students.filter(name => keep.has(name.toLowerCase()))); setNotice('Absent students were removed.'); } }}>Remove absent</button></div></section>
        <section className="panel randomize-panel"><PanelHeading eyebrow="GROUP SETTINGS" title="Randomize"><span className="sparkle"><Sparkles size={21} /></span></PanelHeading><div className="setting"><label htmlFor="group-count">Number of groups</label><div className="number-control"><button onClick={() => setGroupCount(value => Math.max(1, value - 1))} aria-label="Decrease group count"><Minus size={17} /></button><input id="group-count" type="number" min="1" max={Math.max(1, maxGroups)} value={groupCount} onChange={event => setGroupCount(Number(event.target.value) || 1)} /><button onClick={() => setGroupCount(value => value + 1)} aria-label="Increase group count"><Plus size={17} /></button></div></div><p className="setting-note">{groupHint}</p><button className="button button-primary randomize-button" onClick={randomize}><Shuffle size={16} /> Randomize groups</button><p className="privacy-note"><Archive size={13} /> Saved locally in your browser</p></section>
      </section>
      <section className="results-section"><div className="results-heading"><div><p className="section-kicker">YOUR RESULTS</p><h2>{result ? `${result.length} balanced groups` : 'Groups are waiting'}</h2></div>{result && <button className="button button-soft" onClick={() => setState(prev => ({ ...prev, results: null }))}>Clear results</button>}</div><div className="message" role="status" aria-live="polite">{notice}</div>{result ? <div className="groups-grid">{result.map((group, index) => <article className="group-card" key={index}><div className="group-card-top"><h3>Group {String(index + 1).padStart(2, '0')}</h3><span>{group.length}</span></div><ol>{group.map(name => <li key={name}>{name}</li>)}</ol></article>)}</div> : <div className="empty-results"><Sparkles size={24} /><p>Your randomized groups will appear here.</p><small>Add students above, choose a group count, and begin.</small></div>}</section>
      <footer><span>Groupwise</span><span>Made for focused classrooms · Data stays on this device</span></footer>
    </main>
    {dialog && <ClassDialog dialog={dialog} onClose={() => setDialog(null)} onSave={name => { dialog.mode === 'add' ? addClass(name) : renameClass(name); setDialog(null); }} onDelete={() => { deleteClass(); setDialog(null); }} canDelete={state.classes.length > 1} />}
  </>;
}
function PanelHeading({ eyebrow, title, children }) { return <div className="panel-heading"><div><p className="section-kicker">{eyebrow}</p><h2>{title}</h2></div>{children}</div>; }
function ClassDialog({ dialog, onClose, onSave, onDelete, canDelete }) { const [name, setName] = useState(dialog.name); return <div className="modal-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose()}><form className="class-dialog" onSubmit={event => { event.preventDefault(); if (name.trim()) onSave(name.trim()); }}><button className="close-dialog" type="button" onClick={onClose} aria-label="Close"><X size={17} /></button><p className="section-kicker">CLASS SETUP</p><h2>{dialog.mode === 'add' ? 'Add a class' : 'Manage class'}</h2><label htmlFor="class-name">Class name</label><input id="class-name" autoFocus value={name} onChange={event => setName(event.target.value)} maxLength="50" placeholder="e.g. Science · Period 2" /><div className="dialog-actions">{dialog.mode === 'edit' && canDelete && <button className="button button-danger" type="button" onClick={onDelete}><Trash2 size={15} /> Delete</button>}<span /><button className="button button-soft" type="button" onClick={onClose}>Cancel</button><button className="button button-dark" type="submit">Save class</button></div></form></div>; }

createRoot(document.getElementById('root')).render(<App />);
