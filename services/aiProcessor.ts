import { Dimensions } from 'react-native';
import { loadOpenAISettings } from '@/lib/openaiSettings';
import AutomatorModule from '@/lib/native';
import { XMLParser } from 'fast-xml-parser';
import * as WebBrowser from 'expo-web-browser';

 // Tool definitions for OpenAI function calling
const TOOLS = [
  {
    type: "function",
    function: {
      name: "touch",
      description: "Simulates a touch or tap at a given screen coordinate. Accepts normalized coordinates (0-1) and optional amount/spread for multi-touch.",
      parameters: {
        type: "object",
        properties: {
          x: { type: "number", description: "Normalized x coordinate (0-1)" },
          y: { type: "number", description: "Normalized y coordinate (0-1)" },
          amount: { type: "number", description: "Number of simultaneous touches", default: 1 },
          spacing: { type: "number", description: "Spacing between touches in pixels", default: 0 }
        },
        required: ["x", "y"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "swipe",
      description: "Simulates a swipe gesture through a series of normalized breakpoints.",
      parameters: {
        type: "object",
        properties: {
          breakpoints: {
            type: "array",
            items: {
              type: "object",
              properties: {
                x: { type: "number" },
                y: { type: "number" }
              },
              required: ["x", "y"]
            }
          }
        },
        required: ["breakpoints"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "type",
      description: "Types the given text using the keyboard.",
      parameters: {
        type: "object",
        properties: {
          text: { type: "string" }
        },
        required: ["text"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "end_subtask",
      description: "MUST be called when the subtask is considered complete or has failed.",
      parameters: {
        type: "object",
        properties: {
          success: { type: "boolean" },
          error: { type: "string", description: "Error message if unsuccessful" }
        },
        required: ["success"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_apps",
      description: "Searches installed apps by name returns app names and package IDs",
      parameters: {
        type: "object",
        properties: {
          query: { 
            type: "string",
            description: "Partial or full app name to search for"
          }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "open_app",
      description: "Launches an Android app using its package name. ONLY use when web browser alternative is unavailable! Prefer browser option when possible.",
      parameters: {
        type: "object",
        properties: {
          packageName: {
            type: "string",
            description: "App's package name from search_apps results"
          }
        },
        required: ["packageName"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "open_link",
      description: "Opens web URL as fallback when native app isn't available. First choice for app interactions! Prefer this over native apps.",
      parameters: {
        type: "object",
        properties: {
          url: { 
            type: "string",
            description: "Web URL to open (include protocol)"
          }
        },
        required: ["url"]
      }
    }
  },
];

const TOOL_DATA = TOOLS.map(tool => 
  `${tool.function.name}: ${tool.function.description}`
).join('\n');

// Planner Agent: Generates subtasks from a high-level task and screenshot
async function generatePlan(task: string, screenshot: string): Promise<string[]> {
  const settings = await loadOpenAISettings();
  
  const requestBody = {
    model: settings.model,
    messages: [{
      role: "user",
      content: [
        {
          type: "text",
          text: `You are a task planner for an automation assistant. Break down the user's task into 3-7 atomic subtasks.

AVAILABLE TOOLS:
${TOOL_DATA}

EXAMPLE for "Open settings and turn on Bluetooth":
<task>
  <subtask>Open Settings app</subtask>
  <subtask>Navigate to Bluetooth settings</subtask>
  <subtask>Activate Bluetooth toggle</subtask>
</task>

EXAMPLE for "Open Facebook app":
<task>
  <subtask>Search installed apps for "Facebook"</subtask>
  <subtask>Open Facebook using package name</subtask>
</task>

GOLDEN RULES:
1. ALWAYS prefer browser version over native apps
2. ONLY use native apps when browser alternative is unavailable or clearly inferior
3. Custom system apps (settings, files) can use native
4. Mainstream services (YouTube, Facebook, etc) must use browser version unless impossible

RULES:
1. ONLY return XML with NO additional text
2. Use exact tags: <task> and <subtask>
3. Each subtask must describe one action in 3-7 words
4. Subtasks must be achievable using available actions
5. Consider current screen for initial actions
6. If an app cannot be found through search_apps, use open_link with the appropriate URL instead

TASK: "${task}"`
        },
        {
          type: "image_url",
          image_url: {
            url: screenshot,
            detail: "high" // Use high quality for planning tasks
          }
        }
      ]
    }]
  };

  // Removed request logging here

  let responseText: string | undefined;
  try {
    // CHANGED: Removed /v1 from URL
    const response = await fetch(`${settings.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      responseText = await response.text();
      throw new Error(`API error ${response.status}: ${responseText}`);
    }

    responseText = await response.text();
    console.log('OpenAI API raw response text:', responseText);  // Add this before parsing
    const result = JSON.parse(responseText);
    console.log('OpenAI API response:', result);

    const rawXML = result.choices[0].message.content;

    try {
      const parser = new XMLParser({ ignoreAttributes: true });
      const parsed = parser.parse(rawXML);

      if (parsed?.task?.subtask) {
        const subtaskElements = Array.isArray(parsed.task.subtask)
          ? parsed.task.subtask
          : [parsed.task.subtask];
        return subtaskElements.map((s: any) => s.toString().trim());
      }
      return [];
    } catch (err) {
      console.error('XML parsing failed, using fallback regex method', err);
      // Fallback to regex parsing
      return rawXML.match(/<subtask>(.*?)<\/subtask>/gis)?.map(match =>
        match.replace(/<\/?subtask>/g, '').trim()
      ) || [];
    }
  } catch (err) {
    console.error('generatePlan error:', err);
    if (responseText) {
      console.error('OpenAI API raw error response:', responseText);
    }
    throw err;
  }
}

const MAX_EXECUTION_ATTEMPTS = 5;
const MAX_TOOL_CALLS_PER_STEP = 10;

/**
 * Recursively redacts any image_url.url fields in an object.
 */
function redactImageUrl(obj: any) {
  if (!obj || typeof obj !== 'object') return;
  
  for (const key in obj) {
    if (key === 'image_url' && obj[key]?.url) {
      obj[key].url = '[REDACTED]';
    } else if (Array.isArray(obj[key])) {
      obj[key].forEach(redactImageUrl);
    } else if (typeof obj[key] === 'object') {
      redactImageUrl(obj[key]);
    }
  }
}

/**
 * Creates a deep clone of the request body and redacts image URLs for safe logging.
 */
function createSafeLogBody(requestBody: any) {
  const clone = JSON.parse(JSON.stringify(requestBody));
  redactImageUrl(clone);
  return clone;
}

// Action Agent: Executes a subtask using tool calls and updates screenshot
async function executeSubtask(
  subtask: string,
  screenshot: string,
  updateScreenshot: (uri: string) => void
): Promise<void> {
  const settings = await loadOpenAISettings();
  const screenDimensions = Dimensions.get('window');

  // Conversation history for the action agent
  let messages: any[] = [
    {
      role: "system",
      content: `You are an expert AI automation assistant. Use the available tools to complete the user's subtask. Always use function calls for actions.`
    },
    {
      role: "user",
      content: [
        {
          type: "text",
          text: subtask
        },
        {
          type: "image_url",
          image_url: {
            url: screenshot,
            detail: "high" // Changed from "auto" to "high"
          }
        }
      ]
    }
  ];

  let lastScreenshot = screenshot;
  let executionAttempt = 0;
  let lastError: Error | null = null;

  while (executionAttempt < MAX_EXECUTION_ATTEMPTS) {
    executionAttempt++;
    let actionsInLoop = 0;
    let stepHadError = false;

    while (actionsInLoop < MAX_TOOL_CALLS_PER_STEP) {
      actionsInLoop++;

      const requestBody = {
        model: settings.model,
        messages,
        tools: TOOLS,
        tool_choice: "auto",
      };

      // Removed request logging here

      let result, choice;
      let responseText: string | undefined;
      try {
        // CHANGED: Removed /v1 from URL
        const response = await fetch(`${settings.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${settings.apiKey}`,
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          responseText = await response.text();
          console.error('Action request raw error response:', responseText);
          throw new Error(`API error ${response.status}: ${responseText}`);
        }

        responseText = await response.text();
        console.log('Action request raw response text:', responseText);  // Add this before parsing
        result = JSON.parse(responseText);
        choice = result.choices[0];
        messages.push(choice.message);

        // Add tool call response logging here
        if (choice.message.tool_calls) {
          console.log(
            'Tool call response:',
            choice.message.tool_calls.map((tc: any) => ({
              name: tc.function.name,
              arguments: (() => {
                try {
                  return JSON.parse(tc.function.arguments);
                } catch {
                  return tc.function.arguments;
                }
              })()
            }))
          );
        }
      } catch (err: any) {
        lastError = err;
        if (responseText) {
          console.error('Action request raw error response:', responseText);
        }
        break;
      }

      // Handle tool calls
      if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
        for (const toolCall of choice.message.tool_calls) {
          try {
            const args = JSON.parse(toolCall.function.arguments);
            const name = toolCall.function.name;

            // Log tool call execution with arguments
            console.log(
              `Executing tool: ${name}(${JSON.stringify(args)})`
            );

            if (name === 'touch') {
              // Validate required parameters with type checking
              if (typeof args.x !== 'number' || typeof args.y !== 'number') {
                throw new Error('x and y coordinates must be numbers');
              }
              // Handle optional parameters with default values
              const amount = (typeof args.amount === 'number') ? args.amount : 1;
              const spacing = (typeof args.spacing === 'number') ? args.spacing : 0;
              await AutomatorModule.performTouch(args.x, args.y, amount, spacing);
              const resultText = "Touch performed successfully";
              // LOG TOOL CALL RESULT
              console.log(`Tool call ${toolCall.id} result:`, resultText);
              messages.push({
                role: "tool",
                content: resultText,
                tool_call_id: toolCall.id
              });
            } else if (name === 'swipe') {
              await AutomatorModule.performSwipe(
                args.breakpoints.map((pt: any) => ({
                  x: pt.x,
                  y: pt.y
                }))
              );
              const resultText = "Swipe performed successfully";
              // LOG TOOL CALL RESULT
              console.log(`Tool call ${toolCall.id} result:`, resultText);
              messages.push({
                role: "tool",
                content: resultText,
                tool_call_id: toolCall.id
              });
            } else if (name === 'type') {
              await AutomatorModule.typeText(args.text);
              const resultText = "Text typed successfully";
              // LOG TOOL CALL RESULT
              console.log(`Tool call ${toolCall.id} result:`, resultText);
              messages.push({
                role: "tool",
                content: resultText,
                tool_call_id: toolCall.id
              });
            } else if (name === 'search_apps') {
              const results = await AutomatorModule.searchApps(args.query);
              const resultText = results
                .map(app => `${app.appName}: ${app.packageName}`)
                .join('\n');
              // LOG TOOL CALL RESULT
              console.log(`Tool call ${toolCall.id} result:`, resultText || "No apps found");
              // Send results back to AI
              messages.push({
                role: "tool",
                content: resultText || "No apps found",
                tool_call_id: toolCall.id
              });
            } else if (name === 'open_app') {
              try {
                await AutomatorModule.openApp(args.packageName);
                // Update screenshot after app opens
                const newScreenshot = await AutomatorModule.takeScreenshot();
                updateScreenshot(newScreenshot);
                lastScreenshot = newScreenshot;
        
                messages.push({
                  role: "tool",
                  content: `Opened app successfully`,
                  tool_call_id: toolCall.id
                });
              } catch (err: any) {
                if (err.code === 'APP_NOT_FOUND') {
                  // Suggest web alternative to LLM instead of automatic fallback
                  messages.push({
                    role: "tool",
                    content: `App '${err.cause || args.packageName}' not installed. Suggest another method using browser for this app.`,
                    tool_call_id: toolCall.id
                  });
                } else {
                  throw err;
                }
              }
            } else if (name === 'end_subtask') {
              if (args.success) {
                const resultText = "Subtask ended successfully";
                // LOG TOOL CALL RESULT
                console.log(`Tool call ${toolCall.id} result:`, resultText);
                return;
              }
              if (!args.success && args.error) {
                const resultText = `Subtask failed: ${args.error}`;
                // LOG TOOL CALL RESULT
                console.log(`Tool call ${toolCall.id} result:`, resultText);
                throw new Error(args.error);
              }
            } else if (name === 'open_link') {
              if (typeof args.url !== 'string') {
                throw new Error('URL must be a string');
              }
              await WebBrowser.openBrowserAsync(args.url);
              const resultText = "URL opened successfully";
              // LOG TOOL CALL RESULT
              console.log(`Tool call ${toolCall.id} result:`, resultText);
              messages.push({
                role: "tool",
                content: resultText,
                tool_call_id: toolCall.id
              });
            } else {
              // Update screenshot after each action
              const newScreenshot = await AutomatorModule.takeScreenshot();
              updateScreenshot(newScreenshot);
              lastScreenshot = newScreenshot;

              // Notify AI of action execution
              const resultText = "Action executed successfully";
              // LOG TOOL CALL RESULT
              console.log(`Tool call ${toolCall.id} result:`, resultText);
              messages.push({
                role: "tool",
                content: resultText,
                tool_call_id: toolCall.id
              });
            }
          } catch (toolError: any) {
            const errorMessage = `Execution failed: ${toolError.message}`;
            // LOG ERROR RESULT
            console.warn(`Tool call ${toolCall.id} error:`, errorMessage);
            messages.push({
              role: "system",
              content: errorMessage
            });
            messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: errorMessage
            });
            lastError = toolError;
            stepHadError = true;
            break;
          }
        }
        if (stepHadError) break; // Break on first error in this step
      } else {
        // If no tool calls, break to avoid infinite loop
        break;
      }
    }

    if (!lastError) return; // Success if no errors

    // Add error context to retry
    messages.unshift({
      role: "system",
      content: `Previous attempt failed (${executionAttempt}/${MAX_EXECUTION_ATTEMPTS}). Fix and retry:\n${lastError?.message}`
    });
    lastError = null; // Reset for next attempt
  }

  throw new Error(`Subtask failed after ${MAX_EXECUTION_ATTEMPTS} attempts: ${lastError?.message || subtask}`);
}

// Main Orchestration: Runs the full workflow
export async function runAutomationWorkflow(
  task: string,
  initialScreenshot: string,
  updateStatus: (status: string) => void,
  updateScreenshot: (uri: string) => void
): Promise<void> {
  let currentScreenshot = initialScreenshot;
  try {
    updateStatus("Generating plan...");
    const subtasks = await generatePlan(task, currentScreenshot);

    for (const [index, subtask] of subtasks.entries()) {
      updateStatus(`Executing subtask ${index + 1}/${subtasks.length}: ${subtask}`);
      await executeSubtask(subtask, currentScreenshot, (newScreenshot) => {
        updateScreenshot(newScreenshot);
        currentScreenshot = newScreenshot;
      });
    }
  } catch (err: any) {
    updateStatus(`Automation failed: ${err.message}`);
    throw err;
  }
}
