export type ChartType = 'candlesticks' | 'line' | 'heikin_ashi' | 'ohlc' | 'footprint';
export type TradeSide = 'buy' | 'sell';
export type FootprintMode = 'delta' | 'standard';
export type FootprintScale = 'candle' | 'visible_range' | 'daily' | 'weekly';
export type ChartLayerId = 'price' | 'ohlc' | 'footprint' | 'volume' | 'volume_profile' | 'session' | 'rsi' | 'macd' | 'sma' | 'ema' | 'ehlers_instantaneous_trend' | 'fvg' | 'supply_demand' | 'absorption' | 'obv' | 'kdj' | 'bollinger_bands' | 'atr' | 'session_vwap' | 'dmi_adx' | 'mfi' | 'juice' | 'session_volume_profile' | 'volume_delta' | 'cvd' | 'bar_statistics' | 'volume_bubble' | 'enhanced_chip_peak' | 'cci' | 'williams_r' | 'parabolic_sar' | 'ichimoku' | 'hma' | 'kama' | 'vwma' | 'zig_zag' | 'initial_balance' | 'unfinished_auction' | 'relative_volume' | 'donchian' | 'super_trend' | 'keltner_channel' | 'squeeze_momentum' | 'll_main_force_monitor' | 'large_order_cluster' | 'custom_price_change' | 'sdk_series';
export interface FootprintSettings {
    mode?: FootprintMode;
    scaling?: FootprintScale;
    automatic_aggregation?: boolean;
    ticks_per_row?: number;
    show_bin_text?: boolean;
    compact_mode?: boolean;
    compact_show_volume_profile?: boolean;
    wide_candle?: boolean;
    show_volume_profile?: boolean;
    show_value_area_highlight?: boolean;
    show_poc?: boolean;
    enable_imbalance?: boolean;
    imbalance_ratio?: number;
    stacked_imbalance_levels?: number;
    poc_thickness?: number;
    bull_color?: string;
    bear_color?: string;
    volume_profile_color?: string;
    poc_color?: string;
    buy_imbalance_color?: string;
    sell_imbalance_color?: string;
    buy_imbalance_text_color?: string;
    sell_imbalance_text_color?: string;
}
export interface SymbolInfo {
    symbol: string;
    exchange?: string;
    display_name?: string;
    tick_size: number;
    price_precision: number;
    timezone?: string;
}
export interface ChartConfiguration {
    symbol: SymbolInfo;
    timeframe_seconds: number;
    chart_type: ChartType;
    footprint?: FootprintSettings;
}
export interface Trade {
    timestamp_ms: number;
    price: number;
    quantity: number;
    side: TradeSide;
    sequence?: number;
    trade_id?: string;
}
export interface Candle {
    unix: number;
    open: number;
    high: number;
    low: number;
    close: number;
    vbuy?: number;
    vsell?: number;
    vunknown?: number;
    final?: boolean;
    data_gap_before?: boolean;
    volume_complete?: boolean;
}
export interface Footprint {
    unix: number;
    timeframe?: number;
    prices: number[];
    buys: number[];
    sells: number[];
    final?: boolean;
}
export interface Cvd {
    unix: number;
    open: number;
    high: number;
    low: number;
    close: number;
    delta: number;
    final?: boolean;
}
export interface MarketDataRequest {
    symbol_info: SymbolInfo;
    timeframe_seconds: number;
}
export interface MarketDataHistoryRequest extends MarketDataRequest {
    from: number;
    to: number;
    mode?: 'latest';
    request_id: string;
    stream: MarketDataStream;
}
export interface MarketDataBatch {
    depth?: DepthUpdate[];
    candles?: Candle[];
    footprints?: Footprint[];
    trades?: HeatmapTrade[];
    cvds?: Cvd[];
    has_more?: boolean;
}
export type MarketDataStream = 'candles' | 'footprints' | 'trades' | 'cvds' | 'depth';
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
    connect(handlers: MarketDataSocketHandlers): MarketDataSocketSession | Promise<MarketDataSocketSession>;
}
export type QuantTimeSeriesType = 'line' | 'scatter' | 'signal' | 'histogram' | 'area' | 'step_line';
export type QuantDashboardSeriesType = 'pie' | 'donut' | 'metric' | 'table' | 'ranking_bar' | 'stacked_bar' | 'heatmap' | 'equity_drawdown' | 'gauge' | 'correlation_matrix' | 'distribution' | 'calendar_heatmap' | 'treemap';
export type QuantSeriesType = QuantTimeSeriesType | QuantDashboardSeriesType;
export type QuantSeriesTarget = 'main' | 'subpane' | 'dashboard';
export type QuantSignal = 'buy' | 'sell' | 'exit' | 'warning' | 'custom';
export interface QuantSeriesConfig {
    id: string;
    name?: string;
    series_type: QuantSeriesType;
    target: QuantSeriesTarget;
    widget_slot?: number;
    color?: string;
    negative_color?: string;
    line_width?: number;
    point_radius?: number;
    visible?: boolean;
    axis_min?: number;
    axis_max?: number;
    value_decimals?: number;
}
export interface QuantTimeSeriesPoint {
    timestamp_ms: number;
    value: number;
    label?: string;
    color?: string;
}
export interface QuantSignalPoint extends QuantTimeSeriesPoint {
    signal: QuantSignal;
}
export interface QuantCategoryPoint {
    label: string;
    value: number;
    color?: string;
}
export interface QuantMetricPoint {
    value: number;
    label?: string;
    color?: string;
}
export interface QuantStackedBarPoint {
    label: string;
    segments: Record<string, number>;
}
export interface QuantMatrixPoint {
    row: string;
    column: string;
    value: number;
    color?: string;
}
export interface QuantEquityDrawdownPoint {
    timestamp_ms: number;
    value: number;
    drawdown?: number;
    label?: string;
    color?: string;
}
export interface QuantCalendarHeatmapPoint {
    date: string;
    value: number;
    color?: string;
}
export type QuantSeriesData = {
    series_type: 'line';
    points: QuantTimeSeriesPoint[];
} | {
    series_type: 'scatter';
    points: QuantTimeSeriesPoint[];
} | {
    series_type: 'signal';
    points: QuantSignalPoint[];
} | {
    series_type: 'histogram';
    points: QuantTimeSeriesPoint[];
} | {
    series_type: 'area';
    points: QuantTimeSeriesPoint[];
} | {
    series_type: 'step_line';
    points: QuantTimeSeriesPoint[];
} | {
    series_type: 'pie';
    points: QuantCategoryPoint[];
} | {
    series_type: 'donut';
    points: QuantCategoryPoint[];
} | {
    series_type: 'metric';
    points: QuantMetricPoint[];
} | {
    series_type: 'table';
    points: QuantCategoryPoint[];
} | {
    series_type: 'ranking_bar';
    points: QuantCategoryPoint[];
} | {
    series_type: 'stacked_bar';
    points: QuantStackedBarPoint[];
} | {
    series_type: 'heatmap';
    points: QuantMatrixPoint[];
} | {
    series_type: 'equity_drawdown';
    points: QuantEquityDrawdownPoint[];
} | {
    series_type: 'gauge';
    points: QuantMetricPoint[];
} | {
    series_type: 'correlation_matrix';
    points: QuantMatrixPoint[];
} | {
    series_type: 'distribution';
    points: QuantMetricPoint[];
} | {
    series_type: 'calendar_heatmap';
    points: QuantCalendarHeatmapPoint[];
} | {
    series_type: 'treemap';
    points: QuantCategoryPoint[];
};
export type QuantPointsFor<T extends QuantSeriesType> = Extract<QuantSeriesData, {
    series_type: T;
}>['points'];
export type WidgetTargetFor<T extends QuantSeriesType> = T extends QuantDashboardSeriesType ? 'dashboard' : 'main' | 'subpane';
export interface WidgetDataOptions {
    symbol?: string;
    generation?: number;
}
export type WidgetUpdate = Partial<Pick<QuantSeriesConfig, 'name' | 'widget_slot' | 'color' | 'negative_color' | 'line_width' | 'point_radius' | 'visible' | 'axis_min' | 'axis_max' | 'value_decimals'>> & {
    title?: string;
};
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
export interface SdkAuthorizationOptions {
    endpoint?: string;
    appKey?: string;
    secret?: string;
}
export interface SdkAuthorizationStatus {
    authorized: boolean;
    state: 'unauthorized' | 'authorized' | 'blocked';
    appKey?: string;
    code?: string;
}
export interface MountOptions {
    authorization?: SdkAuthorizationOptions;
    dataSocket?: ChartDataSocket;
    heatmapRuntimeBase?: string;
    initialHistoryBars?: number;
    runtimeUpdatePolicy?: 'manual' | 'notify' | 'reload';
    runtimeUpdateIntervalMs?: number;
}
export interface SdkUpdateAvailableDetail {
    status: 'available';
    current: {
        releaseId: string;
        manifest?: {
            sdkVersion?: string;
        };
    };
    latest: {
        releaseId: string;
        sdkVersion?: string;
    };
}
export type HostEvent = {
    event: 'ready';
    api_version: string;
    capabilities: string[];
} | {
    event: 'symbol_change_requested';
    generation: number;
    symbol: string;
    timeframe_seconds: number;
} | {
    event: 'configuration_changed';
    generation: number;
    symbol: string;
    timeframe_seconds: number;
    chart_type: ChartType;
} | {
    event: 'data_applied';
    generation: number;
    symbol: string;
    mode: 'replace' | 'append';
    data_kind: 'candles' | 'footprints' | 'trades' | 'cvds' | 'depth';
    trades: number;
    candles: number;
    volumes: number;
    cvds?: number;
} | {
    event: 'series_changed';
    series_id: string;
    action: 'created' | 'updated' | 'removed' | 'visibility';
} | {
    event: 'series_data_applied';
    generation: number;
    symbol: string;
    series_id: string;
    mode: 'replace' | 'append';
    points: number;
} | {
    event: 'series_data_required';
    generation: number;
    symbol: string;
    series_id: string;
} | {
    event: 'error';
    code: string;
    message: string;
    recoverable: boolean;
};
export interface CsvImportedDetail {
    series_id: string;
    series_type: QuantDashboardSeriesType;
    file_name: string;
    points: number;
}
export class MarsoonChartError extends Error {
    readonly code: string;
    constructor(code: string, message: string, cause?: unknown);
}
export class MarsoonChart extends EventTarget {
    static readonly apiVersion: string;
    static readonly version: string;
    static mount(options?: MountOptions): Promise<MarsoonChart>;
    readonly generation: number;
    readonly state: 'created' | 'mounting' | 'ready' | 'destroyed';
    readonly authorizationStatus: SdkAuthorizationStatus;
    authorize(options?: {
        prompt?: boolean;
    }): Promise<SdkAuthorizationStatus>;
    configure(configuration: ChartConfiguration, generation?: number): this;
    setTimeframe(seconds: number): this;
    setFootprintSettings(settings: FootprintSettings): this;
    setLayerOrder(paneIndex: number, frontToBack: ChartLayerId[]): this;
    createSeries(series: QuantSeriesConfig): this;
    updateSeries(series: QuantSeriesConfig): this;
    removeSeries(seriesId: string): this;
    setSeriesVisible(seriesId: string, visible: boolean): this;
    openSeriesPanel(): this;
    replaceSeriesData(seriesId: string, data: QuantSeriesData, options?: {
        symbol?: string;
        generation?: number;
    }): this;
    appendSeriesData(seriesId: string, data: QuantSeriesData, options?: {
        symbol?: string;
        generation?: number;
    }): this;
    createDashboardWidget(series: Omit<QuantSeriesConfig, 'target'>): this;
    setDashboardData(seriesId: string, data: QuantSeriesData, options?: {
        symbol?: string;
        generation?: number;
    }): this;
    openWidget(options: {
        id: string;
        type: 'orderbook_heatmap';
    }): HeatmapWidgetHandle;
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
export type HeatmapInteger = number | bigint | string;
export type DepthLevel = [
    price: number,
    quantity: number
];
export interface DepthUpdate {
    timestamp_ms: number;
    sequence: HeatmapInteger;
    kind: 'Snapshot' | 'Delta' | 'Reset' | 'Gap';
    bids: DepthLevel[];
    asks: DepthLevel[];
}
export interface HeatmapWidgetHandle {
    readonly id: string;
    readonly type: 'orderbook_heatmap';
    readonly target: 'dashboard';
    pushDepth(depth: DepthUpdate): void;
    pushTrades(trades: HeatmapTrade[]): void;
    close(): void;
}
export type HeatmapTrade = Omit<Trade, 'side'> & {
    side: TradeSide | 'unknown';
    quantity_unit?: 'contracts' | 'shares' | 'lots' | 'units' | 'base_asset';
    granularity?: 'individual' | 'aggregated';
    side_source?: 'provider_native' | 'quote_inferred' | 'tick_rule_inferred' | 'unavailable';
};
