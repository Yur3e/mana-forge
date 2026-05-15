import { Router } from 'express';
import { addCard, create, getById, list } from '../DeckController.js';

const router = Router();

router.post('/', create);
router.get('/', list);
router.get('/:id', getById);
router.post('/:id/cards', addCard);

export default router;
