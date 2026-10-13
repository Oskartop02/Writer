import { useEffect, useState } from 'react'
import './App.css'
import { chatWithOllama } from './ai/ollama'

type View = 'setup' | 'writer' | 'plan' | 'characters' | 'places' | 'threads' | 'notes' | 'export'

type ProjectBundle = {
  format: 'writer-project'
  version: 1
  exportedAt: string
  project: { title: string; draft: string }
  library: LibraryData
}

type LibraryCategory = 'characters' | 'places' | 'threads' | 'notes'
type LibraryItem = [name: string, detail: string, icon: string]
type LibraryData = Record<LibraryCategory, LibraryItem[]>
type AssistantMessage = { role: 'user' | 'assistant'; text: string }

type LocalProject = {
  version: 1
  title: string
  draft: string
  library: LibraryData
}

const localProjectKey = 'writer.local-project.v1'

const initialDraft = `Mara obudziła się, zanim uderzył pierwszy dzwon.

Przez chwilę nie wiedziała, czy szary prostokąt nad jej głową jest oknem, czy tylko wspomnieniem okna. W powietrzu wisiał zapach mokrego żelaza i morza.

Na nabrzeżu ktoś przesunął skrzynię. Dźwięk przeszedł przez deski jak ostrzeżenie. Mara usiadła i odnalazła pod językiem smak soli, choć od trzech dni nie widziała wody.

To było pierwsze, co pomyślała: morze wróciło po nią.`

const initialLibrary: LibraryData = {
  characters: [['Mara Vey', 'Bohaterka', 'M'], ['Elias Rook', 'Kartograf', 'E'], ['Ilya Sen', 'Strażniczka portu', 'I']],
  places: [['Port Veyr', 'Wybrzeże północne', '⌂'], ['Dom pod latarnią', 'Dzielnica nabrzeżna', '⌂'], ['Białe mokradła', 'Poza mapą', '⌂']],
  threads: [['Morze wraca po bohaterkę', 'Otwarty wątek', '↗'], ['List bez adresu', 'Do rozwinięcia', '↗'], ['Światło pod lodem', 'Zapisany pomysł', '↗']],
  notes: [['Zapach mokrego żelaza', 'Detal do sceny', '·'], ['Mara nie ufa mapom', 'Charakterystyka', '·'], ['Nie wyjaśniać morza zbyt wcześnie', 'Zasada opowieści', '·']],
} as const

const readLocalProject = (): LocalProject | null => {
  try {
    const rawProject = localStorage.getItem(localProjectKey)
    if (!rawProject) return null
    const project = JSON.parse(rawProject) as Partial<LocalProject>
    if (project.version !== 1 || typeof project.title !== 'string' || typeof project.draft !== 'string' || !project.library) return null
    return project as LocalProject
  } catch {
    return null
  }
}

function App() {
  const savedProject = readLocalProject()
  const [view, setView] = useState<View>('setup')
  const [draft, setDraft] = useState(savedProject?.draft ?? initialDraft)
  const [title, setTitle] = useState(savedProject?.title ?? 'Bez tytułu')
  const [focusMode, setFocusMode] = useState(false)
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [assistantInput, setAssistantInput] = useState('')
  const [assistantMessages, setAssistantMessages] = useState<AssistantMessage[]>([
    { role: 'assistant', text: 'Jestem przy Twojej historii. Możesz zapytać o scenę, opis albo pomysł na dalszy ciąg.' },
  ])
  const [assistantBusy, setAssistantBusy] = useState(false)
  const [saved, setSaved] = useState(true)
  const [library, setLibrary] = useState<LibraryData>(savedProject?.library ?? initialLibrary)
  useEffect(() => {
    const saveTimer = window.setTimeout(() => {
      const project: LocalProject = { version: 1, title, draft, library }
      localStorage.setItem(localProjectKey, JSON.stringify(project))
      setSaved(true)
    }, 350)
    return () => window.clearTimeout(saveTimer)
  }, [draft, library, title])
  const showView = (nextView: View) => { setView(nextView); setFocusMode(false) }
  const sendAssistantMessage = async () => {
    const message = assistantInput.trim()
    if (!message || assistantBusy) return
    const nextMessages = [...assistantMessages, { role: 'user' as const, text: message }]
    setAssistantMessages(nextMessages)
    setAssistantInput('')
    setAssistantBusy(true)
    try {
      const editor = document.querySelector<HTMLTextAreaElement>('.continuous-editor')
      const selectedText = editor && editor.selectionStart !== editor.selectionEnd ? editor.value.slice(editor.selectionStart, editor.selectionEnd) : ''
      const projectContext = [
        `Tytuł projektu: ${title || 'Bez tytułu'}`,
        `Bieżący tryb: ${view}`,
        `Tekst roboczy:\n${draft}`,
        `Zaznaczony fragment do pracy:\n${selectedText || '(brak zaznaczenia; pracuj na bieżącym tekście)'}`,
        `Biblioteka świata:\n${Object.entries(library).map(([category, items]) => `${category}: ${items.map(([name, detail]) => `${name} (${detail})`).join('; ')}`).join('\n')}`,
      ].join('\n\n')
      const systemMessage = `Jesteś aktywnym współautorem i redaktorem projektu Writer. Masz wgląd w cały kontekst poniżej. Odpowiadaj w języku ostatniej wiadomości użytkownika: po polsku albo po angielsku. Odpowiadaj konkretnie i bez serii pytań. Używaj czytelnego Markdown: krótkie nagłówki, listy numerowane i **pogrubienia** dla najważniejszych elementów. Jeśli użytkownik mówi, że się zablokował, od razu zaproponuj 3 różne kierunki dalszej sceny, każdy z krótką konsekwencją fabularną, oraz wskaż rekomendowany. Jeśli prosi o opis, napisz gotowy przykładowy fragment zamiast pytać o dziesięć szczegółów. Jeśli istnieje zaznaczony fragment, pracuj przede wszystkim na nim. Jeśli analizujesz kontinuum, odwołuj się do konkretnych faktów z kontekstu. Możesz zadać najwyżej jedno pytanie i tylko wtedy, gdy bez niego nie da się sensownie ruszyć. Nie przedstawiaj wymysłów jako istniejących faktów kanonu.\n\nKONTEKST PROJEKTU:\n${projectContext}`
      const response = await chatWithOllama([{ role: 'system', content: systemMessage }, ...nextMessages.map(({ role, text }) => ({ role, content: text }))])
      setAssistantMessages((messages) => [...messages, { role: 'assistant', text: normalizeAssistantResponse(response) }])
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Nie udało się połączyć z lokalnym modelem.'
      setAssistantMessages((messages) => [...messages, { role: 'assistant', text: `Nie mogę teraz odpowiedzieć. ${reason} Uruchom Ollamę, aby włączyć rozmowę lokalną.` }])
    } finally {
      setAssistantBusy(false)
    }
  }
  const suggestAssistantPrompt = (prompt: string) => setAssistantInput(prompt)

  return <main className={`app-shell ${focusMode ? 'focus-mode' : ''}`}>
    {!focusMode && <header className="topbar"><button className="brand-mark" type="button" onClick={() => showView('setup')}><span className="brand-symbol">W</span><span>Writer</span></button><div className="book-title"><span>Projekt</span><input value={title} onChange={(event) => setTitle(event.target.value)} aria-label="Tytuł projektu" /></div><div className="topbar-actions"><span className="save-state"><span className={`save-dot ${saved ? '' : 'unsaved'}`} />{saved ? 'Zapisano lokalnie' : 'Niezapisane zmiany'}</span><button className="plain-icon" type="button" title="Ustawienia">⚙</button><button className="avatar" type="button" title="Profil">O</button></div></header>}
    <div className="app-body">
      {!focusMode && <aside className="navigation"><div className="nav-label">Przestrzeń pracy</div><nav className="main-nav" aria-label="Tryby pracy"><button className={view === 'setup' ? 'active' : ''} type="button" onClick={() => showView('setup')}><span>◇</span><strong>Przygotowanie</strong><small>zacznij tutaj</small></button><button className={view === 'writer' ? 'active' : ''} type="button" onClick={() => showView('writer')}><span>◌</span><strong>Writer</strong><small>ciągłe pisanie</small></button><button className={view === 'plan' ? 'active' : ''} type="button" onClick={() => showView('plan')}><span>☷</span><strong>Plan</strong><small>rozdziały i sceny</small></button></nav><div className="nav-label library-label">Biblioteka powieści</div><nav className="library-nav" aria-label="Biblioteka"><button className={view === 'characters' ? 'active' : ''} type="button" onClick={() => showView('characters')}><span>○</span> Bohaterowie <b>3</b></button><button className={view === 'places' ? 'active' : ''} type="button" onClick={() => showView('places')}><span>⌂</span> Miejsca <b>3</b></button><button className={view === 'threads' ? 'active' : ''} type="button" onClick={() => showView('threads')}><span>↗</span> Wątki <b>3</b></button><button className={view === 'notes' ? 'active' : ''} type="button" onClick={() => showView('notes')}><span>·</span> Notatki <b>3</b></button></nav><div className="nav-bottom"><button type="button" onClick={() => showView('export')}><span>↓</span> Eksportuj książkę</button><small>Tryb lokalny · dane na urządzeniu</small></div></aside>}
      <section className="content-area">{view === 'setup' && <SetupView setView={setView} />}{view === 'writer' && <WriterView draft={draft} updateDraft={(value) => { setDraft(value); setSaved(false) }} focusMode={focusMode} setFocusMode={setFocusMode} setSaved={setSaved} />}{view === 'plan' && <PlanView draft={draft} setView={setView} />}{view === 'export' && <ExportView title={title} draft={draft} library={library} onImport={(nextTitle, nextDraft, nextLibrary) => { setTitle(nextTitle); setDraft(nextDraft); setLibrary(nextLibrary); setSaved(true) }} />}{(view === 'characters' || view === 'places' || view === 'threads' || view === 'notes') && <LibraryView view={view} library={library} onAdd={(category, item) => { setLibrary((current) => ({ ...current, [category]: [...current[category], item] })); setSaved(false) }} />}</section>
      {!focusMode && <aside className={`assistant-drawer ${assistantOpen ? 'open' : ''}`}><button className="assistant-toggle" type="button" onClick={() => setAssistantOpen(!assistantOpen)}><span className="spark">✦</span><span>Asystent</span><span className="toggle-chevron">{assistantOpen ? '›' : '‹'}</span></button>{assistantOpen && <div className="assistant-content"><div className="assistant-heading"><div><span className="eyebrow">Kontekst projektu</span><h2>Jestem obok.</h2></div><button type="button" onClick={() => setAssistantOpen(false)} aria-label="Zamknij asystenta">×</button></div><div className="assistant-tools"><span className="assistant-tools-label">Akcje na tekście</span><button type="button" onClick={() => suggestAssistantPrompt('Sprawdź kontinuum aktualnego fragmentu względem bohaterów, miejsc i wydarzeń.')}>Sprawdź kontinuum</button><button type="button" onClick={() => suggestAssistantPrompt('Rozwiń opis tej sceny, zachowując mój styl i sens.')}>Rozwiń opis</button><button type="button" onClick={() => suggestAssistantPrompt('Popraw interpunkcję i język tego fragmentu bez zmiany mojego stylu.')}>Korekta tekstu</button><button type="button" onClick={() => suggestAssistantPrompt('Przetłumacz zaznaczony fragment na język angielski.')}>Tłumaczenie EN</button></div><div className="assistant-chat">{assistantMessages.map((message, index) => <div className={`chat-message ${message.role}`} key={`${message.role}-${index}`}><span className="chat-label">{message.role === 'assistant' ? 'Asystent' : 'Ty'}</span><p>{message.text}</p></div>)}{assistantBusy && <div className="chat-message assistant"><span className="chat-label">Asystent</span><p>Myślę...</p></div>}</div><div className="assistant-actions"><button type="button" onClick={() => setAssistantInput('Nie wiem, jak opisać tę scenę.')}>Nie mam opisu</button><button type="button" onClick={() => setAssistantInput('Co może wydarzyć się dalej?')}>Zablokowałem się</button></div><div className="assistant-composer"><textarea value={assistantInput} onChange={(event) => setAssistantInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void sendAssistantMessage() } }} placeholder="Napisz do asystenta..." aria-label="Wiadomość do asystenta" /><button type="button" onClick={() => void sendAssistantMessage()} disabled={assistantBusy} aria-label="Wyślij wiadomość">↑</button></div><div className="assistant-note">Lokalna Ollama · model `llama3.2:3b`</div></div>}</aside>}
    </div>
  </main>
}

function normalizeAssistantResponse(response: string) {
  return response
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/^\s*[-*]\s+/gm, '• ')
    .replace(/^\s*(\d+)[.)]\s+/gm, '$1. ')
}

function WriterView({ draft, updateDraft, focusMode, setFocusMode, setSaved }: { draft: string; updateDraft: (value: string) => void; focusMode: boolean; setFocusMode: (value: boolean) => void; setSaved: (value: boolean) => void }) {
  return <div className="writer-view">{!focusMode && <div className="view-header"><div><span className="eyebrow">Tryb ciągłego pisania</span><h1>Writer</h1></div><div className="view-actions"><button type="button" onClick={() => setFocusMode(true)}><span>⛶</span> Skupienie</button><button type="button">···</button></div></div>}<div className={`writing-surface ${focusMode ? 'focused-surface' : ''}`}><div className="writing-meta"><span>Rozdział roboczy</span><span>Ostatnia zmiana przed chwilą</span></div><textarea className="continuous-editor" value={draft} onChange={(event) => updateDraft(event.target.value)} onBlur={() => setSaved(true)} aria-label="Ciągły tekst powieści" /><div className="writing-footer"><span>{draft.split(/\s+/).filter(Boolean).length} słów</span><span className="footer-fill" />{focusMode && <button type="button" onClick={() => setFocusMode(false)}>Zakończ skupienie</button>}<span>⌘ S</span></div></div></div>
}

function SetupView({ setView }: { setView: (view: View) => void }) {
  const steps = [['01', 'Zamysł', 'O czym jest ta historia i dlaczego chcesz ją opowiedzieć?', 'notes'], ['02', 'Bohaterowie', 'Kto niesie opowieść, czego chce i czego się boi?', 'characters'], ['03', 'Świat', 'Gdzie toczy się akcja i jakie zasady nim rządzą?', 'places'], ['04', 'Pierwsze słowa', 'Kiedy będziesz gotowy, przejdź do ciągłego pisania.', 'writer']] as const
  return <div className="setup-view"><div className="view-header"><div><span className="eyebrow">Początek projektu</span><h1>Przygotowanie</h1><p className="view-description">Zbuduj sobie miejsce, do którego będziesz wracać podczas pisania. Nie musisz mieć wszystkiego gotowego.</p></div></div><div className="setup-welcome"><div><span className="setup-mark">W</span><h2>Najpierw pomysł.<br />Potem reszta.</h2><p>Opisz tyle, ile już wiesz. Reszta może odkryć się po drodze.</p></div><div className="setup-progress"><span><strong>0%</strong> przygotowania</span><div><i /></div><small>Możesz zacząć pisać w dowolnym momencie.</small></div></div><div className="setup-grid">{steps.map(([number, name, description, target]) => <button className="setup-card" type="button" key={name} onClick={() => setView(target)}><span className="setup-number">{number}</span><span className="setup-card-copy"><strong>{name}</strong><small>{description}</small></span><span className="card-arrow">→</span></button>)}</div></div>
}

function PlanView({ draft, setView }: { draft: string; setView: (view: View) => void }) {
  const paragraphCount = draft.split(/\n\s*\n/).filter(Boolean).length
  return <div className="plan-view"><div className="view-header"><div><span className="eyebrow">Porządkowanie materiału</span><h1>Plan</h1></div><button className="primary-button" type="button" onClick={() => setView('writer')}>Wróć do pisania</button></div><div className="plan-intro"><div><h2>Z surowego tekstu w opowieść.</h2><p>Pisz najpierw bez hamulców. Później podziel materiał na rozdziały i sceny, kiedy zobaczysz już jego kształt.</p></div><span className="draft-stat"><strong>{paragraphCount}</strong><small>fragmenty robocze</small></span></div><div className="chapter-board"><div className="board-heading"><span>Manuskrypt bez podziału</span><span>Przeciągnij fragment do rozdziału</span></div><div className="fragment-card"><span className="drag-handle">⠿</span><div><strong>Tekst roboczy</strong><p>Mara budzi się przy porcie. Morze wróciło po nią.</p></div><span className="fragment-count">{draft.length} znaków</span></div><div className="chapter-row"><div className="chapter-marker">01</div><div><strong>Rozdział I · Popiół i sól</strong><small>3 sceny · 1 248 słów</small></div><button type="button">Otwórz</button></div><div className="empty-chapter"><span>+</span><strong>Dodaj rozdział</strong><small>Zacznij dzielić tekst, gdy będziesz gotowy.</small></div></div></div>
}

function LibraryView({ view, library, onAdd }: { view: LibraryCategory; library: LibraryData; onAdd: (category: LibraryCategory, item: LibraryItem) => void }) {
  const labels: Record<typeof view, [string, string]> = { characters: ['Bohaterowie', 'Ludzie, którzy niosą tę historię.'], places: ['Miejsca', 'Przestrzenie, które mają własną pamięć.'], threads: ['Wątki', 'Pytania, napięcia i obietnice opowieści.'], notes: ['Notatki', 'Myśli, które nie muszą jeszcze znać swojego miejsca.'] }
  const addItem = () => {
    const name = window.prompt(`Nazwa: ${labels[view][0]}`)?.trim()
    if (!name) return
    const detail = window.prompt('Krótki opis lub rola:')?.trim() || 'Nowy element kanonu'
    const icon = view === 'characters' ? '○' : view === 'places' ? '⌂' : view === 'threads' ? '↗' : '·'
    onAdd(view, [name, detail, icon])
  }
  return <div className="library-view"><div className="view-header"><div><span className="eyebrow">Biblioteka powieści</span><h1>{labels[view][0]}</h1><p className="view-description">{labels[view][1]}</p></div><button className="primary-button" type="button" onClick={addItem}>+ Dodaj</button></div><div className="library-grid">{library[view].map(([name, detail, icon]) => <button className="library-card" type="button" key={`${name}-${detail}`}><span className="library-icon">{icon}</span><span><strong>{name}</strong><small>{detail}</small></span><span className="card-arrow">→</span></button>)}</div></div>
}

function ExportView({ title, draft, library, onImport }: { title: string; draft: string; library: LibraryData; onImport: (title: string, draft: string, library: LibraryData) => void }) {
  const [manuscriptFormat, setManuscriptFormat] = useState<'docx' | 'pdf' | 'epub'>('docx')
  const [exportMessage, setExportMessage] = useState('')
  const safeFileName = (title || 'writer-manuscript').replace(/[^a-z0-9ąćęłńóśźż _-]/gi, '').trim().replace(/\s+/g, '-') || 'writer-manuscript'
  const exportProject = () => {
    const bundle: ProjectBundle = { format: 'writer-project', version: 1, exportedAt: new Date().toISOString(), project: { title, draft }, library }
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${title || 'writer-project'}.writer.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const importProject = async (file: File) => {
    try {
      const bundle = JSON.parse(await file.text()) as Partial<ProjectBundle>
      if (bundle.format !== 'writer-project' || bundle.version !== 1 || !bundle.project?.title || typeof bundle.project.draft !== 'string') throw new Error('Nieprawidłowy plik projektu.')
      onImport(bundle.project.title, bundle.project.draft, bundle.library ?? initialLibrary)
    } catch {
      window.alert('Nie udało się otworzyć tego pliku Writer.')
    }
  }

  const exportManuscript = async () => {
    if (manuscriptFormat === 'docx') {
      const { Document, HeadingLevel, Packer, Paragraph, TextRun } = await import('docx')
      const paragraphs = draft.split('\n').map((line) => new Paragraph({ children: [new TextRun(line)] }))
      const document = new Document({ sections: [{ properties: {}, children: [new Paragraph({ text: title || 'Bez tytułu', heading: HeadingLevel.TITLE }), ...paragraphs] }] })
      const blob = await Packer.toBlob(document)
      downloadBlob(blob, `${safeFileName}.docx`)
      setExportMessage('DOCX został pobrany.')
      return
    }
    if (manuscriptFormat === 'pdf') {
      const { jsPDF } = await import('jspdf')
      const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
      const lines = pdf.splitTextToSize(draft, 170) as string[]
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(18)
      pdf.text(title || 'Bez tytułu', 20, 22)
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(11)
      let y = 36
      for (const line of lines) {
        if (y > 280) { pdf.addPage(); y = 20 }
        pdf.text(line || ' ', 20, y)
        y += 6
      }
      pdf.save(`${safeFileName}.pdf`)
      setExportMessage('PDF został pobrany.')
      return
    }
    setExportMessage('EPUB pozostaje kolejnym etapem eksportu publikacyjnego.')
  }

  return <div className="export-view"><div className="view-header"><div><span className="eyebrow">Gotowa książka</span><h1>Eksport i import</h1><p className="view-description">Wybierz, czy chcesz przenieść cały projekt, czy przygotować rękopis do czytania.</p></div></div><div className="export-sections"><section className="project-transfer"><div className="transfer-copy"><span className="transfer-icon">↕</span><span className="eyebrow">Pakiet roboczy</span><h2>Jeden plik, cała historia.</h2><p>Przenieś tekst, bibliotekę świata i ustawienia na inne urządzenie z Writerem.</p><button className="primary-button export-button" type="button" onClick={exportProject}>Pobierz projekt Writer</button><label className="import-button">Otwórz projekt z pliku<input type="file" accept=".json,.writer.json,application/json" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importProject(file) }} /></label></div><div className="bundle-preview"><span className="eyebrow">Zawartość</span><strong>{title || 'Bez tytułu'}</strong><div><span>Tekst roboczy</span><b>{draft.split(/\s+/).filter(Boolean).length} słów</b></div><div><span>Biblioteka świata</span><b>{Object.values(library).flat().length} elementów</b></div><div><span>Format</span><b>.writer.json · v1</b></div></div></section><section className="manuscript-export"><div><span className="transfer-icon manuscript-icon">Aa</span><span className="eyebrow">Rękopis dla wydawnictwa</span><h2>Przygotuj plik do wysłania.</h2><p>Najczęściej zacznij od edytowalnego DOCX. PDF służy jako wersja do czytania i sprawdzenia układu.</p></div><div className="format-options"><button className={manuscriptFormat === 'docx' ? 'selected' : ''} type="button" onClick={() => setManuscriptFormat('docx')}><strong>DOCX</strong><small>Edytowalny rękopis</small><span>›</span></button><button className={manuscriptFormat === 'pdf' ? 'selected' : ''} type="button" onClick={() => setManuscriptFormat('pdf')}><strong>PDF</strong><small>Wersja do czytania</small><span>›</span></button><button className={manuscriptFormat === 'epub' ? 'selected' : ''} type="button" onClick={() => setManuscriptFormat('epub')}><strong>EPUB</strong><small>Publikacja cyfrowa</small><span>›</span></button><button className="manuscript-button" type="button" onClick={() => void exportManuscript()}>Pobierz {manuscriptFormat.toUpperCase()} <span>→</span></button>{exportMessage && <small className="export-status">{exportMessage}</small>}</div></section></div></div>
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

export default App