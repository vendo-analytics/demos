import React, { useState } from 'react';
import { SavedReport, deleteReport } from '../utils/fileManager';
import './Sidebar.css';

interface SidebarProps {
  reports: SavedReport[];
  currentReportId: string | null;
  onSelectReport: (report: SavedReport) => void;
  onNewReport: () => void;
  onDeleteReport: (id: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  reports,
  currentReportId,
  onSelectReport,
  onNewReport,
  onDeleteReport,
}) => {
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    if (deleteConfirm === id) {
      onDeleteReport(id);
      setDeleteConfirm(null);
    } else {
      setDeleteConfirm(id);
      // Auto-cancel delete confirmation after 3 seconds
      setTimeout(() => setDeleteConfirm(null), 3000);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>📊 Reports</h2>
        <button className="new-report-btn" onClick={onNewReport}>
          <span>+</span> New Report
        </button>
      </div>
      
      <div className="sidebar-content">
        {reports.length === 0 ? (
          <div className="empty-state">
            <p>No reports yet</p>
            <p className="empty-subtitle">Create your first report</p>
          </div>
        ) : (
          <div className="reports-list">
            {reports.map((report) => (
              <div
                key={report.id}
                className={`report-item ${currentReportId === report.id ? 'active' : ''}`}
                onClick={() => onSelectReport(report)}
              >
                <div className="report-info">
                  <div className="report-title">{report.title}</div>
                  <div className="report-meta">
                    Updated {formatDate(report.updatedAt)}
                  </div>
                </div>
                <div className="report-actions">
                  <button
                    className={`delete-btn ${deleteConfirm === report.id ? 'confirm' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(report.id);
                    }}
                    title={deleteConfirm === report.id ? 'Click again to confirm' : 'Delete report'}
                  >
                    {deleteConfirm === report.id ? '✓' : '🗑️'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="sidebar-footer">
        <div className="storage-info">
          <small>{reports.length} report{reports.length !== 1 ? 's' : ''} saved locally</small>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
