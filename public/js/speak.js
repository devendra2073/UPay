// Global reference prevents mobile garbage collection mid-speech
let currentUtterance = null;

function speak(text, lang = 'en-US') {
  if (!('speechSynthesis' in window)) {
    console.error('Text-to-speech not supported.');
    return;
  }

  const synth = window.speechSynthesis;

  // Unstick paused audio state (common on Android/Chrome)
  synth.cancel();
  if (synth.paused) {
    synth.resume();
  }

  currentUtterance = new SpeechSynthesisUtterance(text);
  currentUtterance.lang = lang;
  currentUtterance.rate = 1.0;
  currentUtterance.pitch = 1.0;

  // Attempt to map an installed system voice for the language
  const voices = synth.getVoices();
  const matchedVoice = voices.find(v => v.lang === lang || v.lang.startsWith(lang.slice(0, 2)));
  if (matchedVoice) {
    currentUtterance.voice = matchedVoice;
  }

  currentUtterance.onend = () => { currentUtterance = null; };
  currentUtterance.onerror = (e) => { 
    console.error('TTS error:', e); 
    currentUtterance = null; 
  };

  synth.speak(currentUtterance);
}

// Preload voices for Android/Chrome
if ('speechSynthesis' in window && window.speechSynthesis.onvoiceschanged !== undefined) {
  window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
}
