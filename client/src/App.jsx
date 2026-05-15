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
  Trash2
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
  const [theme, setTheme] = useState(() => localStorage.getItem(storageKeys.theme) ?? 'light');
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

  useEffect(() => {
    saveDecks(decks);
  }, [decks]);

  useEffect(() => {
    localStorage.setItem(storageKeys.theme, theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(storageKeys.language, language);
  }, [language]);

  useEffect(() => {
    const query = cardName.trim();

    if (selectedSuggestionRef.current) {
      selectedSuggestionRef.current = false;
      setLoading((current) => ({ ...current, suggestions: false }));
      return undefined;
    }

    if (!query) {
      setSuggestions([]);
      setShowSuggestions(false);
      setLoading((current) => ({ ...current, suggestions: false }));
      return undefined;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setLoading((current) => ({ ...current, suggestions: true }));

      try {
        const cardNames = await suggestCards(query, { signal: controller.signal });
        setSuggestions(cardNames.slice(0, suggestionLimit));
        setShowSuggestions(cardNames.length > 0);
      } catch (error) {
        if (error.name !== 'AbortError') {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      } finally {
        setLoading((current) => ({ ...current, suggestions: false }));
      }
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [cardName]);

  function handleCreateDeck(event) {
    event.preventDefault();

    if (!deckName.trim()) {
      return;
    }

    const deck = createLocalDeck({
      name: deckName.trim(),
      format: deckFormat
    });

    setDecks((current) => [deck, ...current]);
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

    if (!cardName.trim()) {
      return;
    }

    setLoading((current) => ({ ...current, search: true }));
    setEditions([]);

    try {
      const card = await searchCard({
        name: cardName.trim(),
        edition: cardEdition
      });
      const prints = await listCardPrints(card.name);

      setFoundCard(card);
      setEditions(prints);
      setCardEdition(card.setCode ?? '');
    } catch (error) {
      setFoundCard(null);
    } finally {
      setLoading((current) => ({ ...current, search: false }));
    }
  }

  async function handleEditionChange(nextEdition) {
    setCardEdition(nextEdition);

    if (!foundCard || !cardName.trim()) return;

    setLoading((current) => ({ ...current, edition: true }));

    try {
      const card = await searchCard({
        name: foundCard.name,
        edition: nextEdition
      });
      setFoundCard(card);
    } catch (error) {
      return;
    } finally {
      setLoading((current) => ({ ...current, edition: false }));
    }
  }

  function handleAddCard() {
    if (!activeDeck || !foundCard) return;

    try {
      validateCardForDeck(activeDeck, foundCard, t);
      const cardToAdd = {
        ...foundCard,
        condition: cardCondition || ''
      };

      const updatedDeck = {
        ...activeDeck,
        cards: [...activeDeck.cards, cardToAdd]
      };

      setDecks((current) => current.map((deck) => (deck.id === updatedDeck.id ? updatedDeck : deck)));
    } catch (error) {
      return;
    }
  }

  function handleRemoveCard(cardToRemove) {
    if (!activeDeck) return;

    let removed = false;
    const updatedCards = activeDeck.cards.filter((card) => {
      if (!removed && isSameCardEntry(card, cardToRemove)) {
        removed = true;
        return false;
      }

      return true;
    });

    const updatedDeck = {
      ...activeDeck,
      cards: updatedCards
    };

    setDecks((current) => current.map((deck) => (deck.id === updatedDeck.id ? updatedDeck : deck)));
  }

  function handleDeleteDeck(deckId) {
    const nextDecks = decks.filter((deck) => deck.id !== deckId);

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

  return (
    <main className={theme === 'dark' ? 'dark' : ''}>
      <div className="min-h-screen bg-stone-100 text-zinc-950 transition-colors dark:bg-zinc-950 dark:text-zinc-50">
        <div className="mx-auto flex min-h-screen w-full max-w-[1500px] flex-col px-4 py-4 sm:px-6 lg:px-8">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-300 pb-4 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-normal">ManaForge</h1>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <IconButton
                icon={Languages}
                label={t.languageLabel}
                onClick={() => setLanguage((current) => (current === 'pt' ? 'en' : 'pt'))}
              />
              <IconButton
                icon={theme === 'dark' ? Sun : Moon}
                label={t.themeLabel}
                onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
              />
            </div>
          </header>

          <div className="grid flex-1 gap-4 py-4 lg:grid-cols-[310px_minmax(0,1fr)_390px]">
            <aside className="flex min-h-0 flex-col gap-4">
              <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-panel dark:border-zinc-800 dark:bg-zinc-900">
                <div className="mb-4 flex items-center gap-2">
                  <Archive className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                  <h2 className="text-base font-semibold">{t.decks}</h2>
                </div>

                <form className="space-y-3" onSubmit={handleCreateDeck}>
                  <input
                    value={deckName}
                    onChange={(event) => setDeckName(event.target.value)}
                    className="h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none transition focus:border-zinc-950 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:border-emerald-400"
                    placeholder={t.deckName}
                    required
                  />

                  <div className="grid grid-cols-3 rounded-md border border-zinc-300 bg-zinc-50 p-1 dark:border-zinc-700 dark:bg-zinc-950">
                    {formats.map((format) => (
                      <button
                        key={format}
                        type="button"
                        onClick={() => setDeckFormat(format)}
                        className={`h-9 rounded text-xs font-medium capitalize transition ${
                          deckFormat === format
                            ? 'bg-zinc-950 text-white dark:bg-emerald-500 dark:text-zinc-950'
                            : 'text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50'
                        }`}
                      >
                        {format}
                      </button>
                    ))}
                  </div>

                  <button
                    type="submit"
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 dark:bg-emerald-500 dark:text-zinc-950 dark:hover:bg-emerald-400"
                  >
                    <Plus className="h-4 w-4" />
                    {t.createDeck}
                  </button>
                </form>
              </section>

              <section className="min-h-0 flex-1 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-panel dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-center justify-between border-b border-zinc-200 p-4 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <Library className="h-4 w-4 text-amber-700 dark:text-amber-400" />
                    <h2 className="text-base font-semibold">{t.saved}</h2>
                  </div>
                  <span className="rounded bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    {decks.length}
                  </span>
                </div>

                <div className="max-h-[420px] overflow-y-auto p-2">
                  {decks.map((deck) => (
                    <div
                      key={deck.id}
                      className={`mb-2 grid grid-cols-[minmax(0,1fr)_40px] items-center gap-2 rounded-md border p-2 transition ${
                        activeDeck?.id === deck.id
                          ? 'border-zinc-950 bg-zinc-950 text-white dark:border-emerald-500 dark:bg-emerald-500 dark:text-zinc-950'
                          : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setActiveDeckId(deck.id);
                          setFoundCard(null);
                          setEditions([]);
                        }}
                        className="min-w-0 p-1 text-left"
                      >
                        <span className="block truncate text-sm font-semibold">{deck.name}</span>
                        <span
                          className={`mt-1 block text-xs capitalize ${
                            activeDeck?.id === deck.id ? 'text-zinc-300 dark:text-zinc-800' : 'text-zinc-500 dark:text-zinc-400'
                          }`}
                        >
                          {deck.format} - {deck.cards.length} {t.cards}
                        </span>
                      </button>
                      <IconButton icon={Trash2} label={t.removeDeck} onClick={() => handleDeleteDeck(deck.id)} />
                    </div>
                  ))}

                  {decks.length === 0 && <p className="p-3 text-sm text-zinc-500 dark:text-zinc-400">{t.noDecks}</p>}
                </div>
              </section>
            </aside>

            <section className="min-h-0 rounded-lg border border-zinc-200 bg-white p-4 shadow-panel dark:border-zinc-800 dark:bg-zinc-900">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">{t.cardSearch}</h2>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {t.activeDeck}: {activeDeck?.name ?? t.noActiveDeck}
                  </p>
                </div>
              </div>

              <form className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_150px]" onSubmit={handleSearch}>
                <div className="relative min-w-0">
                  <input
                    value={cardName}
                    onChange={(event) => {
                      setCardName(event.target.value);
                      setSuggestions([]);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(suggestions.length > 0)}
                    onBlur={() => window.setTimeout(() => setShowSuggestions(false), 120)}
                    className="h-11 w-full min-w-0 rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none transition focus:border-zinc-950 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:border-emerald-400"
                    placeholder={t.cardName}
                    autoComplete="off"
                    required
                  />

                  {(loading.suggestions || (showSuggestions && suggestions.length > 0)) && (
                    <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-20 overflow-hidden rounded-md border border-zinc-200 bg-white shadow-panel dark:border-zinc-800 dark:bg-zinc-950">
                      {loading.suggestions && suggestions.length === 0 ? (
                        <div className="flex h-10 items-center px-3 text-sm text-zinc-500 dark:text-zinc-400">
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t.search}
                        </div>
                      ) : (
                        suggestions.map((suggestion) => (
                          <button
                            key={suggestion}
                            type="button"
                            onMouseDown={(event) => {
                              event.preventDefault();
                              handleSuggestionSelect(suggestion);
                            }}
                            className="block h-10 w-full truncate px-3 text-left text-sm transition hover:bg-zinc-100 focus:bg-zinc-100 focus:outline-none dark:hover:bg-zinc-900 dark:focus:bg-zinc-900"
                          >
                            {suggestion}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={loading.search}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-emerald-500 dark:text-zinc-950 dark:hover:bg-emerald-400"
                >
                  {loading.search ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  {t.search}
                </button>
              </form>

              <label className="mt-3 block">
                <span className="mb-2 block text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">{t.edition}</span>
                <select
                  value={cardEdition}
                  onChange={(event) => handleEditionChange(event.target.value)}
                  disabled={!foundCard || loading.edition}
                  className="h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none transition focus:border-zinc-950 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:border-emerald-400"
                >
                  <option value="">{t.automaticEdition}</option>
                  {editionOptions.map((edition) => (
                    <option key={edition.setCode} value={edition.setCode}>
                      {edition.editionName} ({edition.setCode.toUpperCase()})
                    </option>
                  ))}
                </select>
              </label>

              <div className="mt-5 grid gap-5 xl:grid-cols-[270px_minmax(0,1fr)]">
                <div className="aspect-[488/680] overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950">
                  {foundCard?.imageUrl ? (
                    <img src={foundCard.imageUrl} alt={foundCard.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center px-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
                      {t.noCard}
                    </div>
                  )}
                </div>

                <div className="flex min-h-[360px] flex-col rounded-lg border border-zinc-200 bg-stone-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
                  <div className="flex-1">
                    <p className="text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">{t.result}</p>
                    <h3 className="mt-2 text-2xl font-semibold">{foundCard?.name ?? t.card}</h3>

                    <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                      <Info label={t.type} value={foundCard?.type ?? '-'} />
                      <Info label={t.rarity} value={foundCard?.rarity ?? '-'} />
                      <Info label={t.mana} value={foundCard?.manaCost ?? '-'} />
                      <Info
                        label={t.edition}
                        value={foundCard?.setCode ? `${foundCard.editionName} (${foundCard.setCode.toUpperCase()})` : '-'}
                      />
                    </dl>
                  </div>

                  <label className="mt-5 block">
                    <span className="mb-2 block text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">{t.condition}</span>
                    <select
                      value={cardCondition}
                      onChange={(event) => setCardCondition(event.target.value)}
                      className="h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none transition focus:border-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-emerald-400"
                    >
                      {conditions.map((condition) => (
                        <option key={condition.value} value={condition.value}>
                          {condition[language]}
                        </option>
                      ))}
                    </select>
                  </label>

                  <button
                    type="button"
                    disabled={!activeDeck || !foundCard}
                    onClick={handleAddCard}
                    className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-amber-600 px-4 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-amber-400 dark:text-zinc-950 dark:hover:bg-amber-300"
                  >
                    <Plus className="h-4 w-4" />
                    {t.addToDeck}
                  </button>
                </div>
              </div>
            </section>

            <aside className="flex min-h-0 flex-col gap-4">
              <section className="min-h-[360px] rounded-lg border border-zinc-200 bg-white shadow-panel dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-center justify-between border-b border-zinc-200 p-4 dark:border-zinc-800">
                  <div>
                    <h2 className="text-lg font-semibold">{activeDeck?.name ?? 'Deck'}</h2>
                    <p className="text-sm capitalize text-zinc-600 dark:text-zinc-400">
                      {activeDeck?.format ?? '-'} - {activeDeck?.cards.length ?? 0} {t.cards}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <IconButton icon={Clipboard} label={t.copyTxt} onClick={handleCopyText} disabled={!activeDeck || !exportText} />
                    <IconButton icon={FileText} label={t.downloadTxt} onClick={handleDownloadTxt} disabled={!activeDeck} />
                  </div>
                </div>

                <div className="max-h-[420px] overflow-y-auto p-3">
                  {groupedCards.map(({ quantity, card }) => (
                    <div
                      key={getCardEntryKey(card)}
                      className="mb-2 grid grid-cols-[42px_minmax(0,1fr)_40px] gap-3 rounded-md border border-zinc-200 bg-white p-2 dark:border-zinc-800 dark:bg-zinc-950"
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded bg-zinc-950 text-sm font-bold text-white dark:bg-emerald-500 dark:text-zinc-950">
                        {quantity}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{card.name}</p>
                        <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                          {[card.setCode?.toUpperCase(), card.condition, card.type].filter(Boolean).join(' - ')}
                        </p>
                      </div>
                      <IconButton icon={Trash2} label={t.removeCopy} onClick={() => handleRemoveCard(card)} />
                    </div>
                  ))}

                  {groupedCards.length === 0 && <p className="p-3 text-sm text-zinc-500 dark:text-zinc-400">{t.emptyDeck}</p>}
                </div>
              </section>

              <section className="rounded-lg border border-zinc-200 bg-white shadow-panel dark:border-zinc-800 dark:bg-zinc-900">
                <div className="border-b border-zinc-200 p-4 dark:border-zinc-800">
                  <h2 className="text-base font-semibold">{t.decklistTxt}</h2>
                </div>

                <div className="grid gap-3 p-4">
                  <textarea
                    value={exportText}
                    readOnly
                    className="h-56 resize-none rounded-md border border-zinc-300 bg-zinc-50 p-3 font-mono text-xs text-zinc-700 outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200"
                  />
                </div>
              </section>
            </aside>
          </div>
        </div>
      </div>
    </main>
  );
}

function validateCardForDeck(deck, card, t) {
  if (deck.cards.length >= 100) {
    throw new Error(t.deckLimit);
  }

  if (deck.format === 'pauper' && card.rarity !== 'common') {
    throw new Error(t.pauperRule(card.name));
  }
}

function uniqueEditions(editions) {
  const seen = new Map();

  for (const edition of editions) {
    if (!seen.has(edition.setCode)) {
      seen.set(edition.setCode, edition);
    }
  }

  return Array.from(seen.values());
}

function isSameCardEntry(card, reference) {
  return getCardEntryKey(card) === getCardEntryKey(reference);
}

function getCardEntryKey(card) {
  return [card.name, card.setCode ?? '', card.condition ?? ''].join('|');
}

function Info({ label, value }) {
  return (
    <div className="rounded-md border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
      <dt className="text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium text-zinc-950 dark:text-zinc-50">{value}</dd>
    </div>
  );
}

function slug(value) {
  return (
    value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'deck'
  );
}

export default App;
