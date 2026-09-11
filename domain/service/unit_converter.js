'use strict';

const { Decimal } = require('../types/decimal');
const { InvalidUnitException } = require('../exceptions/invalid_unit_exception');

/**
 * UnitConverter —— 领域服务（跨值对象的换算规则）
 *
 * 各品类统一折算到基准单位再换算；温度为仿射变换，单独处理。
 * 换算因子是领域知识，放在 domain，不放页面。
 */

const FACTORS = {
  length: {
    label: '长度',
    base: 'm',
    units: {
      m: { factor: 1, label: '米' },
      km: { factor: 1000, label: '千米' },
      dm: { factor: 0.1, label: '分米' },
      cm: { factor: 0.01, label: '厘米' },
      mm: { factor: 0.001, label: '毫米' },
      inch: { factor: 0.0254, label: '英寸' },
      ft: { factor: 0.3048, label: '英尺' },
      yd: { factor: 0.9144, label: '码' },
      mi: { factor: 1609.344, label: '英里' },
      li: { factor: 500, label: '里' },
      chi: { factor: 1 / 3, label: '尺' },
    },
  },
  mass: {
    label: '重量',
    base: 'kg',
    units: {
      kg: { factor: 1, label: '千克' },
      g: { factor: 0.001, label: '克' },
      t: { factor: 1000, label: '吨' },
      lb: { factor: 0.45359237, label: '磅' },
      oz: { factor: 0.028349523125, label: '盎司' },
      jin: { factor: 0.5, label: '斤' },
      liang: { factor: 0.05, label: '两' },
    },
  },
  area: {
    label: '面积',
    base: 'm2',
    units: {
      m2: { factor: 1, label: '平方米' },
      km2: { factor: 1000000, label: '平方千米' },
      cm2: { factor: 0.0001, label: '平方厘米' },
      hectare: { factor: 10000, label: '公顷' },
      mu: { factor: 2000 / 3, label: '亩' },
      acre: { factor: 4046.8564224, label: '英亩' },
      ft2: { factor: 0.09290304, label: '平方英尺' },
    },
  },
  data: {
    label: '数据',
    base: 'Byte',
    units: {
      Byte: { factor: 1, label: '字节' },
      KB: { factor: 1024, label: 'KB' },
      MB: { factor: 1048576, label: 'MB' },
      GB: { factor: 1073741824, label: 'GB' },
      TB: { factor: 1099511627776, label: 'TB' },
    },
  },
  temperature: {
    label: '温度',
    affine: true,
    units: {
      C: { factor: 1, label: '摄氏度' },
      F: { factor: 1, label: '华氏度' },
      K: { factor: 1, label: '开尔文' },
    },
  },
};

function toCelsius(unit, value) {
  if (unit === 'C') return value;
  if (unit === 'F') return (value - 32) * 5 / 9;
  return value - 273.15;
}

function fromCelsius(unit, value) {
  if (unit === 'C') return value;
  if (unit === 'F') return value * 9 / 5 + 32;
  return value + 273.15;
}

function categoryOf(category) {
  const found = FACTORS[category];
  if (!found) throw new InvalidUnitException('不支持的单位类别：' + String(category));
  return found;
}

class UnitConverter {
  static categories() {
    return Object.keys(FACTORS).map(function (key) {
      return { key: key, label: FACTORS[key].label };
    });
  }

  static unitsOf(category) {
    const config = categoryOf(category);
    return Object.keys(config.units).map(function (key) {
      return { key: key, label: config.units[key].label };
    });
  }

  /**
   * @param {{category: string, value: Decimal|string|number, from: string, to: string}} params
   * @returns {Decimal}
   */
  static convert(params) {
    const category = params && params.category;
    const config = categoryOf(category);
    const from = params.from;
    const to = params.to;
    if (!config.units[from]) throw new InvalidUnitException('不支持的源单位：' + String(from));
    if (!config.units[to]) throw new InvalidUnitException('不支持的目标单位：' + String(to));

    const value = Decimal.from(params.value);

    if (config.affine) {
      const celsius = toCelsius(from, value.toNumber());
      return Decimal.from(String(fromCelsius(to, celsius)));
    }

    const base = value.mul(Decimal.from(String(config.units[from].factor)));
    return base.div(Decimal.from(String(config.units[to].factor)));
  }
}

module.exports = { UnitConverter };
