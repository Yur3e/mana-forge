export class SearchCardUseCase {
  constructor(cardGateway) {
    this.cardGateway = cardGateway;
  }

  async execute(input) {
    const { name, edition } = normalizeInput(input);

    if (!name) {
      const error = new Error("O nome da carta é obrigatório.");
      error.statusCode = 400;
      throw error;
    }

    return this.cardGateway.searchCardByName(name, edition);
  }
}

function normalizeInput(input) {
  if (typeof input === 'string') {
    return { name: input.trim(), edition: '' };
  }

  return {
    name: input?.name?.trim() ?? '',
    edition: input?.edition?.trim() ?? ''
  };
}

