import { useMemo } from 'react';
import {
  YooptaPlugin,
  type SlateElement,
  useYooptaEditor,
  useBlockData,
  generateId,
} from '@yoopta/editor';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Title,
  type ChartOptions,
  type ChartData,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
);

export type ChartBlockConfig = {
  type: 'line' | 'bar' | 'doughnut';
  data: ChartData;
  options?: ChartOptions;
};

function generateDefaultConfig(): ChartBlockConfig {
  const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  return {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Sales',
          data: labels.map(() => Math.round(Math.random() * 100)),
          borderColor: 'rgb(53, 162, 235)',
          backgroundColor: 'rgba(53, 162, 235, 0.5)',
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'top' },
        title: { display: true, text: 'Chart Block' },
      },
    },
  };
}

function randomizeConfig(config: ChartBlockConfig): ChartBlockConfig {
  const labels = Array.isArray(config.data.labels)
    ? (config.data.labels as string[])
    : ['A', 'B', 'C', 'D', 'E', 'F'];
  const next = { ...config } as ChartBlockConfig;
  next.data = {
    ...config.data,
    labels,
    datasets: (config.data.datasets || []).map((ds) => ({
      ...ds,
      data: labels.map(() => Math.round(Math.random() * 100)),
    })),
  };
  return next;
}

function ChartRenderer({ blockId }: { blockId: string }) {
  const editor = useYooptaEditor();
  const block = useBlockData(blockId);

  const element = ((block?.value?.[0] as any) || {
    id: generateId(),
    type: 'chart',
    children: [],
    props: { config: generateDefaultConfig() },
  }) as unknown as SlateElement<'chart', { config: ChartBlockConfig }>;

  const config: ChartBlockConfig = (element.props as any)?.config || generateDefaultConfig();

  const ChartComponent = useMemo(() => {
    if (config.type === 'bar') return Bar;
    if (config.type === 'doughnut') return Doughnut;
    return Line;
  }, [config.type]);

  function updateConfig(next: ChartBlockConfig) {
    const nextElement: SlateElement<'chart', { config: ChartBlockConfig }> = {
      ...element,
      props: { ...(element.props || {}), config: next },
    } as any;

    editor.updateBlock(blockId, { value: [nextElement] });
  }

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12, background: '#fff' }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        <label style={{ fontSize: 12, color: '#374151' }}>Type</label>
        <select
          value={config.type}
          onChange={(e) => updateConfig({ ...config, type: e.target.value as ChartBlockConfig['type'] })}
          style={{ padding: '4px 8px', fontSize: 12 }}
        >
          <option value="line">Line</option>
          <option value="bar">Bar</option>
          <option value="doughnut">Doughnut</option>
        </select>
        <button
          onClick={() => updateConfig(randomizeConfig(config))}
          style={{ padding: '4px 8px', fontSize: 12 }}
        >
          Randomize data
        </button>
      </div>
      <div style={{ width: '100%', maxWidth: 720 }}>
        <ChartComponent data={config.data as any} options={config.options as any} />
      </div>
    </div>
  );
}

const ChartBlock = new YooptaPlugin<{ chart: SlateElement<'chart', { config: ChartBlockConfig }> }, Record<string, unknown>>({
  type: 'chart-block',
  elements: {
    chart: {
      render: (props) => {
        const { blockId } = props;
        return <ChartRenderer blockId={blockId} />;
      },
      props: { nodeType: 'void' },
      options: { draggable: false },
    },
  },
  events: {
    onBeforeCreate: () => {
      const defaultConfig = generateDefaultConfig();
      const element: SlateElement<'chart', { config: ChartBlockConfig }> = {
        id: generateId(),
        type: 'chart',
        children: [],
        props: { config: defaultConfig },
      } as any;
      return element as unknown as SlateElement;
    },
  },
  options: {
    display: {
      title: 'Chart',
      description: 'Renderable Chart.js block',
    },
    shortcuts: ['/chart'],
  },
});

export default ChartBlock;


