// const API_URL = 'http://localhost:3000/api';
const API_URL = 'https://pratik-ai-assistant.onrender.com/api';


export const sendChatMessage = async (message, imageBase64 = null) => {
    try {
        const payload = { message };
        if (imageBase64) payload.imageBase64 = imageBase64;
        const response = await fetch(`${API_URL}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error(`Error: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};

export const executeSystemCommand = async (command) => {
    try {
        const response = await fetch(`${API_URL}/execute`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ command }),
        });
        if (!response.ok) {
            throw new Error(`Error: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('System API Error:', error);
        throw error;
    }
};

export const fetchMusicEmbed = async (query) => {
    try {
        const response = await fetch(`${API_URL}/music`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query }),
        });
        if (!response.ok) {
            throw new Error(`Error: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Music API Error:', error);
        throw error;
    }
};
