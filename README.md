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
