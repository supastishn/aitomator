import { Dimensions } from 'react-native';
import { loadOpenAISettings } from '@/lib/openaiSettings';
import AutomatorModule from '@/lib/native';
import { parseString } from 'xml2js';

// Tool definitions for OpenAI function calling
const TOOLS = [
  {
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
  },
  {
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
  },
  {
    name: "type",
    description: "Types the given text using the keyboard.",
    parameters: {
      type: "object",
      properties: {
        text: { type: "string" }
      },
      required: ["text"]
    }
  },
  {
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
];

// Planner Agent: Generates subtasks from a high-level task and screenshot
async function generatePlan(task: string, screenshot: string): Promise<string[]> {
  const settings = await loadOpenAISettings();
  const requestBody = {
    model: settings.model,
    messages: [{
      role: "user",
      content: [
        { type: "text", text: `Given the following user automation task, break it down into a sequence of subtasks in XML format. Each <subtask> should be a single actionable step. Only return the XML.\n\nTask: ${task}` },
        { type: "image_url", image_url: { url: screenshot } }
      ]
    }]
  };

  const response = await fetch(`${settings.baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${settings.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  const result = await response.json();
  const rawXML = result.choices[0].message.content;

  try {
    // Parse XML using xml2js
    const subtasks: string[] = [];
    await new Promise<void>((resolve, reject) => {
      parseString(rawXML, { explicitArray: false }, (err, parsed) => {
        if (err) return reject(new Error(`XML Parse Error: ${err.message}`));
        if (parsed?.task?.subtask) {
          const subtaskElements = Array.isArray(parsed.task.subtask)
            ? parsed.task.subtask
            : [parsed.task.subtask];
          subtaskElements.forEach((s: any) => {
            if (typeof s === 'string') {
              subtasks.push(s.trim());
            } else if (s?._) {
              subtasks.push(s._.trim());
            }
          });
        }
        resolve();
      });
    });
    if (subtasks.length > 0) return subtasks;
    // If xml2js parsing yields nothing, fallback to regex
    throw new Error('No subtasks found in parsed XML');
  } catch (err) {
    console.error('XML parsing failed, using fallback regex method', err);
    // Fallback to regex parsing
    return rawXML.match(/<subtask>(.*?)<\/subtask>/gis)?.map(match =>
      match.replace(/<\/?subtask>/g, '').trim()
    ) || [];
  }
}

const MAX_EXECUTION_ATTEMPTS = 5;
const MAX_TOOL_CALLS_PER_STEP = 10;

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
        { type: "image_url", image_url: { url: screenshot } },
        { type: "text", text: subtask }
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

      let result, choice;
      try {
        const response = await fetch(`${settings.baseUrl}/v1/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${settings.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        result = await response.json();
        choice = result.choices[0];
        messages.push(choice.message);
      } catch (err: any) {
        lastError = err;
        break;
      }

      // Handle tool calls
      if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
        for (const toolCall of choice.message.tool_calls) {
          try {
            const args = JSON.parse(toolCall.function.arguments);
            const name = toolCall.function.name;

            // JUST PASS NORMALIZED COORDINATES TO NATIVE MODULE - NO CONVERSION
            if (name === 'touch') {
              await AutomatorModule.performTouch(
                args.x,
                args.y,
                args.amount,
                args.spacing
              );
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
