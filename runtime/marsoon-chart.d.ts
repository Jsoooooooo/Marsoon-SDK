export type ChartType = 'candlesticks' | 'line' | 'heikin_ashi' | 'ohlc' | 'footprint';
export type TradeSide = 'buy' | 'sell';
export type FootprintMode = 'delta' | 'standard';
export type FootprintScale = 'candle' | 'visible_range' | 'daily' | 'weekly';
export type ChartLayerId =
  | 'price' | 'ohlc' | 'footprint' | 'volume' | 'volume_profile' | 'session'
  | 'rsi' | 'macd' | 'sma' | 'ema' | 'ehlers_instantaneous_trend' | 'fvg'
  | 'supply_demand' | 'absorption' | 'obv' | 'kdj' | 'bollinger_bands' | 'atr'
  | 'session_vwap' | 'dmi_adx' | 'mfi' | 'juice' | 'session_volume_profile'
  | 'volume_delta' | 'cvd' | 'bar_statistics' | 'volume_bubble'
  | 'enhanced_chip_peak' | 'sdk_series';
export interface FootprintSettings {
  mode?: FootprintMode;
  /** Pro: controls Footprint volume normalization scope. */
  scaling?: FootprintScale;
  /** Pro: switches automatic ticks-per-row aggregation. */
  automatic_aggregation?: boolean;
  /** Pro: sets the manual number of price ticks in each row. */
  ticks_per_row?: number;
  show_bin_text?: boolean;
  /** Enables the compact footprint renderer. */
  compact_mode?: boolean;
  /** Shows VP only for compact standard footprints; defaults to false. */
  compact_show_volume_profile?: boolean;
  wide_candle?: boolean;
  /** Shows VP for the normal footprint renderer. */
  show_volume_profile?: boolean;
  show_value_area_highlight?: boolean;
  show_poc?: boolean;
  /** Pro: enables imbalance rendering. */
  enable_imbalance?: boolean;
  /** Pro: configures the imbalance threshold. */
  imbalance_ratio?: number;
  /** Pro: configures stacked imbalance levels. */
  stacked_imbalance_levels?: number;
  poc_thickness?: number;
  /** Colors use #RRGGBB or #RRGGBBAA. */
  bull_color?: string;
  bear_color?: string;
  volume_profile_color?: string;
  poc_color?: string;
  /** Pro imbalance color. */
  buy_imbalance_color?: string;
  /** Pro imbalance color. */
  sell_imbalance_color?: string;
  /** Pro imbalance text color. */
  buy_imbalance_text_color?: string;
  /** Pro imbalance text color. */
  sell_imbalance_text_color?: string;
}
export interface SymbolInfo {
  symbol: string; exchange?: string; display_name?: string;
  tick_size: number; price_precision: number; timezone?: string;
}
export interface ChartConfiguration { symbol: SymbolInfo; timeframe_seconds: number; chart_type: ChartType; footprint?: FootprintSettings; }
/** One individual print used only for large-trade bubbles; the SDK does not aggregate Trades. */
export interface Trade { timestamp_ms: number; price: number; quantity: number; side: TradeSide; sequence?: number; trade_id?: string; }
export interface Candle { unix: number; open: number; high: number; low: number; close: number; vbuy?: number; vsell?: number; final?: boolean; }
export interface Footprint { unix: number; timeframe?: number; prices: number[]; buys: number[]; sells: number[]; final?: boolean; }
/** Host-supplied cumulative volume delta bar. SDK never derives this from Trade. */
export interface Cvd { unix: number; open: number; high: number; low: number; close: number; delta: number; final?: boolean; }
export interface MarketDataRequest {
  symbol_info: SymbolInfo;
  timeframe_seconds: number;
}
export interface MarketDataHistoryRequest extends MarketDataRequest {
  /** Inclusive UTC Unix timestamp in seconds. */
  from: number;
  /** Exclusive UTC Unix timestamp in seconds. */
  to: number;
  mode?: 'latest';
  request_id: string;
  stream: MarketDataStream;
}
export interface MarketDataBatch {
  candles?: Candle[];
  footprints?: Footprint[];
  trades?: Trade[];
  cvds?: Cvd[];
  has_more?: boolean;
}
export type MarketDataStream = 'candles' | 'footprints' | 'trades' | 'cvds';
export interface MarketDataSubscriptionRequest extends MarketDataRequest {
  stream: MarketDataStream;
}
export interface MarketDataSocketMessage extends MarketDataBatch {
  kind: 'history' | 'realtime';
  stream: MarketDataStream;
  request_id?: string;
}
export interface MarketDataSocketHandlers {
  onMessage(message: MarketDataSocketMessage): void;
  onError(error: unknown): void;
  onClose(error?: unknown): void;
}
export interface MarketDataSocketSession {
  subscribe(request: MarketDataSubscriptionRequest): void | Promise<void>;
  unsubscribe?(request: MarketDataSubscriptionRequest): void | Promise<void>;
  requestRange(request: MarketDataHistoryRequest): void | Promise<void>;
  close(): void;
}
export interface ChartDataSocket {
  /** Host creates one shared WebSocket session multiplexing all market-data streams. */
  connect(handlers: MarketDataSocketHandlers): MarketDataSocketSession | Promise<MarketDataSocketSession>;
}
export type QuantTimeSeriesType = 'line' | 'scatter' | 'signal' | 'histogram' | 'area' | 'step_line';
export type QuantDashboardSeriesType = 'pie' | 'donut' | 'metric' | 'table' | 'ranking_bar' | 'stacked_bar' | 'heatmap' | 'equity_drawdown' | 'gauge' | 'correlation_matrix' | 'distribution' | 'calendar_heatmap' | 'treemap';
export type QuantSeriesType = QuantTimeSeriesType | QuantDashboardSeriesType;
export type QuantSeriesTarget = 'main' | 'subpane' | 'dashboard';
export type QuantSignal = 'buy' | 'sell' | 'exit' | 'warning' | 'custom';
export interface QuantSeriesConfig { id: string; name?: string; series_type: QuantSeriesType; target: QuantSeriesTarget; widget_slot?: number; color?: string; negative_color?: string; line_width?: number; point_radius?: number; visible?: boolean; axis_min?: number; axis_max?: number; value_decimals?: number; }
export interface QuantTimeSeriesPoint { timestamp_ms: number; value: number; label?: string; color?: string; }
export interface QuantSignalPoint extends QuantTimeSeriesPoint { signal: QuantSignal; }
export interface QuantCategoryPoint { label: string; value: number; color?: string; }
export interface QuantMetricPoint { value: number; label?: string; color?: string; }
export interface QuantStackedBarPoint { label: string; segments: Record<string, number>; }
export interface QuantMatrixPoint { row: string; column: string; value: number; color?: string; }
export interface QuantEquityDrawdownPoint { timestamp_ms: number; value: number; drawdown?: number; label?: string; color?: string; }
export interface QuantCalendarHeatmapPoint { date: string; value: number; color?: string; }
export type QuantSeriesData =
  | { series_type: 'line'; points: QuantTimeSeriesPoint[] }
  | { series_type: 'scatter'; points: QuantTimeSeriesPoint[] }
  | { series_type: 'signal'; points: QuantSignalPoint[] }
  | { series_type: 'histogram'; points: QuantTimeSeriesPoint[] }
  | { series_type: 'area'; points: QuantTimeSeriesPoint[] }
  | { series_type: 'step_line'; points: QuantTimeSeriesPoint[] }
  | { series_type: 'pie'; points: QuantCategoryPoint[] }
  | { series_type: 'donut'; points: QuantCategoryPoint[] }
  | { series_type: 'metric'; points: QuantMetricPoint[] }
  | { series_type: 'table'; points: QuantCategoryPoint[] }
  | { series_type: 'ranking_bar'; points: QuantCategoryPoint[] }
  | { series_type: 'stacked_bar'; points: QuantStackedBarPoint[] }
  | { series_type: 'heatmap'; points: QuantMatrixPoint[] }
  | { series_type: 'equity_drawdown'; points: QuantEquityDrawdownPoint[] }
  | { series_type: 'gauge'; points: QuantMetricPoint[] }
  | { series_type: 'correlation_matrix'; points: QuantMatrixPoint[] }
  | { series_type: 'distribution'; points: QuantMetricPoint[] }
  | { series_type: 'calendar_heatmap'; points: QuantCalendarHeatmapPoint[] }
  | { series_type: 'treemap'; points: QuantCategoryPoint[] };
export type QuantPointsFor<T extends QuantSeriesType> = Extract<QuantSeriesData, { series_type: T }>['points'];
export type WidgetTargetFor<T extends QuantSeriesType> =
  T extends QuantDashboardSeriesType ? 'dashboard' : 'main' | 'subpane';
export interface WidgetDataOptions { symbol?: string; generation?: number; }
export type WidgetUpdate = Partial<Pick<QuantSeriesConfig,
  'name' | 'widget_slot' | 'color' | 'negative_color' | 'line_width' |
  'point_radius' | 'visible' | 'axis_min' | 'axis_max' | 'value_decimals'
>> & { title?: string };
export type OpenWidgetOptions<T extends QuantSeriesType = QuantSeriesType> = WidgetUpdate & {
  id: string;
  type: T;
  target?: WidgetTargetFor<T>;
  points?: QuantPointsFor<T>;
};
export interface ChartWidgetHandle<T extends QuantSeriesType = QuantSeriesType> {
  readonly id: string;
  readonly type: T;
  readonly target: WidgetTargetFor<T>;
  setData(points: QuantPointsFor<T>, options?: WidgetDataOptions): this;
  appendData(points: QuantPointsFor<T>, options?: WidgetDataOptions): this;
  update(patch: WidgetUpdate): this;
  setVisible(visible: boolean): this;
  close(): void;
}
export type QuantPoint = QuantSeriesData['points'][number];
export interface MountOptions {
  /** Host-owned WebSocket factory; the SDK never knows the data address. */
  dataSocket?: ChartDataSocket;
  /** Number of bars requested on first configure; defaults to 400, matching the main app. */
  initialHistoryBars?: number;
  /**
   * Returns a short-lived access token from the host's backend/BFF.
   * The host owns refresh credentials; the SDK never stores a refresh token.
   */
  getAccessToken?: () => string | Promise<string>;
  /** Bundled npm builds always notify; managed builds may reload. manual disables polling. */
  runtimeUpdatePolicy?: 'manual' | 'notify' | 'reload';
  /** Poll interval in milliseconds, clamped to at least 60 seconds; defaults to 24 hours. */
  runtimeUpdateIntervalMs?: number;
}
export interface SdkUpdateAvailableDetail {
  status: 'available';
  current: { releaseId: string; manifest?: { sdkVersion?: string } };
  latest: { releaseId: string; sdkVersion?: string };
}
export type HostEvent =
  | { event: 'ready'; api_version: string; capabilities: string[] }
  | { event: 'symbol_change_requested'; generation: number; symbol: string; timeframe_seconds: number }
  | { event: 'configuration_changed'; generation: number; symbol: string; timeframe_seconds: number; chart_type: ChartType }
  | { event: 'data_applied'; generation: number; symbol: string; mode: 'replace' | 'append'; data_kind: 'candles' | 'footprints' | 'trades' | 'cvds'; trades: number; candles: number; volumes: number; cvds?: number }
  | { event: 'series_changed'; series_id: string; action: 'created' | 'updated' | 'removed' | 'visibility' }
  | { event: 'series_data_applied'; generation: number; symbol: string; series_id: string; mode: 'replace' | 'append'; points: number }
  | { event: 'series_data_required'; generation: number; symbol: string; series_id: string }
  | { event: 'error'; code: string; message: string; recoverable: boolean };

export interface CsvImportedDetail {
  series_id: string;
  series_type: QuantDashboardSeriesType;
  file_name: string;
  points: number;
}

export class MarsoonChartError extends Error { readonly code: string; constructor(code: string, message: string, cause?: unknown); }
export class MarsoonChart extends EventTarget {
  static readonly apiVersion: string;
  static readonly version: string;
  static mount(options?: MountOptions): Promise<MarsoonChart>;
  readonly generation: number; readonly state: 'created' | 'mounting' | 'ready' | 'destroyed';
  configure(configuration: ChartConfiguration, generation?: number): this;
  setTimeframe(seconds: number): this;
  setFootprintSettings(settings: FootprintSettings): this;
  /** Promote named layers in Legend order (front-to-back) for the selected chart pane. */
  setLayerOrder(paneIndex: number, frontToBack: ChartLayerId[]): this;
  createSeries(series: QuantSeriesConfig): this; updateSeries(series: QuantSeriesConfig): this;
  removeSeries(seriesId: string): this; setSeriesVisible(seriesId: string, visible: boolean): this; openSeriesPanel(): this;
  replaceSeriesData(seriesId: string, data: QuantSeriesData, options?: { symbol?: string; generation?: number }): this;
  appendSeriesData(seriesId: string, data: QuantSeriesData, options?: { symbol?: string; generation?: number }): this;
  createDashboardWidget(series: Omit<QuantSeriesConfig, 'target'>): this;
  setDashboardData(seriesId: string, data: QuantSeriesData, options?: { symbol?: string; generation?: number }): this;
  /** Creates, opens and optionally seeds a line/subpane or dashboard widget. */
  openWidget<T extends QuantSeriesType>(options: OpenWidgetOptions<T>, dataOptions?: WidgetDataOptions): ChartWidgetHandle<T>;
  addEventListener(type: 'event', listener: (event: CustomEvent<HostEvent>) => void, options?: boolean | AddEventListenerOptions): void;
  addEventListener(type: HostEvent['event'], listener: (event: CustomEvent<HostEvent>) => void, options?: boolean | AddEventListenerOptions): void;
  addEventListener(type: 'error', listener: (event: CustomEvent<MarsoonChartError>) => void, options?: boolean | AddEventListenerOptions): void;
  addEventListener(type: 'csv_imported', listener: (event: CustomEvent<CsvImportedDetail>) => void, options?: boolean | AddEventListenerOptions): void;
  addEventListener(type: 'sdkupdateavailable' | 'runtimeupdateavailable', listener: (event: CustomEvent<SdkUpdateAvailableDetail>) => void, options?: boolean | AddEventListenerOptions): void;
  addEventListener(type: 'destroyed', listener: (event: CustomEvent<void>) => void, options?: boolean | AddEventListenerOptions): void;
  addEventListener(type: string, callback: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions): void;
  destroy(): void;
}
export default MarsoonChart;
