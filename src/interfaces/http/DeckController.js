import { ScryfallGateway } from '../../infrastructure/external/ScryfallGateway.js';
import { InMemoryDeckRepository } from '../../infrastructure/repositories/InMemoryDeckRepository.js';
import { SearchCardUseCase } from '../../application/use-cases/SearchCardUseCase.js';
import { CreateDeckUseCase } from '../../application/use-cases/CreateDeckUseCase.js';
import { GetDeckUseCase } from '../../application/use-cases/GetDeckUseCase.js';
import { ListDecksUseCase } from '../../application/use-cases/ListDecksUseCase.js';
import { AddCardToDeckUseCase } from '../../application/use-cases/AddCardToDeckUseCase.js';

const deckRepository = new InMemoryDeckRepository();
const searchCardUseCase = new SearchCardUseCase(new ScryfallGateway());

const createDeckUseCase = new CreateDeckUseCase(deckRepository);
const getDeckUseCase = new GetDeckUseCase(deckRepository);
const listDecksUseCase = new ListDecksUseCase(deckRepository);
const addCardToDeckUseCase = new AddCardToDeckUseCase({
  deckRepository,
  searchCardUseCase
});

export const create = (req, res) => {
  const { name, format } = req.body;

  try {
    const deck = createDeckUseCase.execute({ name, format });
    return res.status(201).json(deck);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

export const list = (_req, res) => {
  const decks = listDecksUseCase.execute();
  return res.json(decks);
};

export const getById = (req, res) => {
  const deck = getDeckUseCase.execute(req.params.id);

  if (!deck) {
    return res.status(404).json({ message: "Deck não encontrado." });
  }

  return res.json(deck);
};

export const addCard = async (req, res) => {
  const { name } = req.body;

  try {
    const deck = await addCardToDeckUseCase.execute({
      deckId: req.params.id,
      cardName: name
    });

    if (!deck) {
      return res.status(404).json({ message: "Deck não encontrado." });
    }

    return res.json(deck);
  } catch (error) {
    if (error.statusCode === 404) {
      return res.status(404).json({ message: error.message });
    }

    return res.status(error.statusCode ?? 400).json({ error: error.message });
  }
};

