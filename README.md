# Marsoon Chart SDK

浏览器图表组件，支持 K 线、足迹、指标、实时盘口热力图和数据可视化。行情由接入方提供，SDK 不包含行情服务。

历史与实时链路、存储聚合、盘口热力图和 AI 接入步骤见完整指南。[数据接入与可视化指南](docs/SDK_MARKET_DATA_INTEGRATION.md)

## 安装

```bash
npm install @cdjustin/chart-sdk@0.2.4
```

## 初始化与鉴权

页面放置画布并设置尺寸：

```html
<canvas id="chart-canvas" style="width:100%;height:640px;display:block"></canvas>
```

```ts
import { MarsoonChart } from '@cdjustin/chart-sdk';

const chart = await MarsoonChart.mount({ dataSocket });

chart.configure({
  symbol: {
    symbol: 'YOUR_SYMBOL',
    exchange: 'YOUR_EXCHANGE',
    display_name: '示例品种',
    tick_size: 0.01,
    price_precision: 2,
    timezone: 'UTC',
  },
  timeframe_seconds: 60,
  chart_type: 'candlesticks',
});
```

`dataSocket` 按下节实现。SDK 自动显示 AppKey / Secret 输入框，内部完成鉴权请求。验证成功后 `mount()` 才返回；不必在网页源码中预置凭证。SDK 自动定期复核授权，明确拒绝后停止使用。鉴权不等于登录行情服务，行情连接的身份仍由接入方管理。

## dataSocket 接口

`dataSocket` 是接入方提供的数据适配器。SDK 不规定你与行情后端之间的 WebSocket 报文，适配器负责将后端协议转换为下述结构。

```ts
const dataSocket = {
  async connect(handlers) {
    const connection = await connectYourMarketData();
    connection.onMessage(message => handlers.onMessage(message));
    connection.onError(error => handlers.onError(error));
    connection.onClose(error => handlers.onClose(error));

    return {
      subscribe(request) {
        return connection.subscribe(request);
      },
      unsubscribe(request) {
        return connection.unsubscribe(request);
      },
      requestRange(request) {
        return connection.requestRange(request);
      },
      close() {
        connection.close();
      },
    };
  },
};
```

`connectYourMarketData()` 由接入方实现。`connect` 返回的连接供多种数据流共用。

| 调用 | SDK 传入的信息 |
| --- | --- |
| `subscribe` / `unsubscribe` | `symbol_info`、`timeframe_seconds`、`stream` |
| `requestRange` | 上述信息以及 `from`、`to`、`request_id`，可能包含 `mode: 'latest'` |
| `handlers.onMessage` | 接入方交付历史或实时数据 |

`from` 包含边界，`to` 不包含边界，均为 UTC Unix 秒。历史响应必须原样带回 `request_id`，空页也要回复；`has_more: false` 表示该数据流已没有更早数据。

## K 线、足迹、成交和 CVD

支持 `candles`、`footprints`、`trades`、`cvds` 四种常规流。每条消息使用对应的数组字段。

```ts
handlers.onMessage({
  kind: 'history',
  stream: 'candles',
  request_id: request.request_id,
  has_more: false,
  candles: [
    { unix: 1793900000, open: 100, high: 101, low: 99, close: 100.5,
      vbuy: 600, vsell: 400, vunknown: 0, final: true },
  ],
});
```

| 数组 | 单项字段 |
| --- | --- |
| `candles` | `unix`、`open`、`high`、`low`、`close`；可附 `vbuy`、`vsell`、`vunknown`、`final` |
| `footprints` | `unix`、`timeframe`、等长数组 `prices` / `buys` / `sells`、`final` |
| `trades` | `timestamp_ms`、`price`、`quantity`、`side`；热力图扩展字段见下文 |
| `cvds` | `unix`、`open`、`high`、`low`、`close`、`delta`、`final` |

实时消息使用 `kind: 'realtime'`，不带历史请求标识。CVD 由接入方提供，SDK 不从成交自动构建 CVD。K 线和足迹的成交量需保持同一口径，未知方向量不能归到卖方。

## 实时盘口热力图

盘口热力图的类型是 `orderbook_heatmap`，与矩阵数据图 `heatmap` 不同。

0.2.2 起，npm 包的 `runtime/heatmap-runtime/` 自带热力图 JS、Worker、字体和引擎 WASM。将完整 `runtime/` 目录随应用发布，默认即可加载。需要自定义部署位置时，通过绝对目录 URL 指定：

```ts
const chart = await MarsoonChart.mount({
  dataSocket,
  heatmapRuntimeBase: new URL('/heatmap-runtime/', location.href).href,
});

chart.configure(configuration);
const heatmap = chart.openWidget({ id: 'orderbook', type: 'orderbook_heatmap' });
```

使用 `dataSocket` 时，SDK 在打开首个盘口热图时增加 `stream: 'depth'` 订阅，在关闭最后一个时取消该订阅。该流只交付实时盘口，SDK 不通过 `requestRange` 请求历史深度。成交仍通过完整的实时 `trades` 流交付。

### 盘口深度消息

0.2.1 起只需传递事件时间、连续序号、更新类型和买卖价档。品种及最小价位复用 `chart.configure()` 的设置，接收时间、连接和会话信息由 SDK 管理。

```ts
handlers.onMessage({
  kind: 'realtime',
  stream: 'depth',
  depth: [{
    timestamp_ms: 1793900000000,
    sequence: 1,
    kind: 'Snapshot',
    bids: [[100.00, 800]],
    asks: [[100.01, 600]],
  }],
});
```

每个价档为 `[实际价格, 数量]`，价格必须对齐配置的 `tick_size`，数量不得为负。时间为 UTC Unix 毫秒整数，`sequence` 可为安全整数、bigint 或十进制字符串；大序号通过 JSON 传输时使用字符串。

- `Snapshot` 替换整个盘口，先发送快照，再发送增量和成交。
- `Delta` 只更新指定价档。数量是更新后的绝对量，0 表示删除；没有变化的一侧传空数组。
- `sequence` 是当前连接内连续递增的交付序号。SDK 忽略重复或旧序号；增量跳号后暂停使用旧盘口，等待新快照。
- 断线重连后必须重新发送 `Snapshot`，新连接可从新的序号起点开始。
- 数据源主动重置时发送 `kind: 'Reset'`，发现上游数据缺口时发送 `kind: 'Gap'`；两者的 `bids`、`asks` 均为空数组，随后重新发送快照。
- 适配器负责检查上游数据完整性；自行生成交付序号不能证明上游没有丢包。

例如将买一数量改成 500、删除卖一：

```ts
handlers.onMessage({
  kind: 'realtime',
  stream: 'depth',
  depth: [{
    timestamp_ms: 1793900000100,
    sequence: 2,
    kind: 'Delta',
    bids: [[100.00, 500]],
    asks: [[100.01, 0]],
  }],
});
```

SDK 通过 `error` 事件的 `event.detail.code === 'heatmap_snapshot_required'` 通知接入方重新提供快照。深度流不使用 `requestRange`；接入方按自己的后端协议获取并交付新快照。恢复前暂停向热力图投递成交。

### 热力图成交消息

```ts
handlers.onMessage({
  kind: 'realtime',
  stream: 'trades',
  trades: [{
    timestamp_ms: 1793900000000,
    price: 100.01,
    quantity: 100,
    side: 'buy',
    sequence: 2,
    trade_id: 'YOUR_TRADE_ID',
    quantity_unit: 'units',
    granularity: 'individual',
    side_source: 'provider_native',
  }],
});
```

| 字段 | 可选值 |
| --- | --- |
| `side` | `buy`、`sell`、`unknown` |
| `quantity_unit` | `contracts`、`shares`、`lots`、`units`、`base_asset` |
| `granularity` | `individual`、`aggregated` |
| `side_source` | `provider_native`、`quote_inferred`、`tick_rule_inferred`、`unavailable` |

成交量分布需要完整、未按大单阈值过滤的实时成交。保留未知方向及其来源信息，不要把 unknown 改成 sell；聚合成交需标记 aggregated，数量单位要与实际数据一致。

已有盘口接入组件也可以直接推送，不经过 dataSocket：

```ts
heatmap.pushDepth(depthUpdate);
heatmap.pushTrades(trades);
```

两种入口按需选择，同一条数据不要重复投递。关闭热图调用 `heatmap.close()`。

## 指标、配置和销毁

支持指标叠加、图表配置和绘图。数据历史是否完整取决于接入方实际提供的数据。

```ts
chart.setTimeframe(604_800);
chart.setFootprintSettings({
  display: 'aligned', aligned_mode: 'delta_volume', aligned_delta_bid_ask: true,
  enable_imbalance: true, stacked_imbalance_levels: 5,
});
chart.addEventListener('error', event => console.error(event.detail.message));
chart.destroy();
```

周线、月线和年线的 `timeframe_seconds` 分别为 `604800`、`2629800` 和 `31536000`。接入方按交易市场的日历生成各周期数据和实际开盘时间。同一根 K 线的足迹和 CVD 使用相同的 `unix`。

足迹支持 `profile`（足迹分布）、`cluster`（足迹簇）和 `aligned`（档位足迹）。在足迹分布和足迹簇中，用 `delta_volume` 同时显示买卖差和成交量。

## 读取指标数据

`getIndicatorData()` 读取当前选中图表已经加载的行情。图上有该指标时使用当前参数（`source: 'chart'`）。也可以直接读取默认参数结果（`source: 'default'`）。

```ts
const macd = await chart.getIndicatorData('macd', { limit: 100 });
console.log(macd.points.at(-1)?.values.histogram);

const { profile } = await chart.getIndicatorData('enhanced_chip_peak');
console.log(profile?.poc_price_low, profile?.large_print_percent, profile?.rows);
```

逐 K 线指标支持 `from`（含）和 `to`（不含），单位为 Unix 秒。`limit` 默认 500，最多 2,000 条。点按时间升序排列，`final` 表示对应 K 线是否收盘，缺少输入或预热不足的值为 `null`。

| 指标 ID | `values` 字段 |
| --- | --- |
| `sma`、`ema`、`atr` | `value` |
| `rsi` | `rsi`、`average` |
| `macd` | `macd`、`signal`、`histogram` |
| `bollinger_bands` | `middle`、`upper`、`lower` |
| `kdj` | `k`、`d`、`j` |
| `session_vwap` | `vwap`、`upper`、`lower` |
| `volume` | `total`、`buy`、`sell`、`unknown` |
| `volume_delta` | `delta` |
| `cvd` | `cvd` |

加强筹码峰依据图上的回看根数和每行 Tick 聚合足迹数据。返回 POC、价值区边界和大单占比，每个价位区间含成交量、买卖差、稳定筹码量和核心大单量。价位行按价格升序排列。窗口内缺少足迹时，`profile` 为 `null`。

接口完整类型随包提供。此 SDK 为专有组件，使用及商业分发需取得 Marsoon 授权。
