import { ScryfallGateway } from '../../infrastructure/external/ScryfallGateway.js';
import { SearchCardUseCase } from '../../application/use-cases/SearchCardUseCase.js';

const searchCardUseCase = new SearchCardUseCase(new ScryfallGateway());

export const search = async (req, res) => {
  const { name, edition } = req.query;

  if (!name) {
    return res.status(400).json({ error: "Parametro 'name' e obrigatorio." });
  }

  try {
    const card = await searchCardUseCase.execute({ name, edition });
    
    if (!card) {
      return res.status(404).json({ message: "Nenhuma carta encontrada com esse nome." });
    }

    return res.json(card);
  } catch (error) {
    return res.status(error.statusCode ?? 500).json({ error: error.message });
  }
};
