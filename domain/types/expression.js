'use strict';

const { InvalidExpressionException } = require('../exceptions/invalid_expression_exception');

/**
 * Expression —— domain primitive（值对象）
 *
 * 表示一个「屏幕上正在输入的表达式」。不可变、无公开 setter。
 * parse, don't validate：只能经 Expression.from 构造，
 * 非法字符 / 括号不闭合 / 运算符连写会在边界直接抛领域异常，脏数据进不了实体。
 *
 * 允许「不完整但可继续输入」的中间态（如 "1+"），
 * 是否可求值由 domain/service/expression-evaluator 判断。
 */

const ALLOWED = /^[0-9.+\-×÷*/()]+$/;
const OPERATORS = '+\\-×÷*/';

function isOperator(ch) {
  return OPERATORS.indexOf(ch) >= 0;
}

function validate(s) {
  let depth = 0;
  for (let i = 0; i < s.length; i += 1) {
    const ch = s.charAt(i);
    if (ch === '(') depth += 1;
    else if (ch === ')') {
      depth -= 1;
      if (depth < 0) throw new InvalidExpressionException('括号不匹配');
    }
  }
  if (depth !== 0) throw new InvalidExpressionException('括号未闭合');

  for (let i = 1; i < s.length; i += 1) {
    const prev = s.charAt(i - 1);
    const ch = s.charAt(i);
    // 两个运算符相邻时，仅允许紧跟在运算符后的负号（一元负号），如 "1×-2"；"1--2" 视为重复
    if (isOperator(ch) && isOperator(prev) && !(ch === '-' && prev !== '-')) {
      throw new InvalidExpressionException('运算符重复');
    }
  }

  const numbers = s.split(/[+\-×÷*/()]/).filter(function (item) {
    return item !== '';
  });
  for (let i = 0; i < numbers.length; i += 1) {
    const token = numbers[i];
    if (!/^\d*\.?\d*$/.test(token)) throw new InvalidExpressionException('数字格式错误：' + token);
    if ((token.match(/\./g) || []).length > 1) {
      throw new InvalidExpressionException('数字格式错误：' + token);
    }
  }
}

class Expression {
  /** @internal */
  constructor(raw) {
    this._raw = raw;
  }

  static empty() {
    return new Expression('');
  }

  static from(raw) {
    if (typeof raw !== 'string') throw new InvalidExpressionException('表达式必须是字符串');
    const s = raw.replace(/\s+/g, '');
    if (s === '') return Expression.empty();
    if (!ALLOWED.test(s)) throw new InvalidExpressionException('包含非法字符');
    validate(s);
    return new Expression(s);
  }

  /** 非法则返回 null（供调用方决定是否忽略本次输入） */
  static tryFrom(raw) {
    try {
      return Expression.from(raw);
    } catch (e) {
      return null;
    }
  }

  get raw() {
    return this._raw;
  }

  get isEmpty() {
    return this._raw === '';
  }

  /** 追加一个按键字符；非法则抛领域异常 */
  append(ch) {
    return Expression.from(this._raw + ch);
  }

  /** 追加；非法原样返回 this（键盘连击场景用，不打断用户输入） */
  tryAppend(ch) {
    const next = Expression.tryFrom(this._raw + ch);
    return next === null ? this : next;
  }

  backspace() {
    return Expression.from(this._raw.slice(0, -1));
  }

  clear() {
    return Expression.empty();
  }

  equals(other) {
    if (!(other instanceof Expression)) return false;
    return this._raw === other.raw;
  }

  toString() {
    return this._raw;
  }

  /** 展示用：空表达式显示 0 */
  toDisplay() {
    return this._raw === '' ? '0' : this._raw;
  }
}

module.exports = { Expression };
