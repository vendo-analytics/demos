# Chart.js Interactive Demo - All Chart Types

This comprehensive demo provides an interactive interface for exploring all major Chart.js chart types and their configurations. It's designed to help developers understand how different chart options affect visualizations and how to implement them in real-world scenarios, organized by data visualization purpose.

## Chart Types by Purpose

### 📊 **Comparison Charts**
1. **Line Chart** - Show trends over time with multiple data series
   - Stacking options for composition analysis
   - Area fill for visual emphasis
   - Customizable point styles and line tension

2. **Bar Chart** - Compare values across categories  
   - Horizontal/vertical orientation toggle
   - Stacking for composition analysis
   - Customizable bar thickness and styling

3. **Combo Chart** - Combine bars and lines for different data types
   - Dual Y-axes for different scales
   - Mix categorical and continuous data

### 🔗 **Relationship Charts**
4. **Scatter Chart** - Show correlation between two variables
   - Customer count vs satisfaction analysis
   - Customizable point styles and sizes
   - Optional trend line overlay

5. **Bubble Chart** - Show relationship between three variables
   - Multi-dimensional data visualization
   - Bubble size represents third dimension
   - Interactive tooltips for data exploration

### 🥧 **Composition Charts**
6. **Donut/Pie Chart** - Show parts of a whole
   - Toggle between pie and donut styles
   - Adjustable cutout percentage
   - Revenue/cost/profit breakdown

7. **Multi-Series Pie** - Compare compositions across multiple series
   - Quarterly comparisons
   - Nested ring visualization
   - Multiple data series in one chart

## Features

### 🎯 **Dynamic Navigation System**
- **Purpose-Based Organization**: Charts grouped by Comparison, Relationship, and Composition
- **One-Click Switching**: Seamless navigation between different chart types
- **Context-Aware Controls**: Dynamic control panel that adapts to each chart type

### ⚙️ **Interactive Configuration Panel**
- **Chart-Specific Controls**: Each chart type has relevant configuration options
- **Real-Time Updates**: See changes immediately as you adjust settings
- **Professional Styling**: Modern UI with smooth animations

### 📊 **Real-World Data Structure**
The demo uses a modular approach with raw business data that mimics real-world scenarios:

```javascript
const rawBusinessData = [
    { month: 'Jan', revenue: 65000, costs: 45000, profit: 20000, customers: 1200 },
    { month: 'Feb', revenue: 59000, costs: 42000, profit: 17000, customers: 1150 },
    // ... more data points
];
```

### 🔧 **Modular Architecture**

#### ChartDataParser Class
Transforms raw data into Chart.js compatible format using the `parsing` configuration:
- Handles multiple metrics from single data source
- Automatic color assignment
- Flexible data mapping

#### ChartConfigManager Class
Manages chart lifecycle and user interactions:
- Real-time configuration updates
- Event handling for all UI controls
- Dataset visibility management

## Usage

1. **Open `index.html`** in a web browser
2. **Explore the controls** on the right panel to see real-time changes
3. **Toggle datasets** to see how multiple data series work
4. **View raw data** to understand the data structure
5. **Experiment with different configurations** to learn Chart.js options

## Key Chart.js Concepts Demonstrated

### Data Parsing
```javascript
parsing: {
    xAxisKey: 'month',
    yAxisKey: 'revenue'
}
```

### Dataset Configuration
- `tension`: Line smoothness (0 = straight lines, 1 = very curved)
- `fill`: Area under line
- `pointStyle`: Point shapes (circle, triangle, rect, etc.)
- `borderWidth`: Line thickness
- `pointRadius`: Point size

### Chart Options
- `responsive`: Auto-resize behavior
- `maintainAspectRatio`: Aspect ratio control
- `scales`: X and Y axis configuration
- `plugins`: Title, legend, and other plugin settings
- `animation`: Transition effects

## Files Structure

```
chart-types/
├── index.html          # Main HTML structure
├── styles.css          # Professional styling
├── script.js           # Chart logic and interactivity
└── README.md           # This documentation
```

## Browser Compatibility

Works in all modern browsers that support:
- ES6 Classes
- Canvas API
- Chart.js 3.x+

## Customization

### Adding New Metrics
1. Add data to `rawBusinessData`
2. Update color mappings in `ChartDataParser`
3. Add UI controls in HTML
4. Wire up event listeners in `ChartConfigManager`

### Adding New Chart Types
1. Modify the chart type dropdown
2. Add type-specific configurations
3. Handle type-specific options in event listeners

## Learning Resources

- [Chart.js Documentation](https://www.chartjs.org/docs/latest/)
- [Chart.js Configuration](https://www.chartjs.org/docs/latest/configuration/)
- [Chart.js Data Structures](https://www.chartjs.org/docs/latest/general/data-structures.html)

This demo serves as both a learning tool and a starting point for implementing Chart.js in your own projects.
