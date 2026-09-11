'use strict';

const { CalcSession } = require('../entity/calc_session');

/**
 * CalculatorFacade —— 领域模块对外收口
 * ui / application 只经 facade 使用计算能力，不直接碰内部实体与服务。
 */
class CalculatorFacade {
  static openSession(id) {
    return CalcSession.create({ id: id || 'session' });
  }

  static press(session, rawKey) {
    return session.pressKey(rawKey);
  }

  /** @returns {Object} Decimal 结果 */
  static commit(session) {
    return session.commit().result;
  }

  /** @returns {Object|null} 预览结果，非法表达式返回 null */
  static preview(session) {
    return session.preview();
  }
}

module.exports = { CalculatorFacade };
