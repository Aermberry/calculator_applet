'use strict';

Page({
  data: {
    version: '1.0.0',
  },

  onShareAppMessage() {
    return { title: '计算器小程序，打开即用', path: '/pages/calc/calc' };
  },
});
