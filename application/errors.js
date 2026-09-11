'use strict';

/**
 * 应用层错误：领域异常 → 用户可读文案的翻译边界。
 * wx 错误码、领域 code 都不外泄到 ui；ui 只拿到 message。
 */
class AppError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'AppError';
    this.code = code || 'UNKNOWN';
  }
}

const MESSAGES = {
  INVALID_EXPRESSION: '算式写得不完整，检查一下再算',
  DIVISION_BY_ZERO: '除数不能为 0',
  NUMBER_OVERFLOW: '数字太大了，超出可计算范围',
  INVALID_NUMBER: '这不是一个有效数字',
  INVALID_KEY: '不支持的操作',
  INVALID_HISTORY_ENTRY: '记录保存失败',
  INVALID_UNIT: '不支持的单位',
};

function translate(error) {
  const code = error && error.code;
  const message = (code && MESSAGES[code]) || (error && error.message) || '出了点小问题，请重试';
  return new AppError(message, code || 'UNKNOWN');
}

module.exports = { AppError, translate };
