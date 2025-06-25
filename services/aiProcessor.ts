import { Dimensions } from 'react-native';
import { loadOpenAISettings } from '@/lib/openaiSettings';
import AutomatorModule from '@/lib/native';
import { XMLParser } from 'fast-xml-parser';

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
  }
];

// Simplified tool names for planner
const TOOL_NAMES = TOOLS.map(tool => tool.function.name);

// Planner Agent: Generates subtasks from a high-level task and screenshot
async function generatePlan(task: string, screenshot: string): Promise<string[]> {
  const settings = await loadOpenAISettings();
  
  const requestBody = {
    model: settings.model,
    messages: [{
      role: "user",
      content: `You are a task planner for an automation assistant. Break down the user's task into 3-7 atomic subtasks.

Available Actions: ${TOOL_NAMES.join(', ')}

EXAMPLE for "Open settings and turn on Bluetooth":
<task>
  <subtask>Open Settings app</subtask>
  <subtask>Navigate to Bluetooth settings</subtask>
  <subtask>Activate Bluetooth toggle</subtask>
</task>

RULES:
1. ONLY return XML with NO additional text
2. Use exact tags: <task> and <subtask>
3. Each subtask must describe one action in 3-7 words
4. Subtasks must be achievable using available actions
5. Consider current screen for initial actions

TASK: "${task}"`
    }]
  };

  console.log('Sending request to OpenAI:', JSON.stringify(requestBody, null, 2));

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
            url: `data:image/jpeg;base64,${screenshot}`, // Changed to JPEG
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

      console.log(
        'Sending action request to OpenAI:', 
        JSON.stringify(createSafeLogBody(requestBody), null, 2)
      );

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

            if (name === 'touch') {
              // Validate required parameters with type checking
              if (typeof args.x !== 'number' || typeof args.y !== 'number') {
                throw new Error('x and y coordinates must be numbers');
              }
              // Handle optional parameters with default values
              const amount = (typeof args.amount === 'number') ? args.amount : 1;
              const spacing = (typeof args.spacing === 'number') ? args.spacing : 0;
              await AutomatorModule.performTouch(args.x, args.y, amount, spacing);
            } else if (name === 'swipe') {
              await AutomatorModule.performSwipe(
                args.breakpoints.map((pt: any) => ({
                  x: pt.x,
                  y: pt.y
                }))
              );
            } else if (name === 'type') {
              await AutomatorModule.typeText(args.text);
            } else if (name === 'end_subtask') {
              if (args.success) return;
              if (!args.success && args.error) {
                throw new Error(args.error);
              }
            }

            // Update screenshot after each action
            const newScreenshot = await AutomatorModule.takeScreenshot();
            updateScreenshot(newScreenshot);
            lastScreenshot = newScreenshot;

            // Notify AI of action execution
            messages.push({
              role: "tool",
              content: "Action executed successfully",
              tool_call_id: toolCall.id
            });
          } catch (toolError: any) {
            messages.push({
              role: "system",
              content: `Execution failed: ${toolError.message}`
            });
            messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: `Error: ${toolError.message}`
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
