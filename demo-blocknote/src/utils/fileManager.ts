// File management utilities for saving and loading reports
export interface SavedReport {
  id: string;
  title: string;
  content: any[];
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = 'blocknote-reports';

// Get all saved reports from localStorage
export const getSavedReports = (): SavedReport[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error('Error loading saved reports:', error);
    return [];
  }
};

// Save a report to localStorage
export const saveReport = (report: Omit<SavedReport, 'id' | 'createdAt' | 'updatedAt'>): SavedReport => {
  try {
    const reports = getSavedReports();
    const now = new Date().toISOString();
    
    const newReport: SavedReport = {
      ...report,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    };
    
    reports.push(newReport);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
    
    return newReport;
  } catch (error) {
    console.error('Error saving report:', error);
    throw error;
  }
};

// Update an existing report
export const updateReport = (id: string, updates: Partial<Pick<SavedReport, 'title' | 'content'>>): SavedReport | null => {
  try {
    const reports = getSavedReports();
    const reportIndex = reports.findIndex(r => r.id === id);
    
    if (reportIndex === -1) {
      return null;
    }
    
    const updatedReport = {
      ...reports[reportIndex],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    
    reports[reportIndex] = updatedReport;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
    
    return updatedReport;
  } catch (error) {
    console.error('Error updating report:', error);
    throw error;
  }
};

// Delete a report
export const deleteReport = (id: string): boolean => {
  try {
    const reports = getSavedReports();
    const filteredReports = reports.filter(r => r.id !== id);
    
    if (filteredReports.length === reports.length) {
      return false; // Report not found
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredReports));
    return true;
  } catch (error) {
    console.error('Error deleting report:', error);
    return false;
  }
};

// Generate a unique ID
const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
};

// Get a report by ID
export const getReportById = (id: string): SavedReport | null => {
  const reports = getSavedReports();
  return reports.find(r => r.id === id) || null;
};

// Initialize with default marketing report if no reports exist
export const initializeDefaultReports = (): void => {
  const reports = getSavedReports();
  
  if (reports.length === 0) {
    // Add the marketing reporting example as the default report
    const defaultContent = getMarketingReportContent();
    saveReport({
      title: "Marketing Reporting Example",
      content: defaultContent,
    });
  }
};

// Get the default marketing report content
const getMarketingReportContent = () => [
  {
    type: "heading",
    content: "Acme X Weekly Marketing Reporting",
  },
  {
    type: "paragraph",
    content: "Week of Aug 4 – Aug 10",
  },
  {
    type: "paragraph",
    content: "",
  },
  {
    type: "paragraph",
    content: "This week, conversions were up 12% vs. last week, driven by a strong Meta Ads retargeting campaign. CAC improved by $3, but organic traffic dipped due to SEO ranking changes. For more details see commentary below.",
  },
  {
    type: "paragraph",
    content: "",
  },
  {
    type: "table",
    content: {
      type: "tableContent",
      rows: [
        {
          cells: [
            [{ type: "text", text: "Status", styles: { bold: true } }],
            [{ type: "text", text: "Metric", styles: { bold: true } }],
            [{ type: "text", text: "Trend", styles: { bold: true } }],
            [{ type: "text", text: "2025 W33", styles: { bold: true } }],
            [{ type: "text", text: "2025 W32", styles: { bold: true } }],
            [{ type: "text", text: "2024 W33", styles: { bold: true } }],
            [{ type: "text", text: "WOW", styles: { bold: true } }],
            [{ type: "text", text: "YOY", styles: { bold: true } }]
          ]
        },
        {
          cells: [
            [{ type: "text", text: "🟢", styles: {} }],
            [{ type: "text", text: "Spend", styles: {} }],
            [{ type: "text", text: "📈", styles: {} }],
            [{ type: "text", text: "$20,000", styles: {} }],
            [{ type: "text", text: "$20,110", styles: {} }],
            [{ type: "text", text: "$15,110", styles: {} }],
            [{ type: "text", text: "📉 -0.55%", styles: {} }],
            [{ type: "text", text: "📈 32.36%", styles: {} }]
          ]
        },
        {
          cells: [
            [{ type: "text", text: "🟢", styles: {} }],
            [{ type: "text", text: "Impressions", styles: {} }],
            [{ type: "text", text: "📈", styles: {} }],
            [{ type: "text", text: "100,000", styles: {} }],
            [{ type: "text", text: "98,000", styles: {} }],
            [{ type: "text", text: "78,000", styles: {} }],
            [{ type: "text", text: "📈 2.04%", styles: {} }],
            [{ type: "text", text: "📈 28.21%", styles: {} }]
          ]
        },
        {
          cells: [
            [{ type: "text", text: "🟢", styles: {} }],
            [{ type: "text", text: "Visits", styles: {} }],
            [{ type: "text", text: "📈", styles: {} }],
            [{ type: "text", text: "10,000", styles: {} }],
            [{ type: "text", text: "9,981", styles: {} }],
            [{ type: "text", text: "8,104", styles: {} }],
            [{ type: "text", text: "📈 0.19%", styles: {} }],
            [{ type: "text", text: "📈 23.40%", styles: {} }]
          ]
        },
        {
          cells: [
            [{ type: "text", text: "🟢", styles: {} }],
            [{ type: "text", text: "Conversions", styles: {} }],
            [{ type: "text", text: "📈", styles: {} }],
            [{ type: "text", text: "500", styles: {} }],
            [{ type: "text", text: "495", styles: {} }],
            [{ type: "text", text: "375", styles: {} }],
            [{ type: "text", text: "📈 1.01%", styles: {} }],
            [{ type: "text", text: "📈 33.33%", styles: {} }]
          ]
        },
        {
          cells: [
            [{ type: "text", text: "🟢", styles: {} }],
            [{ type: "text", text: "Conversion rate", styles: {} }],
            [{ type: "text", text: "📈", styles: {} }],
            [{ type: "text", text: "5.00%", styles: {} }],
            [{ type: "text", text: "4.96%", styles: {} }],
            [{ type: "text", text: "4.63%", styles: {} }],
            [{ type: "text", text: "📈 0.82%", styles: {} }],
            [{ type: "text", text: "📈 8.05%", styles: {} }]
          ]
        },
        {
          cells: [
            [{ type: "text", text: "🔴", styles: {} }],
            [{ type: "text", text: "Cost per conversion", styles: {} }],
            [{ type: "text", text: "📉", styles: {} }],
            [{ type: "text", text: "$40", styles: {} }],
            [{ type: "text", text: "$41", styles: {} }],
            [{ type: "text", text: "$40", styles: {} }],
            [{ type: "text", text: "📉 -1.54%", styles: {} }],
            [{ type: "text", text: "📉 -0.73%", styles: {} }]
          ]
        },
        {
          cells: [
            [{ type: "text", text: "🟢", styles: {} }],
            [{ type: "text", text: "Revenue", styles: {} }],
            [{ type: "text", text: "📈", styles: {} }],
            [{ type: "text", text: "$104,000", styles: {} }],
            [{ type: "text", text: "$99,500", styles: {} }],
            [{ type: "text", text: "$78,000", styles: {} }],
            [{ type: "text", text: "📈 4.52%", styles: {} }],
            [{ type: "text", text: "📈 33.33%", styles: {} }]
          ]
        },
        {
          cells: [
            [{ type: "text", text: "🔴", styles: {} }],
            [{ type: "text", text: "COGS", styles: {} }],
            [{ type: "text", text: "📈", styles: {} }],
            [{ type: "text", text: "$52,000", styles: {} }],
            [{ type: "text", text: "$49,750", styles: {} }],
            [{ type: "text", text: "$39,000", styles: {} }],
            [{ type: "text", text: "📈 4.52%", styles: {} }],
            [{ type: "text", text: "📈 33.33%", styles: {} }]
          ]
        },
        {
          cells: [
            [{ type: "text", text: "🟢", styles: {} }],
            [{ type: "text", text: "Gross Profit", styles: {} }],
            [{ type: "text", text: "📈", styles: {} }],
            [{ type: "text", text: "$32,000", styles: {} }],
            [{ type: "text", text: "$29,640", styles: {} }],
            [{ type: "text", text: "$23,890", styles: {} }],
            [{ type: "text", text: "📈 7.96%", styles: {} }],
            [{ type: "text", text: "📈 33.95%", styles: {} }]
          ]
        },
        {
          cells: [
            [{ type: "text", text: "🟢", styles: {} }],
            [{ type: "text", text: "Average Order Value", styles: {} }],
            [{ type: "text", text: "📉", styles: {} }],
            [{ type: "text", text: "$231", styles: {} }],
            [{ type: "text", text: "$231", styles: {} }],
            [{ type: "text", text: "$244", styles: {} }],
            [{ type: "text", text: "📉 -0.12%", styles: {} }],
            [{ type: "text", text: "📉 -5.19%", styles: {} }]
          ]
        }
      ]
    }
  },
  {
    type: "paragraph",
    content: "",
  },
  {
    type: "heading",
    content: "Wins and Highlights",
    props: {
      level: 2
    }
  },
  {
    type: "bulletListItem",
    content: [
      {
        type: "text",
        text: "Meta Ads retargeting achieved 5.2 ROAS (highest in 3 months)",
        styles: {}
      }
    ]
  },
  {
    type: "bulletListItem",
    content: [
      {
        type: "text",
        text: "Email A/B test increased open rates by 3%.",
        styles: {}
      }
    ]
  },
  {
    type: "bulletListItem",
    content: [
      {
        type: "text",
        text: "New product page layout improved \"Add to Cart\" by 5%.",
        styles: {}
      }
    ]
  },
  {
    type: "paragraph",
    content: "",
  },
  {
    type: "heading",
    content: "Issues and Risks",
    props: {
      level: 2
    }
  },
  {
    type: "bulletListItem",
    content: [
      {
        type: "text",
        text: "Organic search down 10% due to ranking drops on \"best [product]\" keyword.",
        styles: {}
      }
    ]
  },
  {
    type: "bulletListItem",
    content: [
      {
        type: "text",
        text: "CPCs on Google Search increased 12% — monitor spend efficiency.",
        styles: {}
      }
    ]
  },
  {
    type: "bulletListItem",
    content: [
      {
        type: "text",
        text: "Cart abandonment rate increased from 67% → 70%.",
        styles: {}
      }
    ]
  },
  {
    type: "paragraph",
    content: "",
  },
  {
    type: "heading",
    content: "Insights & Recommendations",
    props: {
      level: 2
    }
  },
  {
    type: "bulletListItem",
    content: [
      {
        type: "text",
        text: "Double down on high-performing campaigns: Increase Meta retargeting budget by 15%.",
        styles: {}
      }
    ]
  },
  {
    type: "bulletListItem",
    content: [
      {
        type: "text",
        text: "Mitigate CPC rise: Review Google Ads keyword bids & Quality Scores.",
        styles: {}
      }
    ]
  },
  {
    type: "bulletListItem",
    content: [
      {
        type: "text",
        text: "SEO recovery: Launch link-building push for affected pages.",
        styles: {}
      }
    ]
  },
  {
    type: "paragraph",
    content: "",
  },
  {
    type: "heading",
    content: "In Progress",
    props: {
      level: 2
    }
  },
  {
    type: "bulletListItem",
    content: [
      {
        type: "text",
        text: "New pricing experiment for X-large Redlight Panels is inconclusive. We expect it to run for 2 more weeks before we have insights.",
        styles: {}
      }
    ]
  },
  {
    type: "paragraph",
    content: "",
  },
  {
    type: "heading",
    content: "Data",
    props: {
      level: 2
    }
  },
  {
    type: "bulletListItem",
    content: [
      {
        type: "text",
        text: "🟢 ",
        styles: {}
      },
      {
        type: "text",
        text: "Google Ads",
        styles: { bold: true }
      },
      {
        type: "text",
        text: " - Excellent data quality and coverage. Last synced: 2 min ago.",
        styles: {}
      }
    ]
  },
  {
    type: "bulletListItem",
    content: [
      {
        type: "text",
        text: "🟢 ",
        styles: {}
      },
      {
        type: "text",
        text: "Meta Ads",
        styles: { bold: true }
      },
      {
        type: "text",
        text: " - Potential data quality issues due to iOS 14.5+. Last synced: 3 min ago.",
        styles: {}
      }
    ]
  },
  {
    type: "bulletListItem",
    content: [
      {
        type: "text",
        text: "🟢 ",
        styles: {}
      },
      {
        type: "text",
        text: "Google Analytics 4",
        styles: { bold: true }
      },
      {
        type: "text",
        text: " - Excellent tracking with server-side implementation. Last synced: 1 min ago.",
        styles: {}
      }
    ]
  },
  {
    type: "bulletListItem",
    content: [
      {
        type: "text",
        text: "🟡 ",
        styles: {}
      },
      {
        type: "text",
        text: "Shopify",
        styles: { bold: true }
      },
      {
        type: "text",
        text: " - Minor discrepancy, likely due to timezone differences. Last synced: 5 min ago.",
        styles: {}
      }
    ]
  }
];
