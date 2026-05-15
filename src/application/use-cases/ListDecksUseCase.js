export class ListDecksUseCase {
  constructor(deckRepository) {
    this.deckRepository = deckRepository;
  }

  execute() {
    return this.deckRepository.findAll();
  }
}
