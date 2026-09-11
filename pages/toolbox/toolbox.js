'use strict';

/**
 * 工具箱：垂直工具的中转页。新增工具只需在这里加一项 + 在 packageTool 加分包页。
 */
Page({
  data: {
    tools: [
      {
        key: 'unit',
        name: '单位换算',
        desc: '长度 · 重量 · 面积 · 温度 · 数据',
        path: '/packageTool/unit-convert/unit-convert',
      },
    ],
  },

  onSelect(e) {
    const path = e.detail.path;
    if (path) wx.navigateTo({ url: path });
  },

  onShareAppMessage() {
    return { title: '工具箱，打开即用不装 App', path: '/pages/toolbox/toolbox' };
  },
});
