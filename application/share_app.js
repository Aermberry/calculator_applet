'use strict';

const { Expression } = require('../domain/types/expression');
const { Decimal } = require('../domain/types/decimal');

/**
 * share-app —— 应用层用例：分享卡片（增长钩子 1）
 * 页面只拿到纯字符串参数，直接喂给 onShareAppMessage。
 */

/** 结果卡分享：算完一条就有一条可分享的素材 */
function buildResultShare(raw) {
  const expression = Expression.from(raw.expression);
  const result = Decimal.from(raw.result);
  const text = expression.toDisplay() + ' = ' + result.toDisplay();
  return {
    title: text + ' · 用计算器小程序一键算',
    path: '/packageTool/result-share/result-share',
    query: 'expr=' + encodeURIComponent(expression.toDisplay()) +
      '&result=' + encodeURIComponent(result.toDisplay()) +
      '&from=share',
  };
}

/** 工具页分享：带上工具标识，落地页可直接定位 */
function buildToolShare(toolKey, toolName) {
  return {
    title: toolName + ' · 打开即用，不装 App',
    path: '/pages/toolbox/toolbox',
    query: 'tool=' + encodeURIComponent(toolKey) + '&from=share',
  };
}

module.exports = { buildResultShare, buildToolShare };
