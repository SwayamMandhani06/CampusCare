/**
 * CSV Generation & Formatting Utility
 * Adheres strictly to RFC 4180 standard escaping.
 */

const escapeCsvField = (value) => {
  if (value === null || value === undefined) {
    return '';
  }
  const str = String(value);
  // If field contains comma, quote, or newline, escape internal double quotes and wrap in quotes
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const formatComplaintsCsv = (complaints) => {
  const headers = [
    'Ticket ID',
    'Title',
    'Category',
    'Priority',
    'Status',
    'Student Name',
    'Student Email',
    'Assigned Staff',
    'Staff Email',
    'Location',
    'Created At',
    'Updated At',
    'Resolved At',
    'Rating (1-5)',
    'Feedback Comments',
  ];

  const rows = complaints.map((c) => {
    // Find resolved date from status history or timeline if available
    const resolvedEntry = c.statusHistory?.find((h) => h.status === 'RESOLVED');
    const resolvedAt = resolvedEntry ? new Date(resolvedEntry.changedAt).toISOString() : '';

    return [
      c._id ? c._id.toString() : '',
      c.title || '',
      c.category || '',
      c.priority || '',
      c.status || '',
      c.createdBy?.name || '',
      c.createdBy?.email || '',
      c.assignedTo?.name || 'Unassigned',
      c.assignedTo?.email || '',
      c.location || '',
      c.createdAt ? new Date(c.createdAt).toISOString() : '',
      c.updatedAt ? new Date(c.updatedAt).toISOString() : '',
      resolvedAt,
      c.feedback?.rating ? String(c.feedback.rating) : '',
      c.feedback?.comment || '',
    ]
      .map(escapeCsvField)
      .join(',');
  });

  return [headers.map(escapeCsvField).join(','), ...rows].join('\r\n');
};

module.exports = {
  escapeCsvField,
  formatComplaintsCsv,
};
