import './style.css';
import { sendChatMessage, executeSystemCommand, fetchMusicEmbed } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
  const chatForm = document.getElementById('chat-form');
  const messageInput = document.getElementById('message-input');
  const chatFeed = document.getElementById('chat-feed');
  const micBtn = document.getElementById('mic-btn');
  const newChatBtn = document.querySelector('.new-chat-btn');
  const historyList = document.querySelector('.history-list');
  const currentChatTitle = document.getElementById('current-chat-title');

  const settingsBtn = document.getElementById('settings-btn');
  const settingsModal = document.getElementById('settings-modal');
  const closeSettingsBtn = document.getElementById('close-settings-btn');
  const clearAllBtn = document.getElementById('clear-all-btn');
  const voiceToggle = document.getElementById('voice-toggle');
  const voiceSelect = document.getElementById('voice-select');

  let isVoiceEnabled = localStorage.getItem('pratik_voice_enabled') !== 'false';
  if (voiceToggle) voiceToggle.checked = isVoiceEnabled;

  let selectedVoiceURI = localStorage.getItem('pratik_voice_uri') || '';
  let availableVoices = [];

  const populateVoices = () => {
      availableVoices = window.speechSynthesis.getVoices();
      if (availableVoices.length === 0 || !voiceSelect) return;
      
      voiceSelect.innerHTML = '';
      availableVoices.forEach(voice => {
          const option = document.createElement('option');
          option.value = voice.voiceURI;
          option.textContent = `${voice.name} (${voice.lang})`;
          if (voice.voiceURI === selectedVoiceURI) option.selected = true;
          voiceSelect.appendChild(option);
      });
      
      if (!selectedVoiceURI && availableVoices.length > 0) {
          selectedVoiceURI = availableVoices[0].voiceURI;
      }
  };

  if ('speechSynthesis' in window) {
      populateVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
          window.speechSynthesis.onvoiceschanged = populateVoices;
      }
  }

  // STATE: LocalStorage Chat History
  let chats = JSON.parse(localStorage.getItem('pratik_chats')) || [];
  let currentChatId = null;

  const renderHistory = () => {
    historyList.innerHTML = '';
    chats.forEach(chat => {
      const wrapper = document.createElement('div');
      wrapper.className = `history-item-wrapper ${chat.id === currentChatId ? 'active' : ''}`;

      const titleBtn = document.createElement('button');
      titleBtn.className = 'history-item-title';
      titleBtn.textContent = chat.title || 'New Conversation';
      titleBtn.onclick = () => loadChat(chat.id);

      const dotsBtn = document.createElement('button');
      dotsBtn.className = 'history-dots-btn';
      dotsBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>';

      const dropdown = document.createElement('div');
      dropdown.className = 'history-dropdown hidden';
      dropdown.innerHTML = `
        <button class="dropdown-item" data-action="rename"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg> Rename</button>
        <button class="dropdown-item" data-action="pin"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="17" x2="12" y2="22"></line><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.6V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3v4.6a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"></path></svg> Pin chat</button>
        <button class="dropdown-item" data-action="archive"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg> Archive</button>
        <div class="dropdown-divider"></div>
        <button class="dropdown-item danger" data-action="delete"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg> Delete</button>
      `;

      dotsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        // Close all other open dropdowns first
        document.querySelectorAll('.history-dropdown').forEach(d => d.classList.add('hidden'));
        dropdown.classList.toggle('hidden');
      });

      dropdown.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          const action = item.dataset.action;
          
          if (action === 'rename') {
            const newTitle = prompt('Enter new name:', chat.title);
            if (newTitle && newTitle.trim()) {
              chat.title = newTitle.trim();
              saveChats();
              if (chat.id === currentChatId) currentChatTitle.textContent = chat.title;
            }
          } else if (action === 'delete') {
            chats = chats.filter(c => c.id !== chat.id);
            saveChats();
            if (chat.id === currentChatId) {
              chats.length > 0 ? loadChat(chats[0].id) : createNewChat();
            }
          }
          dropdown.classList.add('hidden');
        });
      });

      wrapper.appendChild(titleBtn);
      wrapper.appendChild(dotsBtn);
      wrapper.appendChild(dropdown);
      historyList.appendChild(wrapper);
    });
  };

  const saveChats = () => {
    localStorage.setItem('pratik_chats', JSON.stringify(chats));
    renderHistory();
  };

  const createNewChat = () => {
    currentChatId = Date.now().toString();
    chats.unshift({ id: currentChatId, title: 'New Conversation', messages: [] });
    if (chats.length > 20) chats.pop();
    saveChats();
    
    currentChatTitle.textContent = 'New Conversation';
    
    chatFeed.innerHTML = `
      <div class="message system">
        <div class="message-bubble system-bubble">
          Hello! I'm the Pratik AI Assistant. How can I help you today?
        </div>
      </div>
    `;
  };

  const loadChat = (chatId) => {
    currentChatId = chatId;
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;

    currentChatTitle.textContent = chat.title || 'Conversation';
    chatFeed.innerHTML = '';
    
    if (chat.messages.length === 0) {
      chatFeed.innerHTML = `
        <div class="message system">
          <div class="message-bubble system-bubble">
            Hello! I'm the Pratik AI Assistant. How can I help you today?
          </div>
        </div>
      `;
    }

    chat.messages.forEach(msg => {
      addMessageToFeed(msg.text, msg.sender, false);
    });
    renderHistory();
  };

  // Speech Recognition Setup
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;
  
  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.interimResults = false;

    recognition.onstart = () => {
      micBtn.classList.add('listening');
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      messageInput.value = transcript;
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error', event.error);
      micBtn.classList.remove('listening');
    };

    recognition.onend = () => {
      micBtn.classList.remove('listening');
      const text = messageInput.value.trim();
      if (text) {
        processMessage(text);
      }
    };

    micBtn.addEventListener('click', () => {
      if (micBtn.classList.contains('listening')) {
        recognition.stop();
      } else {
        recognition.start();
      }
    });
  } else {
    micBtn.style.display = 'none';
  }

  // Text-to-Speech Utility
  const speakText = (text) => {
    if (!isVoiceEnabled) return;
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    if (selectedVoiceURI) {
        const matchingVoice = availableVoices.find(v => v.voiceURI === selectedVoiceURI);
        if (matchingVoice) utterance.voice = matchingVoice;
    } else {
        utterance.lang = 'en-US';
    }
    window.speechSynthesis.speak(utterance);
  };

  // DOM Utils
  const scrollToBottom = () => {
    chatFeed.scrollTop = chatFeed.scrollHeight;
  };

  const addMessageToFeed = (text, sender, save = true) => {
    const isUser = sender === 'user';
    const messageEl = document.createElement('div');
    messageEl.className = `message ${isUser ? 'user' : 'system'}`;
    
    messageEl.innerHTML = `
      <div class="message-bubble ${isUser ? 'user-bubble' : 'system-bubble'}">
        ${text}
      </div>
    `;
    
    chatFeed.appendChild(messageEl);
    scrollToBottom();

    if (save && currentChatId) {
      const chat = chats.find(c => c.id === currentChatId);
      if (chat) {
         if (chat.messages.length === 0 && sender === 'user') {
            chat.title = text.substring(0, 25) + (text.length > 25 ? '...' : '');
         }
         chat.messages.push({ text, sender });
         saveChats();
      }
    }
  };

  const showTypingIndicator = () => {
    const messageEl = document.createElement('div');
    messageEl.className = 'message system typing-msg';
    messageEl.id = 'typing-indicator';
    
    messageEl.innerHTML = `
      <div class="message-bubble system-bubble">
        <div class="typing-indicator">
          <span></span><span></span><span></span>
        </div>
      </div>
    `;
    
    chatFeed.appendChild(messageEl);
    scrollToBottom();
  };

  const removeTypingIndicator = () => {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) {
      indicator.remove();
    }
  };

  async function processMessage(text) {
    // 1. Add user message
    addMessageToFeed(text, 'user');
    messageInput.value = '';

    const lowerText = text.toLowerCase();
    
    // Image Generation Intent
    const imgMatch = lowerText.match(/(?:generate|create|show|make|draw).*(?:image|photo|picture|drawing) of\s+(.+)/);
    if (imgMatch) {
      let prompt = imgMatch[1].trim().substring(0, 500);
      const imageUrl = `http://localhost:3000/api/image?prompt=${encodeURIComponent(prompt)}&seed=${Math.floor(Math.random()*10000)}`;
      
      const imgHtml = `Here is your photo of ${prompt}:<br>
        <div style="margin-top: 10px;">
          <img src="${imageUrl}" alt="${prompt}" style="width: 100%; max-width: 400px; border-radius: 8px; box-shadow: var(--shadow-sm); display: block;" onload="const feed=document.getElementById('chat-feed'); feed.scrollTop=feed.scrollHeight;">
          <div style="display: flex; gap: 8px; margin-top: 8px;">
            <button class="download-btn" data-url="${imageUrl}" style="background: var(--bg-secondary); border: 1px solid var(--border-light); color: var(--text-primary); padding: 6px 12px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 0.85rem;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> Download</button>
            <button class="share-btn" data-url="${imageUrl}" style="background: var(--bg-secondary); border: 1px solid var(--border-light); color: var(--text-primary); padding: 6px 12px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 0.85rem;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg> Share</button>
          </div>
        </div>`;
      
      speakText(`Creating a photo of ${prompt}`);
      addMessageToFeed(imgHtml, 'system');
      return;
    }

    // Song Playback Intent
    const songMatch = lowerText.match(/(?:play|listen to|hear).*(?:song|music|track)?\s+(.+)/) || (lowerText.startsWith('play ') ? [null, lowerText.replace('play ', '')] : null);
    if (songMatch) {
        const query = songMatch[1].trim();
        speakText(`Finding the song ${query}`);
        showTypingIndicator();
        try {
            const data = await fetchMusicEmbed(query);
            removeTypingIndicator();
            if (data.success && data.embedUrl) {
                const iframe = `<iframe width="100%" height="200" src="${data.embedUrl}?autoplay=1" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="border-radius: 12px; margin-top: 10px;"></iframe>`;
                addMessageToFeed(`Here is ${query}:<br>${iframe}`, 'system');
            } else {
                addMessageToFeed(`Sorry, I couldn't find a song for ${query}.`, 'system');
            }
        } catch (e) {
            removeTypingIndicator();
            addMessageToFeed(`Failed to get music playback.`, 'system');
        }
        return;
    }
    
    // Command Intent Matcher (Dynamic App Opening)
    const openMatch = lowerText.match(/open\s+(.+)/);
    if (openMatch) {
      let appName = openMatch[1].trim();
      // Remove trailing punctuation that speech recognition might add
      appName = appName.replace(/[^\w\s-]/g, '');

      // Common app URLs
      const customUrls = {
        'whatsapp': 'https://web.whatsapp.com/',
        'instagram': 'https://www.instagram.com/',
        'youtube': 'https://www.youtube.com/',
        'facebook': 'https://www.facebook.com/',
        'twitter': 'https://twitter.com/',
        'x': 'https://x.com/',
        'gmail': 'https://mail.google.com/',
        'google': 'https://www.google.com/',
        'chatgpt': 'https://chatgpt.com/',
        'github': 'https://github.com/',
        'linkedin': 'https://www.linkedin.com/',
        'netflix': 'https://www.netflix.com/'
      };

      let targetUrl = customUrls[appName];
      const spokenName = appName.charAt(0).toUpperCase() + appName.slice(1);
      
      // Fallback: Try OS Native App Execution first before blindly opening .com
      if (!targetUrl) {
          try {
             // Ask backend to execute OS command: start <appName>
             executeSystemCommand(`start "" "${appName}"`).catch(()=> {}); // Don't crash if fails
             speakText(`Attempting to launch ${spokenName} locally on your PC`);
             addMessageToFeed(`Attempting to launch ${spokenName} locally...`, 'system');
             return;
          } catch(e) {
             const sanitizedApp = appName.replace(/\s+/g, '');
             targetUrl = `https://www.${sanitizedApp}.com/`;
          }
      }

      window.open(targetUrl, '_blank');
      speakText(`Opening ${spokenName}`);
      addMessageToFeed(`Opening ${spokenName} directly in a new tab...`, 'system');
      return;
    }

    // 2. Show loading state
    showTypingIndicator();

    try {
      // 3. Call API
      const response = await sendChatMessage(text);
      removeTypingIndicator();
      
      let replyHtml = response.reply;
      
      // Parse backend tags for dynamic embeds
      const backendImgMatch = replyHtml.match(/\[IMAGE:\s*([\s\S]+?)\]/i);
      if (backendImgMatch) {
         let prompt = backendImgMatch[1].trim().replace(/\n/g, ' ').substring(0, 500);
         const imageUrl = `http://localhost:3000/api/image?prompt=${encodeURIComponent(prompt)}&seed=${Math.floor(Math.random()*10000)}`;
         const imgHtml = `<br>
            <div style="margin-top: 10px;">
              <img src="${imageUrl}" alt="AI generated image" style="width: 100%; max-width: 400px; border-radius: 8px; box-shadow: var(--shadow-sm); display: block;" onload="const feed=document.getElementById('chat-feed'); feed.scrollTop=feed.scrollHeight;">
              <div style="display: flex; gap: 8px; margin-top: 8px;">
                <button class="download-btn" data-url="${imageUrl}" style="background: var(--bg-secondary); border: 1px solid var(--border-light); color: var(--text-primary); padding: 6px 12px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 0.85rem;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> Download</button>
                <button class="share-btn" data-url="${imageUrl}" style="background: var(--bg-secondary); border: 1px solid var(--border-light); color: var(--text-primary); padding: 6px 12px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 0.85rem;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg> Share</button>
              </div>
            </div>`;
         replyHtml = replyHtml.replace(/\[IMAGE:\s*[\s\S]+?\]/i, imgHtml);
      }

      const backendMusicMatch = replyHtml.match(/\[MUSIC:\s*([\s\S]+?)\]/i);
      if (backendMusicMatch) {
         const query = backendMusicMatch[1].trim();
         try {
             const data = await fetchMusicEmbed(query);
             if (data.success && data.embedUrl) {
                 const iframe = `<br><iframe width="100%" height="200" src="${data.embedUrl}?autoplay=1" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="border-radius: 12px; margin-top: 10px;"></iframe>`;
                 replyHtml = replyHtml.replace(/\[MUSIC:\s*[\s\S]+?\]/i, iframe);
             } else {
                 replyHtml = replyHtml.replace(/\[MUSIC:\s*[\s\S]+?\]/i, '<br>*(Could not find the requested song)*');
             }
         } catch(e) {
             replyHtml = replyHtml.replace(/\[MUSIC:\s*[\s\S]+?\]/i, '<br>*(Failed to load music)*');
         }
      }
      
      // 4. Add system message
      addMessageToFeed(replyHtml, 'system');
      
      // Clean text for speech
      const textToSpeak = replyHtml.replace(/<[^>]*>?/gm, '').replace(/\[.*?\]/g, '');
      if (textToSpeak.trim()) speakText(textToSpeak);
      
    } catch (err) {
      removeTypingIndicator();
      addMessageToFeed('Sorry, I encountered an error. Please ensure the backend server is running.', 'system');
    }
  }

  // Event Listeners
  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = messageInput.value.trim();
    if (!text) return;
    processMessage(text);
  });

  newChatBtn.addEventListener('click', createNewChat);
  
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => settingsModal.classList.remove('hidden'));
    closeSettingsBtn.addEventListener('click', () => settingsModal.classList.add('hidden'));
    settingsModal.addEventListener('click', (e) => {
       if (e.target === settingsModal) settingsModal.classList.add('hidden');
    });

    clearAllBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to delete all chat history forever?')) {
            chats = [];
            saveChats();
            createNewChat();
            settingsModal.classList.add('hidden');
        }
    });

    voiceToggle.addEventListener('change', (e) => {
        isVoiceEnabled = e.target.checked;
        localStorage.setItem('pratik_voice_enabled', isVoiceEnabled);
    });

    if (voiceSelect) {
        voiceSelect.addEventListener('change', (e) => {
            selectedVoiceURI = e.target.value;
            localStorage.setItem('pratik_voice_uri', selectedVoiceURI);
            speakText("Hi, I am your Pratik AI assistant.");
        });
    }
  }

  // Global click listeners for dropdowns and image actions
  document.addEventListener('click', async (e) => {
    document.querySelectorAll('.history-dropdown').forEach(d => d.classList.add('hidden'));

    const downloadBtn = e.target.closest('.download-btn');
    const shareBtn = e.target.closest('.share-btn');
    
    if (downloadBtn) {
        const url = downloadBtn.dataset.url;
        try {
            const res = await fetch(url);
            const blob = await res.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = `Pratik_AI_${Date.now()}.jpg`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(blobUrl);
        } catch (err) {
            console.error('Download error:', err);
            alert('Failed to download image.');
        }
    }

    if (shareBtn) {
        const url = shareBtn.dataset.url;
        try {
            const res = await fetch(url);
            const blob = await res.blob();
            const file = new File([blob], 'Pratik_AI_Image.jpg', { type: 'image/jpeg' });
            
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    title: 'Generated by Pratik AI',
                    files: [file]
                });
            } else {
                alert('Your browser does not support native file sharing. Right click the image or use the Download button instead!');
            }
        } catch (err) {
            console.error('Share error:', err);
        }
    }
  });

  // Initialize App History
  if (chats.length > 0) {
    loadChat(chats[0].id);
  } else {
    createNewChat();
  }
});
