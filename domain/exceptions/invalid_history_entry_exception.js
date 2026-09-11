'use strict';

const { DomainException } = require('./domain_exception');

/** 历史记录实体构造参数不合法 */
class InvalidHistoryEntryException extends DomainException {
  constructor(message) {
    super('INVALID_HISTORY_ENTRY', message || '历史记录不合法');
  }
}

module.exports = { InvalidHistoryEntryException };
