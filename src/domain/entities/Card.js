export class Card {
  constructor({ id, name, type, rarity, manaCost, imageUrl, setCode, editionName, collectorNumber }) {
    if (!name) throw new Error("O nome da carta e obrigatorio.");
    
    this.id = id;
    this.name = name;
    this.type = type;
    this.rarity = rarity;
    this.manaCost = manaCost;
    this.imageUrl = imageUrl;
    this.setCode = setCode;
    this.editionName = editionName;
    this.collectorNumber = collectorNumber;
  }
}
