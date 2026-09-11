'use strict';

/**
 * 领域异常基类。
 * 所有领域异常都带 code，供 application 层翻译成用户可读文案；
 * code 不得使用 wx 错误码（技术细节不外泄到 ui）。
 */
class DomainException extends Error {
  constructor(code, message) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, new.target);
    }
  }

  toJSON() {
    return { code: this.code, message: this.message };
  }
}

module.exports = { DomainException };
