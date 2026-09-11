'use strict';

const historyApp = require('../../application/history_app');

/**
 * 历史页：读取由 application 翻译好的纯 view 列表，只负责渲染与交互。
 */
Page({
  data: {
    list: [],
    openId: '', // 当前展开（露出删除按钮）的记录 id，同时只允许一条
  },

  onShow() {
    this.refresh();
  },

  async refresh() {
    try {
      const list = await historyApp.list();
      this.setData({ list, openId: '' });
    } catch (e) {
      // 读取失败时保持空列表而不是整页静默无响应
      console.error('[history] 加载失败：', e && e.message ? e.message : e);
      this.setData({ list: [] });
    }
  },

  onCopy(e) {
    const expr = e.currentTarget.dataset.expr;
    const result = e.currentTarget.dataset.result;
    wx.setClipboardData({ data: expr + '=' + result });
  },

  /** 左滑展开：记录当前展开项，其余项由 opened=false 自动收起 */
  onSwipeOpen(e) {
    this.setData({ openId: e.currentTarget.dataset.id || '' });
  },

  onSwipeClose() {
    if (!this.data.openId) return;
    this.setData({ openId: '' });
  },

  /** 点击左滑露出的「删除」 */
  onSwipeDelete(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ openId: '' });
    historyApp.remove(id).then(() => this.refresh());
  },

  onClear() {
    wx.showModal({
      title: '清空历史',
      content: '确定清空全部计算记录？',
      success: (res) => {
        if (res.confirm) historyApp.clear().then(() => this.refresh());
      },
    });
  },

  onShareAppMessage() {
    return { title: '好用的计算器，打开即用', path: '/pages/calc/calc' };
  },
});
