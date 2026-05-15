import { Router } from 'express';
import { prints, search, suggestions } from '../CardController.js';

const router = Router();

router.get('/', search);
router.get('/search', search);
router.get('/suggestions', suggestions);
router.get('/prints', prints);

export default router;
