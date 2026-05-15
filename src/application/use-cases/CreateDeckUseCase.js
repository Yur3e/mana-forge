import { randomUUID } from 'crypto';
import { Deck } from '../../domain/entities/Deck.js';

export class CreateDeckUseCase {
  constructor(deckRepository) {
    this.deckRepository = deckRepository;
  }

  execute({ name, format }) {
    const deck = new Deck({
      id: randomUUID(),
      name,
      format
    });

    this.deckRepository.save(deck);
    return deck;
  }
}
