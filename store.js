'use strict';
// Small JSON-file store. Good for a first launch with a few thousand orders.
// For heavy traffic move this module to SQLite or Postgres: keep the same four functions.
const fs = require('fs');
const path = require('path');

function createStore(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  let orders = {};
  try {
    orders = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
  const byCard = {};
  Object.values(orders).forEach((o) => { byCard[o.cardId] = o.id; });

  let writing = Promise.resolve();
  function persist() {
    writing = writing
      .then(() => {
        const tmp = file + '.tmp';
        return fs.promises.writeFile(tmp, JSON.stringify(orders)).then(() => fs.promises.rename(tmp, file));
      })
      .catch((err) => console.error('store write failed:', err.message));
    return writing;
  }

  return {
    get: (id) => orders[id] || null,
    getByCard: (cardId) => (byCard[cardId] ? orders[byCard[cardId]] : null),
    all: () => Object.values(orders),
    put(order) {
      orders[order.id] = order;
      byCard[order.cardId] = order.id;
      return persist();
    },
    remove(id) {
      const o = orders[id];
      if (!o) return Promise.resolve();
      delete byCard[o.cardId];
      delete orders[id];
      return persist();
    }
  };
}

module.exports = createStore;
