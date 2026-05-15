export class InMemoryDeckRepository {
  constructor() {
    this.decks = new Map();
  }

  save(deck) {
    this.decks.set(deck.id, deck);
    return deck;
  }

  findById(id) {
    return this.decks.get(id) ?? null;
  }

  findAll() {
    return Array.from(this.decks.values());
  }
}
