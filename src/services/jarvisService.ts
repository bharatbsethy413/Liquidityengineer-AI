/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface JarvisAction {
  type: 'NAVIGATE' | 'FETCH_STOCK' | 'SET_ALERT' | 'CHANGE_CHART';
  payload: any;
  message: string;
}

/**
 * processCommand
 * Intercepts voice/text command and converts into actionable JSON via server-side AI
 */
export async function processJarvisCommand(command: string): Promise<JarvisAction | null> {
  try {
    const response = await fetch('/api/jarvis/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command })
    });

    if (!response.ok) {
      throw new Error('Jarvis server response was not ok');
    }

    const { functionCalls, message } = await response.json();

    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[functionCalls.length - 1]; // Use the last one if multiples
      
      switch (call.name) {
        case 'navigate':
          return { type: 'NAVIGATE', payload: call.args, message };
        case 'fetchStock':
          return { type: 'FETCH_STOCK', payload: call.args, message };
        case 'setPriceAlert':
          return { type: 'SET_ALERT', payload: call.args, message };
        default:
          return { type: 'NAVIGATE', payload: { screen: 'dashboard' }, message: "I'm not sure how to do that, sir." };
      }
    }

    return { type: 'NAVIGATE', payload: null, message }; // Just a message/fallback
  } catch (error) {
    console.error("Jarvis Error:", error);
    return null;
  }
}
