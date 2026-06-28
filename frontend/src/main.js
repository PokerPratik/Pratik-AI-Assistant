import { Capacitor } from '@capacitor/core';
import './style.css';
import { sendChatMessage, executeSystemCommand, fetchMusicEmbed } from './api.js';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { SpeechRecognition as NativeSpeech } from '@capacitor-community/speech-recognition';
import { Contacts } from '@capacitor-community/contacts';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { defineCustomElements } from '@ionic/pwa-elements/loader';

defineCustomElements(window);

document.addEventListener('DOMContentLoaded', () => {
  const chatForm = document.getElementById('chat-form');
  const messageInput = document.getElementById('message-input');
  const chatFeed = document.getElementById('chat-feed');

  const attachmentBtn = document.getElementById('attachment-btn');
  const attachmentMenu = document.getElementById('attachment-menu');
  const uploadImageBtn = document.getElementById('upload-image-btn');
  const cameraBtn = document.getElementById('camera-btn');
  const imageUploadInput = document.getElementById('image-upload-input');
  const cameraInput = document.getElementById('camera-input');
  const imagePreviewContainer = document.getElementById('image-preview-container');
  const imagePreview = document.getElementById('image-preview');
  const clearPreviewBtn = document.getElementById('clear-preview-btn');
  
  // Hands-Free Orb Elements
  const orbContainer = document.getElementById('orb-container');
  const orbStatus = document.getElementById('orb-status');
  const orbTranscript = document.getElementById('orb-transcript');
  const closeOrbBtn = document.getElementById('close-orb-btn');
  window.isOrbModeActive = false;
  
  if (closeOrbBtn) {
    closeOrbBtn.addEventListener('click', () => {
       window.isOrbModeActive = false;
       orbContainer.classList.add('hidden');
       orbContainer.classList.remove('listening');
       orbTranscript.textContent = "";
    });
  }
  
  let currentImageBase64 = null;

  if (attachmentBtn) {
    attachmentBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      attachmentMenu.classList.toggle('hidden');
      attachmentBtn.classList.toggle('active');
    });

    uploadImageBtn.addEventListener('click', async () => {
      attachmentMenu.classList.add('hidden');
      attachmentBtn.classList.remove('active');
      const isNative = Capacitor.isNativePlatform();
      if (isNative) {
        try {
          const image = await Camera.getPhoto({
            quality: 60,
            width: 800,
            allowEditing: false,
            resultType: CameraResultType.Base64,
            source: CameraSource.Photos
          });
          if (image && image.base64String) {
            currentImageBase64 = `data:image/${image.format || 'jpeg'};base64,${image.base64String}`;
            imagePreview.src = currentImageBase64;
            imagePreviewContainer.classList.remove('hidden');
          }
        } catch (e) {
          console.error("Camera gallery error:", e);
        }
      } else {
        imageUploadInput.click();
      }
    });

    cameraBtn.addEventListener('click', async () => {
      attachmentMenu.classList.add('hidden');
      attachmentBtn.classList.remove('active');
      const isNative = Capacitor.isNativePlatform();
      if (isNative) {
        try {
          const image = await Camera.getPhoto({
            quality: 60,
            width: 800,
            allowEditing: false,
            resultType: CameraResultType.Base64,
            source: CameraSource.Camera
          });
          if (image && image.base64String) {
            currentImageBase64 = `data:image/${image.format || 'jpeg'};base64,${image.base64String}`;
            imagePreview.src = currentImageBase64;
            imagePreviewContainer.classList.remove('hidden');
          }
        } catch (e) {
          console.error("Camera error:", e);
        }
      } else {
        cameraInput.click();
      }
    });

    const handleImageSelect = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          currentImageBase64 = event.target.result;
          imagePreview.src = currentImageBase64;
          imagePreviewContainer.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
      }
      e.target.value = '';
    };

    imageUploadInput.addEventListener('change', handleImageSelect);
    cameraInput.addEventListener('change', handleImageSelect);

    clearPreviewBtn.addEventListener('click', () => {
      currentImageBase64 = null;
      imagePreview.src = '';
      imagePreviewContainer.classList.add('hidden');
    });
  }
  const micBtn = document.getElementById('mic-btn');
  const newChatBtn = document.querySelector('.new-chat-btn');
  const historyList = document.querySelector('.history-list');
  const currentChatTitle = document.getElementById('current-chat-title');

  // ── Mobile sidebar wiring ────────────────────────────────
  const sidebar = document.getElementById('sidebar');
  const hamburgerBtn = document.getElementById('hamburger-btn');
  const sidebarOverlay = document.getElementById('sidebar-overlay');

  const openSidebar = () => {
    sidebar.classList.add('open');
    sidebarOverlay.classList.add('visible');
    hamburgerBtn.setAttribute('aria-expanded', 'true');
  };

  const closeSidebar = () => {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('visible');
    hamburgerBtn.setAttribute('aria-expanded', 'false');
  };

  hamburgerBtn.addEventListener('click', () => {
    sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
  });

  sidebarOverlay.addEventListener('click', closeSidebar);

  // Close sidebar on Escape key (accessibility)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSidebar();
  });
  // ────────────────────────────────────────────────────────

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

  const populateVoices = async () => {
      if (!voiceSelect) return;
      const isNative = Capacitor.isNativePlatform();
      
      if (isNative) {
          try {
              const res = await TextToSpeech.getSupportedVoices();
              availableVoices = res.voices || [];
          } catch(e) {
              availableVoices = [];
          }
      } else if ('speechSynthesis' in window) {
          availableVoices = window.speechSynthesis.getVoices();
      }
      
      voiceSelect.innerHTML = '';
      if (availableVoices.length === 0) {
          voiceSelect.innerHTML = '<option value="">Default System Voice (or none found)</option>';
          return;
      }

      availableVoices.forEach(voice => {
          const option = document.createElement('option');
          const vId = voice.voiceURI || voice.identifier || voice.name;
          option.value = vId;
          option.textContent = `${voice.name} (${voice.lang})`;
          if (vId === selectedVoiceURI) option.selected = true;
          voiceSelect.appendChild(option);
      });
      
      if (!selectedVoiceURI && availableVoices.length > 0) {
          selectedVoiceURI = availableVoices[0].voiceURI || availableVoices[0].identifier || availableVoices[0].name;
      }
  };

  const initVoices = async () => {
      // Await on mobile so availableVoices is populated before any speech call
      await populateVoices();
      const isNative = Capacitor.isNativePlatform();
      
      if (!isNative && 'speechSynthesis' in window && window.speechSynthesis.onvoiceschanged !== undefined) {
          window.speechSynthesis.onvoiceschanged = populateVoices;
      }

      let attempts = 0;
      const voiceInterval = setInterval(async () => {
          attempts++;
          if (availableVoices.length === 0) {
              await populateVoices();
          }
          if (availableVoices.length > 0 || attempts > 15) {
              clearInterval(voiceInterval);
          }
      }, 600);
  };
  initVoices(); // fires async, voices will be ready by the time user speaks

  // STATE: LocalStorage Chat History
  let chats = JSON.parse(localStorage.getItem('pratik_chats')) || [];
  let currentChatId = null;

  // ── Custom Confirm Dialog ──────────────────────────────────────
  const confirmDialog = document.createElement('div');
  confirmDialog.className = 'confirm-dialog';
  confirmDialog.innerHTML = `
    <p class="confirm-msg"></p>
    <div class="confirm-dialog-actions">
      <button class="confirm-cancel-btn">Cancel</button>
      <button class="confirm-ok-btn">Delete</button>
    </div>
  `;
  document.body.appendChild(confirmDialog);

  let _confirmResolve = null;

  confirmDialog.querySelector('.confirm-cancel-btn').addEventListener('click', () => {
    confirmDialog.classList.remove('visible');
    if (_confirmResolve) _confirmResolve(false);
  });
  confirmDialog.querySelector('.confirm-ok-btn').addEventListener('click', () => {
    confirmDialog.classList.remove('visible');
    if (_confirmResolve) _confirmResolve(true);
  });

  const showConfirm = (message, okLabel = 'Delete') => {
    confirmDialog.querySelector('.confirm-msg').textContent = message;
    confirmDialog.querySelector('.confirm-ok-btn').textContent = okLabel;
    confirmDialog.classList.add('visible');
    return new Promise(resolve => { _confirmResolve = resolve; });
  };

  // ── Section Label ─────────────────────────────────────────────
  const createSectionLabel = (text) => {
    const el = document.createElement('div');
    el.className = 'history-section-label';
    el.textContent = text;
    return el;
  };

  // ── Single History Item ───────────────────────────────────────
  const createHistoryItem = (chat) => {
    const wrapper = document.createElement('div');
    wrapper.className = `history-item-wrapper ${chat.id === currentChatId ? 'active' : ''}`;

    // Pin badge (small icon shown when pinned)
    const pinBadge = document.createElement('span');
    pinBadge.className = 'pin-badge';
    pinBadge.title = 'Pinned';
    pinBadge.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/></svg>`;
    pinBadge.style.display = chat.pinned ? 'flex' : 'none';

    const titleBtn = document.createElement('button');
    titleBtn.className = 'history-item-title';
    titleBtn.textContent = chat.title || 'New Conversation';
    titleBtn.onclick = () => {
      loadChat(chat.id);
      if (window.innerWidth <= 768) closeSidebar();
    };

    const dotsBtn = document.createElement('button');
    dotsBtn.className = 'history-dots-btn';
    dotsBtn.setAttribute('aria-label', 'Chat options');
    dotsBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>`;

    const dropdown = document.createElement('div');
    dropdown.className = 'history-dropdown hidden';
    dropdown.innerHTML = `
      <button class="dropdown-item" data-action="rename">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
        Rename
      </button>
      <button class="dropdown-item" data-action="pin">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="17" x2="12" y2="22"></line><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.6V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3v4.6a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"></path></svg>
        ${chat.pinned ? 'Unpin' : 'Pin chat'}
      </button>
      <button class="dropdown-item" data-action="archive">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>
        ${chat.archived ? 'Unarchive' : 'Archive'}
      </button>
      <div class="dropdown-divider"></div>
      <button class="dropdown-item danger" data-action="delete">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        Delete
      </button>
    `;

    dotsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.history-dropdown').forEach(d => d.classList.add('hidden'));
      dropdown.classList.toggle('hidden');
    });

    dropdown.querySelectorAll('.dropdown-item').forEach(item => {
      item.addEventListener('click', async (e) => {
        e.stopPropagation();
        dropdown.classList.add('hidden');
        const action = item.dataset.action;

        if (action === 'rename') {
          // ── Inline rename ──────────────────────────────────
          const input = document.createElement('input');
          input.type = 'text';
          input.className = 'rename-input';
          input.value = chat.title || 'New Conversation';
          wrapper.replaceChild(input, titleBtn);
          input.focus();
          input.select();

          const finishRename = () => {
            const newTitle = input.value.trim();
            if (newTitle) {
              chat.title = newTitle;
              if (chat.id === currentChatId) currentChatTitle.textContent = chat.title;
              saveChats(); // will re-render, replacing input with fresh item
            } else {
              // Revert without saving
              if (input.parentNode === wrapper) wrapper.replaceChild(titleBtn, input);
            }
          };

          input.addEventListener('blur', finishRename, { once: true });
          input.addEventListener('keydown', (ke) => {
            if (ke.key === 'Enter')  { ke.preventDefault(); input.blur(); }
            if (ke.key === 'Escape') { input.value = chat.title; input.blur(); }
          });

        } else if (action === 'pin') {
          // ── Pin / Unpin ────────────────────────────────────
          chat.pinned = !chat.pinned;
          if (chat.pinned) chat.archived = false; // can't be both
          saveChats();

        } else if (action === 'archive') {
          // ── Archive / Unarchive ────────────────────────────
          chat.archived = !chat.archived;
          if (chat.archived) chat.pinned = false; // can't be both
          saveChats();
          // If active chat is being archived, switch to another
          if (chat.archived && chat.id === currentChatId) {
            const next = chats.find(c => !c.archived && c.id !== chat.id);
            next ? loadChat(next.id) : createNewChat();
          }

        } else if (action === 'delete') {
          // ── Delete with custom confirm ─────────────────────
          const confirmed = await showConfirm(
            `Delete "${chat.title || 'New Conversation'}"? This cannot be undone.`
          );
          if (confirmed) {
            chats = chats.filter(c => c.id !== chat.id);
            saveChats();
            if (chat.id === currentChatId) {
              const next = chats.find(c => !c.archived);
              next ? loadChat(next.id) : createNewChat();
            }
          }
        }
      });
    });

    wrapper.appendChild(pinBadge);
    wrapper.appendChild(titleBtn);
    wrapper.appendChild(dotsBtn);
    wrapper.appendChild(dropdown);
    return wrapper;
  };

  // ── Render Full History List ──────────────────────────────────
  const renderHistory = () => {
    historyList.innerHTML = '';

    const pinned   = chats.filter(c => c.pinned && !c.archived);
    const normal   = chats.filter(c => !c.pinned && !c.archived);
    const archived = chats.filter(c => c.archived);

    // Pinned section
    if (pinned.length > 0) {
      historyList.appendChild(createSectionLabel('📌 Pinned'));
      pinned.forEach(chat => historyList.appendChild(createHistoryItem(chat)));
    }

    // Normal section (only add label when there are also pinned)
    if (normal.length > 0) {
      if (pinned.length > 0) historyList.appendChild(createSectionLabel('💬 Chats'));
      normal.forEach(chat => historyList.appendChild(createHistoryItem(chat)));
    }

    // Archived collapsible section
    if (archived.length > 0) {
      const archiveToggle = document.createElement('button');
      archiveToggle.className = 'archive-toggle-btn';
      archiveToggle.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect></svg>
        Archived (${archived.length})
        <svg class="archive-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-left:auto;transition:transform 0.25s;"><polyline points="6 9 12 15 18 9"></polyline></svg>
      `;

      const archiveSection = document.createElement('div');
      archiveSection.className = 'archive-section hidden';
      archived.forEach(chat => archiveSection.appendChild(createHistoryItem(chat)));

      archiveToggle.addEventListener('click', () => {
        const isHidden = archiveSection.classList.toggle('hidden');
        archiveToggle.querySelector('.archive-chevron').style.transform = isHidden ? '' : 'rotate(180deg)';
      });

      historyList.appendChild(archiveToggle);
      historyList.appendChild(archiveSection);
    }
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
  const setupSpeech = async () => {
    const isNative = Capacitor.isNativePlatform();
    if (isNative) {
      micBtn.addEventListener('click', async () => {
        try {
          const perms = await NativeSpeech.checkPermissions();
          if (perms.speechRecognition !== 'granted') {
             const req = await NativeSpeech.requestPermissions();
             if (req.speechRecognition !== 'granted') return;
          }
          
          if (micBtn.classList.contains('listening')) {
             await NativeSpeech.stop();
             micBtn.classList.remove('listening');
          } else {
             micBtn.classList.add('listening');
             const { available } = await NativeSpeech.available();
             if (!available) {
                 micBtn.classList.remove('listening');
                 alert("Speech recognition not available on this device.");
                 return;
             }

             const result = await NativeSpeech.start({
                 language: 'en-US',
                 maxResults: 1,
                 prompt: 'Speak now...',
                 partialResults: false,
                 popup: false
             });

             micBtn.classList.remove('listening');
             
             if (result && result.matches && result.matches.length > 0) {
                 const text = result.matches[0];
                 messageInput.value = text;
                 if (text) processMessage(text);
             }
          }
        } catch (e) {
          console.error("Native Speech Error:", e);
          micBtn.classList.remove('listening');
        }
      });
      return;
    }

    // Web Fallback with Hands-Free & Wake-Word
    const WebSpeech = window.SpeechRecognition || window.webkitSpeechRecognition;
    window.wakeWordEngine = null;
    window.assistantRecognition = null;
    let isCommandListening = false;

    if (WebSpeech) {
      const initWakeWord = () => {
         window.wakeWordEngine = new WebSpeech();
         window.wakeWordEngine.continuous = true;
         window.wakeWordEngine.interimResults = true;
         window.wakeWordEngine.lang = 'en-US';
         
         window.wakeWordEngine.onresult = (event) => {
             for (let i = event.resultIndex; i < event.results.length; ++i) {
                 const transcript = event.results[i][0].transcript.toLowerCase();
                 if (transcript.includes('hey pratik') || transcript.includes('okay pratik') || transcript.includes('hi pratik')) {
                     window.wakeWordEngine.stop(); 
                     if (!window.isOrbModeActive) window.openHandsFreeMode();
                 }
             }
         };
         
         window.wakeWordEngine.onend = () => {
             if (!isCommandListening && !window.isOrbModeActive) { // restart background listener
                 try { window.wakeWordEngine.start(); } catch(e){}
             }
         };
         
         try { window.wakeWordEngine.start(); } catch(e) {}
      };
      
      initWakeWord();

      window.assistantRecognition = new WebSpeech();
      window.assistantRecognition.continuous = false;
      window.assistantRecognition.lang = 'en-US';
      window.assistantRecognition.interimResults = true;

      window.assistantRecognition.onstart = () => {
          isCommandListening = true;
          micBtn.classList.add('listening');
          if (window.isOrbModeActive) {
             orbContainer.classList.add('listening');
             orbStatus.textContent = "Listening...";
          }
      };

      window.assistantRecognition.onresult = (event) => {
          let interim = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
              if (event.results[i].isFinal) {
                  messageInput.value = event.results[i][0].transcript;
                  if (orbTranscript) orbTranscript.textContent = event.results[i][0].transcript;
              } else {
                  interim += event.results[i][0].transcript;
                  if (orbTranscript) orbTranscript.textContent = interim;
              }
          }
      };

      window.assistantRecognition.onerror = () => {
         micBtn.classList.remove('listening');
         if (window.isOrbModeActive) orbContainer.classList.remove('listening');
      };

      window.assistantRecognition.onend = () => {
        isCommandListening = false;
        micBtn.classList.remove('listening');
        if (window.isOrbModeActive) orbContainer.classList.remove('listening');
        
        const text = messageInput.value.trim();
        if (text) {
           processMessage(text);
        } else if (window.isOrbModeActive) {
           orbStatus.textContent = "I didn't catch that. Say Hey Pratik to re-awaken.";
        } else {
           try { window.wakeWordEngine.start(); } catch(e) {}
        }
      };

      micBtn.addEventListener('click', () => {
        if (micBtn.classList.contains('listening')) {
          window.assistantRecognition.stop();
        } else {
          try { window.wakeWordEngine.stop(); } catch(e) {}
          if (isVoiceEnabled && 'speechSynthesis' in window) {
              window.speechSynthesis.speak(new SpeechSynthesisUtterance(''));
          }
          window.assistantRecognition.start();
        }
      });
      
      window.openHandsFreeMode = () => {
          window.isOrbModeActive = true;
          if (orbContainer) orbContainer.classList.remove('hidden');
          if (orbStatus) orbStatus.textContent = "Listening...";
          if (orbTranscript) orbTranscript.textContent = "";
          try { window.wakeWordEngine.stop(); } catch(e) {}
          
          if (isVoiceEnabled && 'speechSynthesis' in window) {
              window.speechSynthesis.speak(new SpeechSynthesisUtterance(''));
          }
          speakText("Yes?"); 
          setTimeout(() => {
             try { window.assistantRecognition.start(); } catch(e) {}
          }, 800);
      };
      
    } else {
      micBtn.style.display = 'none';
    }
  };

  setupSpeech();

  // Text-to-Speech Utility
  const speakText = async (text) => {
    if (!isVoiceEnabled) return;
    
    const stopOrbPulse = () => {
       if (window.isOrbModeActive && document.getElementById('orb-container')) {
           document.getElementById('orb-container').classList.remove('listening');
           document.getElementById('orb-status').textContent = "Say Hey Pratik...";
       }
    };
    
    if (window.isOrbModeActive && document.getElementById('orb-container')) {
       document.getElementById('orb-container').classList.add('listening');
       document.getElementById('orb-status').textContent = "Speaking...";
    }

    // Use high-reliability native Capacitor TTS on Mobile
    if (Capacitor.isNativePlatform()) {
        try {
            if (availableVoices.length === 0) {
                try {
                    const res = await TextToSpeech.getSupportedVoices();
                    availableVoices = res.voices || [];
                } catch(e) { }
            }
            const options = { text: text, lang: 'en-US', rate: 1.0, pitch: 1.0, volume: 1.0, category: 'ambient' };
            if (selectedVoiceURI && availableVoices.length > 0) {
                const voiceIndex = availableVoices.findIndex(v => (v.voiceURI || v.identifier || v.name) === selectedVoiceURI);
                if (voiceIndex !== -1) options.voice = voiceIndex;
            }
            await TextToSpeech.speak(options);
            stopOrbPulse();
        } catch (e) {
            console.error('Capacitor TTS Error:', e);
            stopOrbPulse();
        }
        return;
    }

    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    if (selectedVoiceURI) {
        const matchingVoice = availableVoices.find(v => v.voiceURI === selectedVoiceURI);
        if (matchingVoice) utterance.voice = matchingVoice;
    } else {
        utterance.lang = 'en-US';
    }
    
    utterance.onend = stopOrbPulse;
    utterance.onerror = stopOrbPulse;
    window.speechSynthesis.speak(utterance);
  };

  // DOM Utils
  const scrollToBottom = () => {
    chatFeed.scrollTop = chatFeed.scrollHeight;
  };

  // ── YouTube Facade: show thumbnail, load iframe only on click ──
  // Defined here (module scope) so addMessageToFeed & processMessage can both use it
  const createYouTubeFacade = (embedUrl, label) => {
    const videoId = embedUrl.split('/embed/')[1]?.split('?')[0] || '';
    const thumbUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

    const wrapper = document.createElement('div');
    wrapper.className = 'yt-facade';
    wrapper.innerHTML = `
      <img class="yt-thumb" src="${thumbUrl}" alt="${label}" loading="lazy">
      <div class="yt-play-overlay">
        <div class="yt-play-btn">
          <svg viewBox="0 0 24 24" fill="white" width="30" height="30"><polygon points="5,3 19,12 5,21"/></svg>
        </div>
      </div>
      <div class="yt-label">${label}</div>
    `;

    wrapper.addEventListener('click', () => {
      const iframe = document.createElement('iframe');
      iframe.width = '100%';
      iframe.height = '220';
      iframe.src = embedUrl + '?autoplay=1&rel=0';
      iframe.title = label;
      iframe.frameBorder = '0';
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
      iframe.allowFullscreen = true;
      iframe.style.borderRadius = '12px';
      iframe.style.display = 'block';
      iframe.style.width = '100%';
      wrapper.replaceWith(iframe);
    }, { once: true });

    return wrapper;
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

    // Reconstruct any YouTube facade placeholders (works for live AND history loads)
    messageEl.querySelectorAll('.yt-facade-placeholder').forEach(placeholder => {
      const embedUrl = placeholder.dataset.embed;
      const label    = placeholder.dataset.label || '';
      if (embedUrl) placeholder.replaceWith(createYouTubeFacade(embedUrl, label));
    });
    
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

  async function processMessage(text, imageBase64 = null) {
    // 1. Add user message
    if (imageBase64) {
      addMessageToFeed(text + `<br><img src="${imageBase64}" style="max-width:200px; border-radius:8px; margin-top:8px;">`, 'user');
    } else {
      addMessageToFeed(text, 'user');
    }
    messageInput.value = '';

    const lowerText = text.toLowerCase();

    // Agentic Workflow: Plan Trip Intent
    const tripMatch = lowerText.match(/(?:plan).*(?:trip|vacation|tour|holiday|journey)\s+(?:to\s+)?(.+)/);
    if (tripMatch) {
       // Clean punctuation from destination
       let destination = tripMatch[1].trim().replace(/[^\w\s-]/g, '');
       destination = destination.charAt(0).toUpperCase() + destination.slice(1);
       
       speakText(`Agentic workflow initiated. Planning your trip to ${destination}.`);
       showTypingIndicator();
       
       // Simulate orchestration
       setTimeout(async () => {
         
         // 1. Fetch real music for the trip
         let embedUrl = "";
         try {
             // Reusing the existing Youtube API search
             const data = await fetchMusicEmbed(`${destination} road trip music`);
             if (data.success && data.embedUrl) {
                 embedUrl = data.embedUrl;
             }
         } catch(e) {
             console.error("Music fetch failed:", e);
         }
         
         // 2. Fetch real weather using Open-Meteo
         let weatherDesc = "<strong>Next Week:</strong> Mostly Sunny, 28°C - Perfect for sightseeing!";
         let weatherVoiceDesc = "The weather looks great";
         try {
             const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(destination)}&count=1&language=en&format=json`);
             const geoData = await geoRes.json();
             if (geoData.results && geoData.results.length > 0) {
                 const { latitude, longitude, name, country } = geoData.results[0];
                 const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`);
                 const weatherData = await weatherRes.json();
                 if (weatherData.current_weather) {
                     const temp = weatherData.current_weather.temperature;
                     const wcode = weatherData.current_weather.weathercode;
                     
                     let condition = "Clear ☀️";
                     let voiceCond = "clear";
                     if (wcode >= 1 && wcode <= 3) { condition = "Partly Cloudy ⛅"; voiceCond = "partly cloudy"; }
                     if (wcode >= 45 && wcode <= 48) { condition = "Foggy 🌫️"; voiceCond = "foggy"; }
                     if (wcode >= 51 && wcode <= 67) { condition = "Rainy 🌧️"; voiceCond = "rainy"; }
                     if (wcode >= 71 && wcode <= 77) { condition = "Snowy ❄️"; voiceCond = "snowy"; }
                     if (wcode >= 95) { condition = "Thunderstorm 🌩️"; voiceCond = "stormy"; }

                     weatherDesc = `<strong>Current in ${name}, ${country}:</strong><br/>${condition}, ${temp}°C`;
                     weatherVoiceDesc = `The weather in ${name} is currently ${voiceCond} at ${temp} degrees celsius`;
                 }
             }
         } catch(e) {
             console.error("Weather fetch failed:", e);
         }
         
         // 3. Build the beautiful UI card
         const htmlCard = `
           <div class="agentic-card" style="background: var(--bg-secondary); border-radius: 16px; padding: 16px; box-shadow: var(--shadow-md); margin-top: 10px; border: 1px solid var(--border-light);">
              <h3 style="margin-bottom: 12px; margin-top: 0; color: #a855f7; display: flex; align-items: center; gap: 8px;">
                 <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"></polygon></svg>
                 Agentic Workflow: ${destination}
              </h3>
              
              <div style="background: rgba(16, 185, 129, 0.1); border-left: 4px solid #10b981; padding: 10px; border-radius: 4px; margin-bottom: 12px;">
                 <div style="font-size: 0.85rem; color: var(--text-secondary); text-transform: uppercase; font-weight: bold; margin-bottom: 6px;">1. Weather 🌤️</div>
                 <div style="font-size: 0.95rem;">
                    ${weatherDesc}
                 </div>
              </div>

              <div style="background: rgba(59, 130, 246, 0.1); border-left: 4px solid #3b82f6; padding: 10px; border-radius: 4px; margin-bottom: 12px;">
                 <div style="font-size: 0.85rem; color: var(--text-secondary); text-transform: uppercase; font-weight: bold; margin-bottom: 6px;">2. Travel & Stay ✈️</div>
                 <div style="font-size: 0.95rem;">
                   <div style="display: flex; justify-content: space-between; margin-bottom: 4px;"><span>Flights Estimate:</span> <strong>₹8,000 - ₹15,000 (Roundtrip)</strong></div>
                   <div style="display: flex; justify-content: space-between;"><span>Hotels Estimate:</span> <strong>₹2,000 - ₹5,000 / night</strong></div>
                 </div>
                 <button onclick="window.open('https://www.expedia.com/Hotel-Search?destination=${destination}', '_blank')" style="width: 100%; margin-top: 10px; background: #3b82f6; color: white; border: none; padding: 8px; border-radius: 6px; cursor: pointer; font-weight: bold; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">Check Live Prices</button>
              </div>
              
              <div style="margin-top: 12px;">
                 <div style="font-size: 0.85rem; color: var(--text-secondary); text-transform: uppercase; font-weight: bold; margin-bottom: 8px;">3. Curated Roadtrip Playlist 🎵</div>
                 ${embedUrl ? `<span class="yt-facade-placeholder" data-embed="${embedUrl}" data-label="${destination} Roadtrip"></span>` : '*(Playlist generation unavailable)*'}
              </div>
           </div>
         `;
         removeTypingIndicator();
         addMessageToFeed(htmlCard, 'system');
         speakText(`I have compiled a trip plan for ${destination}. ${weatherVoiceDesc}, flights are estimated around 10,000 rupees, and I've attached a curated playlist for your journey.`);
       }, 500); // reduced delay slightly since API takes time
       
       return;
    }
    
    // Image Generation Intent
    const imgMatch = lowerText.match(/(?:generate|create|show|make|draw).*(?:image|photo|picture|drawing) of\s+(.+)/);
    if (imgMatch) {
      let prompt = imgMatch[1].trim().substring(0, 500);
      const imageUrl = `https://pratik-ai-assistant.onrender.com/api/image?prompt=${encodeURIComponent(prompt)}&seed=${Math.floor(Math.random()*10000)}`;
      
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
                // Save a placeholder string — addMessageToFeed will turn it into a facade
                // This also means it's saved to history correctly and restores on reload
                const msgHtml = `Here is <strong>${query}</strong>:<br><span class="yt-facade-placeholder" data-embed="${data.embedUrl}" data-label="${query}"></span>`;
                addMessageToFeed(msgHtml, 'system');
            } else {
                addMessageToFeed(`Sorry, I couldn't find a song for ${query}.`, 'system');
            }
        } catch (e) {
            removeTypingIndicator();
            addMessageToFeed(`Failed to get music playback.`, 'system');
        }
    }
    
    // Phone Call Intent
    const callMatch = lowerText.match(/(?:call|dial)\s+(.+)/);
    if (callMatch) {
       let contactName = callMatch[1].trim();
       contactName = contactName.replace(/[^\w\s-]/g, '');
       const spokenName = contactName.charAt(0).toUpperCase() + contactName.slice(1);
       
       const isNative = Capacitor.isNativePlatform();
       if (isNative) {
           speakText(`Finding ${spokenName} in your contacts`);
           showTypingIndicator();
           try {
               const perms = await Contacts.checkPermissions();
               if (perms.contacts !== 'granted') {
                   const req = await Contacts.requestPermissions();
                   if (req.contacts !== 'granted') {
                       removeTypingIndicator();
                       addMessageToFeed(`I need contacts permission to call ${spokenName}.`, 'system');
                       return;
                   }
               }
               const result = await Contacts.getContacts({ projection: { name: true, phones: true } });
               const contactsList = result.contacts || [];
               const contact = contactsList.find(c => {
                   const nameStr = (c.name?.display || c.name?.given || '').toLowerCase();
                   return nameStr.length > 1 && contactName.toLowerCase().includes(nameStr) || nameStr.includes(contactName.toLowerCase());
               });
               removeTypingIndicator();
               
               if (contact && contact.phones && contact.phones.length > 0) {
                   const phone = contact.phones[0].number;
                   addMessageToFeed(`Calling ${contact.name?.display || spokenName}...`, 'system');
                    try {
                        if (Capacitor.Plugins.DirectCall) {
                            Capacitor.Plugins.DirectCall.startCall({ number: phone });
                        } else {
                            window.location.href = `tel:${phone.replace(/[^0-9+]/g, '')}`;
                        }
                    } catch (callErr) {
                        console.error("Direct Call Failed", callErr);
                    }
               } else {
                   addMessageToFeed(`I couldn't find a phone number for ${spokenName} in your contacts.`, 'system');
               }
           } catch(e) {
               removeTypingIndicator();
               console.error("Contacts Error:", e);
               addMessageToFeed(`Unable to search contacts: ${e.message || String(e)}`, 'system');
           }
           return;
       } else {
           speakText(`I can only make phone calls from a native mobile application.`);
           addMessageToFeed(`I can only make phone calls from a native mobile application.`, 'system');
           return;
       }
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
      
      const isNative = Capacitor.isNativePlatform();

      // Fallback: Try OS Native App Execution first before blindly opening .com
      if (!targetUrl) {
          try {
             if (!Capacitor.isNativePlatform()) {
                 executeSystemCommand(`start "" "${appName}"`).catch(()=> {}); // Don't crash if fails
                 speakText(`Attempting to launch ${spokenName} locally on your PC`);
                 addMessageToFeed(`Attempting to launch ${spokenName} locally...`, 'system');
             } else {
                 const sanitizedApp = appName.replace(/\s+/g, '');
                 const fallbackUrl = `https://www.${sanitizedApp}.com/`;
                 window.open(fallbackUrl, '_system');
                 speakText(`Attempting to open ${spokenName}`);
                 addMessageToFeed(`Opening ${spokenName}...`, 'system');
             }
             return;
          } catch(e) {
             const sanitizedApp = appName.replace(/\s+/g, '');
             targetUrl = `https://www.${sanitizedApp}.com/`;
          }
      }

      window.open(targetUrl, Capacitor.isNativePlatform() ? '_system' : '_blank');
      speakText(`Opening ${spokenName}`);
      addMessageToFeed(`Opening ${spokenName}...`, 'system');
      return;
    }

    // 2. Show loading state
    showTypingIndicator();

    try {
      // 3. Call API
      const response = await sendChatMessage(text, imageBase64);
      removeTypingIndicator();
      
      let replyHtml = response.reply;
      
      // Parse backend tags for dynamic embeds
      const backendImgMatch = replyHtml.match(/\[IMAGE:\s*([\s\S]+?)\]/i);
      if (backendImgMatch) {
         let prompt = backendImgMatch[1].trim().replace(/\n/g, ' ').substring(0, 500);
         const imageUrl = `https://pratik-ai-assistant.onrender.com/api/image?prompt=${encodeURIComponent(prompt)}&seed=${Math.floor(Math.random()*10000)}`;
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
                 // Use a placeholder so we can attach DOM node after addMessageToFeed
                 replyHtml = replyHtml.replace(/\[MUSIC:\s*[\s\S]+?\]/i, `<span class="yt-facade-placeholder" data-embed="${data.embedUrl}" data-label="${query}"></span>`);
             } else {
                 replyHtml = replyHtml.replace(/\[MUSIC:\s*[\s\S]+?\]/i, '<br>*(Could not find the requested song)*');
             }
         } catch(e) {
             replyHtml = replyHtml.replace(/\[MUSIC:\s*[\s\S]+?\]/i, '<br>*(Failed to load music)*');
         }
      }
      
      // 4. Add system message (addMessageToFeed auto-converts yt-facade-placeholder spans)
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
    
    // Unlock voice synthesis for mobile browsers on interaction
    if (isVoiceEnabled && 'speechSynthesis' in window) {
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(''));
    }
    
    let text = messageInput.value.trim();
    if (!text && !currentImageBase64) return;
    
    if (currentImageBase64) {
      if (!text) text = "What is in this image?";
      processMessage(text, currentImageBase64);
      currentImageBase64 = null;
      imagePreview.src = '';
      imagePreviewContainer.classList.add('hidden');
    } else {
      processMessage(text);
    }
  });

  newChatBtn.addEventListener('click', () => {
    createNewChat();
    if (window.innerWidth <= 768) closeSidebar();
  });
  
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

    if (attachmentBtn && !attachmentBtn.contains(e.target) && attachmentMenu && !attachmentMenu.contains(e.target)) {
      attachmentMenu.classList.add('hidden');
      attachmentBtn.classList.remove('active');
    }

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
