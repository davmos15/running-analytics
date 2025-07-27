export const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleDateString('en-AU', { 
    day: 'numeric', 
    month: 'short',
    year: 'numeric'
  });
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