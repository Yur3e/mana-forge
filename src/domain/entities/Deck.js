export class Deck {
  constructor({ id, name, format }) {
    if (!name) throw new Error("O nome do deck e obrigatorio.");
    if (!format) throw new Error("O formato do deck e obrigatorio.");

    this.id = id;
    this.name = name;
    this.format = format.toLowerCase();
    this.cards = [];
  }

  addCard(card) {
    if (this.format === 'pauper' && card.rarity !== 'common') {
      throw new Error(`A carta ${card.name} nao e permitida no formato Pauper (Raridade: ${card.rarity}).`);
    }

    if (this.cards.length >= 100) {
      throw new Error("Limite maximo de cartas no deck atingido.");
    }

    this.cards.push(card);
  }
}
