export function groupCards(cards = []) {
  const grouped = new Map();

  for (const card of cards) {
    const key = getCardGroupKey(card);
    const current = grouped.get(key);
    if (current) {
      current.quantity += 1;
      continue;
    }

    grouped.set(key, {
      quantity: 1,
      card
    });
  }

  return Array.from(grouped.values()).sort((a, b) =>
    a.card.name.localeCompare(b.card.name)
  );
}

export function deckToExportJson(deck) {
  return {
    name: deck?.name ?? '',
    format: deck?.format ?? '',
    cards: groupCards(deck?.cards).map(({ quantity, card }) => ({
      quantity,
      name: card.name,
      setCode: card.setCode ?? '',
      editionName: card.editionName ?? '',
      condition: card.condition ?? ''
    }))
  };
}

export function deckJsonToText(deckJson) {
  return (deckJson?.cards ?? [])
    .map((item) => formatDeckLine(item))
    .join('\n');
}

function getCardGroupKey(card) {
  return [
    card.name,
    card.setCode ?? '',
    card.condition ?? ''
  ].join('|');
}

function formatDeckLine(item) {
  const setCode = item.setCode ? ` [${item.setCode.toUpperCase()}]` : '';
  const condition = item.condition ? ` (${item.condition})` : '';

  return `${item.quantity} ${item.name}${setCode}${condition}`;
}

export function downloadTextFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}
