'use strict';

/**
 * 工具卡：展示一个工具的入口，点击只上抛选择事件，导航由页面决定。
 */
Component({
  properties: {
    name: { type: String, value: '' },
    desc: { type: String, value: '' },
    path: { type: String, value: '' },
  },
  methods: {
    onTap() {
      this.triggerEvent('select', { path: this.data.path });
    },
  },
});
