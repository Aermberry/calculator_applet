'use strict';

const { DomainException } = require('./domain_exception');

/** 无法解析为数值：NaN / Infinity / 非法字符串 */
class InvalidNumberException extends DomainException {
  constructor(message) {
    super('INVALID_NUMBER', message || '不是一个有效数值');
  }
}

module.exports = { InvalidNumberException };
