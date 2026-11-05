# Marsoon Chart SDK（A 股版）

浏览器图表组件，支持 K 线、足迹、指标、实时盘口热力图和数据可视化。行情由接入方提供，SDK 不包含行情服务。

## 安装

```bash
npm install @cdjustin/chart-sdk@0.2.0
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
    timezone: 'Asia/Shanghai',
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

盘口热力图复用配套的热图渲染资源。宿主部署这些运行资源后，通过绝对目录 URL 指定位置：

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

```ts
handlers.onMessage({
  kind: 'realtime',
  stream: 'depth',
  depth: [{
    connection: 'market-connection-1',
    pair: { exchange: 'YOUR_EXCHANGE', symbol: 'YOUR_SYMBOL' },
    provider: 'YOUR_PROVIDER',
    venue: 'YOUR_VENUE',
    instrument_id: 'YOUR_INSTRUMENT',
    tick_size: 0.01,
    event_time_ns: '1793900000000000000',
    receive_time_ns: '1793900000001000000',
    publisher_sequence: '1',
    channel_id: 1,
    book_epoch: '1',
    event_group_id: '1',
    flags: '0',
    source_depth: 2,
    kind: 'Snapshot',
    levels: [
      { side: 'Bid', price_ticks: '10000', volume: 800, orders_count: null },
      { side: 'Ask', price_ticks: '10001', volume: 600, orders_count: null },
    ],
  }],
});
```

- `pair.exchange`、`pair.symbol`、`tick_size` 与图表品种保持一致。
- `provider`、`venue`、`instrument_id` 是数据源身份，不能在同一个来源会话中随意切换。
- `price_ticks` 是整数价位，实际价格为 `price_ticks × tick_size`。
- `Snapshot` 建立或替换盘口；`Delta` 的 volume 是价档更新后的绝对量，0 表示删除，不是增减量。
- 先发 `Snapshot`，再发 `Delta` 和成交。重连、`Reset` 或 `Gap` 后重新同步快照。
- 同一盘口 epoch 内 `publisher_sequence` 递增，重复或旧序号不会当作新更新。
- 纳秒时间、64 位序号及价位可以使用 bigint 或十进制字符串；JSON 传输使用字符串，避免 JavaScript 数字精度损失。
- `source_depth` 按实际数据能力填写：0 为未知，1 为最优买卖价（BBO），2 为按价位聚合盘口（MBP），3 为逐笔委托盘口（MBO）；不是盘口价档数量。

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
    quantity_unit: 'shares',
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

A 股版包含通用指标，以及强势趋势监控、大单聚集、自定义涨跌幅。图表设置和绘图由 SDK 管理，数据历史是否完整取决于接入方实际提供的数据。

```ts
chart.setTimeframe(300);
chart.setFootprintSettings({ mode: 'delta', show_bin_text: true });
chart.addEventListener('error', event => console.error(event.detail.message));
chart.destroy();
```

接口完整类型随包提供。此 SDK 为专有组件，使用及商业分发需取得 Marsoon 授权。
