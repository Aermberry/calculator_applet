'use strict';

/**
 * wx-error —— wx 原生错误的归一化
 * 保证 wx 的错误码/errMsg 不外泄到上层，上层只见统一的 { code, message }。
 */
function normalize(error, fallbackMessage) {
  const raw = (error && error.errMsg) || (error && error.message) || String(error);
  return {
    code: 'PLATFORM_ERROR',
    message: fallbackMessage || '操作失败',
    raw: raw,
  };
}

module.exports = { normalize };
