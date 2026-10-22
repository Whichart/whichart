// Renders a chart's reference implementation in the browser, themed for the current mode.
// Loaded only when needed (playground, "Try your data"), because ECharts is large.
import * as echarts from 'echarts';
import light from '@whichart/tokens/echarts-light.json';
import dark from '@whichart/tokens/echarts-dark.json';

echarts.registerTheme('whichart-light', light);
echarts.registerTheme('whichart-dark', dark);

const modules = import.meta.glob<{ default: (...args: any[]) => any }>('../../../charts/*/code/{echarts,vanilla}.ts');

export const currentMode = () => {
  const t = document.documentElement.dataset.theme;
  return t === 'dark' || (!t && matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
};

const live = new WeakMap<HTMLElement, () => void>();

/** Draw chart `id` into `el`. Re-draws on theme change; returns false if the chart has no browser renderer. */
export async function render(el: HTMLElement, id: string, rows: unknown[], options: Record<string, unknown> = {}): Promise<boolean> {
  const echartsPath = `../../../charts/${id}/code/echarts.ts`;
  const vanillaPath = `../../../charts/${id}/code/vanilla.ts`;
  const path = modules[echartsPath] ? echartsPath : modules[vanillaPath] ? vanillaPath : null;
  if (!path) return false;
  const fn = (await modules[path]()).default;
  live.get(el)?.();

  const draw = () => {
    if (path === echartsPath) {
      echarts.getInstanceByDom(el)?.dispose();
      const chart = echarts.init(el, `whichart-${currentMode()}`, { renderer: 'svg' });
      chart.setOption(fn(rows, options));
      const ro = new ResizeObserver(() => chart.resize());
      ro.observe(el);
      return () => {
        ro.disconnect();
        chart.dispose();
      };
    }
    fn(el, rows, options); // plain DOM: colours are CSS variables, so it follows the theme by itself
    return () => el.replaceChildren();
  };

  let cleanup = draw();
  const onTheme = () => {
    cleanup();
    cleanup = draw();
  };
  document.addEventListener('wc-theme', onTheme);
  live.set(el, () => {
    document.removeEventListener('wc-theme', onTheme);
    cleanup();
  });
  return true;
}
