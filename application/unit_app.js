'use strict';

const { UnitConverter } = require('../domain/service/unit_converter');
const { translate } = require('./errors');

/**
 * unit-app —— 应用层用例：单位换算（packageTool 分包页面使用）
 */
function categories() {
  return UnitConverter.categories();
}

function unitsOf(category) {
  return UnitConverter.unitsOf(category);
}

function convert(raw) {
  try {
    const result = UnitConverter.convert({
      category: raw.category,
      value: raw.value,
      from: raw.from,
      to: raw.to,
    });
    return { value: result.toDisplay(), error: null };
  } catch (e) {
    return { value: '', error: translate(e).message };
  }
}

module.exports = { categories, unitsOf, convert };
