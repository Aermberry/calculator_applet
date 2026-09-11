'use strict';

const { Expression } = require('../types/expression');
const { Decimal } = require('../types/decimal');
const { InvalidHistoryEntryException } = require('../exceptions/invalid_history_entry_exception');

/**
 * HistoryEntry —— 实体（有 id、有生命周期）
 * 充血模型：无公开 setter，只能通过工厂构造。
 */
class HistoryEntry {
  /** @internal */
  constructor(builder) {
    if (!builder.id) throw new InvalidHistoryEntryException('历史记录缺少 id');
    this._id = builder.id;
    this._expression = builder.expression;
    this._result = builder.result;
    this._createdAt = builder.createdAt;
  }

  /**
   * @param {{id: string, expression: Expression|string, result: Decimal|string|number, createdAt?: number}} raw
   */
  static create(raw) {
    const expression = raw.expression instanceof Expression
      ? raw.expression
      : Expression.from(raw.expression);
    const result = raw.result instanceof Decimal ? raw.result : Decimal.from(raw.result);
    return new HistoryEntry({
      id: raw.id,
      expression: expression,
      result: result,
      createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : Date.now(),
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

  get createdAt() {
    return this._createdAt;
  }

  /** 同一条表达式视为重复记录（去重策略的领域判据） */
  sameExpressionAs(other) {
    const target = other instanceof HistoryEntry ? other.expression : other;
    return this._expression.equals(target);
  }

  /** 交给 persistence 序列化的纯数据快照 */
  toSnapshot() {
    return {
      id: this._id,
      expression: this._expression.raw,
      result: this._result.toString(),
      createdAt: this._createdAt,
    };
  }
}

module.exports = { HistoryEntry };
