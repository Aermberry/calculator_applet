'use strict';

const { normalize } = require('./wx_error');
const cloudRpc = require('./cloud_rpc');
const storage = require('./wx_storage');

/**
 * wx-login —— 静默登录适配
 * 只做「拿 code → 换 openid → 落 storage」这三步技术动作，
 * 不弹任何授权窗；是否登录、登录后干什么由 application 决定。
 */

const OPENID_KEY = 'session/openid';

function code() {
  return new Promise(function (resolve, reject) {
    wx.login({
      success: function (res) {
        resolve(res.code);
      },
      fail: function (err) {
        reject(normalize(err, '微信登录失败'));
      },
    });
  });
}

async function silentLogin() {
  const cached = await storage.get(OPENID_KEY);
  if (cached) return cached;
  if (!cloudRpc.isReady()) return null;
  const loginCode = await code();
  const result = await cloudRpc.call('login', { code: loginCode });
  const openid = result && result.openid;
  if (openid) await storage.set(OPENID_KEY, openid);
  return openid || null;
}

module.exports = { silentLogin, code };
