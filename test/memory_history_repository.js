'use strict';

const { HistoryRepository } = require('../domain/repository/history_repository');
const { HistoryRetentionService } = require('../domain/service/history_retention_service');
const { fromEntities, toEntities } = require('../persistence/serializers/history_serializer');

/**
 * MemoryHistoryRepository —— 单测用的内存仓储实现
 *
 * 直接实现 domain 的仓储契约，不依赖 wx.*，用于在 CI / 本地 Node 跑应用层单测，
 * 通过 di.setHistoryRepository 注入，验证「换存储实现不影响业务」这一分层承诺。
 */
class MemoryHistoryRepository extends HistoryRepository {
  constructor() {
    super();
    this._raw = null;
  }

  async all() {
    return toEntities(this._raw);
  }

  async save(entry) {
    const list = await this.all();
    const next = HistoryRetentionService.merge(list, entry);
    await this.replaceAll(next);
    return entry;
  }

  async replaceAll(entries) {
    this._raw = fromEntities(entries);
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
    this._raw = null;
    return true;
  }
}

module.exports = { MemoryHistoryRepository };
