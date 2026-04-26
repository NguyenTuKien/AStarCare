const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

/**
 * Generates a response from the AI model based on user input.
 */
export const generateBotResponse = async (userText, imageUrls = []) => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
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

/**
 * Transcribes an audio Blob using Gemini API.
 * Works on all browsers (including Brave) — does NOT use Web Speech API.
 * @param {Blob} audioBlob - The recorded audio blob from MediaRecorder.
 * @returns {Promise<string>} The transcribed text.
 */
export const transcribeAudio = async (audioBlob, mimeType) => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

    // Convert blob to base64
    const base64Audio = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
    });

    // Use provided mimeType (already stripped of codec suffix), fallback to blob type
    const finalMimeType = mimeType || audioBlob.type.split(';')[0] || 'audio/webm';

    const payload = {
        contents: [{
            parts: [
                { text: "Hãy chuyển đoạn audio sau thành văn bản. Chỉ trả về văn bản đã nhận diện, không giải thích thêm." },
                { inline_data: { mime_type: finalMimeType, data: base64Audio } }
            ]
        }]
    };

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Transcription API Error ${res.status}: ${errText}`);
        }

        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error("No transcription returned");
        return text.trim();
    } catch (err) {
        console.error("Transcription error:", err);
        throw err;
    }
}
