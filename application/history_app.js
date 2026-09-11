'use strict';

const { HistoryFacade } = require('../domain/facade/history_facade');
const { HistoryEntry } = require('../domain/entity/history_entry');
const { SaveHistoryCmd } = require('../domain/cqe/save_history_cmd');
const di = require('../di');

/**
 * history-app —— 应用层用例：历史记录
 * repository 由组合根注入，单测时换成内存实现即可在 CI 跑。
 */

function nextId() {
  return 'h_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

function formatTime(ts) {
  const date = new Date(ts);
  const pad = function (n) {
    return n < 10 ? '0' + n : String(n);
  };
  return (
    date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) +
    ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes())
  );
}

function toView(entry) {
  const snapshot = entry.toSnapshot();
  return {
    id: snapshot.id,
    expr: snapshot.expression,
    result: entry.result.toDisplay(),
    createdAt: snapshot.createdAt,
    timeText: formatTime(snapshot.createdAt),
  };
}

/** @param {SaveHistoryCmd|{expression: string, result: string}} raw */
async function save(raw) {
  const cmd = raw instanceof SaveHistoryCmd ? raw : SaveHistoryCmd.from(raw);
  const entry = HistoryEntry.create({
    id: nextId(),
    expression: cmd.expression,
    result: cmd.result,
  });
  const facade = new HistoryFacade(di.historyRepository());
  await facade.save(entry);
  return toView(entry);
}

async function list() {
  const facade = new HistoryFacade(di.historyRepository());
  const entries = await facade.list();
  return entries.map(toView);
}

async function remove(id) {
  const facade = new HistoryFacade(di.historyRepository());
  await facade.remove(id);
  return true;
}

async function clear() {
  const facade = new HistoryFacade(di.historyRepository());
  await facade.clear();
  return true;
}

module.exports = { save, list, remove, clear };
