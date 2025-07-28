export const formatDate = (dateStr) => {
  // Get saved date format from localStorage
  const dateFormat = localStorage.getItem('dateFormat') || 'DD MMM YYYY';
  
  // Convert dateStr to Date object
  let date;
  if (dateStr && typeof dateStr === 'object' && dateStr.seconds) {
    // Handle Firestore Timestamp objects
    date = new Date(dateStr.seconds * 1000);
  } else {
    // Handle regular date strings
    date = new Date(dateStr);
  }
  
  // Format based on selected format
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const monthShort = date.toLocaleDateString('en-US', { month: 'short' });
  
  switch (dateFormat) {
    case 'DD MMM YYYY':
      return `${day} ${monthShort} ${year}`;
    case 'MM/DD/YYYY':
      return `${month}/${day}/${year}`;
    case 'DD/MM/YYYY':
      return `${day}/${month}/${year}`;
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    case 'MMM DD, YYYY':
      return `${monthShort} ${day}, ${year}`;
    case 'DD.MM.YYYY':
      return `${day}.${month}.${year}`;
    default:
      return `${day} ${monthShort} ${year}`;
  }
};

export const getEffortColor = (effort) => {
  switch(effort) {
    case 'Hard': return 'bg-red-100 text-red-800';
    case 'Moderate': return 'bg-yellow-100 text-yellow-800';
    case 'Easy': return 'bg-green-100 text-green-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export const getTypeColor = (type) => {
  switch(type) {
    case 'Run': return 'bg-blue-50 text-blue-700';
    case 'TrailRun': return 'bg-green-50 text-green-700';
    case 'Race': return 'bg-purple-50 text-purple-700';
    default: return 'bg-gray-50 text-gray-700';
  }
};