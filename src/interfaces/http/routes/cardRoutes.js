import { Router } from 'express';
import { search } from '../CardController.js';

const router = Router();

router.get('/', search);
router.get('/search', search);

export default router;
