'use strict';

const { normalize } = require('./wx_error');

/**
 * cloud-rpc —— 云函数调用适配（防腐层）
 * 只做 Promise 化与错误归一化，业务语义在 application。
 */
function call(name, data) {
  return new Promise(function (resolve, reject) {
    wx.cloud.callFunction({
      name: name,
      data: data || {},
      success: function (res) {
        resolve(res && res.result);
      },
      fail: function (err) {
        reject(normalize(err, '网络异常，请稍后再试'));
      },
    });
  });
}

/** 云环境是否已初始化（未初始化时调用方应降级） */
function isReady() {
  return typeof wx !== 'undefined' && !!wx.cloud;
}

module.exports = { call, isReady };
