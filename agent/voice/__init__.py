"""ORBIT Voice - Speech recognition, TTS, and wake word detection."""

from __future__ import annotations

import asyncio
import io
import logging
import tempfile
import wave
from typing import AsyncGenerator

logger = logging.getLogger(__name__)


class SpeechRecognizer:
    """Streaming speech recognition using Google's free API."""

    def __init__(self):
        self._recognizer = None

    def _get_recognizer(self):
        if self._recognizer is None:
            try:
                import speech_recognition as sr
                self._recognizer = sr.Recognizer()
            except ImportError:
                logger.warning("speech_recognition not installed")
                return None
        return self._recognizer

    async def transcribe_audio(self, audio_data: bytes, language: str = "en-US") -> str:
        """Transcribe raw audio bytes to text."""
        recognizer = self._get_recognizer()
        if not recognizer:
            return ""

        try:
            import speech_recognition as sr
            audio = sr.AudioData(audio_data, 16000, 2)
            loop = asyncio.get_event_loop()
            text = await loop.run_in_executor(
                None, lambda: recognizer.recognize_google(audio, language=language)
            )
            return text
        except Exception as e:
            logger.warning("Transcription failed: %s", e)
            return ""

    async def listen_from_microphone(self, timeout: int = 5) -> str:
        """Listen from microphone and transcribe."""
        recognizer = self._get_recognizer()
        if not recognizer:
            return ""

        try:
            import speech_recognition as sr
            loop = asyncio.get_event_loop()
            with sr.Microphone() as source:
                recognizer.adjust_for_ambient_noise(source, duration=0.5)
                audio = await loop.run_in_executor(
                    None, lambda: recognizer.listen(source, timeout=timeout)
                )
            text = await self.transcribe_audio(audio.get_raw_data())
            return text
        except Exception as e:
            logger.warning("Microphone listen failed: %s", e)
            return ""


class TextToSpeech:
    """Text-to-speech using Microsoft Edge TTS (free, high quality)."""

    def __init__(self, voice: str = "en-US-GuyNeural"):
        self.voice = voice
        self._queue: asyncio.Queue[str | None] = asyncio.Queue()
        self._speaking = False

    @property
    def is_speaking(self) -> bool:
        return self._speaking

    async def speak(self, text: str) -> bytes:
        """Convert text to speech and return audio bytes."""
        try:
            import edge_tts
            communicate = edge_tts.Communicate(text, self.voice)
            audio_chunks = []
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    audio_chunks.append(chunk["data"])
            return b"".join(audio_chunks)
        except Exception as e:
            logger.warning("TTS failed: %s", e)
            return b""

    async def speak_streaming(self, text: str) -> AsyncGenerator[bytes, None]:
        """Stream TTS audio chunks."""
        self._speaking = True
        try:
            import edge_tts
            communicate = edge_tts.Communicate(text, self.voice)
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    yield chunk["data"]
        except Exception as e:
            logger.warning("Streaming TTS failed: %s", e)
        finally:
            self._speaking = False

    async def stop(self):
        """Stop current speech."""
        self._speaking = False


class WakeWordDetector:
    """Simple keyword-based wake word detection."""

    def __init__(self, wake_words: list[str] | None = None):
        self.wake_words = [w.lower() for w in (wake_words or ["orbit", "hey orbit"])]
        self.is_listening = False

    def detect(self, text: str) -> bool:
        """Check if text contains a wake word."""
        text_lower = text.lower().strip()
        for word in self.wake_words:
            if text_lower.startswith(word) or f" {word} " in text_lower:
                return True
        return False

    def strip_wake_word(self, text: str) -> str:
        """Remove the wake word from the text."""
        text_lower = text.lower()
        for word in self.wake_words:
            if text_lower.startswith(word):
                return text[len(word):].strip()
            text_lower = text_lower.replace(f" {word} ", " ")
        return text.strip()


class VoiceManager:
    """Manages all voice components: STT, TTS, wake word."""

    def __init__(self):
        self.recognizer = SpeechRecognizer()
        self.tts = TextToSpeech()
        self.wake = WakeWordDetector()
        self.is_active = False

    async def process_voice_input(self, audio_data: bytes) -> dict:
        """Process voice input: transcribe → check wake word → return result."""
        transcript = await self.recognizer.transcribe_audio(audio_data)

        if not transcript:
            return {"transcript": "", "is_wake": False, "command": ""}

        is_wake = self.wake.detect(transcript)
        command = self.wake.strip_wake_word(transcript) if is_wake else ""

        return {
            "transcript": transcript,
            "is_wake": is_wake,
            "command": command,
        }

    async def speak_response(self, text: str) -> bytes:
        """Convert response text to speech."""
        return await self.tts.speak(text)
