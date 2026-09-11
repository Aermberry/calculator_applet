'use strict';

const shareApp = require('../../application/share_app');

/**
 * 分包页：结果分享落地页。从分享链接进入，还原 expr/result 并支持二次分享。
 */
Page({
  data: {
    expr: '',
    result: '',
  },

  onLoad(query) {
    this.setData({
      expr: decodeURIComponent(query.expr || ''),
      result: decodeURIComponent(query.result || ''),
    });
  },

  onBack() {
    wx.switchTab({ url: '/pages/calc/calc' });
  },

  onShareAppMessage() {
    return shareApp.buildResultShare({ expression: this.data.expr, result: this.data.result });
  },
});
