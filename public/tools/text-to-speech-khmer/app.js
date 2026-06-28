const inputText = document.getElementById('inputText');
const speakBtn = document.getElementById('speakBtn');
const clearBtn = document.getElementById('clearBtn');
const audioPlayer = document.getElementById('audioPlayer');
const downloadBtn = document.getElementById('downloadBtn');
const statusText = document.getElementById('statusText');

function setSpeechStatus(message, isError = false) {
    setStatus(statusText, message, isError);
}

function getKhmerVoice() {
    const voices = window.speechSynthesis?.getVoices?.() || [];
    return voices.find((voice) => voice.lang === 'km-KH')
        || voices.find((voice) => voice.lang.toLowerCase().startsWith('km'))
        || voices.find((voice) => voice.lang === 'th-TH')
        || voices[0];
}

function generateSpeech() {
    const text = inputText.value.trim();

    if (!text) {
        setSpeechStatus('សូមវាយអត្ថបទជាមុនសិន', true);
        return;
    }

    if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) {
        setSpeechStatus('Browser text-to-speech is not supported here.', true);
        return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'km-KH';
    utterance.rate = 0.95;
    utterance.pitch = 1;

    const voice = getKhmerVoice();
    if (voice) utterance.voice = voice;

    utterance.onstart = () => setSpeechStatus('កំពុងអាន...');
    utterance.onend = () => setSpeechStatus('រួចរាល់');
    utterance.onerror = () => setSpeechStatus('Unable to play speech in this browser.', true);

    audioPlayer.hidden = true;
    downloadBtn.hidden = true;
    window.speechSynthesis.speak(utterance);
}

function clearForm() {
    inputText.value = '';
    audioPlayer.src = '';
    audioPlayer.hidden = true;
    downloadBtn.hidden = true;
    window.speechSynthesis?.cancel();
    setSpeechStatus('Ready.');
}

speakBtn.addEventListener('click', generateSpeech);
clearBtn.addEventListener('click', clearForm);
downloadBtn.addEventListener('click', () => {
    setSpeechStatus('Download is unavailable for browser speech playback.', true);
});

window.speechSynthesis?.addEventListener?.('voiceschanged', getKhmerVoice);
setSpeechStatus('Ready.');
