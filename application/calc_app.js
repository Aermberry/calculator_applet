'use strict';

const { CalculatorFacade } = require('../domain/facade/calculator_facade');
const { SaveHistoryCmd } = require('../domain/cqe/save_history_cmd');
const { translate } = require('./errors');
const historyApp = require('./history_app');

/**
 * calc-app —— 应用层用例：计算器屏幕
 *
 * 职责：把页面的原始输入翻译成领域对象 → 编排 → 把领域结果翻译成纯字符串 view state。
 * 不装业务规则（规则在 domain），不碰 wx.*，不做 setData。
 */

const sessions = new Map();

function requireSession(id) {
  const session = sessions.get(id);
  if (!session) throw new Error('会话不存在：' + id);
  return session;
}

function toViewState(session, errorMessage) {
  const snapshot = session.snapshot();
  return {
    id: session.id,
    expr: snapshot.expression.toDisplay(),
    // 只有按下等号（commit）后才有结果；在此之前结果区留空，仅展示表达式
    result: snapshot.result === null ? '' : snapshot.result.toDisplay(),
    hasResult: snapshot.result !== null,
    error: errorMessage || null,
  };
}

/** 打开（或复用）一次计算会话 */
function openSession(id) {
  const key = id || 'default';
  if (!sessions.has(key)) sessions.set(key, CalculatorFacade.openSession(key));
  return toViewState(sessions.get(key), null);
}

/** 按键：非法输入不抛给页面，翻译为提示文案 */
function pressKey(id, rawKey) {
  // '=' 是等效确认操作：无论从页面 onKey 还是其它入口进来，都走同一条「求值 + 落历史」链路
  if (rawKey === '=') return equal(id);

  const session = requireSession(id);
  try {
    CalculatorFacade.press(session, rawKey);
    return toViewState(session, null);
  } catch (e) {
    return toViewState(session, translate(e).message);
  }
}

/** 求值：结果定格 + 落一条历史（历史失败不影响本次计算） */
function equal(id) {
  const session = requireSession(id);
  try {
    CalculatorFacade.commit(session);
    try {
      const cmd = SaveHistoryCmd.from({
        expression: session.expression,
        result: session.result,
      });
      historyApp.save(cmd).catch(function (e) {
        // 历史落库失败不影响本次计算，但必须留痕，否则故障是静默的
        console.warn('[calc] 历史保存失败：', e && e.message ? e.message : e);
      });
    } catch (e) {
      console.warn('[calc] 历史命令构造失败：', e && e.message ? e.message : e);
      /* 历史构造失败同理，不影响计算结果 */
    }
    return toViewState(session, null);
  } catch (e) {
    return toViewState(session, translate(e).message);
  }
}

function clear(id) {
  const session = requireSession(id);
  session.clear();
  return toViewState(session, null);
}

function dropSession(id) {
  sessions.delete(id);
}

module.exports = { openSession, pressKey, equal, clear, dropSession };
