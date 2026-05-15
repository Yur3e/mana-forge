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

      const response = await this.api.get('/cards/named', { params });
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

      const providerError = new Error('Falha na comunicação com o provedor de dados.');
      providerError.statusCode = 502;
      throw providerError;
    }
  }

  async listPrintsByName(name) {
    try {
      const response = await this.api.get('/cards/search', {
        params: {
          q: `!"${name}"`,
          unique: 'prints',
          order: 'released'
        }
      });

      return response.data.data.map((data) => ({
        id: data.id,
        name: data.name,
        setCode: data.set,
        editionName: data.set_name,
        collectorNumber: data.collector_number,
        releasedAt: data.released_at,
        imageUrl: data.image_uris?.normal
      }));
    } catch (error) {
      if (error.response?.status === 404) return [];

      const providerError = new Error('Falha na comunicação com o provedor de dados.');
      providerError.statusCode = 502;
      throw providerError;
    }
  }

  async suggestNames(name) {
    try {
      const response = await this.api.get('/cards/autocomplete', {
        params: { q: name }
      });

      return response.data.data ?? [];
    } catch (error) {
      if (error.response?.status === 404) return [];

      const providerError = new Error('Falha na comunicação com o provedor de dados.');
      providerError.statusCode = 502;
      throw providerError;
    }
  }
}
