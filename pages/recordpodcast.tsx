// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from 'next/router';
import { spacing, radius, fontSize } from "../lib/theme";
import AppText from "../components/AppText";
import { IoArrowBack, IoCloudUploadOutline, IoMicOutline, IoStopCircleOutline } from 'react-icons/io5';

const RecordPodcast = () => {
  const router = useRouter();
  const [isRecording, setIsRecording] = useState(false);
  const [level, setLevel] = useState(0);
  const [timer, setTimer] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [bars, setBars] = useState<number[]>([8, 12, 16, 10, 14, 18, 11, 15, 9, 13]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (isRecording) {
      interval = setInterval(() => {
        animateBars(0.5);
      }, 100);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  const animateBars = (intensity: number) => {
    setBars((prev) => prev.map(() => 8 + intensity * 48 * Math.random()));
  };

  const startRecording = async () => {
    try {
      if (navigator?.mediaDevices?.getUserMedia) {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      setIsRecording(true);

      // Start timer
      setTimer(0);
      intervalRef.current = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Failed to start recording", err);
    }
  };

  const stopRecording = async () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsRecording(false);
    window.alert('Recording stopped. Save/upload flow can be wired to backend.');
  };

  const pickAudioFile = async () => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'audio/*';
      input.onchange = () => {
        const file = input.files?.[0];
        if (file) window.alert(`File: ${file.name}`);
      };
      input.click();
    } catch (error) {
      console.log("Error picking file:", error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <div style={styles.container}>
      {/* HEADER */}
      <div style={styles.header}>
        <button onClick={() => router.back()}>
          <IoArrowBack size={24} color="#333" />
        </button>
      </div>

      {/* TITLE */}
      <AppText style={styles.title}>Hello there!!</AppText>
      <AppText style={styles.subtitle}>Let us upload/record your podcast</AppText>

      {/* MIC + WAVEFORM */}
      <div style={styles.waveformContainer}>
        <button
          style={styles.micCircle}
          onClick={isRecording ? stopRecording : startRecording}
        >
          {isRecording ? <IoStopCircleOutline size={38} color="#fff" /> : <IoMicOutline size={38} color="#fff" />}
        </button>

        {/* Live Timer */}
        {isRecording && <AppText style={styles.timerText}>{formatTime(timer)}</AppText>}

        <div style={styles.waveformBars}>
          {bars.map((val, i) => (
            <div key={i} style={{...(styles.bar || {}), height: val }} />
          ))}
        </div>
      </div>

      {/* UPLOAD BUTTON */}
      <button style={styles.uploadBtn} onClick={pickAudioFile}>
        <IoCloudUploadOutline size={20} color="#00BFFF" />
        <AppText style={styles.uploadText}> Tap to Upload</AppText>
      </button>

      {/* CONTINUE BUTTON */}
      <button
        style={styles.continueBtn}
        onClick={() => router.push('/record-podcast')}
      >
        <AppText style={styles.continueText}>Continue</AppText>
      </button>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingLeft: spacing.lg,
    paddingRight: spacing.lg,
    paddingTop: 70,
  },
  header: { flexDirection: "row", alignItems: "center", marginBottom: spacing.lg },
  title: { fontSize: fontSize.xl5, fontWeight: "400", marginTop: spacing.xl2, marginBottom: spacing.sm },
  subtitle: { fontSize: fontSize.xl3, color: "#777", marginBottom: 50 },
  waveformContainer: { alignItems: "center", marginBottom: spacing.lg },
  micCircle: {
    width: 80,
    height: 80,
    borderRadius: radius.full,
    backgroundColor: "#00BFFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  timerText: {
    fontSize: fontSize.lg,
    color: "#333",
    marginBottom: spacing.md,
  },
  waveformBars: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 70,
    justifyContent: "center",
    marginTop: spacing.md,
  },
  bar: {
    width: 6,
    backgroundColor: "#00BFFF",
    marginLeft: 3,
    marginRight: 3,
    borderRadius: radius.xs,
  },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#00BFFF",
    borderRadius: radius.full,
    paddingLeft: spacing.lg,
    paddingRight: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    alignSelf: "center",
    marginBottom: spacing.xl2,
  },
  uploadText: { fontSize: fontSize.xl2, color: "#00BFFF" },
  continueBtn: {
    backgroundColor: "#00BFFF",
    paddingTop: spacing.base,
    paddingBottom: spacing.base,
    borderRadius: radius.lg,
    alignItems: "center",
    position: "absolute",
    bottom: 30,
    left: 20,
    right: 20,
  },
  continueText: { color: "#fff", fontSize: fontSize.xl2, fontWeight: "400" },
};

export default RecordPodcast;
