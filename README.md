# Marsoon Chart SDK

Marsoon Chart SDK 是浏览器图表渲染组件。Candles、Footprints、Trades 和 CVD 通过宿主提供的一条共享 WebSocket 会话多路复用。SDK 不接收也不知道 WebSocket 地址、鉴权或上游数据源，不聚合、不存储、不转发行情，也不依赖任何数据处理项目。

## 引入与挂载

使用 npm：

```bash
npm install @cdjustin/chart-sdk
```

```ts
import { MarsoonChart } from '@cdjustin/chart-sdk';
```

npm 包自带稳定入口、TypeScript 类型、签名 manifest、Core、Runtime、WASM 和
运行时 snippets。安装完成后，SDK 资源全部从当前应用的 `node_modules`/打包产物
加载；首次加载不依赖 GitHub Pages。行情、鉴权等宿主接口仍由接入方自行提供。

不使用构建工具时，请从锁定版本的 npm 包复制完整 `runtime/` 目录到自己的站点，
不要只复制入口文件：

```html
<canvas id="chart-canvas"></canvas>
<script type="module">
  import { MarsoonChart } from '/vendor/marsoon-chart/runtime/marsoon-chart.js';

  // 宿主自行实现；connect() 返回一条共享 WebSocket 会话。
  const dataSocket = createHostMarketDataSocket();

  const chart = await MarsoonChart.mount({
    runtimeUpdatePolicy: 'reload',
    dataSocket,
    // 可选：由宿主后端持有 Refresh Token，只向 SDK 返回短期 Access Token。
    getAccessToken: async () => {
      const response = await fetch('/api/marsoon-sdk/access-token', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error(`Access token HTTP ${response.status}`);
      return (await response.json()).access_token;
    },
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
</script>
```

不要直接从 GitHub Pages 引入可变入口。npm lockfile 固定包版本，包内入口会验证
签名 manifest 以及 Core/Runtime/WASM 的哈希；升级 SDK 时应更新 npm 版本并重新构建应用。
GitHub Pages 仅作为开源仓库的在线演示与镜像，不是 npm 安装后的运行依赖。

SDK 启动后会单独读取远程签名发布清单以检查版本。该请求只读取版本元数据，
不会下载或执行远程 Core、Runtime 或 WASM。发现新版时，npm 版本会在 SDK 内弹窗
提示项目维护者执行升级命令并重新构建部署；浏览器不会修改 `node_modules`，也不会
把页面刷新伪装成已经升级。关闭提示后，同一版本将在 24 小时后再次提醒。

## macOS / Windows 一键本地运行

要求安装 [Node.js 18 或更高版本](https://nodejs.org/)，克隆 GitHub 仓库后：

```bash
git clone https://github.com/Jsoooooooo/Marsoon-SDK.git
cd Marsoon-SDK
```

- macOS：首次运行可在终端执行 `chmod +x serve-macos.command`，之后双击 `serve-macos.command`。
- Windows：双击 `serve-windows.cmd`。
- 两个平台也可直接执行 `node serve-sdk.mjs`。

脚本只在 `127.0.0.1:4173` 提供当前目录的静态文件，并自动打开 `http://127.0.0.1:4173/runtime/`。它不包含行情后端；接入真实数据需要由宿主实现下述 WebSocket 工厂。端口占用时可设置环境变量 `MARSOON_SDK_PORT` 后再启动。

## 行情数据接口

SDK 只读取标准化结果，不关心宿主如何取得或整理数据。宿主向 `mount()` 传入 `dataSocket`：

```ts
interface ChartDataSocket {
  connect(handlers: MarketDataSocketHandlers):
    MarketDataSocketSession | Promise<MarketDataSocketSession>;
}

interface MarketDataSocketSession {
  subscribe(request: MarketDataSubscriptionRequest): void | Promise<void>;
  unsubscribe?(request: MarketDataSubscriptionRequest): void | Promise<void>;
  requestRange(request: MarketDataHistoryRequest): void | Promise<void>;
  close(): void;
}
```

`connect(handlers)` 由宿主创建并打开一条真正的 WebSocket。SDK 在同一会话中分别订阅 Candles、Footprints、Trades 和 CVD；连接参数、代理、重连和服务器适配全部保留在宿主代码中。

订阅和历史范围请求：

```ts
type MarketDataStream = 'candles' | 'footprints' | 'trades' | 'cvds';

interface MarketDataSubscriptionRequest {
  symbol_info: SymbolInfo;
  timeframe_seconds: number;
  stream: MarketDataStream;
}

interface MarketDataHistoryRequest {
  symbol_info: SymbolInfo;
  timeframe_seconds: number;
  from: number;          // UTC Unix 秒，包含
  to: number;            // UTC Unix 秒，不包含
  request_id: string;    // 历史响应必须原样带回
  stream: MarketDataStream;
  mode?: 'latest';       // 首次请求允许回退到最近交易时段
}

interface MarketDataSocketMessage {
  kind: 'history' | 'realtime';
  stream: MarketDataStream;
  request_id?: string;
  candles?: Candle[];
  footprints?: Footprint[];
  trades?: Trade[];
  cvds?: Cvd[];
  has_more?: boolean;
}
```

`mode` 的含义：

- 不传 `mode`：宿主必须严格查询并返回 `[from, to)` 范围内的数据。
- 传入 `mode: 'latest'`：表示这是首次展示所需的历史数据。宿主以 `to` 为时间上界向前查找最近可用数据；当前范围处于休市、周末或节假日时，允许返回早于 `from` 的最近交易时段。
- 期望返回的最大周期数可由 `Math.ceil((to - from) / timeframe_seconds)` 得出，因此请求中不再重复传递 `count_back`。
- 其他历史请求不携带 `mode: 'latest'`，仍严格使用 `[from, to)`。

无论是否使用 `mode: 'latest'`，历史响应都必须原样返回请求中的 `request_id`。

宿主收到 WebSocket 消息后调用 `handlers.onMessage(message)`；错误和关闭分别调用 `onError`、`onClose`。每条消息用 `stream` 标明共享连接中的逻辑流；历史消息还必须带对应 `request_id`，实时消息不需要。

```ts
interface Candle {
  unix: number;       // UTC Unix 秒；该周期起点
  open: number;
  high: number;
  low: number;
  close: number;
  vbuy?: number;
  vsell?: number;
  final?: boolean;
}

interface Footprint {
  unix: number;
  timeframe?: number;
  prices: number[];
  buys: number[];
  sells: number[];
  final?: boolean;
}

interface Trade {
  timestamp_ms: number;
  price: number;
  quantity: number;
  side: 'buy' | 'sell';
  sequence?: number;
  trade_id?: string;
}

interface Cvd {
  unix: number;          // UTC Unix 秒，对齐当前周期
  open: number;
  high: number;
  low: number;
  close: number;
  delta: number;
  final?: boolean;
}
```

### CVD WebSocket 示例

SDK 会在共享连接上单独订阅 `cvds`：

```json
{
  "symbol_info": {
    "symbol": "ORION-PERP",
    "exchange": "NOVA",
    "tick_size": 0.25,
    "price_precision": 2
  },
  "timeframe_seconds": 60,
  "stream": "cvds"
}
```

宿主收到 CVD 历史范围请求后，应原样带回 `request_id`：

```json
{
  "kind": "history",
  "stream": "cvds",
  "request_id": "req_k7p2",
  "cvds": [
    {
      "unix": 1787414400,
      "open": 1200,
      "high": 1260,
      "low": 1180,
      "close": 1240,
      "delta": 40,
      "final": true
    }
  ],
  "has_more": true
}
```

实时 CVD 不需要 `request_id`：

```json
{
  "kind": "realtime",
  "stream": "cvds",
  "cvds": [
    {
      "unix": 1787414460,
      "open": 1240,
      "high": 1275,
      "low": 1230,
      "close": 1268,
      "delta": 28,
      "final": false
    }
  ]
}
```

同一 `unix` 再次到达时会覆盖该 CVD 柱，适合持续更新尚未结束的实时柱；`final: true` 表示该周期已经结束。`high`、`low` 必须覆盖 `open` 与 `close`，全部数值必须为有限数字。

`Trades` 只用于 SDK 浏览器端的大单气泡：每一条成交保持为独立逐笔，按逐笔成交量阈值筛选和绘制。`CVD` 必须由宿主通过独立的 `cvds` 流直接提供。SDK 不使用 Footprint 档位筛选大单气泡，也不会把 Trades 合成为 Candles、Footprints、CVD 或其他行情序列；数据清洗、聚合、加工和转发均由宿主自行决定并在 SDK 之外完成。

宿主暂时没有 CVD 数据时，仍应对 `cvds` 历史请求返回 `{ cvds: [] }` 并正常结束该请求；实时流可以不推送数据。这样 CVD 为空，但不会阻塞另外三条流。

## 直接打开 Widget

`openWidget()` 会自动创建对应序列、选择主图/副图/看板目标，并可在打开时直接写入数据。调用方不需要组合 `createSeries()`、`target` 和 `replaceSeriesData()`。必须先完成 `MarsoonChart.mount()`，并至少调用一次 `chart.configure()`。

### 完整调用流程

下面的代码可以直接放在宿主项目中。`dataSocket`、Access Token 和真实行情仍由宿主负责；如果只展示外部传入的 Widget 数据，可以不传 `dataSocket`。

```ts
import { MarsoonChart } from '@cdjustin/chart-sdk';

const chart = await MarsoonChart.mount({
  dataSocket: createHostMarketDataSocket(),
  getAccessToken: async () => {
    const response = await fetch('/api/marsoon-sdk/access-token', {
      credentials: 'include',
    });
    if (!response.ok) throw new Error(`Access token HTTP ${response.status}`);
    return (await response.json()).access_token;
  },
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

// 折线图：不传 target 时默认打开在副图。
const trend = chart.openWidget({
  id: 'model-trend',
  type: 'line',
  title: 'Model trend',
  color: '#22c7a9',
  line_width: 2,
  value_decimals: 2,
  points: [
    { timestamp_ms: 1788067200000, value: 12.4 },
    { timestamp_ms: 1788067260000, value: 13.1 },
  ],
});

// 热力图：自动作为 Dashboard Widget 打开。
const factorHeatmap = chart.openWidget({
  id: 'factor-heatmap',
  type: 'heatmap',
  title: 'Factor heatmap',
  points: [
    { row: 'Momentum', column: '1m', value: 0.82 },
    { row: 'Momentum', column: '5m', value: 0.54 },
    { row: 'Flow', column: '1m', value: -0.31 },
  ],
});

// 后续增量、全量替换和样式更新。
trend.appendData([
  { timestamp_ms: 1788067320000, value: 13.8 },
]);
trend.update({ title: 'Updated trend', color: '#5b8cff' });

factorHeatmap.setData([
  { row: 'Momentum', column: '1m', value: 0.91 },
  { row: 'Momentum', column: '5m', value: 0.63 },
  { row: 'Flow', column: '1m', value: -0.18 },
]);
```

### 折线图

折线图默认打开在副图：

```ts
const trend = chart.openWidget({
  id: 'model-trend',
  type: 'line',
  title: 'Model trend',
  color: '#22c7a9',
  points: [
    { timestamp_ms: 1788067200000, value: 12.4 },
    { timestamp_ms: 1788067260000, value: 13.1 },
  ],
});

trend.appendData([{ timestamp_ms: 1788067320000, value: 13.8 }]);
```

如需叠加到 K 线主图，显式设置 `target: 'main'`：

```ts
const mainTrend = chart.openWidget({
  id: 'main-trend',
  type: 'line',
  target: 'main',
  points: [{ timestamp_ms: 1788067200000, value: 120.5 }],
});
```

折线图及其他时间序列的时间字段是 UTC Unix 毫秒 `timestamp_ms`，不是秒。

### 热力图

热力图会自动作为 Dashboard Widget 打开：

```ts
const heatmap = chart.openWidget({
  id: 'factor-heatmap',
  type: 'heatmap',
  title: 'Factor heatmap',
  points: [
    { row: 'Momentum', column: '1m', value: 0.82 },
    { row: 'Momentum', column: '5m', value: 0.54 },
    { row: 'Flow', column: '1m', value: -0.31 },
  ],
});

heatmap.setData(nextHeatmapPoints);
```

每个热力格点使用 `{ row, column, value, color? }`。通常使用 `setData()` 一次替换整张矩阵；`row` 和 `column` 是展示标签。

### Handle 与支持类型

`openWidget()` 返回一个 Handle：

```ts
trend.setData(allTrendPoints);       // 全量替换
trend.appendData(newTrendPoints);    // 增量追加
trend.update({ color: '#5b8cff' });  // 更新标题或样式
trend.setVisible(false);             // 隐藏但不删除
trend.setVisible(true);
trend.close();                       // 删除 Widget
```

`update()` 不能修改 `id`、`type` 或 `target`；需要改变这些字段时，请关闭后使用新配置重新打开。

支持的 19 种 `type`：

- 时间序列：`line`、`scatter`、`signal`、`histogram`、`area`、`step_line`。默认 `target: 'subpane'`，也可以设置为 `target: 'main'`。
- Dashboard：`pie`、`donut`、`metric`、`table`、`ranking_bar`、`stacked_bar`、`heatmap`、`equity_drawdown`、`gauge`、`correlation_matrix`、`distribution`、`calendar_heatmap`、`treemap`。这类 Widget 自动使用 `target: 'dashboard'`。

常用数据格式：

| 类型 | `points` 中的单点格式 |
| --- | --- |
| `line`、`scatter`、`histogram`、`area`、`step_line` | `{ timestamp_ms, value, label?, color? }` |
| `signal` | `{ timestamp_ms, value, signal, label?, color? }` |
| `heatmap`、`correlation_matrix` | `{ row, column, value, color? }` |
| `pie`、`donut`、`table`、`ranking_bar`、`treemap` | `{ label, value, color? }` |
| `stacked_bar` | `{ label, segments: Record<string, number> }` |
| `calendar_heatmap` | `{ date: 'YYYY-MM-DD', value, color? }` |

传入未知字段、错误的 `target` 或不匹配的数据格式时，SDK 会抛出 `MarsoonChartError`，不会把不完整数据静默传给 WASM。

## Free / Pro 功能

- Free：可使用足迹图和全部周期，最多同时启用 2 个指标，单图布局，历史数据显示最近两周。
- Pro：指标数量不限，可使用足迹图失衡设置、每行 Tick 调整和缩放，并可使用全部多图布局；历史数据不设 SDK 侧时间限制。
- 足迹图的模式、普通显示、POC 和基础配色在 Free 中保持可用。

## 权限与义务

- 个人非商业学习、自用和测试可在免费版权益内使用；组织使用、收费服务、广告获客、客户交付或其他商业用途须先取得商业授权。
- SDK 的公开编译产物不等于开源授权。不得转售、再分发、反编译、绕过使用限制或移除权利标识，法律强制允许的情形除外。
- 宿主负责数据来源、展示、缓存、衍生使用及再分发授权。SDK 许可不包含交易所、指数公司、经纪商、数据商或网站的行情许可。
- 宿主负责向终端用户提供自己的隐私政策、数据来源说明和金融风险揭示；不得把 SDK 描述为行情供应商、投资顾问或交易执行服务。
- SDK 默认不把宿主行情、策略、订单或持仓发送至 Marsoon。必要的服务信息按隐私政策处理。

### 数据处理边界

行情、Footprint 和逐笔由宿主直接传入浏览器中的 SDK。Marsoon 服务端默认不接收、不存储、不清洗、不聚合、不加工、不转发这些宿主数据，也不提供行情代理。浏览器端 SDK 只为生成图形读取数据并进行必要的内存组织与绘制，不把它作为 Marsoon 的云端数据加工服务，也不把图表数据上传到 Marsoon。宿主自行建立的代理、数据库、聚合服务或第三方接口不属于 Marsoon SDK 的数据处理。

完整约定见 [SDK 使用协议](https://github.com/Jsoooooooo/Marsoon-SDK/blob/main/SDK_TERMS.md) 与 [隐私政策](https://github.com/Jsoooooooo/Marsoon-SDK/blob/main/SDK_PRIVACY.md)。
