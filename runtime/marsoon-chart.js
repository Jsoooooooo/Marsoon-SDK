// The npm package is self-contained. Pin the managed Loader to the signed
// manifest installed beside this entry before evaluating it, so importing the
// package never requires GitHub Pages for Core, Runtime, WASM, or snippets.
const bundledManifestUrl = new URL('./sdk-manifest.json', import.meta.url).toString();
globalThis.__MARSOON_SDK_BUNDLED_RUNTIME__ = true;
globalThis.__MARSOON_SDK_MANIFEST_URL__ = bundledManifestUrl;

const sdk = await import('./marsoon-chart-loader.js');

export const MarsoonChart = sdk.MarsoonChart;
export const MarsoonChartError = sdk.MarsoonChartError;
export default MarsoonChart;
