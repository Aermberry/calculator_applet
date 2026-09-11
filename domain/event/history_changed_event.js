'use strict';

/**
 * HistoryChangedEvent —— 领域事件（预留位）
 *
 * 二期启用云端同步 / 埋点聚合时，由 facade 或 application 发布，
 * 订阅方在 application 层。当前版本仅定义结构，不接入发布订阅。
 */
class HistoryChangedEvent {
  constructor(payload) {
    this._name = 'history.changed';
    this._payload = payload;
    this._occurredAt = Date.now();
  }

  get name() {
    return this._name;
  }

  get payload() {
    return this._payload;
  }

  get occurredAt() {
    return this._occurredAt;
  }
}

module.exports = { HistoryChangedEvent };
