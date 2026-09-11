'use strict';

const unitApp = require('../../application/unit_app');

/**
 * 分包页：单位换算。只调应用层，不碰领域对象与 wx.* 存储。
 * 新工具按此模式在 packageTool 下加分包页即可，不改动主包。
 */
Page({
  data: {
    categories: [],
    currentLabel: '',
    units: [],
    fromLabel: '',
    toLabel: '',
    value: '',
    result: '',
    error: '',
    _category: '',
    _from: '',
    _to: '',
  },

  onLoad() {
    const cats = unitApp.categories();
    this.setData({ categories: cats });
    if (cats.length) this.selectCategory(0);
  },

  selectCategory(index) {
    const cat = this.data.categories[index];
    const units = unitApp.unitsOf(cat.key);
    const from = units[0];
    const to = units.length > 1 ? units[1] : units[0];
    this.setData({
      _category: cat.key,
      currentLabel: cat.label,
      units: units,
      _from: from.key,
      _to: to.key,
      fromLabel: from.label,
      toLabel: to.label,
      result: '',
      error: '',
    });
    this.convert();
  },

  onCategory(e) {
    this.selectCategory(Number(e.detail.value));
  },

  onFrom(e) {
    const u = this.data.units[Number(e.detail.value)];
    this.setData({ _from: u.key, fromLabel: u.label });
    this.convert();
  },

  onTo(e) {
    const u = this.data.units[Number(e.detail.value)];
    this.setData({ _to: u.key, toLabel: u.label });
    this.convert();
  },

  onValue(e) {
    this.setData({ value: e.detail.value });
    this.convert();
  },

  convert() {
    const r = unitApp.convert({
      category: this.data._category,
      value: this.data.value,
      from: this.data._from,
      to: this.data._to,
    });
    this.setData({ result: r.value, error: r.error || '' });
  },

  onShareAppMessage() {
    return { title: '单位换算，打开即用', path: '/pages/toolbox/toolbox' };
  },
});
