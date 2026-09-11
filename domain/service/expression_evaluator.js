'use strict';

const { Decimal } = require('../types/decimal');
const { Expression } = require('../types/expression');
const { InvalidExpressionException } = require('../exceptions/invalid_expression_exception');

/**
 * ExpressionEvaluator —— 领域服务（跨值对象的运算规则）
 *
 * 不用 eval（安全风险 + 精度不可控），自己实现：
 *   词法分析 → 调度场（中缀转后缀）→ 后缀求值
 * 全程基于 Decimal，保证 0.1+0.2 === 0.3。
 * 零外部依赖，可在 Node 直接单测。
 */

const PRECEDENCE = { '+': 1, '-': 1, '×': 2, '÷': 2 };

function normalizeOperator(ch) {
  if (ch === '*') return '×';
  if (ch === '/') return '÷';
  return ch;
}

function tokenize(raw) {
  const tokens = [];
  let i = 0;
  let expectOperand = true;

  while (i < raw.length) {
    const ch = raw.charAt(i);

    if ((ch >= '0' && ch <= '9') || ch === '.') {
      let j = i;
      let dots = 0;
      while (j < raw.length && ((raw.charAt(j) >= '0' && raw.charAt(j) <= '9') || raw.charAt(j) === '.')) {
        if (raw.charAt(j) === '.') dots += 1;
        j += 1;
      }
      const text = raw.slice(i, j);
      if (dots > 1) throw new InvalidExpressionException('数字格式错误：' + text);
      tokens.push({ type: 'number', value: text });
      i = j;
      expectOperand = false;
      continue;
    }

    if (ch === '(') {
      tokens.push({ type: 'lparen' });
      i += 1;
      expectOperand = true;
      continue;
    }

    if (ch === ')') {
      tokens.push({ type: 'rparen' });
      i += 1;
      expectOperand = false;
      continue;
    }

    if ('+-×÷*/'.indexOf(ch) >= 0) {
      if (expectOperand) {
        if (ch === '-') {
          tokens.push({ type: 'unary' });
          i += 1;
          continue;
        }
        if (ch === '+') {
          i += 1; // 一元正号，忽略
          continue;
        }
        throw new InvalidExpressionException('缺少运算数');
      }
      tokens.push({ type: 'op', op: normalizeOperator(ch) });
      i += 1;
      expectOperand = true;
      continue;
    }

    throw new InvalidExpressionException('非法字符：' + ch);
  }

  if (tokens.length === 0) throw new InvalidExpressionException('表达式为空');
  if (expectOperand) throw new InvalidExpressionException('表达式不完整');
  return tokens;
}

function toRpn(tokens) {
  const output = [];
  const stack = [];

  tokens.forEach(function (token) {
    if (token.type === 'number') {
      output.push(token);
      return;
    }
    if (token.type === 'unary') {
      stack.push(token);
      return;
    }
    if (token.type === 'op') {
      while (stack.length) {
        const top = stack[stack.length - 1];
        const topPrecedence = top.type === 'unary' ? 3 : top.type === 'op' ? PRECEDENCE[top.op] : -1;
        if (topPrecedence >= PRECEDENCE[token.op]) output.push(stack.pop());
        else break;
      }
      stack.push(token);
      return;
    }
    if (token.type === 'lparen') {
      stack.push(token);
      return;
    }
    // rparen
    while (stack.length && stack[stack.length - 1].type !== 'lparen') output.push(stack.pop());
    if (!stack.length) throw new InvalidExpressionException('括号不匹配');
    stack.pop();
  });

  while (stack.length) {
    const token = stack.pop();
    if (token.type === 'lparen') throw new InvalidExpressionException('括号不匹配');
    output.push(token);
  }
  return output;
}

function evalRpn(rpn) {
  const stack = [];

  rpn.forEach(function (token) {
    if (token.type === 'number') {
      stack.push(Decimal.from(token.value));
      return;
    }
    if (token.type === 'unary') {
      if (!stack.length) throw new InvalidExpressionException('表达式不完整');
      stack.push(stack.pop().neg());
      return;
    }
    const b = stack.pop();
    const a = stack.pop();
    if (a === undefined || b === undefined) throw new InvalidExpressionException('表达式不完整');
    if (token.op === '+') stack.push(a.add(b));
    else if (token.op === '-') stack.push(a.sub(b));
    else if (token.op === '×') stack.push(a.mul(b));
    else stack.push(a.div(b));
  });

  if (stack.length !== 1) throw new InvalidExpressionException('表达式不完整');
  return stack[0];
}

class ExpressionEvaluator {
  /**
   * 求值；非法或不完整时抛领域异常
   * @param {Expression|string} expression
   * @returns {Decimal}
   */
  static evaluate(expression) {
    const raw = expression instanceof Expression ? expression.raw : String(expression);
    return evalRpn(toRpn(tokenize(raw)));
  }

  /** 实时预览用：无法求值返回 null，不抛异常 */
  static tryEvaluate(expression) {
    try {
      return ExpressionEvaluator.evaluate(expression);
    } catch (e) {
      return null;
    }
  }
}

module.exports = { ExpressionEvaluator };
