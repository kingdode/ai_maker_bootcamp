import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const CATEGORIES = ["groceries", "crypto", "workouts", "general"];

/**
 * Generate a note using AI based on user input
 */
export async function generateNote(
  prompt: string,
  availableFolders: string[] = []
): Promise<{
  title: string;
  content: string;
  category: string | null;
  isAppointment: boolean;
  appointmentDate: Date | null;
  suggestedFolder: string | null;
}> {
  try {
    const foldersList = availableFolders.length > 0 
      ? `Available folders: ${availableFolders.join(", ")}`
      : "No folders exist yet";

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a helpful assistant that creates notes. When generating notes:
1. Create a concise, descriptive title
2. Generate relevant content based on the user's request
3. Determine if the note is an appointment (contains date/time for meetings, events, etc.)
4. If it's an appointment, extract the date and time in ISO 8601 format
5. Categorize the note into one of these categories: ${CATEGORIES.join(", ")}. Use "general" if none fit.
6. Suggest which folder this note should belong to. ${foldersList}. If one of the available folders matches, use that exact name. Otherwise, suggest an appropriate folder name (like "Fitness", "Work", "Personal", etc.) or null if no folder is appropriate.

Return a JSON object with this structure:
{
  "title": "string",
  "content": "string",
  "category": "groceries|crypto|workouts|general",
  "isAppointment": boolean,
  "appointmentDate": "ISO 8601 date string or null",
  "suggestedFolder": "folder name or null"
}`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");

    return {
      title: result.title || "Untitled Note",
      content: result.content || "",
      category: result.category || "general",
      isAppointment: result.isAppointment || false,
      appointmentDate: result.appointmentDate
        ? new Date(result.appointmentDate)
        : null,
      suggestedFolder: result.suggestedFolder || null,
    };
  } catch (error) {
    console.error("Error generating note:", error);
    throw new Error("Failed to generate note with AI");
  }
}

/**
 * Categorize a note and extract appointment information
 */
export async function categorizeNote(
  title: string,
  content: string | null
): Promise<{
  category: string | null;
  isAppointment: boolean;
  appointmentDate: Date | null;
}> {
  try {
    const text = `${title} ${content || ""}`.trim();

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Analyze the following note and:
1. Determine if it's an appointment (contains date/time for meetings, events, appointments, etc.)
2. If it's an appointment, extract the date and time in ISO 8601 format
3. Categorize it into one of these categories: ${CATEGORIES.join(", ")}. Use "general" if none fit.

Return a JSON object:
{
  "category": "groceries|crypto|workouts|general",
  "isAppointment": boolean,
  "appointmentDate": "ISO 8601 date string or null"
}`,
        },
        {
          role: "user",
          content: text,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");

    return {
      category: result.category || "general",
      isAppointment: result.isAppointment || false,
      appointmentDate: result.appointmentDate
        ? new Date(result.appointmentDate)
        : null,
    };
  } catch (error) {
    console.error("Error categorizing note:", error);
    // Return defaults if categorization fails
    return {
      category: "general",
      isAppointment: false,
      appointmentDate: null,
    };
  }
}

/**
 * Suggest which folder a note should belong to based on its content
 * Returns the suggested folder name (not ID) - caller should match to existing folders
 */
export async function suggestFolder(
  title: string,
  content: string | null,
  availableFolders: string[]
): Promise<string | null> {
  try {
    const text = `${title} ${content || ""}`.trim();
    const foldersList = availableFolders.length > 0 
      ? `Available folders: ${availableFolders.join(", ")}`
      : "No folders exist yet";

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Analyze the following note and determine which folder it should belong to.

${foldersList}

Rules:
1. If one of the available folders matches the note's topic, return that exact folder name (case-insensitive match)
2. If no folder matches but the note is clearly about a specific topic (like fitness, work, personal, etc.), suggest a new folder name that would be appropriate
3. If the note is too general or doesn't fit any clear category, return null
4. Return only the folder name, not "null" as a string - return actual null if no folder is appropriate

Return a JSON object:
{
  "suggestedFolder": "folder name or null"
}`,
        },
        {
          role: "user",
          content: text,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    const suggested = result.suggestedFolder;

    // Return null if the suggestion is null, undefined, or empty string
    if (!suggested || suggested === "null" || suggested.trim() === "") {
      return null;
    }

    return suggested.trim();
  } catch (error) {
    console.error("Error suggesting folder:", error);
    return null;
  }
}

/**
 * Parse natural language commands for managing notes and folders
 */
export async function parseAICommand(
  text: string,
  availableFolders: string[],
  availableNotes: Array<{ id: string; title: string; folderId: string | null; folderName: string | null }>
): Promise<{
  command: string | null;
  targetType: "folder" | "note" | null;
  targetName: string | null;
  items: string | null;
  action: "add" | "delete" | "clear" | "create" | null;
}> {
  try {
    const notesList = availableNotes.map(n => ({
      id: n.id,
      title: n.title,
      folder: n.folderName || "no folder"
    }));

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a command parser for a note-taking app. Analyze the user's input and determine what action they want to perform.

Available folders: ${availableFolders.length > 0 ? availableFolders.join(", ") : "None"}
Available notes: ${JSON.stringify(notesList)}

Commands you should recognize:
1. DELETE commands:
   - "delete existing [folder] notes" or "delete all [folder] notes" → delete all notes in a folder
   - "delete [note title]" → delete a specific note

2. ADD commands:
   - "add to [note title]" or "add to [note title]: items" → add items to a specific note
   - "add to [folder]" → add items to a folder (handled separately)

3. CLEAR commands:
   - "clear [folder] list" or "clear the [folder] list" → clear content of notes in folder

Return a JSON object:
{
  "command": "delete" | "add" | "clear" | null,
  "targetType": "folder" | "note" | null,
  "targetName": "folder name or note title",
  "items": "items to add (if applicable)",
  "action": "add" | "delete" | "clear" | "create" | null
}

If the input doesn't match any command, return null for command.`,
        },
        {
          role: "user",
          content: text,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");

    return {
      command: result.command || null,
      targetType: result.targetType || null,
      targetName: result.targetName || null,
      items: result.items || null,
      action: result.action || null,
    };
  } catch (error) {
    console.error("Error parsing AI command:", error);
    return {
      command: null,
      targetType: null,
      targetName: null,
      items: null,
      action: null,
    };
  }
}

