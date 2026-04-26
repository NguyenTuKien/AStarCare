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
export const transcribeAudio = async (audioBlob, mimeType) => {
    // Tạm thời loại bỏ nhận diện bằng Gemini
    await new Promise(resolve => setTimeout(resolve, 1000));
    throw new Error("Chức năng nhận diện giọng nói đang được cập nhật, chưa có dịch vụ xử lý STT.");
}
