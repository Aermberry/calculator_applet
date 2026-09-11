'use strict';

/**
 * wx-share —— 分享能力适配（增长钩子）
 */
function enableShareMenu() {
  if (typeof wx.showShareMenu === 'function') {
    wx.showShareMenu({ withShareTicket: true, menus: ['shareAppMessage', 'shareTimeline'] });
  }
}

function hideShareMenu() {
  if (typeof wx.hideShareMenu === 'function') wx.hideShareMenu();
}

module.exports = { enableShareMenu, hideShareMenu };
