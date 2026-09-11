'use strict';

/**
 * wx-subscribe —— 订阅消息授权适配
 * 约定：只在用户完成一次实际操作后调用（授权率最高），且不在冷启动打扰。
 */
function request(templateIds) {
  return new Promise(function (resolve) {
    if (typeof wx.requestSubscribeMessage !== 'function') {
      resolve([]);
      return;
    }
    wx.requestSubscribeMessage({
      tmplIds: templateIds || [],
      success: function (res) {
        resolve((templateIds || []).filter(function (id) {
          return res[id] === 'accept';
        }));
      },
      fail: function () {
        resolve([]);
      },
    });
  });
}

module.exports = { request };
