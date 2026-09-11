'use strict';

const { Expression } = require('../types/expression');
const { ExpressionEvaluator } = require('../service/expression_evaluator');
const { KeyPressInput } = require('../cqe/key_press_input');

/**
 * CalcSession —— 聚合根（计算器屏幕的一次会话）
 *
 * 充血模型：状态只能通过 pressKey / clear / commit 等行为改变，无公开 setter。
 * 所有按键规则（求值后输入新数字则重新开局、非法输入忽略）都收敛在实体内。
 * 零 wx 依赖 —— 可直接 Node 单测。
 */
class CalcSession {
  /** @internal */
  constructor(builder) {
    this._id = builder.id;
    this._expression = builder.expression;
    this._result = builder.result;
    this._justEvaluated = builder.justEvaluated;
  }

  static create(options) {
    const opts = options || {};
    return new CalcSession({
      id: opts.id || 'session',
      expression: Expression.empty(),
      result: null,
      justEvaluated: false,
    });
  }

  get id() {
    return this._id;
  }

  get expression() {
    return this._expression;
  }

  get result() {
    return this._result;
  }

  get hasResult() {
    return this._result !== null;
  }

  /** @param {KeyPressInput|string} input */
  pressKey(input) {
    const key = KeyPressInput.from(input);

    if (key.key === 'C') return this.clear();
    if (key.key === '⌫') {
      this._expression = this._expression.backspace();
      this._result = null;
      this._justEvaluated = false;
      return this;
    }
    if (key.key === '=') return this.commit();

    // 刚求值完再输入数字/左括号 → 视为新一次计算
    if (this._justEvaluated && (key.isDigit() || key.key === '(' || key.key === '.')) {
      this._expression = Expression.from(key.key === '.' ? '0.' : key.key);
      this._result = null;
      this._justEvaluated = false;
      return this;
    }

    const next = this._expression.tryAppend(key.key);
    if (next.raw !== this._expression.raw) {
      this._expression = next;
      this._result = null;
      this._justEvaluated = false;
    }
    return this;
  }

  /** 求值并定格结果；非法表达式抛领域异常（由 application 翻译成用户提示） */
  commit() {
    this._result = ExpressionEvaluator.evaluate(this._expression);
    this._justEvaluated = true;
    return this;
  }

  /**
   * 显式预览：调用方主动要才求值，不影响会话状态。
   * 注意：snapshot() 不会调用它 —— 未按下等号前绝不自动求值。
   * @returns {Object|null} 表达式不完整/非法时返回 null
   */
  preview() {
    return ExpressionEvaluator.tryEvaluate(this._expression);
  }

  clear() {
    this._expression = Expression.empty();
    this._result = null;
    this._justEvaluated = false;
    return this;
  }

  /**
   * 只读快照：仅反映「已定格的结果」，不含任何预估/预览值。
   * 未按下等号（commit）前 result 恒为 null —— 读取快照不会触发求值。
   */
  snapshot() {
    return {
      id: this._id,
      expression: this._expression,
      result: this._result,
    };
  }
}

module.exports = { CalcSession };
