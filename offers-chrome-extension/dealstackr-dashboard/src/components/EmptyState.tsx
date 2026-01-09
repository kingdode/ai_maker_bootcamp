/**
 * Empty State Component
 * Displays messages when no data is available or errors occur
 */

'use client';

interface EmptyStateProps {
  type: 'no-data' | 'error' | 'partial';
  message?: string;
}

export default function EmptyState({ type, message }: EmptyStateProps) {
  const getContent = () => {
    switch (type) {
      case 'no-data':
        return {
          title: 'No Offers Found',
          description: message || 'Scan your Chase or Amex offers using the Dealstackr Chrome extension to see them here.',
          icon: '📋'
        };
      case 'error':
        return {
          title: 'Error Loading Data',
          description: message || 'There was an error loading offers. Please try refreshing the page.',
          icon: '⚠️'
        };
      case 'partial':
        return {
          title: 'Partial Data Available',
          description: message || 'Some offers may be missing details depending on what was visible during scan.',
          icon: 'ℹ️'
        };
      default:
        return {
          title: 'No Data',
          description: 'No offers available.',
          icon: '📋'
        };
    }
  };

  const content = getContent();
  const isError = type === 'error';
  const isInfo = type === 'partial';

  return (
    <div className={`
      border rounded-lg p-6 text-center
      ${isError ? 'bg-red-50 border-red-200' : isInfo ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}
    `}>
      <div className="text-4xl mb-3">{content.icon}</div>
      <h3 className={`
        text-lg font-semibold mb-2
        ${isError ? 'text-red-800' : isInfo ? 'text-blue-800' : 'text-gray-800'}
      `}>
        {content.title}
      </h3>
      <p className={`
        text-sm
        ${isError ? 'text-red-700' : isInfo ? 'text-blue-700' : 'text-gray-600'}
      `}>
        {content.description}
      </p>
    </div>
  );
}

