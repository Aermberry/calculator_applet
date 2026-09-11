'use strict';

const fs = require('fs');
const path = require('path');

// 桩：模拟小程序运行时全局，仅为验证「语法 + 模块加载 + 循环依赖」
global.wx = { cloud: { callFunction: function () { return Promise.resolve({ result: {} }); } } };
global.App = function () {};
global.Page = function () {};
global.Component = function () {};

const root = path.join(__dirname, '..');

const jsModules = [
  'app',
  'di',
  'domain/exceptions/domain_exception',
  'domain/exceptions/division_by_zero_exception',
  'domain/exceptions/number_overflow_exception',
  'domain/exceptions/invalid_expression_exception',
  'domain/exceptions/invalid_number_exception',
  'domain/exceptions/invalid_history_entry_exception',
  'domain/exceptions/invalid_key_exception',
  'domain/exceptions/invalid_unit_exception',
  'domain/types/decimal',
  'domain/types/expression',
  'domain/cqe/key_press_input',
  'domain/cqe/save_history_cmd',
  'domain/entity/history_entry',
  'domain/entity/calc_session',
  'domain/service/expression_evaluator',
  'domain/service/unit_converter',
  'domain/service/history_retention_service',
  'domain/repository/history_repository',
  'domain/facade/calculator_facade',
  'domain/facade/history_facade',
  'domain/event/history_changed_event',
  'application/errors',
  'application/history_app',
  'application/unit_app',
  'application/share_app',
  'application/presenter/view_contract',
  'application/presenter/calc_presenter',
  'application/presenter/history_presenter',
  'application/presenter/unit_presenter',
  'application/presenter/toolbox_presenter',
  'application/presenter/mine_presenter',
  'application/presenter/result_share_presenter',
  'infrastructure/wx_error',
  'infrastructure/wx_storage',
  'infrastructure/wx_navigate',
  'infrastructure/wx_ui',
  'infrastructure/page_view',
  'infrastructure/app_info',
  'infrastructure/cloud_rpc',
  'infrastructure/wx_login',
  'infrastructure/wx_share',
  'infrastructure/wx_subscribe',
  'persistence/serializers/history_serializer',
  'persistence/history_repository_storage',
  'pages/calc/calc',
  'pages/toolbox/toolbox',
  'pages/history/history',
  'pages/mine/mine',
  'components/calc-keyboard/calc-keyboard',
  'components/tool-card/tool-card',
  'components/swipe-item/swipe-item',
  'packageTool/unit-convert/unit-convert',
  'packageTool/result-share/result-share',
];

let fail = 0;
for (const m of jsModules) {
  try {
    require(path.join(root, m));
    console.log('OK   ' + m);
  } catch (e) {
    fail += 1;
    console.log('FAIL ' + m + ' :: ' + e.message);
  }
}

function collectJsons(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push.apply(out, collectJsons(p));
    else if (entry.isFile() && entry.name.endsWith('.json')) {
      out.push(path.relative(root, p).replace(/\\/g, '/'));
    }
  }
  return out;
}

// JSON 校验：根级 + pages/components/packageTool 下所有 .json（含组件子目录）
const jsonDirs = ['', 'pages', 'components', 'packageTool'];
const jsons = ['app.json', 'sitemap.json', 'project.config.json'];
for (const d of jsonDirs) {
  jsons.push.apply(jsons, collectJsons(path.join(root, d)));
}
for (const j of jsons.filter(function (item, i) { return jsons.indexOf(item) === i; })) {
  try {
    JSON.parse(fs.readFileSync(path.join(root, j), 'utf8'));
    console.log('OK   ' + j);
  } catch (e) {
    fail += 1;
    console.log('FAIL ' + j + ' :: ' + e.message);
  }
}

console.log('\n模块/配置加载失败数 = ' + fail);
process.exit(fail ? 1 : 0);
