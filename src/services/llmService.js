const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

/**
 * Generates a response from the AI model based on user input.
 * This function is isolated so that the API endpoint or model logic 
 * can be easily swapped out in the future.
 * 
 * @param {string} userText - The text message sent by the user.
 * @param {Array<string>} imageUrls - (Optional) Array of image URLs attached to the message.
 * @returns {Promise<string>} The generated response text.
 */
export const generateBotResponse = async (userText, imageUrls = []) => {
    // Current temporary implementation uses Gemini 2.0 Flash REST API
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    // Construct the payload. For now, we only pass text to keep it simple.
    // Base64 conversion would be needed to pass images to Gemini REST API.
    const payload = {
        contents: [{
            parts: [{ text: userText }]
        }]
    };

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`API Error ${res.status}: ${errorText}`);
        }

        const data = await res.json();
        if (data.candidates && data.candidates[0].content.parts[0].text) {
            return data.candidates[0].content.parts[0].text;
        }
        
        throw new Error("Invalid response format from AI");
    } catch (err) {
        console.error("AI Service Error:", err);
        return "Xin lỗi, hiện tại hệ thống đang gặp lỗi khi gọi API AI. Chi tiết: " + err.message;
    }
}
