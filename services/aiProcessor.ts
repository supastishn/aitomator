import { Dimensions } from 'react-native';
import { loadOpenAISettings } from '@/lib/openaiSettings';
import AutomatorModule from '@/lib/native';

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
    description: "Ends the current subtask. Use this when the subtask is complete.",
    parameters: {
      type: "object",
      properties: {
        success: { type: "boolean" }
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

  // Extract <subtask>...</subtask> blocks
  const subtasks: string[] = [];
  if (rawXML) {
    for (const match of rawXML.matchAll(/<subtask>(.*?)<\/subtask>/gis)) {
      subtasks.push(match[1].trim());
    }
  }
  return subtasks;
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
  const messages: any[] = [
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

  // Action agent loop
  while (true) {
    const requestBody = {
      model: settings.model,
      messages,
      tools: TOOLS,
      tool_choice: "auto",
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
    const choice = result.choices[0];
    messages.push(choice.message);

    // Handle tool calls
    if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
      for (const toolCall of choice.message.tool_calls) {
        const args = JSON.parse(toolCall.function.arguments);
        const name = toolCall.function.name;

        if (name === 'touch') {
          // Convert normalized to screen coordinates
          const x = Math.round(args.x * screenDimensions.width);
          const y = Math.round(args.y * screenDimensions.height);
          const amount = args.amount ?? 1;
          const spacing = args.spacing ?? 0;
          await AutomatorModule.performTouch(x, y, amount, spacing);
        } else if (name === 'swipe') {
          // Convert breakpoints to screen coordinates
          const breakpoints = (args.breakpoints || []).map((pt: any) => ({
            x: Math.round(pt.x * screenDimensions.width),
            y: Math.round(pt.y * screenDimensions.height)
          }));
          await AutomatorModule.performSwipe(breakpoints);
        } else if (name === 'type') {
          await AutomatorModule.typeText(args.text);
        } else if (name === 'end_subtask') {
          if (args.success) {
            return; // Subtask complete
          }
        }

        // Update screenshot after each action
        const newScreenshot = await AutomatorModule.takeScreenshot();
        updateScreenshot(newScreenshot);
        lastScreenshot = newScreenshot;

        // Notify AI of tool execution result
        messages.push({
          role: "tool",
          content: "Action executed successfully",
          tool_call_id: toolCall.id
        });
      }
    } else {
      // If no tool calls, break to avoid infinite loop
      break;
    }
  }
}

// Main Orchestration: Runs the full workflow
export async function runAutomationWorkflow(
  task: string,
  initialScreenshot: string,
  updateStatus: (status: string) => void,
  updateScreenshot: (uri: string) => void
): Promise<void> {
  updateStatus("Generating plan...");
  const subtasks = await generatePlan(task, initialScreenshot);

  for (const [index, subtask] of subtasks.entries()) {
    updateStatus(`Executing subtask ${index + 1}/${subtasks.length}: ${subtask}`);
    await executeSubtask(subtask, initialScreenshot, updateScreenshot);
  }
}
