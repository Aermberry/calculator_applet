'use strict';

const login = require('./infrastructure/wx_login');
const di = require('./di');

/**
 * App 入口：只做全局初始化，不写业务逻辑。
 * 静默登录放在 onLaunch，不阻塞首屏；页面层完全不感知登录。
 */
App({
  globalData: {
    openid: null,
  },

  onLaunch() {
    login.silentLogin()
      .then((openid) => {
        this.globalData.openid = openid;
      })
      .catch(() => {
        /* 登录失败不影响计算功能 */
      });
  },
});
