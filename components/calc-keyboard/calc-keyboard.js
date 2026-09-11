'use strict';

/**
 * 自定义组件：纯交互，只负责把按键意图上抛（triggerEvent）。
 * 不调用 application / services / wx.* —— 保持可复用、可单测。
 */
Component({
  methods: {
    onTap(e) {
      const key = e.currentTarget.dataset.key;
      this.triggerEvent('key', { value: key });
    },
  },
});
