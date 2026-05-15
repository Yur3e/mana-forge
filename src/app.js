import express from 'express';
import cors from 'cors';
import cardRoutes from './interfaces/http/routes/cardRoutes.js';
import deckRoutes from './interfaces/http/routes/deckRoutes.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/cards', cardRoutes);
app.use('/api/decks', deckRoutes);

export { app };
