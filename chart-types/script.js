// Color Palettes
const colorPalettes = {
    default: {
        name: 'Default',
        colors: [
            { border: 'rgb(59, 130, 246)', background: 'rgba(59, 130, 246, 0.8)', backgroundLight: 'rgba(59, 130, 246, 0.1)' },
            { border: 'rgb(239, 68, 68)', background: 'rgba(239, 68, 68, 0.8)', backgroundLight: 'rgba(239, 68, 68, 0.1)' },
            { border: 'rgb(34, 197, 94)', background: 'rgba(34, 197, 94, 0.8)', backgroundLight: 'rgba(34, 197, 94, 0.1)' },
            { border: 'rgb(168, 85, 247)', background: 'rgba(168, 85, 247, 0.8)', backgroundLight: 'rgba(168, 85, 247, 0.1)' },
            { border: 'rgb(245, 158, 11)', background: 'rgba(245, 158, 11, 0.8)', backgroundLight: 'rgba(245, 158, 11, 0.1)' }
        ]
    },
    sunset: {
        name: 'Sunset',
        colors: [
            { border: '#003f5c', background: 'rgba(0, 63, 92, 0.8)', backgroundLight: 'rgba(0, 63, 92, 0.1)' },
            { border: '#2f4b7c', background: 'rgba(47, 75, 124, 0.8)', backgroundLight: 'rgba(47, 75, 124, 0.1)' },
            { border: '#665191', background: 'rgba(102, 81, 145, 0.8)', backgroundLight: 'rgba(102, 81, 145, 0.1)' },
            { border: '#a05195', background: 'rgba(160, 81, 149, 0.8)', backgroundLight: 'rgba(160, 81, 149, 0.1)' },
            { border: '#d45087', background: 'rgba(212, 80, 135, 0.8)', backgroundLight: 'rgba(212, 80, 135, 0.1)' },
            { border: '#f95d6a', background: 'rgba(249, 93, 106, 0.8)', backgroundLight: 'rgba(249, 93, 106, 0.1)' },
            { border: '#ff7c43', background: 'rgba(255, 124, 67, 0.8)', backgroundLight: 'rgba(255, 124, 67, 0.1)' },
            { border: '#ffa600', background: 'rgba(255, 166, 0, 0.8)', backgroundLight: 'rgba(255, 166, 0, 0.1)' }
        ]
    },
    blueHues: {
        name: 'Blue Hues',
        colors: [
            { border: '#004c6d', background: 'rgba(0, 76, 109, 0.8)', backgroundLight: 'rgba(0, 76, 109, 0.1)' },
            { border: '#255e7e', background: 'rgba(37, 94, 126, 0.8)', backgroundLight: 'rgba(37, 94, 126, 0.1)' },
            { border: '#3d708f', background: 'rgba(61, 112, 143, 0.8)', backgroundLight: 'rgba(61, 112, 143, 0.1)' },
            { border: '#5383a1', background: 'rgba(83, 131, 161, 0.8)', backgroundLight: 'rgba(83, 131, 161, 0.1)' },
            { border: '#6996b3', background: 'rgba(105, 150, 179, 0.8)', backgroundLight: 'rgba(105, 150, 179, 0.1)' },
            { border: '#7faac6', background: 'rgba(127, 170, 198, 0.8)', backgroundLight: 'rgba(127, 170, 198, 0.1)' },
            { border: '#94bed9', background: 'rgba(148, 190, 217, 0.8)', backgroundLight: 'rgba(148, 190, 217, 0.1)' },
            { border: '#abd2ec', background: 'rgba(171, 210, 236, 0.8)', backgroundLight: 'rgba(171, 210, 236, 0.1)' },
            { border: '#c1e7ff', background: 'rgba(193, 231, 255, 0.8)', backgroundLight: 'rgba(193, 231, 255, 0.1)' }
        ]
    }
};

// Raw Data Structures for Different Chart Types
const rawBusinessData = [
    { month: 'Jan', revenue: 65000, costs: 45000, profit: 20000, customers: 1200, satisfaction: 85 },
    { month: 'Feb', revenue: 59000, costs: 42000, profit: 17000, customers: 1150, satisfaction: 82 },
    { month: 'Mar', revenue: 80000, costs: 55000, profit: 25000, customers: 1350, satisfaction: 88 },
    { month: 'Apr', revenue: 81000, costs: 58000, profit: 23000, customers: 1400, satisfaction: 90 },
    { month: 'May', revenue: 56000, costs: 40000, profit: 16000, customers: 1100, satisfaction: 78 },
    { month: 'Jun', revenue: 55000, costs: 38000, profit: 17000, customers: 1080, satisfaction: 80 },
    { month: 'Jul', revenue: 40000, costs: 32000, profit: 8000, customers: 950, satisfaction: 75 },
    { month: 'Aug', revenue: 75000, costs: 50000, profit: 25000, customers: 1300, satisfaction: 87 },
    { month: 'Sep', revenue: 85000, costs: 60000, profit: 25000, customers: 1450, satisfaction: 92 },
    { month: 'Oct', revenue: 90000, costs: 65000, profit: 25000, customers: 1500, satisfaction: 89 },
    { month: 'Nov', revenue: 95000, costs: 70000, profit: 25000, customers: 1550, satisfaction: 91 },
    { month: 'Dec', revenue: 100000, costs: 75000, profit: 25000, customers: 1600, satisfaction: 94 }
];

const scatterData = [
    { x: 1200, y: 85, label: 'Jan' }, { x: 1150, y: 82, label: 'Feb' },
    { x: 1350, y: 88, label: 'Mar' }, { x: 1400, y: 90, label: 'Apr' },
    { x: 1100, y: 78, label: 'May' }, { x: 1080, y: 80, label: 'Jun' },
    { x: 950, y: 75, label: 'Jul' }, { x: 1300, y: 87, label: 'Aug' },
    { x: 1450, y: 92, label: 'Sep' }, { x: 1500, y: 89, label: 'Oct' },
    { x: 1550, y: 91, label: 'Nov' }, { x: 1600, y: 94, label: 'Dec' }
];

const bubbleData = [
    { x: 1200, y: 85, r: 65 }, { x: 1150, y: 82, r: 59 },
    { x: 1350, y: 88, r: 80 }, { x: 1400, y: 90, r: 81 },
    { x: 1100, y: 78, r: 56 }, { x: 1080, y: 80, r: 55 },
    { x: 950, y: 75, r: 40 }, { x: 1300, y: 87, r: 75 },
    { x: 1450, y: 92, r: 85 }, { x: 1500, y: 89, r: 90 },
    { x: 1550, y: 91, r: 95 }, { x: 1600, y: 94, r: 100 }
];

// Chart Configuration Templates
const chartConfigs = {
    line: {
        title: 'Line Chart',
        purpose: 'Comparison',
        description: 'Show trends over time with multiple data series',
        controls: [
            { id: 'tension', type: 'checkbox', label: 'Smooth Lines', value: false },
            { id: 'fill', type: 'checkbox', label: 'Fill Area', value: false },
            { id: 'showGrid', type: 'checkbox', label: 'Show Grid', value: false },
            { id: 'beginAtZero', type: 'checkbox', label: 'Y-axis Begin at Zero', value: true },
            { id: 'yAxisMin', type: 'number', label: 'Y-axis Min', value: '' },
            { id: 'yAxisMax', type: 'number', label: 'Y-axis Max', value: '' },
            { id: 'legendPosition', type: 'select', label: 'Legend Position', options: ['top', 'bottom', 'left', 'right'], value: 'bottom' },
            { id: 'titleAlign', type: 'select', label: 'Title Alignment', options: ['start', 'center', 'end'], value: 'start' }
        ]
    },
    'line-stacked': {
        title: 'Stacked Area Chart',
        purpose: 'Composition',
        description: 'Show composition of values over time',
        controls: [
            { id: 'tension', type: 'checkbox', label: 'Smooth Lines', value: false },
            { id: 'fill', type: 'checkbox', label: 'Fill Area', value: true },
            { id: 'showGrid', type: 'checkbox', label: 'Show Grid', value: false },
            { id: 'beginAtZero', type: 'checkbox', label: 'Y-axis Begin at Zero', value: true },
            { id: 'yAxisMin', type: 'number', label: 'Y-axis Min', value: '' },
            { id: 'yAxisMax', type: 'number', label: 'Y-axis Max', value: '' },
            { id: 'legendPosition', type: 'select', label: 'Legend Position', options: ['top', 'bottom', 'left', 'right'], value: 'bottom' },
            { id: 'titleAlign', type: 'select', label: 'Title Alignment', options: ['start', 'center', 'end'], value: 'start' }
        ]
    },
    bar: {
        title: 'Bar Chart',
        purpose: 'Comparison',
        description: 'Compare values across categories',
        controls: [
            { id: 'showGrid', type: 'checkbox', label: 'Show Grid', value: false },
            { id: 'beginAtZero', type: 'checkbox', label: 'Y-axis Begin at Zero', value: true },
            { id: 'yAxisMin', type: 'number', label: 'Y-axis Min', value: '' },
            { id: 'yAxisMax', type: 'number', label: 'Y-axis Max', value: '' },
            { id: 'legendPosition', type: 'select', label: 'Legend Position', options: ['top', 'bottom', 'left', 'right'], value: 'bottom' },
            { id: 'titleAlign', type: 'select', label: 'Title Alignment', options: ['start', 'center', 'end'], value: 'start' }
        ]
    },
    'bar-horizontal': {
        title: 'Horizontal Bar Chart',
        purpose: 'Comparison',
        description: 'Compare values across categories (horizontal orientation)',
        controls: [
            { id: 'showGrid', type: 'checkbox', label: 'Show Grid', value: false },
            { id: 'beginAtZero', type: 'checkbox', label: 'Y-axis Begin at Zero', value: true },
            { id: 'xAxisMin', type: 'number', label: 'X-axis Min', value: '' },
            { id: 'xAxisMax', type: 'number', label: 'X-axis Max', value: '' },
            { id: 'legendPosition', type: 'select', label: 'Legend Position', options: ['top', 'bottom', 'left', 'right'], value: 'bottom' },
            { id: 'titleAlign', type: 'select', label: 'Title Alignment', options: ['start', 'center', 'end'], value: 'start' }
        ]
    },
    'bar-stacked': {
        title: 'Stacked Bar Chart',
        purpose: 'Composition',
        description: 'Show composition of values across categories',
        controls: [
            { id: 'showGrid', type: 'checkbox', label: 'Show Grid', value: false },
            { id: 'beginAtZero', type: 'checkbox', label: 'Y-axis Begin at Zero', value: true },
            { id: 'yAxisMin', type: 'number', label: 'Y-axis Min', value: '' },
            { id: 'yAxisMax', type: 'number', label: 'Y-axis Max', value: '' },
            { id: 'legendPosition', type: 'select', label: 'Legend Position', options: ['top', 'bottom', 'left', 'right'], value: 'bottom' },
            { id: 'titleAlign', type: 'select', label: 'Title Alignment', options: ['start', 'center', 'end'], value: 'start' }
        ]
    },
    'bar-stacked-horizontal': {
        title: 'Horizontal Stacked Bar Chart',
        purpose: 'Composition',
        description: 'Show composition of values across categories (horizontal orientation)',
        controls: [
            { id: 'showGrid', type: 'checkbox', label: 'Show Grid', value: false },
            { id: 'beginAtZero', type: 'checkbox', label: 'Y-axis Begin at Zero', value: true },
            { id: 'xAxisMin', type: 'number', label: 'X-axis Min', value: '' },
            { id: 'xAxisMax', type: 'number', label: 'X-axis Max', value: '' },
            { id: 'legendPosition', type: 'select', label: 'Legend Position', options: ['top', 'bottom', 'left', 'right'], value: 'bottom' },
            { id: 'titleAlign', type: 'select', label: 'Title Alignment', options: ['start', 'center', 'end'], value: 'start' }
        ]
    },
    combo: {
        title: 'Combo Chart',
        purpose: 'Comparison, Composition',
        description: 'Combine bars and lines to show different data types',
        controls: [
            { id: 'tension', type: 'checkbox', label: 'Smooth Lines', value: false },
            { id: 'showGrid', type: 'checkbox', label: 'Show Grid', value: false },
            { id: 'beginAtZero', type: 'checkbox', label: 'Y-axis Begin at Zero', value: true },
            { id: 'yAxisMin', type: 'number', label: 'Y-axis Min', value: '' },
            { id: 'yAxisMax', type: 'number', label: 'Y-axis Max', value: '' },
            { id: 'y1AxisMin', type: 'number', label: 'Right Y-axis Min', value: '' },
            { id: 'y1AxisMax', type: 'number', label: 'Right Y-axis Max', value: '' },
            { id: 'legendPosition', type: 'select', label: 'Legend Position', options: ['top', 'bottom', 'left', 'right'], value: 'bottom' },
            { id: 'titleAlign', type: 'select', label: 'Title Alignment', options: ['start', 'center', 'end'], value: 'start' }
        ]
    },
    donut: {
        title: 'Donut/Pie Chart',
        purpose: 'Composition',
        description: 'Show parts of a whole',
        controls: [
            { id: 'isPie', type: 'checkbox', label: 'Pie Chart (vs Donut)', value: false },
            { id: 'cutout', type: 'range', label: 'Cutout %', min: 0, max: 90, step: 5, value: 50 },
            { id: 'legendPosition', type: 'select', label: 'Legend Position', options: ['top', 'bottom', 'left', 'right'], value: 'bottom' },
            { id: 'titleAlign', type: 'select', label: 'Title Alignment', options: ['start', 'center', 'end'], value: 'start' }
        ]
    },
    multiseries: {
        title: 'Multi-Series Pie',
        purpose: 'Composition',
        description: 'Compare compositions across multiple series',
        controls: [
            { id: 'legendPosition', type: 'select', label: 'Legend Position', options: ['top', 'bottom', 'left', 'right'], value: 'bottom' },
            { id: 'titleAlign', type: 'select', label: 'Title Alignment', options: ['start', 'center', 'end'], value: 'start' }
        ]
    },
    table: {
        title: 'Data Table',
        purpose: 'Analysis',
        description: 'Display data in a structured table format',
        controls: [
            { id: 'showSearch', type: 'checkbox', label: 'Show Search', value: true },
            { id: 'showPagination', type: 'checkbox', label: 'Show Pagination', value: true },
            { id: 'alternatingRows', type: 'checkbox', label: 'Alternating Rows', value: true },
            { id: 'pageSize', type: 'number', label: 'Rows Per Page', value: 10 }
        ]
    },
    funnel: {
        title: 'Funnel Report',
        purpose: 'Analysis',
        description: 'Show conversion rates through different stages',
        controls: [
            
        ]
    },
    retention: {
        title: 'Retention Analysis',
        purpose: 'Analysis',
        description: 'Show user retention over time periods',
        controls: [
            { id: 'timeUnit', type: 'select', label: 'Time Unit', options: ['daily', 'weekly', 'monthly'], value: 'monthly' },
            { id: 'cohortSize', type: 'number', label: 'Cohort Periods', value: 12 }
        ]
    }
};

// Multi-Chart Manager
class MultiChartManager {
    constructor() {
        this.currentChart = null;
        this.currentChartType = 'line';
        this.chartData = rawBusinessData;
        this.currentPalette = 'default';
        this.init();
    }

    init() {
        this.setupNavigation();
        this.setupCommonControls();
        this.createChart('line');
    }

    setupNavigation() {
        const navButtons = document.querySelectorAll('.nav-btn');
        navButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Update active state
                navButtons.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                // Switch chart
                const chartType = e.target.dataset.chart;
                this.createChart(chartType);
                
                // Update dropdown to match
                const dropdown = document.getElementById('chartTypeDropdown');
                if (dropdown) {
                    dropdown.value = chartType;
                }
            });
        });
    }

    setupCommonControls() {
        // Title control
        document.getElementById('titleInput').addEventListener('input', (e) => {
            if (this.currentChart) {
                this.currentChart.options.plugins.title.text = e.target.value;
                this.currentChart.update();
            }
        });

        // Chart type dropdown
        document.getElementById('chartTypeDropdown').addEventListener('change', (e) => {
            const newChartType = e.target.value;
            this.createChart(newChartType);
            
            // Update navigation buttons to match
            const navButtons = document.querySelectorAll('.nav-btn');
            navButtons.forEach(btn => {
                btn.classList.remove('active');
                if (btn.dataset.chart === newChartType) {
                    btn.classList.add('active');
                }
            });
        });

        // Color palette
        document.getElementById('colorPalette').addEventListener('change', (e) => {
            this.currentPalette = e.target.value;
            if (this.currentChart) {
                this.applyColorPalette();
            } else {
                // For special visualizations, recreate them
                this.createChart(this.currentChartType);
            }
        });


        // Animation
        document.getElementById('animation').addEventListener('change', (e) => {
            if (this.currentChart) {
                this.currentChart.options.animation = e.target.checked ? { duration: 1000 } : false;
                this.currentChart.update();
            }
        });

        // Raw data toggle
        document.getElementById('toggleRawData').addEventListener('click', () => {
            const display = document.getElementById('rawDataDisplay');
            display.style.display = display.style.display === 'none' ? 'block' : 'none';
        });
    }

    createChart(chartType) {
        this.currentChartType = chartType;
        const config = chartConfigs[chartType];
        
        // Update dropdown to match current chart
        const dropdown = document.getElementById('chartTypeDropdown');
        if (dropdown && dropdown.value !== chartType) {
            dropdown.value = chartType;
        }
        
        // Generate dynamic controls
        this.generateControls(config.controls);
        
        // Generate dataset visibility controls
        this.generateDatasetControls(chartType);
        
        // Destroy existing chart
        if (this.currentChart) {
            this.currentChart.destroy();
            this.currentChart = null;
        }
        
        // Handle special visualization types
        if (chartType === 'table') {
            this.createTable();
        } else if (chartType === 'funnel') {
            this.createFunnel();
        } else if (chartType === 'retention') {
            this.createRetention();
        } else {
            // Regular Chart.js charts - restore canvas if needed
            this.ensureCanvas();
            const ctx = document.getElementById('mainChart').getContext('2d');
            this.currentChart = new Chart(ctx, this.getChartConfig(chartType));
            
            // Auto-adjust bar thickness for bar charts
            if (chartType === 'bar' || chartType === 'bar-stacked') {
                setTimeout(() => {
                    this.autoAdjustBarThickness();
                }, 100);
            }
        }
        
        // Update raw data display
        this.updateRawDataDisplay();
    }

    generateControls(controls) {
        const container = document.getElementById('dynamicControls');
        container.innerHTML = '';
        
        controls.forEach(control => {
            const controlGroup = document.createElement('div');
            controlGroup.className = 'control-group';
            
            const label = document.createElement('label');
            label.setAttribute('for', control.id);
            label.textContent = control.label + ':';
            controlGroup.appendChild(label);
            
            let input;
            if (control.type === 'range') {
                input = document.createElement('input');
                input.type = 'range';
                input.min = control.min;
                input.max = control.max;
                input.step = control.step;
                input.value = control.value;
                
                const valueSpan = document.createElement('span');
                valueSpan.id = control.id + 'Value';
                valueSpan.textContent = control.value;
                
                input.addEventListener('input', (e) => {
                    valueSpan.textContent = e.target.value;
                    this.handleControlChange(control.id, parseFloat(e.target.value));
                });
                
                controlGroup.appendChild(input);
                controlGroup.appendChild(valueSpan);
            } else if (control.type === 'checkbox') {
                input = document.createElement('input');
                input.type = 'checkbox';
                input.checked = control.value;
                
                input.addEventListener('change', (e) => {
                    this.handleControlChange(control.id, e.target.checked);
                });
                
                controlGroup.appendChild(input);
            } else if (control.type === 'select') {
                input = document.createElement('select');
                control.options.forEach(option => {
                    const optionElement = document.createElement('option');
                    optionElement.value = option;
                    optionElement.textContent = option.charAt(0).toUpperCase() + option.slice(1);
                    if (option === control.value) optionElement.selected = true;
                    input.appendChild(optionElement);
                });
                
                input.addEventListener('change', (e) => {
                    this.handleControlChange(control.id, e.target.value);
                });
                
                controlGroup.appendChild(input);
            } else if (control.type === 'number') {
                input = document.createElement('input');
                input.type = 'number';
                input.value = control.value;
                input.placeholder = 'Auto';
                input.style.width = '80px';
                
                input.addEventListener('input', (e) => {
                    const value = e.target.value === '' ? null : parseFloat(e.target.value);
                    this.handleControlChange(control.id, value);
                });
                
                controlGroup.appendChild(input);
            }
            
            input.id = control.id;
            container.appendChild(controlGroup);
        });
    }

    generateDatasetControls(chartType) {
        const container = document.getElementById('datasetToggles');
        container.innerHTML = '<h4>Dataset Visibility</h4>';
        
        let datasets = [];
        switch (chartType) {
            case 'line':
            case 'bar':
            case 'bar-horizontal':
            case 'line-stacked':
            case 'bar-stacked':
            case 'bar-stacked-horizontal':
            case 'combo':
                datasets = [
                    { id: 'revenue', label: 'Revenue', checked: true },
                    { id: 'costs', label: 'Costs', checked: true },
                    { id: 'profit', label: 'Profit', checked: true }
                ];
                if (chartType === 'combo') {
                    datasets.push({ id: 'satisfaction', label: 'Satisfaction', checked: true });
                }
                break;
            case 'donut':
                datasets = [
                    { id: 'revenue', label: 'Revenue', checked: true },
                    { id: 'costs', label: 'Costs', checked: true },
                    { id: 'profit', label: 'Profit', checked: true }
                ];
                break;
            case 'multiseries':
                datasets = [
                    { id: 'revenue', label: 'Revenue', checked: true },
                    { id: 'visits', label: 'Visits', checked: true }
                ];
                break;
            case 'table':
            case 'funnel':
            case 'retention':
                datasets = [
                    { id: 'data', label: 'Show Data', checked: true }
                ];
                break;
        }
        
        datasets.forEach(dataset => {
            const label = document.createElement('label');
            label.style.display = 'flex';
            label.style.alignItems = 'center';
            label.style.marginBottom = '4px';
            label.style.cursor = 'pointer';
            label.style.fontSize = '13px';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = dataset.checked;
            checkbox.style.marginRight = '6px';
            checkbox.addEventListener('change', (e) => {
                this.toggleDataset(dataset.id, e.target.checked);
            });
            
            const text = document.createTextNode(dataset.label);
            
            label.appendChild(checkbox);
            label.appendChild(text);
            container.appendChild(label);
        });
    }

    toggleDataset(datasetId, show) {
        if (!this.currentChart) return;
        
        // Simple show/hide by changing dataset visibility
        this.currentChart.data.datasets.forEach((dataset, index) => {
            if (dataset.label.toLowerCase().includes(datasetId.toLowerCase()) || 
                (datasetId === 'satisfaction' && dataset.label.includes('Satisfaction')) ||
                (datasetId === 'bubble' && dataset.label.includes('Bubble')) ||
                (datasetId === 'satisfaction' && this.currentChartType === 'scatter')) {
                dataset.hidden = !show;
            }
        });
        
        this.currentChart.update();
        
        // Auto-adjust bar thickness when dataset visibility changes
        if (this.currentChartType === 'bar' || this.currentChartType === 'bar-stacked') {
            setTimeout(() => {
                this.autoAdjustBarThickness();
            }, 50);
        }
    }

    handleControlChange(controlId, value) {
        if (!this.currentChart) return;

        switch (controlId) {
            case 'tension':
                const tensionValue = value ? 0.4 : 0.0;
                this.currentChart.data.datasets.forEach(dataset => {
                    if (dataset.tension !== undefined) dataset.tension = tensionValue;
                });
                break;
            case 'fill':
                this.currentChart.data.datasets.forEach(dataset => {
                    if (dataset.fill !== undefined) dataset.fill = value;
                });
                break;
            case 'stacked':
                if (this.currentChartType === 'line' || this.currentChartType === 'bar' || this.currentChartType === 'line-stacked' || this.currentChartType === 'bar-stacked') {
                    this.currentChart.options.scales.x.stacked = value;
                    this.currentChart.options.scales.y.stacked = value;
                    // Auto-adjust bar thickness when stacking changes
                    if (this.currentChartType === 'bar' || this.currentChartType === 'bar-stacked') {
                        this.autoAdjustBarThickness();
                    }
                }
                break;
            case 'horizontal':
                // Recreate chart for horizontal/vertical switch
                this.createChart(this.currentChartType);
                return;
            case 'pointStyle':
                this.currentChart.data.datasets.forEach(dataset => {
                    if (dataset.pointStyle !== undefined) dataset.pointStyle = value;
                });
                break;
            case 'pointRadius':
                this.currentChart.data.datasets.forEach(dataset => {
                    if (dataset.pointRadius !== undefined) dataset.pointRadius = value;
                });
                break;
            case 'pointHitRadius':
                this.currentChart.data.datasets.forEach(dataset => {
                    if (dataset.pointHitRadius !== undefined) dataset.pointHitRadius = value;
                });
                break;
            case 'borderWidth':
                this.currentChart.data.datasets.forEach(dataset => {
                    dataset.borderWidth = value;
                });
                break;
            case 'borderRadius':
                this.currentChart.data.datasets.forEach(dataset => {
                    if (dataset.borderRadius !== undefined) dataset.borderRadius = value;
                });
                break;
            case 'barThickness':
                this.updateBarThickness(value);
                break;
            case 'showGrid':
                if (this.currentChart.options.scales.x) {
                    this.currentChart.options.scales.x.grid.display = value;
                }
                if (this.currentChart.options.scales.y) {
                    this.currentChart.options.scales.y.grid.display = value;
                }
                break;
            case 'beginAtZero':
                if (this.currentChart.options.scales.y) {
                    this.currentChart.options.scales.y.beginAtZero = value;
                }
                break;
            case 'isPie':
                this.currentChart.options.cutout = value ? 0 : '50%';
                break;
            case 'cutout':
                this.currentChart.options.cutout = `${value}%`;
                break;
            case 'maxRadius':
                this.currentChart.data.datasets.forEach(dataset => {
                    if (dataset.data && Array.isArray(dataset.data)) {
                        dataset.data.forEach(point => {
                            if (point.r) {
                                point.r = Math.min(point.r, value);
                            }
                        });
                    }
                });
                break;
            case 'showLine':
                this.currentChart.data.datasets.forEach(dataset => {
                    if (dataset.showLine !== undefined) dataset.showLine = value;
                });
                break;
            case 'yAxisMin':
                if (this.currentChart.options.scales.y) {
                    this.currentChart.options.scales.y.min = value;
                }
                break;
            case 'yAxisMax':
                if (this.currentChart.options.scales.y) {
                    this.currentChart.options.scales.y.max = value;
                }
                break;
            case 'xAxisMin':
                if (this.currentChart.options.scales.x) {
                    this.currentChart.options.scales.x.min = value;
                }
                break;
            case 'xAxisMax':
                if (this.currentChart.options.scales.x) {
                    this.currentChart.options.scales.x.max = value;
                }
                break;
            case 'y1AxisMin':
                if (this.currentChart.options.scales.y1) {
                    this.currentChart.options.scales.y1.min = value;
                }
                break;
            case 'y1AxisMax':
                if (this.currentChart.options.scales.y1) {
                    this.currentChart.options.scales.y1.max = value;
                }
                break;
            case 'alternatingRows':
                this.updateTableAlternatingRows();
                return; // No need to update chart
            case 'legendPosition':
                if (this.currentChart) {
                    this.currentChart.options.plugins.legend.position = value;
                }
                break;
            case 'titleAlign':
                if (this.currentChart) {
                    this.currentChart.options.plugins.title.align = value;
                }
                break;
        }
        
        this.currentChart.update();
    }

    updateBarThickness(value) {
        if (!this.currentChart) return;
        
        // Check if chart is stacked
        const isStacked = this.currentChart.options.scales.x?.stacked || this.currentChart.options.scales.y?.stacked;
        
        // Apply thickness to datasets
        this.currentChart.data.datasets.forEach(dataset => {
            if (dataset.barThickness !== undefined) {
                dataset.barThickness = value;
            }
        });
        
        // If stacked, also adjust category percentage for better appearance
        if (isStacked) {
            this.currentChart.options.scales.x.categoryPercentage = Math.min(0.9, value / 50);
            this.currentChart.options.scales.y.categoryPercentage = Math.min(0.9, value / 50);
        }
        
        this.currentChart.update();
    }

    autoAdjustBarThickness() {
        if (!this.currentChart) return;
        
        const isStacked = this.currentChart.options.scales.x?.stacked || this.currentChart.options.scales.y?.stacked;
        const datasetCount = this.currentChart.data.datasets.filter(d => !d.hidden).length;
        
        let optimalThickness;
        if (isStacked) {
            // For stacked bars, we can use thicker bars since they stack on top
            optimalThickness = Math.max(30, Math.min(60, 200 / this.currentChart.data.labels.length));
        } else {
            // For grouped bars, thickness depends on number of datasets and available space
            optimalThickness = Math.max(10, Math.min(40, 150 / (datasetCount * this.currentChart.data.labels.length)));
        }
        
        // Update the control slider value
        const thicknessControl = document.getElementById('barThickness');
        if (thicknessControl) {
            thicknessControl.value = optimalThickness;
            const valueDisplay = document.getElementById('barThicknessValue');
            if (valueDisplay) {
                valueDisplay.textContent = optimalThickness;
            }
        }
        
        // Apply the thickness
        this.updateBarThickness(optimalThickness);
    }

    getColors(index) {
        const palette = colorPalettes[this.currentPalette];
        const colorIndex = index % palette.colors.length;
        return palette.colors[colorIndex];
    }

    applyColorPalette() {
        if (!this.currentChart) return;

        this.currentChart.data.datasets.forEach((dataset, index) => {
            const colors = this.getColors(index);
            dataset.borderColor = colors.border;
            
            // Apply appropriate background based on chart type
            if (this.currentChartType === 'line' || this.currentChartType === 'line-stacked') {
                dataset.backgroundColor = dataset.fill ? colors.background : colors.backgroundLight;
            } else if (this.currentChartType === 'bar' || this.currentChartType === 'bar-stacked' || this.currentChartType === 'combo') {
                dataset.backgroundColor = colors.background;
            } else if (this.currentChartType === 'scatter' || this.currentChartType === 'bubble') {
                dataset.backgroundColor = colors.background;
            } else if (this.currentChartType === 'donut' || this.currentChartType === 'multiseries') {
                // For pie/donut charts, apply colors to data array
                if (!dataset.backgroundColor || !Array.isArray(dataset.backgroundColor)) {
                    dataset.backgroundColor = [];
                    dataset.borderColor = [];
                }
                const palette = colorPalettes[this.currentPalette];
                for (let i = 0; i < dataset.data.length; i++) {
                    const colorIndex = i % palette.colors.length;
                    dataset.backgroundColor[i] = palette.colors[colorIndex].background;
                    dataset.borderColor[i] = palette.colors[colorIndex].border;
                }
            }
        });

        this.currentChart.update();
    }

    getChartConfig(chartType) {
        const baseConfig = {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 2,
            plugins: {
                title: {
                    display: true,
                    text: chartConfigs[chartType].title,
                    font: { 
                        color: '#374151',
                        size: 18, 
                        weight: 600, 
                        family: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
                    },
                    padding: {
                        top: 10,
                        bottom: 30
                    },
                    align: 'start'
                },
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: { usePointStyle: true, pointStyle: 'line', padding: 20 }
                }
            },
            animation: { duration: 1000, easing: 'easeOutQuart' }
        };

        switch (chartType) {
            case 'line':
                return this.getLineChartConfig(baseConfig);
            case 'line-stacked':
                return this.getStackedAreaChartConfig(baseConfig);
            case 'bar':
                return this.getBarChartConfig(baseConfig);
            case 'bar-horizontal':
                return this.getHorizontalBarChartConfig(baseConfig);
            case 'bar-stacked':
                return this.getStackedBarChartConfig(baseConfig);
            case 'bar-stacked-horizontal':
                return this.getHorizontalStackedBarChartConfig(baseConfig);
            case 'combo':
                return this.getComboChartConfig(baseConfig);
            case 'donut':
                return this.getDonutChartConfig(baseConfig);
            case 'multiseries':
                return this.getMultiSeriesPieConfig(baseConfig);
            case 'table':
                return this.getTableConfig(baseConfig);
            case 'funnel':
                return this.getFunnelConfig(baseConfig);
            case 'retention':
                return this.getRetentionConfig(baseConfig);
            default:
                return this.getLineChartConfig(baseConfig);
        }
    }

    getLineChartConfig(baseConfig) {
        const datasets = [
            {
                label: 'Revenue',
                data: this.chartData.map(d => d.revenue / 1000),
                tension: 0.1,
                fill: false,
                pointRadius: 1,
                pointHitRadius: 10,
                borderWidth: 2
            },
            {
                label: 'Costs',
                data: this.chartData.map(d => d.costs / 1000),
                tension: 0.1,
                fill: false,
                pointRadius: 1,
                pointHitRadius: 10,
                borderWidth: 2
            },
            {
                label: 'Profit',
                data: this.chartData.map(d => d.profit / 1000),
                tension: 0.1,
                fill: false,
                pointRadius: 1,
                pointHitRadius: 10,
                borderWidth: 2
            }
        ];

        // Apply colors from current palette
        datasets.forEach((dataset, index) => {
            const colors = this.getColors(index);
            dataset.borderColor = colors.border;
            dataset.backgroundColor = colors.backgroundLight;
        });

        return {
            type: 'line',
            data: {
                labels: this.chartData.map(d => d.month),
                datasets: datasets
            },
            options: {
                ...baseConfig,
                plugins: {
                    ...baseConfig.plugins,
                    legend: {
                        ...baseConfig.plugins.legend,
                        labels: {
                            ...baseConfig.plugins.legend.labels,
                            usePointStyle: true,
                            pointStyle: 'line',
                        }
                    }
                },
                scales: {
                    x: {
                        display: true,
                        title: { display: true, text: 'Month' },
                        grid: { display: false },
                        stacked: false
                    },
                    y: {
                        display: true,
                        title: { display: true, text: 'Amount (K$)' },
                        beginAtZero: true,
                        grid: { display: false },
                        stacked: false
                    }
                }
            }
        };
    }

    getStackedAreaChartConfig(baseConfig) {
        const datasets = [
            {
                label: 'Revenue',
                data: this.chartData.map(d => d.revenue / 1000),
                tension: 0.1,
                fill: true,
                pointRadius: 1,
                pointHitRadius: 10,
                borderWidth: 2
            },
            {
                label: 'Costs',
                data: this.chartData.map(d => d.costs / 1000),
                tension: 0.1,
                fill: true,
                pointRadius: 1,
                pointHitRadius: 10,
                borderWidth: 2
            },
            {
                label: 'Profit',
                data: this.chartData.map(d => d.profit / 1000),
                tension: 0.1,
                fill: true,
                pointRadius: 1,
                pointHitRadius: 10,
                borderWidth: 2
            }
        ];

        // Apply colors from current palette
        datasets.forEach((dataset, index) => {
            const colors = this.getColors(index);
            dataset.borderColor = colors.border;
            dataset.backgroundColor = colors.background;
        });

        return {
            type: 'line',
            data: {
                labels: this.chartData.map(d => d.month),
                datasets: datasets
            },
            options: {
                ...baseConfig,
                scales: {
                    x: {
                        display: true,
                        title: { display: true, text: 'Month' },
                        grid: { display: false },
                        stacked: true
                    },
                    y: {
                        display: true,
                        title: { display: true, text: 'Amount (K$)' },
                        beginAtZero: true,
                        grid: { display: false },
                        stacked: true
                    }
                }
            }
        };
    }

    getBarChartConfig(baseConfig) {        
        const datasets = [
            {
                label: 'Revenue',
                data: this.chartData.map(d => d.revenue / 1000),
                borderWidth: 1,
                borderRadius: 2
            },
            {
                label: 'Costs',
                data: this.chartData.map(d => d.costs / 1000),
                borderWidth: 1,
                borderRadius: 2
            },
            {
                label: 'Profit',
                data: this.chartData.map(d => d.profit / 1000),
                borderWidth: 1,
                borderRadius: 2
            }
        ];

        // Apply colors from current palette
        datasets.forEach((dataset, index) => {
            const colors = this.getColors(index);
            dataset.borderColor = colors.border;
            dataset.backgroundColor = colors.background;
        });
        
        return {
            type: 'bar',
            data: {
                labels: this.chartData.map(d => d.month),
                datasets: datasets
            },
            options: {
                ...baseConfig,
                scales: {
                    x: {
                        display: true,
                        title: { display: true, text: 'Month' },
                        beginAtZero: true,
                        grid: { display: false },
                        stacked: false
                    },
                    y: {
                        display: true,
                        title: { display: true, text: 'Amount (K$)' },
                        beginAtZero: true,
                        grid: { display: false },
                        stacked: false
                    }
                }
            }
        };
    }

    getHorizontalBarChartConfig(baseConfig) {        
        const datasets = [
            {
                label: 'Revenue',
                data: this.chartData.map(d => d.revenue / 1000),
                borderWidth: 1,
                borderRadius: 2
            },
            {
                label: 'Costs',
                data: this.chartData.map(d => d.costs / 1000),
                borderWidth: 1,
                borderRadius: 2
            },
            {
                label: 'Profit',
                data: this.chartData.map(d => d.profit / 1000),
                borderWidth: 1,
                borderRadius: 2
            }
        ];

        // Apply colors from current palette
        datasets.forEach((dataset, index) => {
            const colors = this.getColors(index);
            dataset.borderColor = colors.border;
            dataset.backgroundColor = colors.background;
        });
        
        return {
            type: 'bar',
            data: {
                labels: this.chartData.map(d => d.month),
                datasets: datasets
            },
            options: {
                ...baseConfig,
                indexAxis: 'y',
                scales: {
                    x: {
                        display: true,
                        title: { display: true, text: 'Amount (K$)' },
                        beginAtZero: true,
                        grid: { display: false },
                        stacked: false
                    },
                    y: {
                        display: true,
                        title: { display: true, text: 'Month' },
                        beginAtZero: true,
                        grid: { display: false },
                        stacked: false
                    }
                }
            }
        };
    }

    getStackedBarChartConfig(baseConfig) {        
        const datasets = [
            {
                label: 'Revenue',
                data: this.chartData.map(d => d.revenue / 1000),
                borderWidth: 1,
                borderRadius: 2
            },
            {
                label: 'Costs',
                data: this.chartData.map(d => d.costs / 1000),
                borderWidth: 1,
                borderRadius: 2
            },
            {
                label: 'Profit',
                data: this.chartData.map(d => d.profit / 1000),
                borderWidth: 1,
                borderRadius: 2
            }
        ];

        // Apply colors from current palette
        datasets.forEach((dataset, index) => {
            const colors = this.getColors(index);
            dataset.borderColor = colors.border;
            dataset.backgroundColor = colors.background;
        });
        
        return {
            type: 'bar',
            data: {
                labels: this.chartData.map(d => d.month),
                datasets: datasets
            },
            options: {
                ...baseConfig,
                scales: {
                    x: {
                        display: true,
                        title: { display: true, text: 'Month' },
                        beginAtZero: true,
                        grid: { display: false },
                        stacked: true
                    },
                    y: {
                        display: true,
                        title: { display: true, text: 'Amount (K$)' },
                        beginAtZero: true,
                        grid: { display: false },
                        stacked: true
                    }
                }
            }
        };
    }

    getHorizontalStackedBarChartConfig(baseConfig) {        
        const datasets = [
            {
                label: 'Revenue',
                data: this.chartData.map(d => d.revenue / 1000),
                borderWidth: 1,
                borderRadius: 2
            },
            {
                label: 'Costs',
                data: this.chartData.map(d => d.costs / 1000),
                borderWidth: 1,
                borderRadius: 2
            },
            {
                label: 'Profit',
                data: this.chartData.map(d => d.profit / 1000),
                borderWidth: 1,
                borderRadius: 2
            }
        ];

        // Apply colors from current palette
        datasets.forEach((dataset, index) => {
            const colors = this.getColors(index);
            dataset.borderColor = colors.border;
            dataset.backgroundColor = colors.background;
        });
        
        return {
            type: 'bar',
            data: {
                labels: this.chartData.map(d => d.month),
                datasets: datasets
            },
            options: {
                ...baseConfig,
                indexAxis: 'y',
                scales: {
                    x: {
                        display: true,
                        title: { display: true, text: 'Amount (K$)' },
                        beginAtZero: true,
                        grid: { display: false },
                        stacked: true
                    },
                    y: {
                        display: true,
                        title: { display: true, text: 'Month' },
                        beginAtZero: true,
                        grid: { display: false },
                        stacked: true
                    }
                }
            }
        };
    }

    getComboChartConfig(baseConfig) {
        const datasets = [
            {
                type: 'bar',
                label: 'Revenue',
                data: this.chartData.map(d => d.revenue / 1000),
                borderWidth: 1,
                borderRadius: 2,
                yAxisID: 'y'
            },
            {
                type: 'bar',
                label: 'Costs',
                data: this.chartData.map(d => d.costs / 1000),
                borderWidth: 1,
                borderRadius: 2,
                yAxisID: 'y'
            },
            {
                type: 'line',
                label: 'Customer Satisfaction',
                data: this.chartData.map(d => d.satisfaction),
                borderWidth: 2,
                fill: false,
                tension: 0.0,
                pointRadius: 1,
                pointHitRadius: 10,
                yAxisID: 'y1'
            }
        ];

        // Apply colors from current palette
        datasets.forEach((dataset, index) => {
            const colors = this.getColors(index);
            dataset.borderColor = colors.border;
            if (dataset.type === 'bar') {
                dataset.backgroundColor = colors.background;
            } else {
                // Line chart
                dataset.backgroundColor = colors.backgroundLight;
            }
        });

        return {
            type: 'bar',
            data: {
                labels: this.chartData.map(d => d.month),
                datasets: datasets
            },
            options: {
                ...baseConfig,
                scales: {
                    x: {
                        display: true,
                        title: { display: true, text: 'Month' },
                        grid: { display: false }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: { display: true, text: 'Amount (K$)' },
                        beginAtZero: true,
                        grid: { display: false }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: { display: true, text: 'Satisfaction (%)' },
                        grid: { drawOnChartArea: false, display: false }
                    }
                }
            }
        };
    }

    getDonutChartConfig(baseConfig) {
        const totalRevenue = this.chartData.reduce((sum, d) => sum + d.revenue, 0);
        const totalCosts = this.chartData.reduce((sum, d) => sum + d.costs, 0);
        const totalProfit = this.chartData.reduce((sum, d) => sum + d.profit, 0);
        
        const data = [totalRevenue, totalCosts, totalProfit];
        const palette = colorPalettes[this.currentPalette];
        const backgroundColor = [];
        const borderColor = [];
        
        for (let i = 0; i < data.length; i++) {
            const colorIndex = i % palette.colors.length;
            backgroundColor.push(palette.colors[colorIndex].background);
            borderColor.push(palette.colors[colorIndex].border);
        }
        
        return {
            type: 'doughnut',
            data: {
                labels: ['Revenue', 'Costs', 'Profit'],
                datasets: [{
                    data: data,
                    backgroundColor: backgroundColor,
                    borderColor: borderColor,
                    borderWidth: 1
                }]
            },
            options: {
                ...baseConfig,
                cutout: '50%',
                plugins: {
                    ...baseConfig.plugins,
                    legend: {
                        ...baseConfig.plugins.legend,
                        position: 'bottom'
                    }
                }
            }
        };
    }

    getScatterChartConfig(baseConfig) {
        const colors = this.getColors(0);
        
        return {
            type: 'scatter',
            data: {
                datasets: [{
                    label: 'Customer Satisfaction vs Customer Count',
                    data: scatterData,
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    pointRadius: 5
                }]
            },
            options: {
                ...baseConfig,
                scales: {
                    x: {
                        display: true,
                        title: { display: true, text: 'Customer Count' },
                        grid: { display: true }
                    },
                    y: {
                        display: true,
                        title: { display: true, text: 'Satisfaction Score' },
                        grid: { display: true }
                    }
                }
            }
        };
    }

    getBubbleChartConfig(baseConfig) {
        const colors = this.getColors(0);
        
        return {
            type: 'bubble',
            data: {
                datasets: [{
                    label: 'Customers vs Satisfaction vs Revenue',
                    data: bubbleData,
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    borderWidth: 1
                }]
            },
            options: {
                ...baseConfig,
                scales: {
                    x: {
                        display: true,
                        title: { display: true, text: 'Customer Count' },
                        grid: { display: true }
                    },
                    y: {
                        display: true,
                        title: { display: true, text: 'Satisfaction Score' },
                        grid: { display: true }
                    }
                },
                plugins: {
                    ...baseConfig.plugins,
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `Customers: ${context.parsed.x}, Satisfaction: ${context.parsed.y}, Revenue: ${context.parsed._custom}K`;
                            }
                        }
                    }
                }
            }
        };
    }

    getMultiSeriesPieConfig(baseConfig) {
        const palette = colorPalettes[this.currentPalette];
        
        return {
            type: 'doughnut',
            data: {
                labels: ['Revenue', 'Revenue Empty', 'Visits', 'Visits Empty'],
                datasets: [
                    {
                        label: 'Revenue (Inner)',
                        data: [90, 10, 0, 0], // Revenue: 90% filled, 10% empty
                        backgroundColor: [
                            palette.colors[0].background,
                            'rgba(200, 200, 200, 0.2)',

                        ],
                        borderColor: [
                            palette.colors[0].border,
                            'rgba(200, 200, 200, 0.4)',
            
                        ],
                        borderWidth: 1,
                        cutout: '20%',
                        radius: '60%'
                    },
                    {
                        label: 'Visits (Outer)',
                        data: [0, 0, 75, 25], // Visits: 75% filled, 25% empty
                        backgroundColor: [
                            palette.colors[1].background,
                            'rgba(200, 200, 200, 0.2)'
                        ],
                        borderColor: [
                            palette.colors[1].border,
                            'rgba(200, 200, 200, 0.4)'
                        ],
                        borderWidth: 1,
                        cutout: '60%',
                        radius: '100%'
                    }
                ]
            },
            options: {
                ...baseConfig,
                plugins: {
                    ...baseConfig.plugins,
                    legend: {
                        ...baseConfig.plugins.legend,
                        position: 'bottom',
                        labels: {
                            filter: function(legendItem, chartData) {
                                // Only show Revenue and Visits in legend, hide empty segments
                                return legendItem.text === 'Revenue' || legendItem.text === 'Visits';
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label;
                                const value = context.parsed;
                                if (label === 'Revenue') {
                                    return `Revenue: ${value}%`;
                                } else if (label === 'Visits') {
                                    return `Visits: ${value}%`;
                                }
                                return null; // Hide empty segments from tooltip
                            },
                            filter: function(tooltipItem) {
                                // Hide empty segments from tooltip
                                return !tooltipItem.label.includes('Empty');
                            }
                        }
                    }
                }
            }
        };
    }

    ensureCanvas() {
        const container = document.querySelector('.chart-container');
        if (!document.getElementById('mainChart')) {
            container.innerHTML = '<canvas id="mainChart"></canvas>';
        }
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 59, g: 130, b: 246 }; // Default blue fallback
    }

    // Special visualization methods
    createTable() {
        const container = document.querySelector('.chart-container');
        
        // Replace canvas with table container
        container.innerHTML = `
            <div id="tableContainer" style="width: 100%; height: 100%; overflow: auto; padding: 20px;">
                <h3 style="margin-bottom: 20px; color: #374151;">Data Table</h3>
                <div id="tableSearch" style="margin-bottom: 15px;">
                    <input type="text" id="searchInput" placeholder="Search data..." style="padding: 8px; width: 300px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                <table id="dataTable" style="width: 100%; border-collapse: collapse; font-size: 14px;">
                    <thead style="background-color: #f8f9fa; position: sticky; top: 0;">
                        <tr>
                            <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">Month</th>
                            <th style="padding: 12px; text-align: right; border: 1px solid #dee2e6;">Revenue ($K)</th>
                            <th style="padding: 12px; text-align: right; border: 1px solid #dee2e6;">Costs ($K)</th>
                            <th style="padding: 12px; text-align: right; border: 1px solid #dee2e6;">Profit ($K)</th>
                            <th style="padding: 12px; text-align: right; border: 1px solid #dee2e6;">Satisfaction</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.chartData.map((row, index) => `
                            <tr class="table-row" style="border-bottom: 1px solid #dee2e6;">
                                <td style="padding: 10px; border: 1px solid #dee2e6;">${row.month}</td>
                                <td style="padding: 10px; text-align: right; border: 1px solid #dee2e6;">${(row.revenue / 1000).toFixed(1)}</td>
                                <td style="padding: 10px; text-align: right; border: 1px solid #dee2e6;">${(row.costs / 1000).toFixed(1)}</td>
                                <td style="padding: 10px; text-align: right; border: 1px solid #dee2e6;">${(row.profit / 1000).toFixed(1)}</td>
                                <td style="padding: 10px; text-align: right; border: 1px solid #dee2e6;">${row.satisfaction}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        
        // Add search functionality
        const searchInput = document.getElementById('searchInput');
        const table = document.getElementById('dataTable');
        const tbody = table.querySelector('tbody');
        
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const rows = tbody.querySelectorAll('tr');
            
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(searchTerm) ? '' : 'none';
            });
        });

        // Apply alternating rows initially
        this.updateTableAlternatingRows();
    }

    updateTableAlternatingRows() {
        const alternatingEnabled = document.getElementById('alternatingRows')?.checked !== false;
        const rows = document.querySelectorAll('#dataTable .table-row');
        
        rows.forEach((row, index) => {
            if (alternatingEnabled && index % 2 === 1) {
                row.style.backgroundColor = '#f8f9fa';
            } else {
                row.style.backgroundColor = '';
            }
        });
    }

    createFunnel() {
        const container = document.querySelector('.chart-container');
        
        // Funnel data based on business metrics
        const funnelData = [
            { stage: 'Leads', value: 1000 },
            { stage: 'Qualified', value: 750 },
            { stage: 'Proposals', value: 500 },
            { stage: 'Negotiations', value: 300 },
            { stage: 'Closed Won', value: 200 }
        ].map((stage, index) => ({
            ...stage,
            color: this.getColors(index).border
        }));
        
        const maxValue = funnelData[0].value;
        
        container.innerHTML = `
            <div id="funnelContainer" style="width: 100%; height: 100%; padding: 20px;">
                <h3 style="margin-bottom: 20px; color: #374151;">Sales Funnel</h3>
                <div id="funnelChart" style="display: flex; flex-direction: column; align-items: center; gap: 10px; margin-top: 20px;">
                    ${funnelData.map((stage, index) => {
                        const width = (stage.value / maxValue) * 350;
                        const percentage = ((stage.value / funnelData[0].value) * 100).toFixed(1);
                        const conversionRate = index > 0 ? ((stage.value / funnelData[index - 1].value) * 100).toFixed(1) : '100.0';
                        
                        return `
                            <div style="display: flex; align-items: center; margin: 5px 0;">
                                <div style="width: ${width}px; height: 40px; background: ${stage.color}; 
                                           display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; 
                                           border-radius: 4px; position: relative; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                                    ${stage.value}
                                </div>
                                <div style="margin-left: 15px; font-size: 14px; color: #374151; min-width: 200px;">
                                    ${stage.stage} ${percentage}% (${conversionRate}%)
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
                <div style="margin-top: 20px; font-size: 12px; color: #9ca3af;">
                    Percentages show: (total %) (conversion from previous stage %)
                </div>
            </div>
        `;
    }

    createRetention() {
        const container = document.querySelector('.chart-container');
        
        // Get current color palette
        const palette = colorPalettes[this.currentPalette];
        const primaryColor = this.getColors(0).border;
        
        // Sample retention data (cohort analysis)
        const cohorts = ['Jan 2024', 'Feb 2024', 'Mar 2024', 'Apr 2024', 'May 2024'];
        const periods = ['Cohort Size', 'Month 0', 'Month 1', 'Month 2', 'Month 3', 'Month 4', 'Month 5'];
        
        // Generate sample cohort sizes and retention data
        const cohortData = cohorts.map((cohort, cohortIndex) => {
            const cohortSize = Math.floor(Math.random() * 500) + 1000; // Random size between 1000-1500
            const retentionData = periods.map((period, periodIndex) => {
                if (periodIndex === 0) {
                    // First column is cohort size
                    return cohortSize;
                } else if (periodIndex > cohorts.length - cohortIndex) {
                    // Future periods
                    return null;
                } else {
                    // Retention percentages
                    const baseRetention = 100 - ((periodIndex - 1) * 15) - (Math.random() * 10);
                    return Math.max(Math.round(baseRetention), 0);
                }
            });
            return { cohort, size: cohortSize, data: retentionData };
        });
        
        container.innerHTML = `
            <div id="retentionContainer" style="width: 100%; height: 100%; padding: 20px; overflow: auto;">
                <h3 style="margin-bottom: 20px; color: #374151;">User Retention Cohort Analysis</h3>
                <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                    <thead>
                        <tr style="background-color: #f8f9fa;">
                            <th style="padding: 10px; text-align: left; border: 1px solid #dee2e6; position: sticky; left: 0; background: #f8f9fa; z-index: 10;">Cohort</th>
                            ${periods.map((period, index) => `
                                <th style="padding: 10px; text-align: center; border: 1px solid #dee2e6; min-width: 80px; ${index === 0 ? 'background: #e3f2fd;' : ''}">${period}</th>
                            `).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${cohortData.map((cohortInfo, cohortIndex) => `
                            <tr>
                                <td style="padding: 10px; font-weight: bold; border: 1px solid #dee2e6; position: sticky; left: 0; background: #f8f9fa; z-index: 5;">${cohortInfo.cohort}</td>
                                ${periods.map((period, periodIndex) => {
                                    const value = cohortInfo.data[periodIndex];
                                    if (value === null) {
                                        return '<td style="padding: 10px; border: 1px solid #dee2e6; background-color: #f8f9fa;"></td>';
                                    }
                                    
                                    if (periodIndex === 0) {
                                        // Cohort size column
                                        return `
                                            <td style="padding: 10px; text-align: center; border: 1px solid #dee2e6; 
                                                      background-color: #e3f2fd; color: #1565c0; font-weight: bold;">
                                                ${value.toLocaleString()}
                                            </td>
                                        `;
                                    } else {
                                        // Retention percentage columns
                                        const intensity = value / 100;
                                        const primaryColorRgb = this.hexToRgb(primaryColor);
                                        const backgroundColor = `rgba(${primaryColorRgb.r}, ${primaryColorRgb.g}, ${primaryColorRgb.b}, ${intensity * 0.8 + 0.1})`;
                                        const textColor = intensity > 0.5 ? 'white' : '#374151';
                                        
                                        return `
                                            <td style="padding: 10px; text-align: center; border: 1px solid #dee2e6; 
                                                      background-color: ${backgroundColor}; color: ${textColor}; font-weight: bold;">
                                                ${value}%
                                            </td>
                                        `;
                                    }
                                }).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div style="margin-top: 20px; font-size: 12px; color: #6b7280;">
                    <strong>Note:</strong> Cohort Size shows initial users. Color intensity represents retention rate. Darker blue = higher retention.
                </div>
            </div>
        `;
    }

    // Placeholder methods for chart configs (these won't be called for special visualizations)
    getTableConfig(baseConfig) { return null; }
    getFunnelConfig(baseConfig) { return null; }
    getRetentionConfig(baseConfig) { return null; }

    updateRawDataDisplay() {
        let displayData;
        switch (this.currentChartType) {
            default:
                displayData = this.chartData;
        }
        document.getElementById('rawDataDisplay').textContent = JSON.stringify(displayData, null, 2);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new MultiChartManager();
});

// Export for potential module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MultiChartManager, rawBusinessData, scatterData, bubbleData };
}
