'use strict';

const { DomainException } = require('./domain_exception');

/** 除数为零 */
class DivisionByZeroException extends DomainException {
  constructor(message) {
    super('DIVISION_BY_ZERO', message || '除数不能为 0');
  }
}

module.exports = { DivisionByZeroException };
