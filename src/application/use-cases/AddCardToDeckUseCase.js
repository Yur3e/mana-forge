export class AddCardToDeckUseCase {
  constructor({ deckRepository, searchCardUseCase }) {
    this.deckRepository = deckRepository;
    this.searchCardUseCase = searchCardUseCase;
  }

  async execute({ deckId, cardName }) {
    if (!cardName) {
      throw new Error("O nome da carta e obrigatorio.");
    }

    const deck = this.deckRepository.findById(deckId);
    if (!deck) {
      return null;
    }

    const card = await this.searchCardUseCase.execute(cardName);
    if (!card) {
      const error = new Error("Carta nao encontrada.");
      error.statusCode = 404;
      throw error;
    }

    deck.addCard(card);
    this.deckRepository.save(deck);

    return deck;
  }
}
