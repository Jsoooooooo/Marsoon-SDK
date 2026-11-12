# Marsoon Chart SDK 数据接入与可视化

使用你的后端数据，在网页中展示价格图、盘口热力图、统计面板或自定义指标。本文适用于 `@cdjustin/chart-sdk@0.2.3`。准备接口地址、品种信息和脱敏的真实报文，再把下面的任务交给 AI 编程助手。SDK AppKey / Secret 用于图表授权，行情会话由你的应用管理。[npm 包](https://www.npmjs.com/package/@cdjustin/chart-sdk/v/0.2.3)

## 把接入任务交给 AI

替换方括号中的内容。实际凭证通过项目现有方式配置。

```text
请在我的项目中接入 @cdjustin/chart-sdk@0.2.3，并按这份指南实现历史与实时链路。

品种目录或配置是 [品种 ID、交易所、tick_size、价格精度、交易时区]。
历史接口是 [脱敏地址、请求参数、脱敏响应示例、时间单位]。
实时接口是 [脱敏地址、订阅方法、脱敏的第一包及后续消息示例]。
我要展示 [K 线、足迹、盘口热力图、统计面板、自定义指标]，放在 [页面位置]。

只查看接入方的项目代码、接口说明，以及 SDK 的公开指南、README、包清单和 .d.ts 类型定义。
SDK 的编译 JS、Worker 和 WASM 仅用于原样安装、部署和运行。跳过检查、还原、反编译或修改 SDK 的内部实现。
排查时使用公开回调、错误码及资源加载结果。缺少接口信息时，列出具体问题交给 SDK 提供方确认。

复用接入方已有的数据源、认证和存储。实际凭证通过项目现有方式配置。
给 AI 的报文、日志和截图须先脱敏，移除 AppKey、Secret、Token、鉴权头和 URL 中的签名参数。
写明每个流从哪里读取、是否入库、如何映射到 SDK，再接通实际数据。
验证首次开图、向左翻页、实时更新、切换品种和断线恢复。
接盘口热图时，记录交给 SDK 的第一条 depth 消息的脱敏样例、字段单位、
SDK 错误码及脱敏后的 cause，并确认画面从等待快照进入实时状态。
```

## 1. 架构和分工

```text
历史链路
上游历史接口 → 后端回补和聚合 → 历史库 → 历史查询 → dataSocket.requestRange → SDK

实时价格图
上游实时订阅 → 后端归一化和聚合 → 更新当前柱并入库 → 实时推送 → dataSocket → SDK

实时盘口热力图
上游盘口订阅 → 维护当前盘口并生成首包快照 → 实时 depth → dataSocket → 热力图
上游成交订阅 → 标准化实时成交 → 实时 trades → dataSocket → 气泡和区间统计
```

历史查询可用 HTTP，也可走已有 WebSocket 请求。实时可沿用现有订阅接口。SDK 通过 `dataSocket` 与适配器交互，应用负责调用后端并转换报文。已有后端能提供所需历史和实时数据时，直接复用。只展示统计面板或自定义指标时，可直接查询业务接口，再通过 Widget 或指标接口更新。

## 2. 后端保存什么

自行建库时，可以用后端机器上的 SQLite，也可以复用现有数据库。基础周期保存 **1 分钟 K 线和足迹**，查询更高周期时按对应交易时段合并。

| 数据 | 历史保存方式 | 实时怎么走 |
| --- | --- | --- |
| K 线 | 按「品种、周期、柱开始时间」保存 OHLC、可用成交量、收盘状态。只存 1 分钟时，周期固定为 60 秒 | 按同一键更新当前柱并推送整根柱的最新值 |
| 足迹 | 按同一柱键保存价档，可每柱存一组数组，或每价档一行。单价档的键再加价格刻度 | 同一柱发送完整价档及当前累计买卖量 |
| 逐笔成交 | 需要历史成交、补数重算或回放时保存。键用「品种、成交 ID」，或用带会话范围的上游序号。仅展示实时成交时可以按实时转发 | 保留成交时间、实际价格、数量、方向和稳定标识 |
| CVD | 需要历史 CVD 时，可以保存对应周期结果，也可以从历史方向量按统一累计起点重算 | 计算当前柱的 CVD OHLC 和 `delta` 后推送 |
| 盘口深度 | 实时热图可只维护每个品种的最新有效盘口和源序号。只有需要回放或审计时，才另存快照及增量日志 | 新订阅先发当前完整快照，随后发完整更新或增量 |
| 同步进度 | 需要恢复和补数时，保存每个品种、每条流的确认游标或覆盖范围 | 用同一个确认位置衔接历史回补和实时更新 |

品种键应区分同名品种和来源。回补历史时，按柱键更新已有记录。实时当前柱使用同一键覆盖，未收盘传 `final: false`，收盘后传 `final: true`。有缺口时按实际覆盖返回数据，并保留后端能确认的质量标记。

已有 K 线、足迹或指标结果时，可以直接交给 SDK。只有逐笔成交时，先按事件时间排序、去重，再按实际交易时段及价格档聚合。可以用自己的聚合逻辑，或使用独立的 Market Aggregation WASM。[GitHub 仓库](https://github.com/Justinii111/candle-aggregator) · [下载 ZIP](https://github.com/Justinii111/candle-aggregator/archive/00138a4f505d7e4e8be98411fc46fb22adcd4992.zip)

将 `market-aggregator.js`、`market-aggregator.worker.js` 和 `market-aggregator.wasm` 放在同一目录。用 `AggregationClient.replace()` 载入历史，用 `append()` 接续实时。两者返回 `candles` 和 `footprints`，可写入历史库或实时推送。合并高周期 K 线时取首开、最高、最低和末收，量按口径累加。足迹按相同价档合并。只有 OHLC 或总量时，可以先接 K 线，足迹和 CVD 按实际可用数据返回。

## 3. 数据适配器和消息结构

实现 `dataSocket.connect(handlers)`，返回一个会话。SDK 对该会话调用下列方法。

| 方法 | 适配器要做的事 |
| --- | --- |
| `subscribe(request)` | 按 `symbol_info`、`timeframe_seconds` 和 `stream` 建立实时订阅。建立订阅后返回，后续更新交给 `handlers.onMessage()` |
| `requestRange(request)` | 按上面的字段及 `from`、`to` 查询历史。将该次结果映射成同名数组，并带回原 `request_id` |
| `unsubscribe(request)` | 释放对应订阅。共用上游订阅时，在最后一个消费者离开后退订 |
| `close()` | 关闭会话并停止向该会话交付数据 |

连接异常调用 `handlers.onError(error)`，断开时调用 `handlers.onClose(error)`。切换品种或周期时，以 SDK 的新请求建立新上下文，过期请求的响应和旧订阅的推送应丢弃。

| SDK 流 | 每条记录的字段 |
| --- | --- |
| `candles` | `unix, open, high, low, close`。可附 `vbuy, vsell, vunknown, final, volume_complete` |
| `footprints` | `unix, timeframe, prices, buys, sells, final`。三个数组按索引一一对应，长度相同，`timeframe` 为秒 |
| `trades` | `timestamp_ms, price, quantity, side`。可附 `trade_id, sequence, quantity_unit, granularity, side_source`。方向不明传 `unknown`，聚合记录标记 `granularity: 'aggregated'` |
| `cvds` | `unix, open, high, low, close, delta, final`。宿主或后端计算累计量，历史与实时使用相同起点和口径 |
| `depth` | `timestamp_ms, sequence, kind, bids, asks`。只通过实时订阅交付，见第 5 节 |

`unix` 为柱开始时间，和 `from`、`to` 一样使用 Unix **秒**。逐笔成交、盘口和外部指标的 `timestamp_ms` 使用 Unix **毫秒**。普通历史按 `[from, to)` 查询。查询成交时，将两端转换成毫秒再筛选。

历史响应使用 `kind: 'history'`，实时消息使用 `kind: 'realtime'`。每条消息只承载一个流，数组名与 `stream` 相同。以下代码接收实际查询返回的 K 线和实际实时更新，其他常规流使用自己的同名数组。

```ts
import type { Candle, MarketDataHistoryRequest, MarketDataSocketHandlers } from '@cdjustin/chart-sdk';

export function deliverCandleHistory(
  handlers: MarketDataSocketHandlers,
  request: MarketDataHistoryRequest,
  candles: Candle[],
  hasMore: boolean,
) {
  handlers.onMessage({
    kind: 'history',
    stream: 'candles',
    request_id: request.request_id,
    has_more: hasMore,
    candles,
  });
}

export function deliverLiveCandles(handlers: MarketDataSocketHandlers, candles: Candle[]) {
  handlers.onMessage({ kind: 'realtime', stream: 'candles', candles });
}
```

每个历史请求交付一次完整响应，按时间升序返回。上游分批返回时，先在适配器合并。查询成功但该流没有数据时，返回对应空数组并带回原请求 ID。确认没有更早的 K 线时，返回 `has_more: false`。查询失败应报告错误，便于区分接口异常与正常空页。实时更新直接交付对应数组。

## 4. 打开图表后的接续顺序

1. **安装、挂载和配置。** 创建画布，将现有行情适配器传给 SDK，并调用 `configure()`。用真实品种配置填写 `symbol`、`exchange`、`tick_size`、`price_precision`，可附展示名称和交易时区。SDK 在需要授权时会显示 AppKey / Secret 输入界面。
2. **首屏。** SDK 对 `candles`、`footprints`、`trades`、`cvds` 分别订阅并请求首批历史。首批请求带 `mode: 'latest'`，休市时可以返回 `to` 之前最近的可用数据。及时回复暂不支持的流。SDK 按流暂存首批历史返回前收到的实时更新，收到历史后接续应用。
3. **持续更新。** 后端按柱键发送最新的整柱值，成交用稳定标识去重。历史查询和实时发布应使用同一个确认位置，避免重复成交或旧值覆盖实时柱。用户向左拖动时按 SDK 发出的范围继续查库。各流历史覆盖可以不同。
4. **重连和切换。** 通知 SDK 会话已断开，让它重新连接、订阅并请求缺口历史。后端先补齐可查询的缺口，再从相应确认位置接续。切换品种、切换周期或卸载组件时，释放旧会话的订阅和未完成请求。

```bash
npm install @cdjustin/chart-sdk@0.2.3
```

```html
<canvas id="chart-canvas" style="display:block;width:100%;height:640px"></canvas>
```

```ts
import { MarsoonChart, type ChartDataSocket, type SymbolInfo } from '@cdjustin/chart-sdk';

export async function mountChart(symbolInfo: SymbolInfo, dataSocket?: ChartDataSocket) {
  const chart = await MarsoonChart.mount({ dataSocket });
  chart.configure({
    symbol: symbolInfo,
    timeframe_seconds: 60,
    chart_type: 'candlesticks',
  });
  return chart;
}
```

静态部署时随页面发布 npm 包内的完整 `runtime/` 目录，保留文件名和相对路径。组件卸载时调用 `chart.destroy()`。只使用 Widget 时可省略 `dataSocket`，仍需先调用 `configure()`，可以使用应用内的数据上下文标识。

## 5. 实时盘口热力图

### 从订阅到首帧

1. **打开组件。** 调用 `chart.openWidget({ id: 'orderbook', type: 'orderbook_heatmap' })`，也可以通过图表界面打开。SDK 在打开首个盘口热图时调用 `subscribe({ stream: 'depth', ... })`，关闭最后一个时取消该订阅。
2. **立即发首包快照。** 收到 `depth` 订阅后，发送当前有效的完整盘口 `Snapshot`。后端已有有效盘口时，可以直接用内存中的最新盘口。上游只发增量时，先获取快照，再用上游序号衔接增量。SDK 的历史 `requestRange()` 不请求盘口深度。
3. **持续更新。** 上游每包都是完整盘口时，可以每包发 `Snapshot`。增量源在快照后发 `Delta`。每档传更新后的绝对量，数量为 0 时移除该档。仅发送数据源实际提供的档位。
4. **恢复。** 发生缺口、连接重置、切换品种或 SDK 报 `heatmap_snapshot_required` 时，重新提供当前快照。发送 `Gap` 或 `Reset` 时，`bids` 和 `asks` 都用空数组。新连接从新的序号起点重新发快照。恢复快照前暂停投递盘口增量和热图成交。

### 交给 SDK 的结构

外层消息为 `{ kind: 'realtime', stream: 'depth', depth: [snapshot] }`。每个 `snapshot` 或增量元素只包含 `timestamp_ms`、`sequence`、`kind`、`bids`、`asks`。

- `timestamp_ms` 为 Unix 毫秒整数。纳秒时间用 `BigInt` 除以 `1_000_000n` 后再转为数字。
- `sequence` 在同一连接中连续递增。大序号用十进制字符串传输。增量跳号时 SDK 会等待新快照。适配器先用上游序号判断是否缺数据，再映射成交付序号。
- `bids`、`asks` 中的元素均为 `[实际价格, 数量]`。价格应对齐当前品种的 `tick_size`，数量用非负数字，同侧每个价格只出现一次。过滤上游用于表示无效档位的空值和哨兵值。

### 旧版报文迁移示例

接入契约以本节上方的 `DepthUpdate` 结构为准。已有后端仍提供 `event_time_ns / publisher_sequence / levels` 格式的完整快照时，可以在接入方适配器中用下面的函数转换后交付。

```ts
import type { DepthUpdate, MarketDataSocketHandlers } from '@cdjustin/chart-sdk';

type LegacySnapshot = {
  kind: 'Snapshot';
  event_time_ns: string | bigint;
  publisher_sequence: string | bigint | number;
  tick_size: number;
  levels: { side: 'Bid' | 'Ask'; price_ticks: number; volume: number }[];
};

export function deliverLegacySnapshot(handlers: MarketDataSocketHandlers, raw: LegacySnapshot) {
  const snapshot: DepthUpdate = {
    kind: 'Snapshot',
    timestamp_ms: Number(BigInt(raw.event_time_ns) / 1_000_000n),
    sequence: String(raw.publisher_sequence),
    bids: [],
    asks: [],
  };
  for (const level of raw.levels) {
    const side = level.side === 'Bid' ? snapshot.bids : snapshot.asks;
    side.push([level.price_ticks * raw.tick_size, level.volume]);
  }
  handlers.onMessage({ kind: 'realtime', stream: 'depth', depth: [snapshot] });
}
```

转发前按品种路由，确保报文对应当前热图且最小价位与 `configure()` 一致。新格式直接通过 `dataSocket` 交付。已有独立盘口组件也可改用热图句柄的 `pushDepth()` 和 `pushTrades()`。同一条数据选择一个入口。

### 盘口和成交各自负责的显示

`depth` 驱动盘口挂单热图。成交气泡和区间统计使用实时 `trades`，数量单位和方向来源沿用后端口径。展示完整成交量分布时，交付未按大单阈值过滤的成交。仅接入盘口时先验收盘口显示，再按需接入成交。

### 热图一直等待快照时怎么查

| 检查位置 | 确认什么 |
| --- | --- |
| SDK 调用适配器 | 打开热图后，实际收到 `subscribe` 的 `stream: 'depth'` |
| 适配器交付 SDK | 检查调用 `handlers.onMessage()` 时的首包。外层是实时 `depth`，内层第一条是完整 `Snapshot`，字段与单位符合上面的结构 |
| SDK 错误事件 | 记录 `event.detail.code` 和脱敏后的 `message`、`cause`。出现 `invalid_market_data` 时检查报文和价档。出现 `heatmap_snapshot_required` 时先查看原因，再按需补发快照 |
| 浏览器加载资源 | 检查 `runtime/heatmap-runtime/` 下的 JS、Worker、WASM 和清单请求。需要自定义部署位置时，`heatmapRuntimeBase` 使用以 `/` 结尾的绝对目录 URL |
| 画面 | 确认退出等待，买卖价档和主图区色带随真实数据更新。断线重连后再检查首包快照能否恢复显示 |

## 6. 用 Widget 展示数据

把后端的统计结果转换成组件所需的 `points`。通过 `chart.openWidget()` 创建组件，刷新时调用返回对象的 `setData(points)`。

| 想展示的内容 | Widget 类型 |
| --- | --- |
| 数值和进度 | 指标卡 `metric`、仪表盘 `gauge` |
| 分类、排名和占比 | 表格 `table`、排行条形图 `ranking_bar`、堆叠条形图 `stacked_bar`、饼图 `pie`、环形图 `donut`、矩形树图 `treemap` |
| 矩阵与分布 | 矩阵热力图 `heatmap`、相关矩阵 `correlation_matrix`、分布图 `distribution`、日历热力图 `calendar_heatmap` |
| 趋势、信号和回撤 | 折线 `line`、散点 `scatter`、信号 `signal`、柱状图 `histogram`、面积图 `area`、阶梯线 `step_line`、净值与回撤 `equity_drawdown` |

下面的函数接收你的后端排名结果。每项映射为 `{ label, value }`。其他组件的数据形状见安装包里的 `QuantSeriesData` 类型。

```ts
import type { MarsoonChart } from '@cdjustin/chart-sdk';

export function openRanking(chart: MarsoonChart, points: { label: string; value: number }[]) {
  return chart.openWidget({ id: 'ranking', type: 'ranking_bar', title: '排行', points });
}
```

## 7. 添加外部自定义指标

在你的后端或前端计算指标，把结果按 `{ timestamp_ms, value }` 传给 SDK。用 `createSeries()` 注册指标，选择叠加到主图 `main`，或放在独立副图 `subpane`。

```ts
import type { MarsoonChart, QuantTimeSeriesPoint } from '@cdjustin/chart-sdk';

export function showCustomIndicator(chart: MarsoonChart, points: QuantTimeSeriesPoint[]) {
  chart.createSeries({
    id: 'custom-score',
    name: '自定义评分',
    series_type: 'line',
    target: 'subpane',
  });
  chart.replaceSeriesData('custom-score', { series_type: 'line', points });
}
```

有新点时，用 `appendSeriesData(id, { series_type, points })` 增量更新。整段重算时，用 `replaceSeriesData()` 替换数据。指标也可以用柱状图、散点或带 `signal` 字段的信号标记。
