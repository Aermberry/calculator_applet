'use strict';

const { DomainException } = require('./domain_exception');

/** 表达式非法：字符越界、括号不闭合、运算符连写、结构不完整 */
class InvalidExpressionException extends DomainException {
  constructor(message) {
    super('INVALID_EXPRESSION', message || '表达式不合法');
  }
}

module.exports = { InvalidExpressionException };
