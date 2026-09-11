'use strict';

/**
 * di.js —— 组合根（Composition Root）
 *
 * 全项目唯一知道所有层的地方：在这里把 domain 的仓储接口绑定到 persistence 的具体实现。
 * application 只依赖 domain 接口；换平台/换存储只改这里，不改业务代码。
 * 单测可用 setHistoryRepository 注入内存实现。
 */

let historyRepositoryInstance = null;

function historyRepository() {
  if (!historyRepositoryInstance) {
    // 懒加载：避免在 Node 单测环境提前触碰 wx.* 模块
    // 注意必须解构：require 得到的是模块导出对象，直接 new 会抛 "is not a constructor"
    const { HistoryRepositoryStorage } = require('./persistence/history_repository_storage');
    historyRepositoryInstance = new HistoryRepositoryStorage();
  }
  return historyRepositoryInstance;
}

/** 测试注入 / 运行时切换实现（如切到云端仓储） */
function setHistoryRepository(repository) {
  historyRepositoryInstance = repository;
}

module.exports = { historyRepository, setHistoryRepository };
