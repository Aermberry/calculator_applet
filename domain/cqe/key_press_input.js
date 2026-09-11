'use strict';

const { InvalidKeyException } = require('../exceptions/invalid_key_exception');

/**
 * KeyPressInput —— CQE 中的「命令/输入对象」
 *
 * application 层把页面的裸字符串翻译成它，再交给 domain；
 * 键集是领域知识，非法按键在边界被拦截。
 */

const DIGITS = '0123456789';
const OPERATORS = ['+', '-', '×', '÷'];
const PARENS = ['(', ')'];
const COMMANDS = ['C', '⌫', '='];

const ALL_KEYS = DIGITS.split('').concat(['.'], OPERATORS, PARENS, COMMANDS);

function kindOf(key) {
  if (key === 'C' || key === '⌫' || key === '=') return 'command';
  if (DIGITS.indexOf(key) >= 0) return 'digit';
  if (key === '.') return 'dot';
  if (OPERATORS.indexOf(key) >= 0) return 'operator';
  return 'paren';
}

class KeyPressInput {
  /** @internal */
  constructor(key) {
    this._key = key;
    this._kind = kindOf(key);
  }

  /**
   * @param {string|{key: string}} raw 页面传来的裸输入
   * @returns {KeyPressInput}
   */
  static from(raw) {
    const key = typeof raw === 'string' ? raw : raw && raw.key;
    if (ALL_KEYS.indexOf(key) === -1) throw new InvalidKeyException('不支持的按键：' + String(key));
    return new KeyPressInput(key);
  }

  get key() {
    return this._key;
  }

  get kind() {
    return this._kind;
  }

  isCommand() {
    return this._kind === 'command';
  }

  isDigit() {
    return this._kind === 'digit';
  }

  isOperator() {
    return this._kind === 'operator';
  }

  toString() {
    return this._key;
  }
}

module.exports = { KeyPressInput, ALL_KEYS };
