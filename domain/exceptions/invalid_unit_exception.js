'use strict';

const { DomainException } = require('./domain_exception');

/** 单位或单位类别不存在 */
class InvalidUnitException extends DomainException {
  constructor(message) {
    super('INVALID_UNIT', message || '不支持的单位');
  }
}

module.exports = { InvalidUnitException };
