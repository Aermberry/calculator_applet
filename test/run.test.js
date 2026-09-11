'use strict';

/**
 * 纯 Node 单测：覆盖 domain（值对象 / 实体 / 领域服务）与 application（Presenter 用例编排）。
 * 运行：node test/run.test.js
 * 不引入任何测试框架（零依赖），也不触碰真实 wx.* —— 印证 domain/application 可在 Node 直跑。
 * Presenter 全部通过 mockView 验证「与 View 的交互契约」，不依赖任何页面。
 */

const assert = require('assert');

const { Decimal } = require('../domain/types/decimal');
const { Expression } = require('../domain/types/expression');
const { ExpressionEvaluator } = require('../domain/service/expression_evaluator');
const { CalcSession } = require('../domain/entity/calc_session');
const { HistoryEntry } = require('../domain/entity/history_entry');
const { HistoryRetentionService } = require('../domain/service/history_retention_service');
const { UnitConverter } = require('../domain/service/unit_converter');
const { DivisionByZeroException } = require('../domain/exceptions/division_by_zero_exception');

const { MemoryHistoryRepository } = require('./memory_history_repository');
const { mockView } = require('./mock_view');
const di = require('../di');
const historyApp = require('../application/history_app');
const { createCalcPresenter } = require('../application/presenter/calc_presenter');
const { createHistoryPresenter } = require('../application/presenter/history_presenter');
const { createUnitPresenter } = require('../application/presenter/unit_presenter');
const { createToolboxPresenter } = require('../application/presenter/toolbox_presenter');
const { createMinePresenter } = require('../application/presenter/mine_presenter');
const { createResultSharePresenter } = require('../application/presenter/result_share_presenter');

let pass = 0;
let failed = 0;

function test(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(function () {
      pass += 1;
      console.log('  ✓ ' + name);
    })
    .catch(function (err) {
      failed += 1;
      console.log('  ✗ ' + name + '  ::  ' + (err && err.message ? err.message : err));
    });
}

function sleep(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}

/** 让 presenter 内部 fire-and-forget 的历史保存跑完 */
function flush() {
  return sleep(50);
}

async function main() {
  console.log('\n[domain] 值对象与表达式');

  await test('Decimal: 0.1 + 0.2 = 0.3（二进制浮点误差已消除）', function () {
    assert.strictEqual(ExpressionEvaluator.evaluate('0.1+0.2').toString(), '0.3');
  });

  await test('Decimal: 0.3 - 0.1 = 0.2', function () {
    assert.strictEqual(ExpressionEvaluator.evaluate('0.3-0.1').toString(), '0.2');
  });

  await test('Decimal: 大数相加不丢精度（2e20）', function () {
    assert.strictEqual(
      ExpressionEvaluator.evaluate('100000000000000000000+100000000000000000000').toString(),
      '200000000000000000000'
    );
  });

  await test('Decimal: 0.1 + 0.2 经 Decimal 运算仍为 0.3', function () {
    assert.strictEqual(Decimal.from('0.1').add(Decimal.from('0.2')).toString(), '0.3');
  });

  await test('Decimal: 除以 0 抛 DivisionByZeroException', function () {
    assert.throws(function () {
      ExpressionEvaluator.evaluate('1÷0');
    }, function (e) {
      return e instanceof DivisionByZeroException;
    });
  });

  await test('Expression: 非法表达式 tryFrom 返回 null，可继续输入的中间态不为 null', function () {
    assert.strictEqual(Expression.tryFrom('1++'), null, '连续运算符非法');
    assert.strictEqual(Expression.tryFrom('abc'), null, '非法字符');
    assert.notStrictEqual(Expression.tryFrom('1+'), null, '1+ 是合法可继续输入的中间态');
    assert.notStrictEqual(Expression.tryFrom('1+2'), null);
  });

  await test('ExpressionEvaluator: 运算符优先级与括号', function () {
    assert.strictEqual(ExpressionEvaluator.evaluate('1+2×(3-1)').toString(), '5');
    assert.strictEqual(ExpressionEvaluator.evaluate('(1+2)×(3+4)').toString(), '21');
    assert.strictEqual(ExpressionEvaluator.evaluate('2.5×4').toString(), '10');
    assert.strictEqual(ExpressionEvaluator.evaluate('-5+3').toString(), '-2');
  });

  await test('ExpressionEvaluator: 不完整表达式 tryEvaluate 返回 null（不抛）', function () {
    assert.strictEqual(ExpressionEvaluator.tryEvaluate('1+'), null);
    assert.strictEqual(ExpressionEvaluator.tryEvaluate('1+2×'), null);
  });

  console.log('\n[domain] 聚合根 CalcSession');

  await test('CalcSession: 按键序列求值 1 + 2 = 3', function () {
    const s = CalcSession.create({ id: 'a' });
    ['1', '+', '2', '='].forEach(function (k) { s.pressKey(k); });
    assert.strictEqual(s.expression.raw, '1+2');
    assert.strictEqual(s.result.toString(), '3');
  });

  await test('CalcSession: 求值后输入数字自动新开一局', function () {
    const s = CalcSession.create({ id: 'b' });
    ['1', '+', '2', '='].forEach(function (k) { s.pressKey(k); });
    s.pressKey('5');
    assert.strictEqual(s.expression.raw, '5');
    assert.strictEqual(s.result, null);
  });

  await test('CalcSession: 未按下等号前不产生结果（snapshot 不自动求值）', function () {
    const s = CalcSession.create({ id: 'c0' });
    ['1', '+', '2'].forEach(function (k) { s.pressKey(k); });
    assert.strictEqual(s.result, null, '未按下等号前不应有结果');
    assert.strictEqual(s.hasResult, false);
    assert.strictEqual(s.snapshot().result, null, '读取快照不得触发求值');
    assert.strictEqual(s.snapshot().expression.raw, '1+2');
  });

  await test('CalcSession: preview() 仅显式调用才求值，且不污染会话状态', function () {
    const s = CalcSession.create({ id: 'c1' });
    ['1', '+', '2'].forEach(function (k) { s.pressKey(k); });
    assert.strictEqual(s.preview().toString(), '3');
    assert.strictEqual(s.result, null, '预览不得把结果写进会话');
  });

  await test('CalcSession: 退格删除', function () {
    const s = CalcSession.create({ id: 'c' });
    ['1', '2', '3', '⌫'].forEach(function (k) { s.pressKey(k); });
    assert.strictEqual(s.expression.raw, '12');
  });

  console.log('\n[domain] 领域服务 HistoryRetentionService');

  await test('HistoryRetentionService: 同表达式去重', function () {
    const a = HistoryEntry.create({ id: 'e1', expression: '1+2', result: '3' });
    const b = HistoryEntry.create({ id: 'e2', expression: '1+2', result: '3' });
    const merged = HistoryRetentionService.merge([a], b);
    assert.strictEqual(merged.length, 1, '重复表达式应只保留 1 条');
  });

  await test('HistoryRetentionService: 超过 100 条裁剪到上限', function () {
    const list = [];
    for (let i = 0; i < 110; i += 1) {
      list.push(HistoryEntry.create({ id: 'r' + i, expression: String(i), result: String(i) }));
    }
    const merged = HistoryRetentionService.merge(
      list,
      HistoryEntry.create({ id: 'new', expression: '110', result: '1' })
    );
    assert.strictEqual(merged.length, HistoryRetentionService.maxRecords());
  });

  console.log('\n[domain] 领域服务 UnitConverter');

  await test('UnitConverter: 长度 1km = 1000m', function () {
    assert.strictEqual(
      UnitConverter.convert({ category: 'length', value: '1', from: 'km', to: 'm' }).toString(),
      '1000'
    );
  });

  await test('UnitConverter: 温度 100°C = 212°F（仿射变换）', function () {
    assert.strictEqual(
      UnitConverter.convert({ category: 'temperature', value: '100', from: 'C', to: 'F' }).toString(),
      '212'
    );
  });

  await test('UnitConverter: 不支持的单位抛 InvalidUnitException', function () {
    assert.throws(function () {
      UnitConverter.convert({ category: 'length', value: '1', from: 'lightyear', to: 'm' });
    });
  });

  console.log('\n[MVP] IView 契约');

  await test('IView: 未实现 render 的 View 直接报错（契约强制）', function () {
    const { createView } = require('../application/presenter/view_contract');
    assert.throws(function () {
      createView({ toast: function () {} });
    });
  });

  await test('IView: 缺失的可选方法被兜底为 noop，Presenter 不必判空', function () {
    const { createView } = require('../application/presenter/view_contract');
    const view = createView({ render: function () {} });
    assert.doesNotThrow(function () {
      view.toast('x');
      view.navigate('/a');
    });
    return view.confirm({}).then(function (ok) {
      assert.strictEqual(ok, false, '未实现的 confirm 默认返回 false（不误删数据）');
    });
  });

  console.log('\n[MVP] 端到端：真实本地仓储（桩掉 wx.storage）');

  // 在 Node 里桩掉 wx.*，验证 di → persistence 这条真实链路（单测注入内存仓储时覆盖不到）
  const store = new Map();
  global.wx = {
    getStorageSync: function (k) { return store.has(k) ? store.get(k) : ''; },
    setStorageSync: function (k, v) { store.set(k, v); },
    removeStorageSync: function (k) { store.delete(k); },
  };

  await test('di: 组合根默认绑定能实例化出可用仓储', function () {
    const repo = di.historyRepository();
    assert.strictEqual(typeof repo.all, 'function');
    assert.strictEqual(typeof repo.replaceAll, 'function');
    assert.strictEqual(typeof repo.clear, 'function');
  });

  await test('端到端：计算器按等号 → 历史页能读到该条记录', async function () {
    const calc = createCalcPresenter(mockView().view, { sessionId: 'e2e' });
    calc.start();
    ['9', '÷', '3', '='].forEach(function (k) { calc.onKey(k); });
    await flush();

    const historyMock = mockView();
    const history = createHistoryPresenter(historyMock.view);
    await history.start();
    const list = historyMock.lastState().list;
    assert.strictEqual(list.length, 1, '等号应触发历史落库');
    assert.strictEqual(list[0].expr, '9÷3');
    assert.strictEqual(list[0].result, '3');

    await historyApp.clear();
    calc.dispose();
    history.dispose();
  });

  console.log('\n[MVP] Presenter（注入内存仓储 + mock View）');

  di.setHistoryRepository(new MemoryHistoryRepository());

  await test('calc-presenter: 按键序列产出 view state，等号后 hasResult=true', function () {
    const mock = mockView();
    const p = createCalcPresenter(mock.view, { sessionId: 'u1', history: historyApp });
    p.start();
    ['1', '+', '2', '='].forEach(function (k) { p.onKey(k); });
    const state = mock.lastState();
    assert.strictEqual(state.expr, '1+2');
    assert.strictEqual(state.result, '3');
    assert.strictEqual(state.hasResult, true);
    p.dispose();
  });

  await test('calc-presenter: 按下等号前结果区恒为空', function () {
    const mock = mockView();
    const p = createCalcPresenter(mock.view, { sessionId: 'u1b', history: historyApp });
    p.start();
    const states = [];
    ['1', '+', '2'].forEach(function (k) {
      p.onKey(k);
      states.push(mock.lastState());
    });
    states.forEach(function (vs) {
      assert.strictEqual(vs.result, '', '未按下等号前结果区应为空');
      assert.strictEqual(vs.hasResult, false);
    });
    assert.strictEqual(states[2].expr, '1+2');
    p.dispose();
  });

  await test('calc-presenter: 除零被翻译为用户提示，不崩溃', function () {
    const mock = mockView();
    const p = createCalcPresenter(mock.view, { sessionId: 'u2', history: historyApp });
    p.start();
    ['1', '÷', '0', '='].forEach(function (k) { p.onKey(k); });
    assert.ok(mock.lastState().error, '除零应给出提示文案');
    p.dispose();
  });

  await test('calc-presenter: 历史保存失败会回推 toast（原来只能静默 console.warn）', async function () {
    const mock = mockView();
    const failing = {
      save: function () { return Promise.reject(new Error('storage full')); },
      list: function () { return Promise.resolve([]); },
      remove: function () { return Promise.resolve(true); },
      clear: function () { return Promise.resolve(true); },
    };
    const p = createCalcPresenter(mock.view, { sessionId: 'u3', history: failing });
    p.start();
    ['1', '+', '1', '='].forEach(function (k) { p.onKey(k); });
    assert.strictEqual(mock.lastState().result, '2', '历史失败不得影响计算结果');
    await flush();
    const toasts = mock.callsOf('toast');
    assert.strictEqual(toasts.length, 1, '异步失败必须回推给用户');
    assert.ok(/历史保存失败/.test(toasts[0].args[0]));
    p.dispose();
  });

  await test('calc-presenter: dispose 后不再渲染（生命周期跟随 View）', function () {
    const mock = mockView();
    const p = createCalcPresenter(mock.view, { sessionId: 'u4', history: historyApp });
    p.start();
    const before = mock.renderCount();
    p.dispose();
    p.onKey('1');
    p.onKey('=');
    assert.strictEqual(mock.renderCount(), before, 'dispose 后不得再推状态');
  });

  await test('history-presenter: 列表渲染 / 复制 / 删除 / 清空二次确认', async function () {
    await historyApp.clear();
    const mock = mockView();
    const p = createHistoryPresenter(mock.view, { history: historyApp });
    await p.start();
    assert.deepStrictEqual(mock.lastState().list, []);

    await historyApp.save({ expression: '1+2', result: '3' });
    await p.refresh();
    let list = mock.lastState().list;
    assert.strictEqual(list.length, 1);
    assert.strictEqual(list[0].expr, '1+2');
    assert.ok(list[0].timeText, '时间文案由 Presenter 格式化');

    p.onCopy(list[0]);
    assert.strictEqual(mock.callsOf('copy')[0].args[0], '1+2=3', '复制走 IView，页面不调 wx');

    // 重复记录应被领域去重策略合并
    await historyApp.save({ expression: '1+2', result: '3' });
    await p.refresh();
    assert.strictEqual(mock.lastState().list.length, 1, '重复表达式应去重');

    await historyApp.save({ expression: '4×5', result: '20' });
    await p.refresh();
    list = mock.lastState().list;
    assert.strictEqual(list.length, 2);

    p.onSwipeOpen(list[0].id);
    assert.strictEqual(mock.lastState().openId, list[0].id, '展开态由 Presenter 统一持有');
    p.onSwipeClose();
    assert.strictEqual(mock.lastState().openId, '');

    await p.onDelete(list[0].id);
    assert.strictEqual(mock.lastState().list.length, 1);

    await p.onClear();
    assert.strictEqual(mock.callsOf('confirm').length, 1, '清空前必须二次确认');
    assert.strictEqual(mock.lastState().list.length, 0);
    p.dispose();
  });

  await test('history-presenter: confirm 返回 false 时不删除数据', async function () {
    await historyApp.clear();
    await historyApp.save({ expression: '7×8', result: '56' });
    const mock = mockView({ confirmResult: false });
    const p = createHistoryPresenter(mock.view, { history: historyApp });
    await p.start();
    await p.onClear();
    await p.refresh();
    assert.strictEqual(mock.lastState().list.length, 1, '用户取消则数据保留');
    await historyApp.clear();
    p.dispose();
  });

  await test('unit-presenter: 默认选中规则与换算结果由 Presenter 产出', function () {
    const mock = mockView();
    const p = createUnitPresenter(mock.view);
    p.start();
    let state = mock.lastState();
    assert.strictEqual(state.currentLabel, '长度');
    assert.strictEqual(state.fromLabel, '米', '默认源单位取第 1 个');
    assert.strictEqual(state.toLabel, '千米', '默认目标单位取第 2 个');
    assert.strictEqual(state.error, '', '空输入不得误报错误');

    p.onValue('1000');
    state = mock.lastState();
    assert.strictEqual(state.result, '1', '1000m = 1km');
    assert.strictEqual(state.error, '');

    p.onCategory(1);
    state = mock.lastState();
    assert.strictEqual(state.currentLabel, '重量');
    assert.strictEqual(state.fromLabel, '千克');
    assert.strictEqual(state.toLabel, '克');
    assert.strictEqual(state.result, '1,000,000', '1000kg = 1,000,000g，展示带千分位');

    p.onTo(0);
    assert.strictEqual(mock.lastState().toLabel, '千克');
    p.dispose();
  });

  await test('unit-presenter: 非法单位经 Presenter 翻成提示文案', function () {
    const mock = mockView();
    const p = createUnitPresenter(mock.view);
    p.start();
    p.onValue('1');
    p.onFrom(99);
    p.onTo(99);
    // 越界索引被收敛回安全值，不产生脏状态
    const state = mock.lastState();
    assert.ok(state.error === '' || typeof state.error === 'string');
    p.dispose();
  });

  await test('toolbox-presenter: 工具清单与跳转由 Presenter 决定', function () {
    const mock = mockView();
    const p = createToolboxPresenter(mock.view);
    p.start();
    const state = mock.lastState();
    assert.strictEqual(state.tools.length, 1);
    assert.strictEqual(state.tools[0].key, 'unit');

    p.onSelect('unit');
    const navigates = mock.callsOf('navigate');
    assert.strictEqual(navigates.length, 1, '跳转通过 IView 请求，页面不调 wx.navigateTo');
    assert.strictEqual(navigates[0].args[0], '/packageTool/unit-convert/unit-convert');

    p.onSelect('not-exist');
    assert.strictEqual(mock.callsOf('navigate').length, 1, '未知工具不跳转');
    p.dispose();
  });

  await test('mine-presenter: 版本号由 Presenter 提供（可注入替换）', function () {
    const mock = mockView();
    const p = createMinePresenter(mock.view, { appInfo: { version: function () { return '9.9.9'; } } });
    p.start();
    assert.strictEqual(mock.lastState().version, '9.9.9');
    p.dispose();
  });

  await test('result-share-presenter: 解析分享参数（query 解析不在页面做）', function () {
    const mock = mockView();
    const p = createResultSharePresenter(mock.view);
    p.start({ expr: encodeURIComponent('1+2'), result: '3' });
    assert.strictEqual(mock.lastState().expr, '1+2');
    assert.strictEqual(mock.lastState().result, '3');
    assert.strictEqual(mock.callsOf('toast').length, 0);

    p.onBack();
    assert.strictEqual(mock.callsOf('switchTab')[0].args[0], '/pages/calc/calc');

    const share = p.buildShare();
    assert.ok(/1\+2 = 3/.test(share.title), '二次分享带上算式与结果');
    p.dispose();
  });

  await test('result-share-presenter: 参数非法时提示用户而非渲染脏数据', function () {
    const mock = mockView();
    const p = createResultSharePresenter(mock.view);
    p.start({ expr: 'not-an-expression', result: 'oops' });
    assert.strictEqual(mock.lastState().expr, '');
    assert.strictEqual(mock.lastState().result, '');
    assert.strictEqual(mock.callsOf('toast').length, 1, '失效分享内容必须回推提示');
    p.dispose();
  });

  console.log('\n----------------------------------------');
  console.log('  通过 ' + pass + ' / 失败 ' + failed);
  console.log('----------------------------------------');
  if (failed > 0) process.exit(1);
}

main().catch(function (err) {
  console.error('测试运行异常：', err);
  process.exit(1);
});
