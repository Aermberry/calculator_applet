'use strict';

const { Expression } = require('../types/expression');
const { Decimal } = require('../types/decimal');

/**
 * SaveHistoryCmd —— 保存历史的命令对象
 *
 * application 把原始字符串翻译成强类型领域原语后再下发，
 * 保证「类型卫生」：domain 内部只见 Expression / Decimal，不见裸字符串。
 */
class SaveHistoryCmd {
  /** @internal */
  constructor(expression, result) {
    this._expression = expression;
    this._result = result;
  }

  /**
   * @param {{expression: Expression|string, result: Decimal|string|number}} raw
   * @returns {SaveHistoryCmd}
   */
  static from(raw) {
    if (!raw) throw new TypeError('SaveHistoryCmd 缺少入参');
    const expression = raw.expression instanceof Expression
      ? raw.expression
      : Expression.from(raw.expression);
    const result = raw.result instanceof Decimal ? raw.result : Decimal.from(raw.result);
    return new SaveHistoryCmd(expression, result);
  }

  get expression() {
    return this._expression;
  }

  get result() {
    return this._result;
  }
}

module.exports = { SaveHistoryCmd };
