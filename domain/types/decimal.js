'use strict';

const { NumberOverflowException } = require('../exceptions/number_overflow_exception');
const { InvalidNumberException } = require('../exceptions/invalid_number_exception');
const { DivisionByZeroException } = require('../exceptions/division_by_zero_exception');

/**
 * Decimal —— domain primitive（值对象）
 *
 * 设计要点：
 * 1. 内部用「整数尾数 n + 小数位 scale」表示，value = n / 10^scale，
 *    彻底规避二进制浮点误差（0.1 + 0.2 → 0.3）。
 * 2. 不可变：所有运算返回新的 Decimal，无公开 setter。
 * 3. parse, don't validate：只能经静态工厂构造，非法输入在边界抛领域异常。
 * 4. 零外部依赖 —— 可在 Node 环境直接单测。
 */

const MAX_SCALE = 12;
const POW10 = [1];

function pow10(k) {
  if (k < 0) throw new RangeError('pow10 仅支持非负指数');
  for (let i = POW10.length; i <= k; i += 1) POW10[i] = POW10[i - 1] * 10;
  return POW10[k];
}

function isSafe(n) {
  return Number.isSafeInteger(n);
}

/** 去掉尾部多余的 0：0.300 → 3 / scale 1 */
function normalizePair(n, scale) {
  let v = n;
  let s = scale;
  while (s > 0 && v % 10 === 0) {
    v = v / 10;
    s -= 1;
  }
  return { n: v, scale: s };
}

/**
 * 收敛到可精确表示的范围：
 * 1. 小数位超过 MAX_SCALE 则截断；
 * 2. 尾数超出安全整数时，逐级除以 10 并让 scale 变负（等价于科学计数法：value = n × 10^-scale）。
 * 这样 1e20 这类大数不会报错，而是以「1 × 10^20」的形式继续参与运算与展示。
 */
function trimPair(n, scale) {
  let v = n;
  let s = scale;
  while (s > MAX_SCALE) {
    s -= 1;
    v = Math.round(v / 10);
  }
  while (!isSafe(v)) {
    if (!Number.isFinite(v)) throw new NumberOverflowException('数值超出可表示范围');
    v = Math.round(v / 10);
    s -= 1;
  }
  return { n: v, scale: s };
}

/** 尝试把 (n, from) 换算到目标 scale；失败返回 null（调用方负责降精度重试） */
function tryRescale(n, from, to) {
  if (to === from) return isSafe(n) ? n : null;
  if (to > from) {
    const v = n * pow10(to - from);
    return isSafe(v) ? v : null;
  }
  const v = Math.round(n / pow10(from - to));
  return isSafe(v) ? v : null;
}

const MIN_SCALE = -60;

function align(a, b) {
  let scale = Math.max(a.scale, b.scale);
  let ra = tryRescale(a._n, a._scale, scale);
  let rb = tryRescale(b._n, b._scale, scale);
  while ((ra === null || rb === null) && scale > MIN_SCALE) {
    scale -= 1;
    ra = tryRescale(a._n, a._scale, scale);
    rb = tryRescale(b._n, b._scale, scale);
  }
  if (ra === null || rb === null) throw new NumberOverflowException('数值超出可精确表示范围');
  return { ra, rb, scale };
}

function divideTo(an, as, bn, bs, scale) {
  const exp = bs + scale - as;
  const ratio = an / bn;
  return exp >= 0 ? Math.round(ratio * pow10(exp)) : Math.round(ratio / pow10(-exp));
}

function trimExponential(text) {
  return text.replace(/\.?0+e/, 'e');
}

class Decimal {
  /**
   * @internal 请优先使用 Decimal.from / fromString / fromNumber
   * @param {number} n 整数尾数
   * @param {number} scale 小数位数（>= 0）
   */
  constructor(n, scale) {
    const trimmed = trimPair(n, scale);
    const pair = normalizePair(trimmed.n, trimmed.scale);
    this._n = pair.n;
    this._scale = pair.scale;
  }

  static zero() {
    return new Decimal(0, 0);
  }

  static from(raw) {
    if (raw instanceof Decimal) return raw;
    if (typeof raw === 'number') return Decimal.fromNumber(raw);
    if (typeof raw === 'string') return Decimal.fromString(raw);
    throw new InvalidNumberException('无法解析的数值：' + String(raw));
  }

  static fromNumber(num) {
    if (typeof num !== 'number' || !Number.isFinite(num)) {
      throw new InvalidNumberException('不是一个有效数值：' + String(num));
    }
    return Decimal.fromString(String(num));
  }

  static fromString(str) {
    if (typeof str !== 'string') throw new InvalidNumberException('数值必须是字符串');
    const s = str.trim().replace(/,/g, '');
    if (s === '') throw new InvalidNumberException('空字符串不是有效数值');

    const matched = /^([+-]?)(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/.exec(s);
    if (!matched) throw new InvalidNumberException('非法数值：' + str);

    const sign = matched[1] === '-' ? -1 : 1;
    const intPart = matched[2] || '';
    const fracPart = matched[3] || '';
    if (intPart === '' && fracPart === '') throw new InvalidNumberException('非法数值：' + str);

    const exponent = matched[4] ? Number(matched[4]) : 0;
    let scale = fracPart.length - exponent;
    let n = sign * Number(intPart + fracPart);

    if (scale < 0) {
      n = n * pow10(-scale);
      scale = 0;
    }
    return new Decimal(n, scale);
  }

  get n() {
    return this._n;
  }

  get scale() {
    return this._scale;
  }

  add(other) {
    const b = Decimal.from(other);
    const { ra, rb, scale } = align(this, b);
    return new Decimal(ra + rb, scale);
  }

  sub(other) {
    return this.add(Decimal.from(other).neg());
  }

  mul(other) {
    const b = Decimal.from(other);
    return new Decimal(this._n * b._n, this._scale + b._scale);
  }

  div(other) {
    const b = Decimal.from(other);
    if (b.isZero()) throw new DivisionByZeroException();
    let scale = MAX_SCALE;
    let n = divideTo(this._n, this._scale, b._n, b._scale, scale);
    while ((!isSafe(n) || !Number.isFinite(n)) && scale > MIN_SCALE) {
      scale -= 1;
      n = divideTo(this._n, this._scale, b._n, b._scale, scale);
    }
    return new Decimal(n, scale);
  }

  neg() {
    return new Decimal(-this._n, this._scale);
  }

  abs() {
    return this._n < 0 ? this.neg() : this;
  }

  isZero() {
    return this._n === 0;
  }

  compareTo(other) {
    const b = Decimal.from(other);
    const { ra, rb } = align(this, b);
    return ra === rb ? 0 : ra > rb ? 1 : -1;
  }

  eq(other) {
    return this.compareTo(other) === 0;
  }

  gt(other) {
    return this.compareTo(other) > 0;
  }

  lt(other) {
    return this.compareTo(other) < 0;
  }

  /** scale >= 0：value = n / 10^scale；scale < 0：value = n × 10^-scale（大数科学形式） */
  toNumber() {
    return this._scale >= 0
      ? this._n / pow10(this._scale)
      : this._n * pow10(-this._scale);
  }

  /** 无科学计数法、无尾零的字符串 */
  toString() {
    if (this._scale === 0) return String(this._n);
    if (this._scale < 0) {
      return String(this._n) + new Array(1 - this._scale).join('0');
    }
    const negative = this._n < 0;
    const digits = String(Math.abs(this._n)).padStart(this._scale + 1, '0');
    const cut = digits.length - this._scale;
    const intPart = digits.slice(0, cut);
    const fracPart = digits.slice(cut).replace(/0+$/, '');
    return (negative ? '-' : '') + intPart + (fracPart ? '.' + fracPart : '');
  }

  /**
   * 展示用格式化：超大/超小自动转科学计数法，否则加千分位
   * @param {{thousands?: boolean}} options
   */
  toDisplay(options) {
    const opts = options || {};
    const useThousands = opts.thousands !== false;
    const num = this.toNumber();
    if (num !== 0 && (Math.abs(num) >= 1e15 || Math.abs(num) < 1e-9)) {
      return trimExponential(num.toExponential(6));
    }
    const text = this.toString();
    const negative = text.charAt(0) === '-';
    const body = negative ? text.slice(1) : text;
    const parts = body.split('.');
    const intPart = useThousands
      ? parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
      : parts[0];
    return (negative ? '-' : '') + intPart + (parts[1] ? '.' + parts[1] : '');
  }

  /** 固定小数位（不足补 0），常用于金额/结果卡片 */
  toFixed(digits) {
    // 大数（scale < 0）无法用固定小数位表达，直接走展示格式
    if (this._scale < 0) return this.toDisplay();
    const target = Math.max(0, Math.min(Math.round(digits || 0), MAX_SCALE));
    let n;
    if (target >= this._scale) {
      n = this._n * pow10(target - this._scale);
    } else {
      n = Math.round(this._n / pow10(this._scale - target));
    }
    const negative = n < 0;
    const digitsText = String(Math.abs(n)).padStart(target + 1, '0');
    const cut = digitsText.length - target;
    const intPart = digitsText.slice(0, cut);
    const fracPart = digitsText.slice(cut);
    return (negative ? '-' : '') + intPart + (target ? '.' + fracPart : '');
  }
}

module.exports = { Decimal, MAX_SCALE };
