import {
  createReactBlockSpec,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/react";
import { defaultProps, PropSchema } from "@blocknote/core";
import React, { useEffect, useRef } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  ArcElement,
} from "chart.js";
import { Chart } from "react-chartjs-2";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  ArcElement
);

// Define the chart block's data structure
export interface ChartBlockConfig {
  type: "bar" | "line" | "pie" | "doughnut";
  data: {
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      backgroundColor?: string | string[];
      borderColor?: string | string[];
      borderWidth?: number;
    }>;
  };
  options?: any;
}

// Default chart configuration
const defaultChartConfig: ChartBlockConfig = {
  type: "bar",
  data: {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    datasets: [
      {
        label: "Sales",
        data: [12, 19, 3, 5, 2, 3],
        backgroundColor: "rgba(54, 162, 235, 0.2)",
        borderColor: "rgba(54, 162, 235, 1)",
        borderWidth: 1,
      },
    ],
  },
  options: {
    responsive: true,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: true,
        text: "Sample Chart",
      },
    },
  },
};

// Chart component that renders the actual chart
const ChartComponent: React.FC<{ config: ChartBlockConfig }> = ({ config }) => {
  const chartRef = useRef<ChartJS>(null);

  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, []);

  return (
    <div style={{ width: "100%", height: "400px", padding: "16px" }}>
      <Chart
        ref={chartRef}
        type={config.type}
        data={config.data}
        options={{
          ...config.options,
          maintainAspectRatio: false,
        }}
      />
    </div>
  );
};

// Create the chart block specification
export const ChartBlock = createReactBlockSpec(
  {
    type: "chart" as const,
    propSchema: {
      ...defaultProps,
      chartConfig: {
        default: defaultChartConfig,
      } satisfies PropSchema,
    },
    content: "none",
  },
  {
    render: (props) => {
      const { block, editor } = props;
      const chartConfig = block.props.chartConfig || defaultChartConfig;

      return (
        <div style={{ border: "1px solid #e0e0e0", borderRadius: "8px", margin: "8px 0" }}>
          <div
            style={{
              padding: "8px 16px",
              borderBottom: "1px solid #e0e0e0",
              backgroundColor: "#f8f9fa",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontWeight: "bold", fontSize: "14px" }}>Chart Block</span>
            <div>
              <select
                value={chartConfig.type}
                onChange={(e) => {
                  const newType = e.target.value as ChartBlockConfig["type"];
                  editor.updateBlock(block, {
                    props: {
                      chartConfig: {
                        ...chartConfig,
                        type: newType,
                      },
                    },
                  });
                }}
                style={{
                  padding: "4px 8px",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  marginRight: "8px",
                }}
              >
                <option value="bar">Bar Chart</option>
                <option value="line">Line Chart</option>
                <option value="pie">Pie Chart</option>
                <option value="doughnut">Doughnut Chart</option>
              </select>
              <button
                onClick={() => {
                  // Simple data randomization for demo purposes
                  const newData = chartConfig.data.datasets[0].data.map(() =>
                    Math.floor(Math.random() * 50) + 1
                  );
                  editor.updateBlock(block, {
                    props: {
                      chartConfig: {
                        ...chartConfig,
                        data: {
                          ...chartConfig.data,
                          datasets: [
                            {
                              ...chartConfig.data.datasets[0],
                              data: newData,
                            },
                          ],
                        },
                      },
                    },
                  });
                }}
                style={{
                  padding: "4px 8px",
                  border: "1px solid #007bff",
                  backgroundColor: "#007bff",
                  color: "white",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Randomize Data
              </button>
            </div>
          </div>
          <ChartComponent config={chartConfig} />
        </div>
      );
    },
  }
);

export default ChartBlock;
