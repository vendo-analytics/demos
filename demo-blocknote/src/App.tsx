import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";
import { ChartBlock } from "./ChartBlock";
import Sidebar from "./components/Sidebar";
import { 
  SavedReport, 
  getSavedReports, 
  saveReport, 
  updateReport, 
  deleteReport, 
  getReportById,
  initializeDefaultReports 
} from "./utils/fileManager";
import { useState, useEffect } from "react";
import "./App.css";

// Create a schema that includes the chart block
const schema = BlockNoteSchema.create({
  blockSpecs: {
    // Add default blocks
    ...defaultBlockSpecs,
    // Add the chart block to the editor
    chart: ChartBlock,
  },
});

function App() {
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [currentReportId, setCurrentReportId] = useState<string | null>(null);
  const [currentReportTitle, setCurrentReportTitle] = useState<string>("Untitled Report");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Initialize default reports on first load
  useEffect(() => {
    initializeDefaultReports();
    const reports = getSavedReports();
    setSavedReports(reports);
    
    // Load the first report (Marketing Reporting Example) by default
    if (reports.length > 0) {
      const firstReport = reports[0];
      setCurrentReportId(firstReport.id);
      setCurrentReportTitle(firstReport.title);
    }
  }, []);

  // Get initial content based on current report
  const getInitialContent = () => {
    if (currentReportId) {
      const report = getReportById(currentReportId);
      if (report) {
        return report.content;
      }
    }
    // Default empty content for new reports
    return [
      {
        type: "heading",
        content: "New Report",
      },
      {
        type: "paragraph",
        content: "Start writing your report here...",
      },
    ];
  };

  // Create a new editor instance with the chart block
  const editor = useCreateBlockNote({
    schema,
    initialContent: getInitialContent(),
  });

  // Track content changes
  useEffect(() => {
    const handleChange = () => {
      if (currentReportId) {
        setHasUnsavedChanges(true);
      }
      // Update the title in real-time based on document content
      const newTitle = getDocumentTitle();
      if (newTitle !== currentReportTitle) {
        setCurrentReportTitle(newTitle);
      }
    };

    editor.onChange(handleChange);
    return () => {
      // Cleanup if needed
    };
  }, [editor, currentReportId, currentReportTitle]);

  const insertChart = () => {
    // Insert a new chart block
    editor.insertBlocks(
      [
        {
          type: "chart",
        } as any,
      ],
      editor.document[editor.document.length - 1],
      "after"
    );
    setHasUnsavedChanges(true);
  };

  // Extract title from document content
  const getDocumentTitle = () => {
    const firstBlock = editor.document[0];
    if (firstBlock && firstBlock.type === "heading" && (firstBlock as any).content) {
      const content = (firstBlock as any).content;
      // If content is a string, return it directly
      if (typeof content === 'string') {
        return content.trim() || "Untitled Report";
      }
      // If content is an array of inline content, extract text
      if (Array.isArray(content)) {
        const text = content
          .map((item: any) => {
            if (typeof item === 'string') return item;
            if (item && typeof item === 'object' && item.text) return item.text;
            return '';
          })
          .join('')
          .trim();
        return text || "Untitled Report";
      }
    }
    return "Untitled Report";
  };

  const handleSave = () => {
    const content = editor.document;
    const title = getDocumentTitle();
    
    if (currentReportId) {
      // Update existing report
      const updatedReport = updateReport(currentReportId, { title, content });
      if (updatedReport) {
        setCurrentReportTitle(title);
        setSavedReports(getSavedReports());
        setHasUnsavedChanges(false);
      }
    } else {
      // Save new report
      const newReport = saveReport({ title, content });
      setCurrentReportId(newReport.id);
      setCurrentReportTitle(title);
      setSavedReports(getSavedReports());
      setHasUnsavedChanges(false);
    }
  };

  const handleSelectReport = (report: SavedReport) => {
    if (hasUnsavedChanges) {
      const shouldProceed = window.confirm('You have unsaved changes. Do you want to continue without saving?');
      if (!shouldProceed) return;
    }

    setCurrentReportId(report.id);
    setCurrentReportTitle(report.title);
    setHasUnsavedChanges(false);
    
    // Replace editor content
    editor.replaceBlocks(editor.document, report.content);
  };

  const handleNewReport = () => {
    if (hasUnsavedChanges) {
      const shouldProceed = window.confirm('You have unsaved changes. Do you want to continue without saving?');
      if (!shouldProceed) return;
    }

    setCurrentReportId(null);
    setCurrentReportTitle("Untitled Report");
    setHasUnsavedChanges(false);
    
    // Clear editor content
    editor.replaceBlocks(editor.document, [
      {
        type: "heading",
        content: "New Report",
      },
      {
        type: "paragraph",
        content: "Start writing your report here...",
      },
    ]);
  };

  const handleDeleteReport = (id: string) => {
    const success = deleteReport(id);
    if (success) {
      setSavedReports(getSavedReports());
      
      // If we deleted the current report, create a new one
      if (currentReportId === id) {
        handleNewReport();
      }
    }
  };


  return (
    <div className="app">
      <Sidebar
        reports={savedReports}
        currentReportId={currentReportId}
        onSelectReport={handleSelectReport}
        onNewReport={handleNewReport}
        onDeleteReport={handleDeleteReport}
      />
      
      <div className="main-content">
        <div className="header">
          <div className="header-left">
            <h1>{currentReportTitle}</h1>
            {hasUnsavedChanges && <span className="unsaved-indicator">● Unsaved changes</span>}
          </div>
          <div className="header-actions">
            <button onClick={insertChart} className="action-btn secondary">
              📊 Insert Chart
            </button>
            <button onClick={handleSave} className="action-btn primary">
              💾 Save
            </button>
          </div>
        </div>
        
        <div className="editor-container">
          <BlockNoteView editor={editor} />
        </div>
      </div>

    </div>
  );
}

export default App;
