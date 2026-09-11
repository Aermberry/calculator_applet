'use strict';

/**
 * HistoryRepository —— 仓储接口（契约）
 *
 * 接口定义在 domain（依赖倒置）：domain 只依赖契约，不依赖 wx/storage。
 * 具体实现在 persistence 层（本地 storage / 云端），可在 di 组合根替换。
 * 未实现的方法直接抛错，避免"静默失败"。
 */
class HistoryRepository {
  /** @returns {Promise<Array>} newest-first */
  all() {
    return Promise.reject(new Error('HistoryRepository.all 未实现'));
  }

  /** 单条写入（不处理留存规则，规则在领域服务） */
  save() {
    return Promise.reject(new Error('HistoryRepository.save 未实现'));
  }

  /** 整体替换（留存策略裁剪后由它落库） */
  replaceAll() {
    return Promise.reject(new Error('HistoryRepository.replaceAll 未实现'));
  }

  remove(id) {
    return Promise.reject(new Error('HistoryRepository.remove(' + id + ') 未实现'));
  }

  clear() {
    return Promise.reject(new Error('HistoryRepository.clear 未实现'));
  }
}

module.exports = { HistoryRepository };
