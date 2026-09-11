'use strict';

const { normalize } = require('./wx_error');

/**
 * wx-storage —— 基础设施适配器（防腐层）
 *
 * 规则：本层是全项目唯一允许触碰 wx.* 的地方之一，保持极薄：
 * 只做「Promise 化 + 错误归一化」，不做任何业务判断。
 */

function get(key) {
  return new Promise(function (resolve) {
    try {
      const value = wx.getStorageSync(key);
      resolve(value === '' || value === undefined || value === null ? null : value);
    } catch (e) {
      resolve(null); // 读取失败按空处理，不阻断主流程
    }
  });
}

function set(key, value) {
  return new Promise(function (resolve, reject) {
    try {
      wx.setStorageSync(key, value);
      resolve(true);
    } catch (e) {
      reject(normalize(e, '本地存储写入失败'));
    }
  });
}

function remove(key) {
  return new Promise(function (resolve) {
    try {
      wx.removeStorageSync(key);
    } catch (e) {
      /* 删除失败无需上抛 */
    }
    resolve(true);
  });
}

module.exports = { get, set, remove };
