// Parses templates like {{step1.result.data}} and replaces with actual values

//example: Task 1-HTTP. Response saved in DB: {"success": true, "result": { "data": { "login": "octocat", "id": 583231, "email": "octo@github.com" } }
// Task 2- Data processing. wanna extract username and ID and pass them forward so config is like: { "username": "{{step1.result.data.login}}", "userId": "{{step1.result.data.id}}" }
// but for node.js, it literally sees {{step1.result.data.login}} as just a string.
// so templateParser translates: "{{step1.result.data.login}}" → "octocat"
// this does not automatically pass results. only replaces placeholders when task is about to run.
// Task 1 → produces variables
// Task 2 → reads variables from Task 1
// Task 3 → reads variables from Task 1 & 2
// example: step 1 result ---> { "temp": 32 }. step 2 config ---> { "message": "Temp is {{step1.result.temp}}" }. step 2 receives --> { "message": "Temp is 32" }

class TemplateParser {
  
  // Replace template variables in config with actual values from previous tasks
  parseConfig(config, previousTasksResults) {   // config of current task e.g { url: "https://api.weather.com/{{step1.result.city}}", message: "Temp is {{step1.result.temp}}" }. previousTasksResults of all earlier steps, indexed by step no. e.g { 1: { result: { city: "London", temp: 18 } }, 2: { result: { processed: true } } }

    // Handle the config recursively to preserve data types
    return this.parseValue(config, previousTasksResults);
  }

  //  recursive method to handle all data types
  parseValue(value, previousTasksResults) {
    if (typeof value === 'string') {
      // Check if entire string is a single template variable
      const singleTemplateMatch = value.match(/^{{([^}]+)}}$/);
      if (singleTemplateMatch) {
        // Return the actual value (preserves arrays/objects)
        const variable = singleTemplateMatch[1].trim();
        const resolvedValue = this.resolveVariable(variable, previousTasksResults);
        return resolvedValue !== undefined ? resolvedValue : value;
      }
      
      // Otherwise, replace templates within string
      const templateRegex = /\{\{([^}]+)\}\}/g;
      return value.replace(templateRegex, (match, variable) => {
        const val = this.resolveVariable(variable.trim(), previousTasksResults);
        return val !== undefined ? String(val) : match;
      });
    } else if (Array.isArray(value)) {
        return value.map(item => this.parseValue(item, previousTasksResults));
    } else if (value && typeof value === 'object') {
        const parsed = {};
        for (const key in value) {
          parsed[key] = this.parseValue(value[key], previousTasksResults);
      }
      return parsed;
    }
    
    return value;
  }
  
  // Resolve a variable path like "step1.result.data.temp"
  resolveVariable(path, previousTasksResults) {
    const parts = path.split('.');   // e.g "step1.result.temp" ---> ["step1", "result", "temp"]
    
    // First part should be like "step1", "step2", etc.
    const stepMatch = parts[0].match(/step(\d+)/);   // e.g stepMatch = [ "step1", "1"]
    if (!stepMatch) {
      console.warn(`Invalid variable path: ${path}`);
      return undefined;
    }
    
    const stepOrder = parseInt(stepMatch[1]);   // e.g stepOrder = 1. taskResult = { result: { temp: 18 } }
    const taskResult = previousTasksResults[stepOrder];
    
    if (!taskResult) {
      console.warn(`No result found for step ${stepOrder}`);
      return undefined;
    }
    
    // Navigate through the object path
    let value = taskResult;
    for (let i = 1; i < parts.length; i++) {
      if (value && typeof value === 'object') {
        value = value[parts[i]];                       // taskResult --> taskResult.result --> taskResult.result.temp --> 18
      } else {
        return undefined;
      }
    }
    
    return value;
  }
  
  // Get available variables for a given step (for UI hints)
  getAvailableVariables(stepOrder) {  // e.g user is configuring step 3.
    const variables = [];
    
    for (let i = 1; i < stepOrder; i++) {
      variables.push({
        step: i,
        examples: [
          `{{step${i}.result}}`,
          `{{step${i}.result.data}}`,
          `{{step${i}.result.status}}`
        ]
      });
    }
    
    return variables;         // [ { step: 1, examples: [ "{{step1.result}}", "{{step1.result.data}}", "{{step1.result.status}}" ] }, { step: 2, examples: [ "{{step2.result}}", "{{step2.result.data}}", "{{step2.result.status}}" ] } ]

  }
}

module.exports = new TemplateParser();

