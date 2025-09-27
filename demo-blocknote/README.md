# BlockNote Chart Demo

A demonstration of integrating Chart.js charts as custom blocks in BlockNote.js editor.

## Features

- ✨ Custom chart block type for BlockNote.js
- 📊 Support for multiple chart types (Bar, Line, Pie, Doughnut)
- 🎛️ Interactive chart controls (type switching, data randomization)
- 💫 Beautiful, responsive design
- ⚡ Built with React, TypeScript, and Vite

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open your browser and navigate to the displayed URL (typically `http://localhost:5173`)

## Usage

- Type `/` in the editor and select "Chart" to insert a chart block
- Click the "Insert Sample Chart" button to add a pre-configured chart
- Use the dropdown in each chart block to change chart types
- Click "Randomize Data" to generate new random data for the chart

## Technologies Used

- [BlockNote.js](https://www.blocknotejs.org/) - Rich text editor framework
- [Chart.js](https://www.chartjs.org/) - Chart library
- [react-chartjs-2](https://github.com/reactchartjs/react-chartjs-2) - React wrapper for Chart.js
- [React](https://react.dev/) - UI framework
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Vite](https://vitejs.dev/) - Build tool

## Chart Block Features

The custom chart block includes:

- **Chart Configuration Storage**: Chart type, data, and options are stored in the block's data model
- **Interactive Controls**: Dropdown to change chart type and button to randomize data
- **Responsive Design**: Charts automatically resize to fit the container
- **Multiple Chart Types**: Support for bar, line, pie, and doughnut charts
- **Persistent Data**: Chart configurations are saved with the document

## Development

To extend the chart block:

1. Modify `src/ChartBlock.tsx` to add new chart types or controls
2. Update the `ChartBlockConfig` interface to include new configuration options
3. Enhance the UI in the render function to expose new features

## Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.
