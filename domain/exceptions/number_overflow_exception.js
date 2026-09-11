'use strict';

const { DomainException } = require('./domain_exception');

/** 数值超出可精确表示范围（> 2^53 - 1），或输入非有限数 */
class NumberOverflowException extends DomainException {
  constructor(message) {
    super('NUMBER_OVERFLOW', message || '数值超出可计算范围');
  }
}

module.exports = { NumberOverflowException };
