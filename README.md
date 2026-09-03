# Marsoon Chart SDK

Marsoon Chart SDK 是面向浏览器的金融图表组件，支持 K 线、足迹图和扩展数据可视化。行情数据由接入方提供。

## 安装

```bash
npm install @cdjustin/chart-sdk
```

```ts
import { MarsoonChart } from '@cdjustin/chart-sdk';
```

## 快速开始

```ts
const chart = await MarsoonChart.mount({
  dataSocket: createHostMarketDataSocket(),
});

chart.configure({
  symbol: {
    symbol: 'ORION-PERP',
    exchange: 'NOVA',
    display_name: '示例标的',
    tick_size: 0.01,
    price_precision: 2,
    timezone: 'UTC',
  },
  timeframe_seconds: 60,
  chart_type: 'candlesticks',
});
```

`dataSocket` 由接入方实现。完整类型定义随 npm 包提供。

## 接入 Candles、Footprints、Trades 和 CVD

`dataSocket` 是接入方提供给 SDK 的行情适配器。推荐用 HTTP 查询历史数据、用一条 WebSocket 连接推送实时数据；也可以全部使用 WebSocket。

### 四个 stream

SDK 会在同一会话中使用以下四个 `stream`：

| `stream` | 消息中的数组字段 | 用途 |
| --- | --- | --- |
| `candles` | `candles` | K 线和所有依赖 OHLC 的图表 |
| `footprints` | `footprints` | 每根 K 线内各价格档位的主动买卖量 |
| `trades` | `trades` | 逐笔成交和大单气泡；SDK 不会用它自动生成其他三类数据 |
| `cvds` | `cvds` | 接入方已经聚合好的 CVD K 线；SDK 不会根据 Trades 计算 CVD |

首次 `configure()` 后，SDK 会对四个 stream 分别调用一次 `subscribe()` 和 `requestRange()`。如果暂时没有某个 stream，也要对其历史请求返回对应的空数组，例如 `footprints: []`，不能不响应。

### SDK 发出的请求

订阅请求结构：

```ts
type MarketDataStream = 'candles' | 'footprints' | 'trades' | 'cvds';

type MarketDataSubscriptionRequest = {
  stream: MarketDataStream;
  symbol_info: {
    symbol: string;
    exchange?: string;
    display_name?: string;
    tick_size: number;
    price_precision: number;
    timezone?: string;
  };
  timeframe_seconds: number;
};
```

例如：

```json
{
  "stream": "candles",
  "symbol_info": {
    "symbol": "ORION-PERP",
    "exchange": "NOVA",
    "tick_size": 0.01,
    "price_precision": 2,
    "timezone": "UTC"
  },
  "timeframe_seconds": 60
}
```

历史请求在订阅请求的基础上增加以下字段：

```ts
type MarketDataHistoryRequest = MarketDataSubscriptionRequest & {
  from: number;       // 包含，UTC Unix 秒
  to: number;         // 不包含，UTC Unix 秒
  request_id: string; // 由 SDK 生成
  mode?: 'latest';    // 首次加载可能出现
};
```

未携带 `mode` 的历史范围严格使用 `[from, to)`。`mode: 'latest'` 表示首次加载：如果请求范围位于休市、周末或节假日，接入方可以返回 `to` 之前最近的可用交易数据，不必强制落在 `from` 之后。Trades 自身虽然使用毫秒时间戳，查询范围仍然使用 Unix 秒。

### 返回给 SDK 的消息

历史响应必须带回原请求的 `stream` 和 `request_id`：

```json
{
  "kind": "history",
  "stream": "candles",
  "request_id": "req_1",
  "candles": [
    {
      "unix": 1788192000,
      "open": 101.2,
      "high": 102.8,
      "low": 100.9,
      "close": 102.1,
      "vbuy": 1250,
      "vsell": 980,
      "final": true
    }
  ],
  "has_more": true
}
```

实时消息不需要 `request_id`：

```json
{
  "kind": "realtime",
  "stream": "candles",
  "candles": [
    {
      "unix": 1788192060,
      "open": 102.1,
      "high": 102.5,
      "low": 101.8,
      "close": 102.3,
      "vbuy": 310,
      "vsell": 260,
      "final": false
    }
  ]
}
```

`stream` 和数组字段必须对应：

- `candles` → `{ candles: [...] }`
- `footprints` → `{ footprints: [...] }`
- `trades` → `{ trades: [...] }`
- `cvds` → `{ cvds: [...] }`

没有数据时也要返回空数组：

```json
{
  "kind": "history",
  "stream": "footprints",
  "request_id": "req_2",
  "footprints": []
}
```

每个历史请求应通过一次 `handlers.onMessage()` 返回完整结果。`has_more: false` 用于告诉 SDK 已经没有更早的 Candle 历史；仍有更早数据时返回 `true` 或省略该字段。

### 四类数据结构

```ts
type Candle = {
  unix: number;       // K 线开始时间，Unix 秒
  open: number;
  high: number;
  low: number;
  close: number;
  vbuy?: number;      // 主动买成交量
  vsell?: number;     // 主动卖成交量
  final?: boolean;
};

type Footprint = {
  unix: number;       // 对应 K 线的开始时间，Unix 秒
  timeframe?: number; // 为兼容旧类型保留可选；实际传输请始终传入
  prices: number[];
  buys: number[];
  sells: number[];
  final?: boolean;
};

type Trade = {
  timestamp_ms: number; // 成交时间，Unix 毫秒
  price: number;
  quantity: number;
  side: 'buy' | 'sell';
  sequence?: number;
  trade_id?: string;
};

type Cvd = {
  unix: number;       // CVD K 线开始时间，Unix 秒
  open: number;
  high: number;
  low: number;
  close: number;
  delta: number;
  final?: boolean;
};
```

数据要求：

- 所有数值必须是有限数字；价格和 Trade 数量必须大于 `0`，成交量不能为负数。
- Candle、Footprint 和 CVD 的 `unix` 应表示同一周期的开始时间。
- Footprint 的 `timeframe` 必须与当前请求的 `timeframe_seconds` 一致。
- Footprint 的 `prices`、`buys`、`sells` 长度必须完全一致，每个下标表示同一价格档位。
- CVD 的 `high`、`low` 必须覆盖 `open` 和 `close`。
- `final: false` 表示当前周期仍在更新，`final: true` 表示该周期已经结束。
- 历史数据建议按时间升序返回。

### HTTP 历史 + WebSocket 实时适配器

```ts
import type { ChartDataSocket } from '@cdjustin/chart-sdk';

function createHostMarketDataSocket(): ChartDataSocket {
  return {
    connect(handlers) {
      const ws = new WebSocket('wss://your-domain.example/market');

      ws.addEventListener('message', (event) => {
        handlers.onMessage(JSON.parse(event.data));
      });
      ws.addEventListener('error', () => {
        handlers.onError(new Error('market WebSocket failed'));
      });
      ws.addEventListener('close', () => handlers.onClose());

      return new Promise((resolve, reject) => {
        ws.addEventListener('open', () => resolve({
          subscribe(request) {
            ws.send(JSON.stringify({ action: 'subscribe', ...request }));
          },
          unsubscribe(request) {
            ws.send(JSON.stringify({ action: 'unsubscribe', ...request }));
          },
          async requestRange(request) {
            try {
              const response = await fetch('/api/market/history', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(request),
              });
              if (!response.ok) throw new Error(`HTTP ${response.status}`);

              // HTTP 返回体包含与 stream 对应的数组字段。
              handlers.onMessage({
                kind: 'history',
                stream: request.stream,
                request_id: request.request_id,
                ...(await response.json()),
              });
            } catch (error) {
              handlers.onError(error);
            }
          },
          close() {
            ws.close();
          },
        }), { once: true });
        ws.addEventListener('error', () => reject(
          new Error('market WebSocket connection failed'),
        ), { once: true });
      });
    },
  };
}
```

示例中的 `action: 'subscribe'` 和 `action: 'unsubscribe'` 只是宿主自己的 WebSocket 协议，不是 SDK 强制格式。SDK 只要求 `ChartDataSocket` 的方法和回调符合类型定义。

HTTP 接口可按 `stream` 返回以下任一种结构：

```json
{ "candles": [], "has_more": false }
{ "footprints": [], "has_more": false }
{ "trades": [], "has_more": false }
{ "cvds": [], "has_more": false }
```

如果历史和实时都走 WebSocket，只需在 `requestRange()` 中把历史请求发到 WebSocket，收到响应后仍通过 `handlers.onMessage()` 交给 SDK。

### 生命周期与排查

- 切换 ticker 或周期后，SDK 会关闭旧会话，并以新的 `symbol_info` 和 `timeframe_seconds` 建立会话。
- 不要把旧会话的历史响应转发到新会话；每个历史响应必须使用当前请求的原始 `request_id`。
- 页面一直显示“等待本地数据中”时，先检查四个初始 `requestRange()` 是否都收到响应。
- 再检查 `stream` 与数组字段是否匹配、`request_id` 是否原样返回、时间戳是否落在 `[from, to)` 内。
- 监听 SDK 的 `error` 事件，并在开发环境记录 `detail.code` 和 `detail.message`，可快速定位数据格式问题。

## 图表与数据

- 图表：K 线、折线、Heikin Ashi、OHLC、足迹图
- 行情：Candles、Footprints、Trades、CVD
- 指标：RSI、MACD、SMA、EMA、ATR、VWAP 等
- 绘图：趋势线、水平线、区域、测量和标注工具
- 布局：单图与多图布局

## 扩展 Widget

通过 `openWidget()` 可以打开主图、副图或 Dashboard 数据组件。

```ts
const trend = chart.openWidget({
  id: 'model-trend',
  type: 'line',
  points: [
    { timestamp_ms: 1788067200000, value: 12.4 },
    { timestamp_ms: 1788067260000, value: 13.1 },
  ],
});

trend.appendData([
  { timestamp_ms: 1788067320000, value: 13.8 },
]);
```

支持折线、散点、信号、柱状图、面积图、饼图、表格、排名、热力图、仪表盘等组件。

## Free / Pro

- Free：适合个人学习、研究、测试和非商业使用
- Pro：提供更完整的指标、足迹图设置、多图布局和历史数据能力

商业用途需要取得相应许可。接入方负责其行情数据来源、展示和分发授权。

## 相关文件

- 公共 API：`runtime/marsoon-chart.d.ts`
- [SDK 使用协议](https://github.com/Jsoooooooo/Marsoon-SDK/blob/main/SDK_TERMS.md)
- [隐私政策](https://github.com/Jsoooooooo/Marsoon-SDK/blob/main/SDK_PRIVACY.md)
