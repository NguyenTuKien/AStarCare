/**
 * Generates a response from the AI model based on user input.
 */
export const generateBotResponse = async (userText, imageUrls = []) => {
    // Tạm thời loại bỏ Gemini
    await new Promise(resolve => setTimeout(resolve, 1000)); // Giả lập độ trễ
    return "Hệ thống hiện tại chưa kết nối model. Vui lòng quay lại sau.";
}

/**
 * Transcribes an audio Blob.
 */
export const transcribeAudio = async (audioBlob) => {
    try {
        const formData = new FormData();
        formData.append("audio", audioBlob, "record.webm");

        const response = await fetch("/api/transcribe", {
            method: "POST",
            body: formData,
            // KHÔNG set header Content-Type để trình duyệt tự động tính toán boundary
        });

        if (!response.ok) {
            throw new Error(`API Error ${response.status}: ${await response.text()}`);
        }

        const data = await response.json();
        return data.text;
    } catch (err) {
        console.error("Lỗi khi transcribe audio:", err);
        throw err;
    }
}
