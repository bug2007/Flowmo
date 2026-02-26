export default function TemplateVariableHelper({ currentStepOrder, tasks, onInsert }) {
  // Get all previous tasks that have completed successfully
  const availableTasks = tasks
    .filter(task => task.step_order < currentStepOrder && task.status === 'success' && task.result)
    .sort((a, b) => a.step_order - b.step_order);

  if (availableTasks.length === 0) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm">
        <p className="text-blue-800 font-medium mb-1">Template Variables</p>
        <p className="text-blue-600 text-xs">
          {currentStepOrder === 1 
            ? "This is the first step, so no previous data is available."
            : "No completed tasks yet. Execute the workflow to see available outputs."}
        </p>
      </div>
    );
  }

  // Helper function to extract all keys from an object (including nested)
  const extractKeys = (obj, prefix = '') => {
    const keys = [];
    
    if (typeof obj !== 'object' || obj === null) {
      return keys;
    }

    for (const key in obj) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      keys.push(fullKey);
      
      // If value is object, recurse (but limit depth to 2 levels to avoid clutter)
      if (typeof obj[key] === 'object' && obj[key] !== null && prefix.split('.').length < 2) {
        keys.push(...extractKeys(obj[key], fullKey));
      }
    }
    
    return keys;
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm mb-3">
      <p className="text-blue-800 font-medium mb-2">Use Output from Previous Steps</p>
      
      <div className="space-y-2">
        {availableTasks.map(task => {
          let resultObj;
          try {
            resultObj = typeof task.result === 'string' ? JSON.parse(task.result) : task.result;
          } catch (e) {
            resultObj = task.result;
          }

          const availableKeys = extractKeys(resultObj);

          return (
            <div key={task.id} className="bg-white rounded p-2 border border-blue-100">
              <p className="text-xs font-medium text-gray-700 mb-1">
                Step {task.step_order} ({task.task_name}) - Available fields:
              </p>
              {availableKeys.length === 0 ? (
                <p className="text-xs text-gray-500">No data fields available</p>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {availableKeys.slice(0, 10).map(key => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => onInsert(`{{step${task.step_order}.${key}}}`)}
                      className="text-xs px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded border border-blue-300"
                      title={`Insert {{step${task.step_order}.${key}}}`}
                    >
                      .{key}
                    </button>
                  ))}
                  {availableKeys.length > 10 && (
                    <span className="text-xs text-gray-500 px-2 py-1">
                      +{availableKeys.length - 10} more
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      <p className="text-xs text-blue-600 mt-2">
         These are the actual fields from completed tasks. Click to insert.
      </p>
    </div>
  );
}