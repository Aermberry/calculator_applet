'use strict';

const { HistoryEntry } = require('../../domain/entity/history_entry');

/**
 * history-serializer —— 存取格式的唯一归属地（persistence 层）
 *
 * 存储格式版本化（v1）：将来改结构只动这里，domain 与 ui 零感知。
 * 违反「格式只在此层」的铁律 = 把 DTO 泄露到 domain，会导致换存储时全网改造。
 */

const VERSION = 1;

function fromEntities(entries) {
  return {
    v: VERSION,
    items: (entries || []).map(function (entry) {
      return entry.toSnapshot();
    }),
  };
}

function toEntities(raw) {
  if (!raw) return [];
  const items = raw.items || [];
  if (!Array.isArray(items)) return [];
  const result = [];
  items.forEach(function (item) {
    try {
      result.push(HistoryEntry.create({
        id: item.id,
        expression: item.expression,
        result: item.result,
        createdAt: item.createdAt,
      }));
    } catch (e) {
      // 单条脏数据不影响整体读取（存储被手工改坏时的兜底）
    }
  });
  return result;
}

module.exports = { fromEntities, toEntities, VERSION };
