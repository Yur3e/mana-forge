import { useEffect, useMemo, useState } from 'react';
import {
  Archive,
  Clipboard,
  FileText,
  Library,
  Loader2,
  Plus,
  Search,
  Sparkles,
  Trash2
} from 'lucide-react';
import { searchCard } from './api/cardsApi';
import { deckJsonToText, deckToExportJson, downloadTextFile, groupCards } from './utils/deckExport';
import { createLocalDeck, loadDecks, saveDecks } from './utils/localDecks';
import { IconButton } from './components/IconButton';

const formats = ['commander', 'pauper', 'standard'];
const conditions = [
  { value: '', label: 'Sem estado' },
  { value: 'NM', label: 'Near Mint' },
  { value: 'LP', label: 'Lightly Played' },
  { value: 'MP', label: 'Moderately Played' },
  { value: 'HP', label: 'Heavily Played' },
  { value: 'DMG', label: 'Damaged' }
];

function App() {
  const [decks, setDecks] = useState([]);
  const [activeDeckId, setActiveDeckId] = useState(null);
  const [deckName, setDeckName] = useState('');
  const [deckFormat, setDeckFormat] = useState('commander');
  const [cardName, setCardName] = useState('');
  const [cardEdition, setCardEdition] = useState('');
  const [cardCondition, setCardCondition] = useState('');
  const [foundCard, setFoundCard] = useState(null);
  const [loading, setLoading] = useState({ search: false });
  const [notice, setNotice] = useState({ type: 'idle', text: '' });

  const activeDeck = useMemo(
    () => decks.find((deck) => deck.id === activeDeckId) ?? decks[0] ?? null,
    [activeDeckId, decks]
  );
  const exportJson = useMemo(() => deckToExportJson(activeDeck), [activeDeck]);
  const exportText = useMemo(() => deckJsonToText(exportJson), [exportJson]);
  const groupedCards = useMemo(() => groupCards(activeDeck?.cards), [activeDeck]);

  useEffect(() => {
    const storedDecks = loadDecks();
    setDecks(storedDecks);
    setActiveDeckId(storedDecks[0]?.id ?? null);
  }, []);

  useEffect(() => {
    saveDecks(decks);
  }, [decks]);

  function handleCreateDeck(event) {
    event.preventDefault();

    if (!deckName.trim()) {
      showError('Informe o nome do deck.');
      return;
    }

    const deck = createLocalDeck({
      name: deckName.trim(),
      format: deckFormat
    });

    setDecks((current) => [deck, ...current]);
    setActiveDeckId(deck.id);
    setDeckName('');
    showSuccess('Deck criado no navegador.');
  }

  async function handleSearch(event) {
    event.preventDefault();

    if (!cardName.trim()) {
      showError('Informe o nome da carta.');
      return;
    }

    setLoading({ search: true });

    try {
      const card = await searchCard({
        name: cardName.trim(),
        edition: cardEdition.trim()
      });
      setFoundCard(card);
      showSuccess('Carta encontrada.');
    } catch (error) {
      setFoundCard(null);
      showError(error.message);
    } finally {
      setLoading({ search: false });
    }
  }

  function handleAddCard() {
    if (!activeDeck || !foundCard) return;

    try {
      validateCardForDeck(activeDeck, foundCard);
      const cardToAdd = {
        ...foundCard,
        condition: cardCondition || ''
      };

      const updatedDeck = {
        ...activeDeck,
        cards: [...activeDeck.cards, cardToAdd]
      };

      setDecks((current) =>
        current.map((deck) => (deck.id === updatedDeck.id ? updatedDeck : deck))
      );
      showSuccess('Carta adicionada.');
    } catch (error) {
      showError(error.message);
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

    setDecks((current) =>
      current.map((deck) => (deck.id === updatedDeck.id ? updatedDeck : deck))
    );
    showSuccess('Carta removida.');
  }

  function handleDeleteDeck(deckId) {
    const nextDecks = decks.filter((deck) => deck.id !== deckId);

    setDecks(nextDecks);
    setActiveDeckId(nextDecks[0]?.id ?? null);
    showSuccess('Deck removido.');
  }

  async function handleCopyText() {
    if (!activeDeck || !exportText) return;

    await navigator.clipboard.writeText(exportText);
    showSuccess('Decklist copiada.');
  }

  function handleDownloadTxt() {
    if (!activeDeck) return;

    downloadTextFile(`${slug(activeDeck.name)}.txt`, exportText, 'text/plain');
  }

  function showSuccess(text) {
    setNotice({ type: 'success', text });
  }

  function showError(text) {
    setNotice({ type: 'error', text });
  }

  return (
    <main className="min-h-screen bg-stone-100 text-zinc-950">
      <div className="mx-auto flex min-h-screen w-full max-w-[1500px] flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-300 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-md bg-zinc-950 text-white">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-normal">ManaForge</h1>
              <p className="text-sm text-zinc-600">Deck builder com exportacao TXT</p>
            </div>
          </div>

          {notice.text && (
            <div
              className={`rounded-md border px-3 py-2 text-sm ${
                notice.type === 'error'
                  ? 'border-red-200 bg-red-50 text-red-700'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700'
              }`}
            >
              {notice.text}
            </div>
          )}
        </header>

        <div className="grid flex-1 gap-4 py-4 lg:grid-cols-[310px_minmax(0,1fr)_390px]">
          <aside className="flex min-h-0 flex-col gap-4">
            <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-panel">
              <div className="mb-4 flex items-center gap-2">
                <Archive className="h-4 w-4 text-emerald-700" />
                <h2 className="text-base font-semibold">Decks</h2>
              </div>

              <form className="space-y-3" onSubmit={handleCreateDeck}>
                <input
                  value={deckName}
                  onChange={(event) => setDeckName(event.target.value)}
                  className="h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none transition focus:border-zinc-950"
                  placeholder="Nome do deck"
                />

                <div className="grid grid-cols-3 rounded-md border border-zinc-300 bg-zinc-50 p-1">
                  {formats.map((format) => (
                    <button
                      key={format}
                      type="button"
                      onClick={() => setDeckFormat(format)}
                      className={`h-9 rounded text-xs font-medium capitalize transition ${
                        deckFormat === format
                          ? 'bg-zinc-950 text-white'
                          : 'text-zinc-600 hover:text-zinc-950'
                      }`}
                    >
                      {format}
                    </button>
                  ))}
                </div>

                <button
                  type="submit"
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800"
                >
                  <Plus className="h-4 w-4" />
                  Criar deck
                </button>
              </form>
            </section>

            <section className="min-h-0 flex-1 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-panel">
              <div className="flex items-center justify-between border-b border-zinc-200 p-4">
                <div className="flex items-center gap-2">
                  <Library className="h-4 w-4 text-amber-700" />
                  <h2 className="text-base font-semibold">Salvos</h2>
                </div>
                <span className="rounded bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-600">
                  {decks.length}
                </span>
              </div>

              <div className="max-h-[420px] overflow-y-auto p-2">
                {decks.map((deck) => (
                  <div
                    key={deck.id}
                    className={`mb-2 grid grid-cols-[minmax(0,1fr)_40px] items-center gap-2 rounded-md border p-2 transition ${
                      activeDeck?.id === deck.id
                        ? 'border-zinc-950 bg-zinc-950 text-white'
                        : 'border-zinc-200 bg-white'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setActiveDeckId(deck.id);
                        setFoundCard(null);
                      }}
                      className="min-w-0 p-1 text-left"
                    >
                      <span className="block truncate text-sm font-semibold">{deck.name}</span>
                      <span
                        className={`mt-1 block text-xs capitalize ${
                          activeDeck?.id === deck.id ? 'text-zinc-300' : 'text-zinc-500'
                        }`}
                      >
                        {deck.format} - {deck.cards.length} cartas
                      </span>
                    </button>
                    <IconButton
                      icon={Trash2}
                      label="Remover deck"
                      onClick={() => handleDeleteDeck(deck.id)}
                      className={activeDeck?.id === deck.id ? 'border-zinc-700 bg-zinc-900 text-zinc-200' : ''}
                    />
                  </div>
                ))}

                {decks.length === 0 && (
                  <p className="p-3 text-sm text-zinc-500">Nenhum deck criado.</p>
                )}
              </div>
            </section>
          </aside>

          <section className="min-h-0 rounded-lg border border-zinc-200 bg-white p-4 shadow-panel">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Busca de carta</h2>
                <p className="text-sm text-zinc-600">Deck ativo: {activeDeck?.name ?? 'nenhum'}</p>
              </div>
            </div>

            <form className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_150px_120px]" onSubmit={handleSearch}>
              <input
                value={cardName}
                onChange={(event) => setCardName(event.target.value)}
                className="h-11 min-w-0 rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none transition focus:border-zinc-950"
                placeholder="Nome da carta"
              />
              <input
                value={cardEdition}
                onChange={(event) => setCardEdition(event.target.value)}
                className="h-11 min-w-0 rounded-md border border-zinc-300 bg-white px-3 text-sm uppercase outline-none transition focus:border-zinc-950"
                placeholder="Edicao"
              />
              <button
                type="submit"
                disabled={loading.search}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading.search ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Buscar
              </button>
            </form>

            <div className="mt-5 grid gap-5 xl:grid-cols-[270px_minmax(0,1fr)]">
              <div className="aspect-[488/680] overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100">
                {foundCard?.imageUrl ? (
                  <img src={foundCard.imageUrl} alt={foundCard.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center px-6 text-center text-sm text-zinc-500">
                    Nenhuma carta selecionada.
                  </div>
                )}
              </div>

              <div className="flex min-h-[360px] flex-col rounded-lg border border-zinc-200 bg-stone-50 p-4">
                <div className="flex-1">
                  <p className="text-xs font-semibold uppercase text-zinc-500">Resultado</p>
                  <h3 className="mt-2 text-2xl font-semibold">{foundCard?.name ?? 'Carta'}</h3>

                  <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                    <Info label="Tipo" value={foundCard?.type ?? '-'} />
                    <Info label="Raridade" value={foundCard?.rarity ?? '-'} />
                    <Info label="Mana" value={foundCard?.manaCost ?? '-'} />
                    <Info
                      label="Edicao"
                      value={foundCard?.setCode ? `${foundCard.editionName} (${foundCard.setCode.toUpperCase()})` : '-'}
                    />
                  </dl>
                </div>

                <label className="mt-5 block">
                  <span className="mb-2 block text-xs font-semibold uppercase text-zinc-500">Estado opcional</span>
                  <select
                    value={cardCondition}
                    onChange={(event) => setCardCondition(event.target.value)}
                    className="h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none transition focus:border-zinc-950"
                  >
                    {conditions.map((condition) => (
                      <option key={condition.value} value={condition.value}>
                        {condition.label}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  type="button"
                  disabled={!activeDeck || !foundCard}
                  onClick={handleAddCard}
                  className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-amber-600 px-4 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                  Adicionar ao deck
                </button>
              </div>
            </div>
          </section>

          <aside className="flex min-h-0 flex-col gap-4">
            <section className="min-h-[360px] rounded-lg border border-zinc-200 bg-white shadow-panel">
              <div className="flex items-center justify-between border-b border-zinc-200 p-4">
                <div>
                  <h2 className="text-lg font-semibold">{activeDeck?.name ?? 'Deck'}</h2>
                  <p className="text-sm capitalize text-zinc-600">
                    {activeDeck?.format ?? '-'} - {activeDeck?.cards.length ?? 0} cartas
                  </p>
                </div>

                <div className="flex gap-2">
                  <IconButton icon={Clipboard} label="Copiar TXT" onClick={handleCopyText} disabled={!activeDeck || !exportText} />
                  <IconButton icon={FileText} label="Baixar TXT" onClick={handleDownloadTxt} disabled={!activeDeck} />
                </div>
              </div>

              <div className="max-h-[420px] overflow-y-auto p-3">
                {groupedCards.map(({ quantity, card }) => (
                  <div
                    key={getCardEntryKey(card)}
                    className="mb-2 grid grid-cols-[42px_minmax(0,1fr)_40px] gap-3 rounded-md border border-zinc-200 bg-white p-2"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded bg-zinc-950 text-sm font-bold text-white">
                      {quantity}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{card.name}</p>
                      <p className="truncate text-xs text-zinc-500">
                        {[card.setCode?.toUpperCase(), card.condition, card.type].filter(Boolean).join(' - ')}
                      </p>
                    </div>
                    <IconButton icon={Trash2} label="Remover uma copia" onClick={() => handleRemoveCard(card)} />
                  </div>
                ))}

                {groupedCards.length === 0 && <p className="p-3 text-sm text-zinc-500">Deck vazio.</p>}
              </div>
            </section>

            <section className="rounded-lg border border-zinc-200 bg-white shadow-panel">
              <div className="border-b border-zinc-200 p-4">
                <h2 className="text-base font-semibold">Decklist TXT</h2>
              </div>

              <div className="grid gap-3 p-4">
                <textarea
                  value={exportText}
                  readOnly
                  className="h-56 resize-none rounded-md border border-zinc-300 bg-zinc-50 p-3 font-mono text-xs text-zinc-700 outline-none"
                />
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

function validateCardForDeck(deck, card) {
  if (deck.cards.length >= 100) {
    throw new Error('Limite maximo de cartas no deck atingido.');
  }

  if (deck.format === 'pauper' && card.rarity !== 'common') {
    throw new Error(`A carta ${card.name} nao e permitida no formato Pauper.`);
  }
}

function isSameCardEntry(card, reference) {
  return getCardEntryKey(card) === getCardEntryKey(reference);
}

function getCardEntryKey(card) {
  return [card.name, card.setCode ?? '', card.condition ?? ''].join('|');
}

function Info({ label, value }) {
  return (
    <div className="rounded-md border border-zinc-200 bg-white p-3">
      <dt className="text-xs font-semibold uppercase text-zinc-500">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium text-zinc-950">{value}</dd>
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
