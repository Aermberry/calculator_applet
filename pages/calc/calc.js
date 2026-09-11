'use strict';

const calcApp = require('../../application/calc_app');
const shareApp = require('../../application/share_app');

/**
 * 表现层：只做「接收事件 → 调应用层 → setData」。
 * 不碰任何 wx.* 业务 API，不写计算逻辑——这些都在 application/domain。
 */
Page({
  data: {
    expr: '0',
    result: '',
    hasResult: false,
    error: '',
  },

  onLoad() {
    this._id = 'calc_main';
    this._apply(calcApp.openSession(this._id));
  },

  onUnload() {
    calcApp.dropSession(this._id);
  },

  _apply(vs) {
    this.setData({
      expr: vs.expr,
      result: vs.result,
      hasResult: vs.hasResult,
      error: vs.error || '',
    });
  },

  onKey(e) {
    const key = e.detail.value;
    let vs;
    if (key === '=') vs = calcApp.equal(this._id);
    else if (key === 'C') vs = calcApp.clear(this._id);
    else vs = calcApp.pressKey(this._id, key);
    this._apply(vs);
  },

  onShareAppMessage() {
    const d = this.data;
    if (!d.hasResult) {
      return { title: '计算器小程序，打开即用', path: '/pages/calc/calc' };
    }
    return shareApp.buildResultShare({ expression: d.expr, result: d.result });
  },
});
