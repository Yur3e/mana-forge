import { request } from './http';

export function searchCard({ name, edition = '' }) {
  const params = new URLSearchParams({ name });

  if (edition) {
    params.set('edition', edition);
  }

  return request(`/api/cards?${params.toString()}`);
}

export function listCardPrints(name) {
  const params = new URLSearchParams({ name });
  return request(`/api/cards/prints?${params.toString()}`);
}
