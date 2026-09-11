'use strict';

/**
 * swipe-item —— 左滑操作容器（纯交互组件）
 *
 * 只负责手势与位移：左滑露出右侧操作区，松手按阈值吸附，点击操作区上抛 delete。
 * 具体业务（删的是哪条、要不要二次确认）交给页面 —— 组件不认识「历史记录」这个概念。
 */

const ACTION_WIDTH = 80; // 右侧操作区宽度（px，≈160rpx）
const OPEN_RATIO = 0.4; // 松手时位移超过操作区宽度的该比例即吸附为打开

Component({
  properties: {
    /** 由页面统一控制的展开态：同时只允许一条记录处于展开 */
    opened: {
      type: Boolean,
      value: false,
      observer(next) {
        this.setData({ x: next ? -ACTION_WIDTH : 0 });
      },
    },
  },

  data: {
    x: 0, // 位移量（px，<=0）
    dragging: false,
  },

  methods: {
    onTouchStart(e) {
      const touch = e.touches[0];
      this._startX = touch.clientX;
      this._startY = touch.clientY;
      this._dragging = true;
      this.setData({ dragging: true });
    },

    onTouchMove(e) {
      if (!this._dragging) return;
      const touch = e.touches[0];
      const dx = touch.clientX - this._startX;
      const dy = touch.clientY - this._startY;
      // 纵向为主的手势交给页面滚动，不抢事件
      if (Math.abs(dy) > Math.abs(dx)) return;

      const base = this.properties.opened ? -ACTION_WIDTH : 0;
      let x = base + dx;
      if (x > 0) x = 0;
      if (x < -ACTION_WIDTH) x = -ACTION_WIDTH;
      if (x !== this.data.x) this.setData({ x });
    },

    onTouchEnd() {
      if (!this._dragging) return;
      this._dragging = false;
      const opened = this.data.x <= -ACTION_WIDTH * OPEN_RATIO;
      this.setData({ x: opened ? -ACTION_WIDTH : 0, dragging: false });
      // 只在状态真正变化时通知页面，避免无谓 setData
      if (opened !== this.properties.opened) {
        this.triggerEvent(opened ? 'open' : 'close');
      }
    },

    /** 展开态下点击内容区 → 收起（与常见列表交互一致） */
    onBodyTap() {
      if (this.properties.opened) this.triggerEvent('close');
    },

    onDelete() {
      this.triggerEvent('delete');
    },
  },
});
