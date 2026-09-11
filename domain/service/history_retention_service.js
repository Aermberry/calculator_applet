'use strict';

/**
 * HistoryRetentionService —— 领域服务（跨实体的集合规则）
 *
 * 「最多保留 100 条」「重复表达式只留最新」是业务规则，
 * 既不属于某个 HistoryEntry，也不该散落在页面里，因此收在本服务。
 */

const MAX_RECORDS = 100;

class HistoryRetentionService {
  /**
   * 把新记录并入历史列表（列表 newest-first）
   * @param {Array} list 已有记录
   * @param {Object} entry 新记录
   * @returns {Array} 应用规则后的新列表
   */
  static merge(list, entry) {
    const source = Array.isArray(list) ? list : [];
    const rest = source.filter(function (item) {
      return !item.sameExpressionAs(entry);
    });
    return [entry].concat(rest).slice(0, MAX_RECORDS);
  }

  static maxRecords() {
    return MAX_RECORDS;
  }
}

module.exports = { HistoryRetentionService, MAX_RECORDS };
