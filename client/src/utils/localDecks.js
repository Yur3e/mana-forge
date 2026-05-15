const STORAGE_KEY = 'manaforge:decks';

export function loadDecks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveDecks(decks) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(decks));
}

export function createLocalDeck({ name, format }) {
  return {
    id: crypto.randomUUID(),
    name,
    format: format.toLowerCase(),
    cards: []
  };
}
