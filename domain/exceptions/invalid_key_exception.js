'use strict';

const { DomainException } = require('./domain_exception');

/** 按键不在计算器允许的键集内 */
class InvalidKeyException extends DomainException {
  constructor(message) {
    super('INVALID_KEY', message || '不支持的按键');
  }
}

module.exports = { InvalidKeyException };
