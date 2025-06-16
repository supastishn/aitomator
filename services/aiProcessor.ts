import { Dimensions } from 'react-native';
import { loadOpenAISettings } from '@/lib/openaiSettings';

export async function processScreenshot(screenshotUri: string): Promise<{x: number, y: number}[]> {
  try {
    // Load OpenAI settings
    const settings = await loadOpenAISettings();
    
    if (!settings.apiKey) {
      throw new Error('OpenAI API key not configured. Please check your settings.');
    }

    // Convert data URI to base64 if needed
    let base64Image = screenshotUri;
    if (screenshotUri.startsWith('data:image')) {
      base64Image = screenshotUri.split(',')[1];
    }

    // Prepare the OpenAI Vision API request
    const requestBody = {
      model: settings.model,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this screenshot and identify interactive elements that could be automated. Return a JSON array of touch coordinates in the format:
              [{"x": 0.5, "y": 0.3}, {"x": 0.2, "y": 0.7}]
              
              Where x and y are normalized coordinates (0-1) representing the position on the screen.
              Focus on buttons, links, input fields, and other clickable elements.
              Return only the JSON array, no additional text.`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/png;base64,${base64Image}`,
                detail: "high"
              }
            }
          ]
        }
      ],
      max_tokens: 1000,
      temperature: 0.1
    };

    // Make the API request
    const response = await fetch(`${settings.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${settings.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
    }

    const result = await response.json();
    
    // Extract the response content
    const content = result.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('No response content from OpenAI API');
    }

    // Parse the JSON response
    let coordinates;
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        coordinates = JSON.parse(jsonMatch[0]);
      } else {
        coordinates = JSON.parse(content);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Invalid response format from AI');
    }

    // Validate and transform coordinates
    if (!Array.isArray(coordinates)) {
      throw new Error('AI response is not an array of coordinates');
    }

    const screenDimensions = Dimensions.get('window');
    
    return coordinates.map((coord: any, index: number) => {
      if (typeof coord.x !== 'number' || typeof coord.y !== 'number') {
        console.warn(`Invalid coordinate at index ${index}:`, coord);
        return null;
      }
      
      // Convert normalized coordinates (0-1) to screen pixels
      const screenX = Math.round(coord.x * screenDimensions.width);
      const screenY = Math.round(coord.y * screenDimensions.height);
      
      // Ensure coordinates are within screen bounds
      const clampedX = Math.max(0, Math.min(screenX, screenDimensions.width));
      const clampedY = Math.max(0, Math.min(screenY, screenDimensions.height));
      
      console.log(`Transformed coordinate ${index}: (${coord.x}, ${coord.y}) -> (${clampedX}, ${clampedY})`);
      
      return {
        x: clampedX,
        y: clampedY
      };
    }).filter(coord => coord !== null);

  } catch (error) {
    console.error('AI processing error:', error);
    throw error;
  }
}