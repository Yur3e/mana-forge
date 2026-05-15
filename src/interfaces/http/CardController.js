import { ScryfallGateway } from '../../infrastructure/external/ScryfallGateway.js';
import { SearchCardUseCase } from '../../application/use-cases/SearchCardUseCase.js';

const scryfallGateway = new ScryfallGateway();
const searchCardUseCase = new SearchCardUseCase(scryfallGateway);

export const search = async (req, res) => {
  const { name, edition } = req.query;

  if (!name) {
    return res.status(400).json({ error: "Parâmetro 'name' é obrigatório." });
  }

  try {
    const card = await searchCardUseCase.execute({ name, edition });

    if (!card) {
      return res.status(404).json({ message: 'Nenhuma carta encontrada com esse nome.' });
    }

    return res.json(card);
  } catch (error) {
    return res.status(error.statusCode ?? 500).json({ error: error.message });
  }
};

export const prints = async (req, res) => {
  const { name } = req.query;

  if (!name) {
    return res.status(400).json({ error: "Parâmetro 'name' é obrigatório." });
  }

  try {
    const editions = await scryfallGateway.listPrintsByName(name);
    return res.json(editions);
  } catch (error) {
    return res.status(error.statusCode ?? 500).json({ error: error.message });
  }
};

export const suggestions = async (req, res) => {
  const { name } = req.query;

  if (!name) {
    return res.status(400).json({ error: "Parâmetro 'name' é obrigatório." });
  }

  try {
    const cardNames = await scryfallGateway.suggestNames(name);
    return res.json(cardNames);
  } catch (error) {
    return res.status(error.statusCode ?? 500).json({ error: error.message });
  }
};
