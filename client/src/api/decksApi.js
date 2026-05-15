import { request } from './http';

export function createDeck({ name, format }) {
  return request('/api/decks', {
    method: 'POST',
    body: JSON.stringify({ name, format })
  });
}

export function listDecks() {
  return request('/api/decks');
}

export function getDeck(id) {
  return request(`/api/decks/${id}`);
}

export function addCardToDeck(deckId, name) {
  return request(`/api/decks/${deckId}/cards`, {
    method: 'POST',
    body: JSON.stringify({ name })
  });
}
