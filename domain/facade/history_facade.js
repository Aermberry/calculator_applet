'use strict';

const { HistoryRetentionService } = require('../service/history_retention_service');

/**
 * HistoryFacade —— 历史模块对外收口
 * 依赖注入 repository（domain 接口），单测时 mock 实现即可在 CI 跑。
 */
class HistoryFacade {
  constructor(repository) {
    if (!repository) throw new Error('HistoryFacade 需要 repository');
    this._repository = repository;
  }

  /** 写入一条历史（含去重 + 上限裁剪） */
  async save(entry) {
    const list = await this._repository.all();
    const next = HistoryRetentionService.merge(list, entry);
    await this._repository.replaceAll(next);
    return entry;
  }

  async list() {
    return this._repository.all();
  }

  async remove(id) {
    return this._repository.remove(id);
  }

  async clear() {
    return this._repository.clear();
  }
}

module.exports = { HistoryFacade };
