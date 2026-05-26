import { useEffect, useMemo, useState } from 'react';
import { useRef } from 'react';
import {
  Archive,
  Clipboard,
  FileText,
  Languages,
  Library,
  Loader2,
  Moon,
  Plus,
  Search,
  Sun,
  Trash2,
  Sword,
  Sparkles,
  Shield,
  ChevronDown
} from 'lucide-react';
import { listCardPrints, searchCard, suggestCards } from './api/cardsApi';
import { deckJsonToText, deckToExportJson, downloadTextFile, groupCards } from './utils/deckExport';
import { createLocalDeck, loadDecks, saveDecks } from './utils/localDecks';
import { IconButton } from './components/IconButton';

const formats = ['commander', 'pauper', 'standard'];
const storageKeys = {
  theme: 'manaforge:theme',
  language: 'manaforge:language'
};
const suggestionLimit = 8;

const translations = {
  pt: {
    decks: 'Decks',
    saved: 'Salvos',
    deckName: 'Nome do deck',
    createDeck: 'Criar deck',
    noDecks: 'Nenhum deck criado.',
    cardSearch: 'Busca de carta',
    activeDeck: 'Deck ativo',
    noActiveDeck: 'nenhum',
    cardName: 'Nome da carta',
    edition: 'Edição',
    automaticEdition: 'Edição automática',
    search: 'Buscar',
    noCard: 'Nenhuma carta selecionada.',
    result: 'Resultado',
    card: 'Carta',
    type: 'Tipo',
    rarity: 'Raridade',
    mana: 'Mana',
    condition: 'Estado opcional',
    addToDeck: 'Adicionar ao deck',
    removeDeck: 'Remover deck',
    removeCopy: 'Remover uma cópia',
    copyTxt: 'Copiar TXT',
    downloadTxt: 'Baixar TXT',
    decklistTxt: 'Decklist TXT',
    emptyDeck: 'Deck vazio.',
    cards: 'cartas',
    created: 'Deck criado no navegador.',
    cardFound: 'Carta encontrada.',
    cardAdded: 'Carta adicionada.',
    cardRemoved: 'Carta removida.',
    deckRemoved: 'Deck removido.',
    copied: 'Decklist copiada.',
    fillDeckName: 'Informe o nome do deck.',
    fillCardName: 'Informe o nome da carta.',
    deckLimit: 'Limite máximo de cartas no deck atingido.',
    pauperRule: (name) => `A carta ${name} não é permitida no formato Pauper.`,
    languageLabel: 'Usar inglês',
    themeLabel: 'Alternar tema'
  },
  en: {
    decks: 'Decks',
    saved: 'Saved',
    deckName: 'Deck name',
    createDeck: 'Create deck',
    noDecks: 'No decks created.',
    cardSearch: 'Card search',
    activeDeck: 'Active deck',
    noActiveDeck: 'none',
    cardName: 'Card name',
    edition: 'Edition',
    automaticEdition: 'Automatic edition',
    search: 'Search',
    noCard: 'No card selected.',
    result: 'Result',
    card: 'Card',
    type: 'Type',
    rarity: 'Rarity',
    mana: 'Mana',
    condition: 'Optional condition',
    addToDeck: 'Add to deck',
    removeDeck: 'Remove deck',
    removeCopy: 'Remove one copy',
    copyTxt: 'Copy TXT',
    downloadTxt: 'Download TXT',
    decklistTxt: 'Decklist TXT',
    emptyDeck: 'Empty deck.',
    cards: 'cards',
    created: 'Deck saved in this browser.',
    cardFound: 'Card found.',
    cardAdded: 'Card added.',
    cardRemoved: 'Card removed.',
    deckRemoved: 'Deck removed.',
    copied: 'Decklist copied.',
    fillDeckName: 'Enter the deck name.',
    fillCardName: 'Enter the card name.',
    deckLimit: 'Maximum deck size reached.',
    pauperRule: (name) => `${name} is not legal in Pauper.`,
    languageLabel: 'Use Portuguese',
    themeLabel: 'Toggle theme'
  }
};

const conditions = [
  { value: '', pt: 'Sem estado', en: 'No condition' },
  { value: 'NM', pt: 'Near Mint', en: 'Near Mint' },
  { value: 'LP', pt: 'Pouco usada', en: 'Lightly Played' },
  { value: 'MP', pt: 'Moderadamente usada', en: 'Moderately Played' },
  { value: 'HP', pt: 'Muito usada', en: 'Heavily Played' },
  { value: 'DMG', pt: 'Danificada', en: 'Damaged' }
];

/* ─── Rarity badge color ─────────────────────────────── */
function rarityStyle(rarity) {
  const r = (rarity ?? '').toLowerCase();
  if (r === 'mythic rare') return { bg: 'bg-orange-900/60 text-orange-300 border-orange-700/50' };
  if (r === 'rare')        return { bg: 'bg-yellow-900/60 text-yellow-300 border-yellow-700/50' };
  if (r === 'uncommon')    return { bg: 'bg-slate-700/60 text-slate-300 border-slate-600/50' };
  return                          { bg: 'bg-stone-800/60 text-stone-400 border-stone-700/50' };
}

function App() {
  const [decks, setDecks] = useState([]);
  const [activeDeckId, setActiveDeckId] = useState(null);
  const [deckName, setDeckName] = useState('');
  const [deckFormat, setDeckFormat] = useState('commander');
  const [cardName, setCardName] = useState('');
  const [cardEdition, setCardEdition] = useState('');
  const [cardCondition, setCardCondition] = useState('');
  const [editions, setEditions] = useState([]);
  const [foundCard, setFoundCard] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState({ search: false, edition: false, suggestions: false });
  const [theme, setTheme] = useState(() => localStorage.getItem(storageKeys.theme) ?? 'dark');
  const [language, setLanguage] = useState(() => localStorage.getItem(storageKeys.language) ?? 'pt');
  const selectedSuggestionRef = useRef(false);

  const t = translations[language];
  const activeDeck = useMemo(
    () => decks.find((deck) => deck.id === activeDeckId) ?? decks[0] ?? null,
    [activeDeckId, decks]
  );
  const exportJson = useMemo(() => deckToExportJson(activeDeck), [activeDeck]);
  const exportText = useMemo(() => deckJsonToText(exportJson), [exportJson]);
  const groupedCards = useMemo(() => groupCards(activeDeck?.cards), [activeDeck]);
  const editionOptions = useMemo(() => uniqueEditions(editions), [editions]);

  useEffect(() => {
    const storedDecks = loadDecks();
    setDecks(storedDecks);
    setActiveDeckId(storedDecks[0]?.id ?? null);
  }, []);

  useEffect(() => { saveDecks(decks); }, [decks]);
  useEffect(() => { localStorage.setItem(storageKeys.theme, theme); }, [theme]);
  useEffect(() => { localStorage.setItem(storageKeys.language, language); }, [language]);

  useEffect(() => {
    const query = cardName.trim();
    if (selectedSuggestionRef.current) {
      selectedSuggestionRef.current = false;
      setLoading((c) => ({ ...c, suggestions: false }));
      return undefined;
    }
    if (!query) {
      setSuggestions([]);
      setShowSuggestions(false);
      setLoading((c) => ({ ...c, suggestions: false }));
      return undefined;
    }
    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setLoading((c) => ({ ...c, suggestions: true }));
      try {
        const cardNames = await suggestCards(query, { signal: controller.signal });
        setSuggestions(cardNames.slice(0, suggestionLimit));
        setShowSuggestions(cardNames.length > 0);
      } catch (error) {
        if (error.name !== 'AbortError') { setSuggestions([]); setShowSuggestions(false); }
      } finally {
        setLoading((c) => ({ ...c, suggestions: false }));
      }
    }, 250);
    return () => { window.clearTimeout(timeoutId); controller.abort(); };
  }, [cardName]);

  function handleCreateDeck(event) {
    event.preventDefault();
    if (!deckName.trim()) return;
    const deck = createLocalDeck({ name: deckName.trim(), format: deckFormat });
    setDecks((c) => [deck, ...c]);
    setActiveDeckId(deck.id);
    setDeckName('');
  }

  function handleSuggestionSelect(name) {
    selectedSuggestionRef.current = true;
    setCardName(name);
    setSuggestions([]);
    setShowSuggestions(false);
  }

  async function handleSearch(event) {
    event.preventDefault();
    if (!cardName.trim()) return;
    setLoading((c) => ({ ...c, search: true }));
    setEditions([]);
    try {
      const card = await searchCard({ name: cardName.trim(), edition: cardEdition });
      const prints = await listCardPrints(card.name);
      setFoundCard(card);
      setEditions(prints);
      setCardEdition(card.setCode ?? '');
    } catch {
      setFoundCard(null);
    } finally {
      setLoading((c) => ({ ...c, search: false }));
    }
  }

  async function handleEditionChange(nextEdition) {
    setCardEdition(nextEdition);
    if (!foundCard || !cardName.trim()) return;
    setLoading((c) => ({ ...c, edition: true }));
    try {
      const card = await searchCard({ name: foundCard.name, edition: nextEdition });
      setFoundCard(card);
    } catch { return; }
    finally { setLoading((c) => ({ ...c, edition: false })); }
  }

  function handleAddCard() {
    if (!activeDeck || !foundCard) return;
    try {
      validateCardForDeck(activeDeck, foundCard, t);
      const cardToAdd = { ...foundCard, condition: cardCondition || '' };
      const updatedDeck = { ...activeDeck, cards: [...activeDeck.cards, cardToAdd] };
      setDecks((c) => c.map((d) => (d.id === updatedDeck.id ? updatedDeck : d)));
    } catch { return; }
  }

  function handleRemoveCard(cardToRemove) {
    if (!activeDeck) return;
    let removed = false;
    const updatedCards = activeDeck.cards.filter((card) => {
      if (!removed && isSameCardEntry(card, cardToRemove)) { removed = true; return false; }
      return true;
    });
    setDecks((c) => c.map((d) => (d.id === activeDeck.id ? { ...activeDeck, cards: updatedCards } : d)));
  }

  function handleDeleteDeck(deckId) {
    const nextDecks = decks.filter((d) => d.id !== deckId);
    setDecks(nextDecks);
    setActiveDeckId(nextDecks[0]?.id ?? null);
  }

  async function handleCopyText() {
    if (!activeDeck || !exportText) return;
    await navigator.clipboard.writeText(exportText);
  }

  function handleDownloadTxt() {
    if (!activeDeck) return;
    downloadTextFile(`${slug(activeDeck.name)}.txt`, exportText, 'text/plain');
  }

  const isDark = theme === 'dark';

  return (
    <main className={isDark ? 'dark' : ''}>
      {/* ── Global styles injected once ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Crimson+Pro:ital,wght@0,300;0,400;0,600;1,300;1,400&display=swap');

        .mf-root {
          font-family: 'Crimson Pro', Georgia, serif;
          background: #0d0f14;
          color: #e8e0d0;
          min-height: 100vh;
        }
        .mf-root.light {
          background: #f5f0e8;
          color: #1a1510;
        }

        /* Parchment texture via pseudo + gradient */
        .mf-root::before {
          content: '';
          position: fixed;
          inset: 0;
          background:
            repeating-linear-gradient(0deg, transparent, transparent 31px, rgba(255,255,255,.015) 31px, rgba(255,255,255,.015) 32px),
            repeating-linear-gradient(90deg, transparent, transparent 79px, rgba(255,255,255,.008) 79px, rgba(255,255,255,.008) 80px);
          pointer-events: none;
          z-index: 0;
        }
        .mf-root > * { position: relative; z-index: 1; }

        /* Panel */
        .panel {
          background: rgba(20,17,13,.85);
          border: 1px solid rgba(180,145,60,.22);
          border-radius: 6px;
          backdrop-filter: blur(4px);
        }
        .light .panel {
          background: rgba(245,238,220,.9);
          border-color: rgba(120,85,30,.25);
        }

        /* Panel header divider */
        .panel-header {
          border-bottom: 1px solid rgba(180,145,60,.18);
          padding: 14px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        /* Cinzel headings */
        .cinzel { font-family: 'Cinzel', serif; letter-spacing: .04em; }

        /* Inputs */
        .mf-input {
          height: 40px;
          width: 100%;
          background: rgba(0,0,0,.35);
          border: 1px solid rgba(180,145,60,.3);
          border-radius: 4px;
          padding: 0 12px;
          font-family: 'Crimson Pro', serif;
          font-size: 15px;
          color: #e8e0d0;
          outline: none;
          transition: border-color .2s;
        }
        .light .mf-input {
          background: rgba(255,255,255,.6);
          color: #1a1510;
        }
        .mf-input:focus { border-color: rgba(180,145,60,.75); }
        .mf-input::placeholder { color: rgba(200,185,155,.35); }
        .mf-select {
          appearance: none;
          -webkit-appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23b49140' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 12px center;
          padding-right: 32px !important;
          cursor: pointer;
        }

        /* Buttons */
        .btn-primary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          height: 40px;
          padding: 0 18px;
          border-radius: 4px;
          font-family: 'Cinzel', serif;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: .08em;
          cursor: pointer;
          transition: all .2s;
          border: 1px solid;
        }
        .btn-gold {
          background: linear-gradient(135deg, #c8a84b 0%, #e8c96a 50%, #b8942e 100%);
          border-color: #c8a84b;
          color: #1a1208;
        }
        .btn-gold:hover { filter: brightness(1.12); }
        .btn-gold:disabled { opacity: .4; cursor: not-allowed; filter: none; }
        .btn-emerald {
          background: linear-gradient(135deg, #1a6b4a 0%, #20865e 50%, #155c3e 100%);
          border-color: #1f7a52;
          color: #a8f0d0;
        }
        .btn-emerald:hover { filter: brightness(1.15); }
        .btn-emerald:disabled { opacity: .4; cursor: not-allowed; filter: none; }
        .btn-ghost {
          background: transparent;
          border-color: rgba(180,145,60,.3);
          color: #b8a070;
          height: 34px;
          width: 34px;
          padding: 0;
          border-radius: 4px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all .2s;
        }
        .btn-ghost:hover { background: rgba(180,145,60,.1); border-color: rgba(180,145,60,.6); color: #e8c96a; }
        .btn-ghost:disabled { opacity: .35; cursor: not-allowed; }

        /* Format tab selector */
        .fmt-bar {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          background: rgba(0,0,0,.4);
          border: 1px solid rgba(180,145,60,.2);
          border-radius: 4px;
          padding: 3px;
          gap: 3px;
        }
        .light .fmt-bar { background: rgba(0,0,0,.06); }
        .fmt-tab {
          height: 34px;
          border-radius: 3px;
          font-family: 'Cinzel', serif;
          font-size: 10px;
          letter-spacing: .1em;
          font-weight: 600;
          text-transform: uppercase;
          cursor: pointer;
          border: none;
          transition: all .2s;
          color: rgba(180,155,90,.55);
          background: transparent;
        }
        .fmt-tab.active {
          background: linear-gradient(135deg, #c8a84b, #e8c96a);
          color: #1a1208;
        }
        .fmt-tab:not(.active):hover { color: #c8a84b; }

        /* Deck list item */
        .deck-item {
          display: grid;
          grid-template-columns: 1fr 34px;
          align-items: center;
          gap: 8px;
          border-radius: 4px;
          border: 1px solid rgba(180,145,60,.15);
          padding: 8px 10px;
          margin-bottom: 6px;
          transition: all .2s;
          cursor: pointer;
          background: rgba(0,0,0,.2);
        }
        .deck-item:hover { border-color: rgba(180,145,60,.4); background: rgba(180,145,60,.06); }
        .deck-item.active {
          background: rgba(180,145,60,.12);
          border-color: rgba(180,145,60,.65);
        }
        .light .deck-item { background: rgba(255,255,255,.4); }
        .light .deck-item.active { background: rgba(180,120,20,.1); }

        /* Card entry in decklist */
        .card-entry {
          display: grid;
          grid-template-columns: 38px 1fr 34px;
          align-items: center;
          gap: 8px;
          border-radius: 4px;
          border: 1px solid rgba(180,145,60,.12);
          padding: 6px 8px;
          margin-bottom: 5px;
          background: rgba(0,0,0,.2);
          transition: border-color .2s;
        }
        .card-entry:hover { border-color: rgba(180,145,60,.35); }
        .light .card-entry { background: rgba(255,255,255,.35); }

        /* Badge */
        .badge {
          display: inline-block;
          padding: 2px 7px;
          border-radius: 3px;
          font-size: 11px;
          font-family: 'Cinzel', serif;
          letter-spacing: .06em;
          border: 1px solid;
        }

        /* Decorative rule */
        .divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(180,145,60,.35), transparent);
          margin: 2px 0;
        }

        /* Scrollbar */
        .mf-scroll::-webkit-scrollbar { width: 4px; }
        .mf-scroll::-webkit-scrollbar-track { background: transparent; }
        .mf-scroll::-webkit-scrollbar-thumb { background: rgba(180,145,60,.25); border-radius: 2px; }
        .mf-scroll::-webkit-scrollbar-thumb:hover { background: rgba(180,145,60,.45); }

        /* Card image frame */
        .card-frame {
          border: 1px solid rgba(180,145,60,.3);
          border-radius: 8px;
          overflow: hidden;
          background: rgba(0,0,0,.5);
          position: relative;
          display: flex;
          align-items: stretch;
        }
        .card-frame::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 8px;
          box-shadow: inset 0 0 30px rgba(0,0,0,.4);
          pointer-events: none;
        }

        /* Textarea */
        .mf-textarea {
          width: 100%;
          background: rgba(0,0,0,.4);
          border: 1px solid rgba(180,145,60,.2);
          border-radius: 4px;
          padding: 10px 12px;
          font-family: 'Courier New', monospace;
          font-size: 12px;
          color: #b8c890;
          resize: none;
          outline: none;
          transition: border-color .2s;
        }
        .light .mf-textarea { background: rgba(255,255,255,.5); color: #2a4a18; }
        .mf-textarea:focus { border-color: rgba(180,145,60,.5); }

        /* Autocomplete dropdown */
        .suggest-drop {
          position: absolute;
          left: 0; right: 0;
          top: calc(100% + 4px);
          z-index: 50;
          background: #1a1610;
          border: 1px solid rgba(180,145,60,.35);
          border-radius: 4px;
          overflow: hidden;
        }
        .light .suggest-drop { background: #f8f2e4; }
        .suggest-item {
          display: block;
          width: 100%;
          padding: 9px 12px;
          text-align: left;
          font-family: 'Crimson Pro', serif;
          font-size: 15px;
          color: #c8b888;
          background: transparent;
          border: none;
          cursor: pointer;
          transition: background .15s;
          border-bottom: 1px solid rgba(180,145,60,.08);
        }
        .suggest-item:last-child { border-bottom: none; }
        .suggest-item:hover { background: rgba(180,145,60,.1); color: #e8c96a; }
        .light .suggest-item { color: #6a5010; }

        /* Info grid item */
        .info-tile {
          background: rgba(0,0,0,.3);
          border: 1px solid rgba(180,145,60,.15);
          border-radius: 4px;
          padding: 10px 12px;
        }
        .light .info-tile { background: rgba(255,255,255,.4); }

        /* Fade-in animation */
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fadeUp .35s ease forwards; }

        /* Logo flame accent */
        .logo-accent {
          background: linear-gradient(135deg, #c8a84b, #e8c96a, #ff9040);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        /* Subtle noise overlay */
        .noise::before {
          content: '';
          position: absolute;
          inset: 0;
          opacity: .03;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          pointer-events: none;
          border-radius: inherit;
        }
      `}</style>

      <div className={`mf-root${isDark ? '' : ' light'}`} style={{ padding: '0' }}>
        <div style={{ maxWidth: 1520, margin: '0 auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', minHeight: '100vh', gap: 0 }}>

          {/* ── HEADER ─────────────────────────────────────────────────────── */}
          <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 16, borderBottom: '1px solid rgba(180,145,60,.2)', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 6, background: 'linear-gradient(135deg,#c8a84b,#e8c96a)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles size={18} color="#1a1208" />
              </div>
              <div>
                <h1 className="cinzel logo-accent" style={{ fontSize: 22, fontWeight: 700, margin: 0, lineHeight: 1 }}>ManaForge</h1>
                <p style={{ fontSize: 11, color: 'rgba(180,145,60,.55)', margin: 0, letterSpacing: '.12em', fontFamily: 'Cinzel,serif', textTransform: 'uppercase' }}>Deck Builder</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn-ghost"
                title={t.languageLabel}
                onClick={() => setLanguage((c) => (c === 'pt' ? 'en' : 'pt'))}
                style={{ width: 'auto', padding: '0 12px', gap: 6, fontSize: 12, fontFamily: 'Cinzel,serif', letterSpacing: '.06em' }}
              >
                <Languages size={14} />
                {language === 'pt' ? 'EN' : 'PT'}
              </button>
              <button className="btn-ghost" title={t.themeLabel} onClick={() => setTheme((c) => (c === 'dark' ? 'light' : 'dark'))}>
                {isDark ? <Sun size={15} /> : <Moon size={15} />}
              </button>
            </div>
          </header>

          {/* ── MAIN GRID ──────────────────────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '290px 1fr 370px', gap: 16, flex: 1 }}>

            {/* ══ LEFT SIDEBAR ═══════════════════════════════════════════════ */}
            <aside style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Create deck */}
              <div className="panel" style={{ padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <Archive size={14} style={{ color: '#c8a84b' }} />
                  <span className="cinzel" style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.1em', color: '#c8a84b', textTransform: 'uppercase' }}>{t.decks}</span>
                </div>

                <form onSubmit={handleCreateDeck} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <input
                    className="mf-input"
                    value={deckName}
                    onChange={(e) => setDeckName(e.target.value)}
                    placeholder={t.deckName}
                    required
                  />

                  <div className="fmt-bar">
                    {formats.map((f) => (
                      <button
                        key={f}
                        type="button"
                        className={`fmt-tab${deckFormat === f ? ' active' : ''}`}
                        onClick={() => setDeckFormat(f)}
                      >
                        {f}
                      </button>
                    ))}
                  </div>

                  <button type="submit" className="btn-primary btn-gold" style={{ width: '100%' }}>
                    <Plus size={13} />
                    {t.createDeck}
                  </button>
                </form>
              </div>

              {/* Saved decks */}
              <div className="panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div className="panel-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Library size={14} style={{ color: '#20865e' }} />
                    <span className="cinzel" style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.1em', color: '#20865e', textTransform: 'uppercase' }}>{t.saved}</span>
                  </div>
                  <span style={{ background: 'rgba(180,145,60,.15)', border: '1px solid rgba(180,145,60,.3)', borderRadius: 3, padding: '1px 8px', fontSize: 12, color: '#c8a84b', fontFamily: 'Cinzel,serif' }}>{decks.length}</span>
                </div>

                <div className="mf-scroll" style={{ padding: '10px 12px', overflowY: 'auto', flex: 1 }}>
                  {decks.length === 0 && (
                    <p style={{ fontSize: 14, color: 'rgba(180,155,90,.45)', textAlign: 'center', padding: '20px 0', fontStyle: 'italic' }}>{t.noDecks}</p>
                  )}
                  {decks.map((deck) => (
                    <div key={deck.id} className={`deck-item${activeDeck?.id === deck.id ? ' active' : ''}`}>
                      <button
                        type="button"
                        onClick={() => { setActiveDeckId(deck.id); setFoundCard(null); setEditions([]); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0, color: 'inherit', minWidth: 0 }}
                      >
                        <p className="cinzel" style={{ fontSize: 13, fontWeight: 600, margin: 0, color: activeDeck?.id === deck.id ? '#e8c96a' : '#d4c090', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {deck.name}
                        </p>
                        <p style={{ fontSize: 12, margin: '3px 0 0', color: 'rgba(180,155,90,.5)', textTransform: 'capitalize', fontFamily: 'Crimson Pro,serif' }}>
                          {deck.format} · {deck.cards.length} {t.cards}
                        </p>
                      </button>
                      <button className="btn-ghost" style={{ width: 30, height: 30 }} title={t.removeDeck} onClick={() => handleDeleteDeck(deck.id)}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </aside>

            {/* ══ CENTER — CARD SEARCH ════════════════════════════════════════ */}
            <section className="panel" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <h2 className="cinzel" style={{ fontSize: 15, fontWeight: 700, margin: 0, color: '#e8c96a', letterSpacing: '.06em', textTransform: 'uppercase' }}>{t.cardSearch}</h2>
                  <p style={{ fontSize: 13, margin: '4px 0 0', color: 'rgba(180,155,90,.5)', fontStyle: 'italic' }}>
                    {t.activeDeck}: <span style={{ color: 'rgba(180,155,90,.8)' }}>{activeDeck?.name ?? t.noActiveDeck}</span>
                  </p>
                </div>
                <Shield size={20} style={{ color: 'rgba(180,145,60,.25)', marginTop: 2 }} />
              </div>

              <div className="divider" />

              {/* Search form */}
              <form onSubmit={handleSearch} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
                <div style={{ position: 'relative' }}>
                  <input
                    className="mf-input"
                    value={cardName}
                    onChange={(e) => { setCardName(e.target.value); setSuggestions([]); setShowSuggestions(true); }}
                    onFocus={() => setShowSuggestions(suggestions.length > 0)}
                    onBlur={() => window.setTimeout(() => setShowSuggestions(false), 120)}
                    placeholder={t.cardName}
                    autoComplete="off"
                    required
                    style={{ paddingRight: 36 }}
                  />
                  <Search size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(180,145,60,.4)', pointerEvents: 'none' }} />

                  {(loading.suggestions || (showSuggestions && suggestions.length > 0)) && (
                    <div className="suggest-drop">
                      {loading.suggestions && suggestions.length === 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', color: 'rgba(180,145,60,.5)', fontSize: 14 }}>
                          <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> {t.search}…
                        </div>
                      ) : suggestions.map((s) => (
                        <button key={s} type="button" className="suggest-item" onMouseDown={(e) => { e.preventDefault(); handleSuggestionSelect(s); }}>{s}</button>
                      ))}
                    </div>
                  )}
                </div>

                <button type="submit" className="btn-primary btn-emerald" disabled={loading.search} style={{ whiteSpace: 'nowrap' }}>
                  {loading.search ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Search size={14} />}
                  {t.search}
                </button>
              </form>

              {/* Edition select */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontFamily: 'Cinzel,serif', letterSpacing: '.1em', color: 'rgba(180,145,60,.6)', textTransform: 'uppercase', marginBottom: 6 }}>{t.edition}</label>
                <select
                  className="mf-input mf-select"
                  value={cardEdition}
                  onChange={(e) => handleEditionChange(e.target.value)}
                  disabled={!foundCard || loading.edition}
                  style={{ opacity: (!foundCard || loading.edition) ? .4 : 1, cursor: (!foundCard || loading.edition) ? 'not-allowed' : 'pointer' }}
                >
                  <option value="">{t.automaticEdition}</option>
                  {editionOptions.map((ed) => (
                    <option key={ed.setCode} value={ed.setCode}>{ed.editionName} ({ed.setCode.toUpperCase()})</option>
                  ))}
                </select>
              </div>

              {/* Card preview + info */}
              <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 16, flex: 1 }}>

                {/* Image */}
                <div className="card-frame" style={{ aspectRatio: '488/680' }}>
                  {foundCard?.imageUrl ? (
                    <img src={foundCard.imageUrl} alt={foundCard.name} className="fade-up" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', gap: 12, color: 'rgba(180,145,60,.2)', textAlign: 'center' }}>
                      <Sword size={32} />
                      <span style={{ fontSize: 12, fontFamily: 'Cinzel,serif', letterSpacing: '.1em', textTransform: 'uppercase' }}>{t.noCard}</span>
                    </div>
                  )}
                </div>

                {/* Details panel */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

                  {/* Name + rarity */}
                  <div>
                    <p style={{ fontSize: 11, fontFamily: 'Cinzel,serif', letterSpacing: '.12em', color: 'rgba(180,145,60,.5)', textTransform: 'uppercase', margin: 0 }}>{t.result}</p>
                    <h3 className="cinzel" style={{ fontSize: 20, fontWeight: 600, margin: '6px 0 0', color: '#e8d8a0', lineHeight: 1.2 }}>
                      {foundCard?.name ?? t.card}
                    </h3>
                    {foundCard?.rarity && (
                      <span className={`badge ${rarityStyle(foundCard.rarity).bg}`} style={{ marginTop: 8, display: 'inline-block' }}>
                        {foundCard.rarity}
                      </span>
                    )}
                  </div>

                  <div className="divider" />

                  {/* Info tiles */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <InfoTile label={t.type}    value={foundCard?.type ?? '—'} />
                    <InfoTile label={t.mana}    value={foundCard?.manaCost ?? '—'} />
                    <InfoTile label={t.edition} value={foundCard?.setCode ? `${foundCard.editionName} (${foundCard.setCode.toUpperCase()})` : '—'} colSpan />
                  </div>

                  {/* Condition select */}
                  <div style={{ marginTop: 'auto' }}>
                    <label style={{ display: 'block', fontSize: 11, fontFamily: 'Cinzel,serif', letterSpacing: '.1em', color: 'rgba(180,145,60,.6)', textTransform: 'uppercase', marginBottom: 6 }}>{t.condition}</label>
                    <select className="mf-input mf-select" value={cardCondition} onChange={(e) => setCardCondition(e.target.value)}>
                      {conditions.map((c) => (
                        <option key={c.value} value={c.value}>{c[language]}</option>
                      ))}
                    </select>
                  </div>

                  {/* Add button */}
                  <button
                    type="button"
                    className="btn-primary btn-gold"
                    disabled={!activeDeck || !foundCard}
                    onClick={handleAddCard}
                    style={{ width: '100%' }}
                  >
                    <Plus size={14} />
                    {t.addToDeck}
                  </button>
                </div>
              </div>
            </section>

            {/* ══ RIGHT SIDEBAR ═══════════════════════════════════════════════ */}
            <aside style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Active deck list */}
              <div className="panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div className="panel-header">
                  <div>
                    <h2 className="cinzel" style={{ fontSize: 14, fontWeight: 700, margin: 0, color: '#e8d8a0' }}>{activeDeck?.name ?? 'Deck'}</h2>
                    <p style={{ fontSize: 12, margin: '3px 0 0', color: 'rgba(180,155,90,.5)', textTransform: 'capitalize', fontStyle: 'italic' }}>
                      {activeDeck?.format ?? '—'} · {activeDeck?.cards.length ?? 0} {t.cards}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn-ghost" style={{ width: 30, height: 30 }} title={t.copyTxt} disabled={!activeDeck || !exportText} onClick={handleCopyText}>
                      <Clipboard size={13} />
                    </button>
                    <button className="btn-ghost" style={{ width: 30, height: 30 }} title={t.downloadTxt} disabled={!activeDeck} onClick={handleDownloadTxt}>
                      <FileText size={13} />
                    </button>
                  </div>
                </div>

                <div className="mf-scroll" style={{ padding: '10px 12px', overflowY: 'auto', flex: 1, maxHeight: 380 }}>
                  {groupedCards.length === 0 && (
                    <p style={{ fontSize: 14, color: 'rgba(180,155,90,.35)', textAlign: 'center', padding: '20px 0', fontStyle: 'italic' }}>{t.emptyDeck}</p>
                  )}
                  {groupedCards.map(({ quantity, card }) => (
                    <div key={getCardEntryKey(card)} className="card-entry">
                      <span className="cinzel" style={{ width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 3, background: 'linear-gradient(135deg,#c8a84b,#e8c96a)', color: '#1a1208', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
                        {quantity}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, margin: 0, color: '#d4c090', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'Cinzel,serif' }}>{card.name}</p>
                        <p style={{ fontSize: 11, margin: '2px 0 0', color: 'rgba(180,155,90,.45)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {[card.setCode?.toUpperCase(), card.condition, card.type].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                      <button className="btn-ghost" style={{ width: 28, height: 28 }} title={t.removeCopy} onClick={() => handleRemoveCard(card)}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Decklist TXT */}
              <div className="panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div className="panel-header">
                  <span className="cinzel" style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.1em', color: 'rgba(180,145,60,.7)', textTransform: 'uppercase' }}>{t.decklistTxt}</span>
                </div>
                <div style={{ padding: '12px 14px' }}>
                  <textarea className="mf-textarea" value={exportText} readOnly rows={8} />
                </div>
              </div>

            </aside>
          </div>
        </div>
      </div>
    </main>
  );
}

/* ─── Sub-components ──────────────────────────────────── */

function InfoTile({ label, value, colSpan }) {
  return (
    <div className="info-tile" style={colSpan ? { gridColumn: '1 / -1' } : {}}>
      <p style={{ fontSize: 10, fontFamily: 'Cinzel,serif', letterSpacing: '.1em', color: 'rgba(180,145,60,.5)', textTransform: 'uppercase', margin: '0 0 4px' }}>{label}</p>
      <p style={{ fontSize: 14, color: '#d4c090', margin: 0, wordBreak: 'break-word' }}>{value}</p>
    </div>
  );
}

/* ─── Helpers ─────────────────────────────────────────── */

function validateCardForDeck(deck, card, t) {
  if (deck.cards.length >= 100) throw new Error(t.deckLimit);
  if (deck.format === 'pauper' && card.rarity !== 'common') throw new Error(t.pauperRule(card.name));
}

function uniqueEditions(editions) {
  const seen = new Map();
  for (const ed of editions) { if (!seen.has(ed.setCode)) seen.set(ed.setCode, ed); }
  return Array.from(seen.values());
}

function isSameCardEntry(card, ref) { return getCardEntryKey(card) === getCardEntryKey(ref); }
function getCardEntryKey(card) { return [card.name, card.setCode ?? '', card.condition ?? ''].join('|'); }

function slug(value) {
  return (
    value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'deck'
  );
}

export default App;
