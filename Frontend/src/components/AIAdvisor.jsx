import { useState } from 'react';

export default function AIAdvisor({ courses, selectedIds, onSelectCourse }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="ai-panel">
      <div className="ai-header" onClick={() => setOpen(!open)}>
        <div className="ai-header-left">
          <div className="ai-icon">&#9830;</div>
          <h3>AI Course Advisor</h3>
        </div>
        <span className={`chevron ${open ? 'open' : ''}`}>&#9660;</span>
      </div>
      {open && (
        <div className="ai-body">
          <p className="ai-description" style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-secondary)' }}>
            Coming soon
          </p>
        </div>
      )}
    </div>
  );
}
