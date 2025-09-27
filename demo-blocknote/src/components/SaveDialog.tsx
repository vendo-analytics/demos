import React, { useState, useEffect } from 'react';
import './SaveDialog.css';

interface SaveDialogProps {
  isOpen: boolean;
  initialTitle?: string;
  onSave: (title: string) => void;
  onCancel: () => void;
}

const SaveDialog: React.FC<SaveDialogProps> = ({
  isOpen,
  initialTitle = '',
  onSave,
  onCancel,
}) => {
  const [title, setTitle] = useState(initialTitle);

  useEffect(() => {
    setTitle(initialTitle);
  }, [initialTitle, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onSave(title.trim());
      setTitle('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="save-dialog-overlay" onClick={onCancel}>
      <div className="save-dialog" onClick={(e) => e.stopPropagation()} onKeyDown={handleKeyDown}>
        <div className="save-dialog-header">
          <h3>Save Report</h3>
          <button className="close-btn" onClick={onCancel}>×</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="report-title">Report Title</label>
            <input
              id="report-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter report title..."
              autoFocus
              maxLength={100}
            />
          </div>
          
          <div className="save-dialog-actions">
            <button type="button" onClick={onCancel} className="cancel-btn">
              Cancel
            </button>
            <button type="submit" disabled={!title.trim()} className="save-btn">
              Save Report
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SaveDialog;
