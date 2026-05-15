export class GetDeckUseCase {
  constructor(deckRepository) {
    this.deckRepository = deckRepository;
  }

  execute(id) {
    return this.deckRepository.findById(id);
  }
}
