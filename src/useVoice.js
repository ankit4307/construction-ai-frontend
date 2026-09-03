// src/useVoice.js
// Voice input (speech-to-text) + voice output (text-to-speech)
// using the browser's built-in Web Speech API. No backend, no API key, free.
//
// Usage:
//   const v = useVoice("hi-IN");
//   v.supported, v.listening, v.transcript, v.startListening(), v.stopListening()
//   v.speaking, v.speak(text), v.stopSpeaking()

import { useState, useRef, useEffect, useCallback } from "react";

const SpeechRecognition =
  typeof window !== "undefined" &&
  (window.SpeechRecognition || window.webkitSpeechRecognition);

/**
 * Markdown ko bolne-layak plain text mein badalta hai.
 * Tables ko padhna kaan ke liye bekaar hota hai, isliye table aane par
 * sirf ek chhota summary bola jata hai.
 */
export function cleanForSpeech(md) {
  if (!md) return "";
  let text = String(md);

  // Code blocks hata do
  text = text.replace(/```[\s\S]*?```/g, " ");

  // Markdown table detect karo (| ... | wali lines)
  const tableLines = text
    .split("\n")
    .filter((l) => l.trim().startsWith("|") && l.trim().endsWith("|"));

  if (tableLines.length >= 3) {
    // header + separator + data rows
    const dataRows = tableLines.length - 2;
    const nonTable = text
      .split("\n")
      .filter((l) => !(l.trim().startsWith("|") && l.trim().endsWith("|")))
      .join(" ")
      .trim();
    const intro = stripMarks(nonTable);
    return (
      (intro ? intro + ". " : "") +
      `${dataRows} entries ki table screen par dikha di hai, kripya dekh lijiye.`
    );
  }

  return stripMarks(text);
}

function stripMarks(t) {
  return t
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")     // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")   // links -> label
    .replace(/[*_`>#|]/g, " ")                 // markdown symbols
    .replace(/^\s*[-+]\s+/gm, ", ")            // bullets -> pause
    .replace(/\s+/g, " ")
    .trim();
}

export function useVoice(lang = "hi-IN") {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState("");

  const recogRef = useRef(null);
  const voicesRef = useRef([]);
  const supported = Boolean(SpeechRecognition);
  const canSpeak = typeof window !== "undefined" && "speechSynthesis" in window;

  // Available voices load karo (pehli baar khaali aati hai)
  useEffect(() => {
    if (!canSpeak) return;
    const load = () => {
      voicesRef.current = window.speechSynthesis.getVoices();
    };
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () =>
      window.speechSynthesis.removeEventListener("voiceschanged", load);
  }, [canSpeak]);

  // Recognition object banao (lang badalne par dobara)
  useEffect(() => {
    if (!supported) return;
    const r = new SpeechRecognition();
    r.lang = lang;
    r.continuous = false;      // ek sawaal, phir apne aap band
    r.interimResults = true;   // bolte-bolte text dikhta rahe
    r.maxAlternatives = 1;

    r.onresult = (e) => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) {
        text += e.results[i][0].transcript;
      }
      setTranscript(text);
    };
    r.onend = () => setListening(false);
    r.onerror = (e) => {
      setListening(false);
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setError("Mic permission block hai. Address bar ke lock icon se allow karein.");
      } else if (e.error === "no-speech") {
        setError("Kuch sunai nahi diya. Dobara try karein.");
      } else {
        setError("Voice input error: " + e.error);
      }
    };

    recogRef.current = r;
    return () => {
      try {
        r.abort();
      } catch (_) {}
    };
  }, [lang, supported]);

  const startListening = useCallback(() => {
    setError("");
    if (!recogRef.current || listening) return;
    setTranscript("");
    if (canSpeak) window.speechSynthesis.cancel(); // bolna band, warna mic khud ko sun lega
    try {
      recogRef.current.start();
      setListening(true);
    } catch (_) {
      // already started — ignore
    }
  }, [listening, canSpeak]);

  const stopListening = useCallback(() => {
    try {
      recogRef.current?.stop();
    } catch (_) {}
    setListening(false);
  }, []);

  const pickVoice = useCallback(() => {
    const voices = voicesRef.current || [];
    return (
      voices.find((v) => v.lang === lang) ||
      voices.find((v) => v.lang?.startsWith(lang.split("-")[0])) ||
      voices.find((v) => v.lang === "en-IN") ||
      null
    );
  }, [lang]);

  const speak = useCallback(
    (text) => {
      if (!canSpeak) return;
      const clean = cleanForSpeech(text);
      if (!clean) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(clean);
      const v = pickVoice();
      if (v) u.voice = v;
      u.lang = v?.lang || lang;
      u.rate = 1.0;
      u.pitch = 1.0;
      u.onstart = () => setSpeaking(true);
      u.onend = () => setSpeaking(false);
      u.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(u);
    },
    [canSpeak, lang, pickVoice]
  );

  const stopSpeaking = useCallback(() => {
    if (!canSpeak) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [canSpeak]);

  return {
    supported,
    canSpeak,
    listening,
    transcript,
    setTranscript,
    speaking,
    error,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
  };
}
