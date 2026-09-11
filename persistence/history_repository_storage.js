'use strict';

const { HistoryRepository } = require('../domain/repository/history_repository');
const { HistoryRetentionService } = require('../domain/service/history_retention_service');
const { fromEntities, toEntities } = require('./serializers/history_serializer');
const storage = require('../infrastructure/wx_storage');

const KEY = 'calc_history_v1';

/**
 * HistoryRepositoryStorage —— 仓储的本地实现（persistence 层）
 *
 * 实现 domain 定义的仓储契约；底层走 infrastructure/wx-storage（防腐层），
 * 存取格式由 persistence/serializers/history_serializer 负责。
 * 领域规则（去重/上限）在 HistoryRetentionService，这里只负责「读-改-写」编排。
 */
class HistoryRepositoryStorage extends HistoryRepository {
  async all() {
    const raw = await storage.get(KEY);
    return toEntities(raw);
  }

  async save(entry) {
    const list = await this.all();
    const next = HistoryRetentionService.merge(list, entry);
    await this.replaceAll(next);
    return entry;
  }

  async replaceAll(entries) {
    await storage.set(KEY, fromEntities(entries));
    return true;
  }

  async remove(id) {
    const list = await this.all();
    const next = list.filter(function (item) {
      return item.id !== id;
    });
    await this.replaceAll(next);
    return true;
  }

  async clear() {
    await storage.remove(KEY);
    return true;
  }
}

module.exports = { HistoryRepositoryStorage, KEY };
