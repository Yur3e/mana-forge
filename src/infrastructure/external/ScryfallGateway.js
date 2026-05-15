import axios from 'axios';
import { Card } from '../../domain/entities/Card.js';

export class ScryfallGateway {
  constructor() {
    this.api = axios.create({
      baseURL: 'https://api.scryfall.com',
      timeout: 10000
    });
  }

  async searchCardByName(name, edition) {
    try {
      const params = { fuzzy: name };
      if (edition) params.set = edition.toLowerCase();

      const response = await this.api.get('/cards/named', {
        params
      });
      const data = response.data;

      return new Card({
        id: data.id,
        name: data.name,
        type: data.type_line,
        rarity: data.rarity,
        manaCost: data.mana_cost,
        imageUrl: data.image_uris?.normal,
        setCode: data.set,
        editionName: data.set_name,
        collectorNumber: data.collector_number
      });
    } catch (error) {
      if (error.response?.status === 404) return null;

      const providerError = new Error("Falha na comunicacao com o provedor de dados.");
      providerError.statusCode = 502;
      throw providerError;
    }
  }
}
