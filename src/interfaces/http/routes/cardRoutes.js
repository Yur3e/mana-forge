import { Router } from 'express';
import { prints, search } from '../CardController.js';

const router = Router();

router.get('/', search);
router.get('/search', search);
router.get('/prints', prints);

export default router;
