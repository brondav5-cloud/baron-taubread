"use client";

import { useState } from "react";

// ============================================
// HOOK
// ============================================

export function useSettings() {
  const [saved, setSaved] = useState(false);

  // Notification settings
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [pushAlerts, setPushAlerts] = useState(false);
  const [weeklyReport, setWeeklyReport] = useState(true);

  // Display settings
  const [darkMode, setDarkMode] = useState(false);
  const [compactView, setCompactView] = useState(false);
  const [showMetrics, setShowMetrics] = useState(true);

  // Alert thresholds
  const [crashThreshold, setCrashThreshold] = useState(-30);
  const [declineThreshold, setDeclineThreshold] = useState(-10);
  const [returnsThreshold, setReturnsThreshold] = useState(20);

  const handleSave = () => {
    // In production, this would save to API
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return {
    // Save state
    saved,
    handleSave,

    // Notification settings
    emailAlerts,
    setEmailAlerts,
    pushAlerts,
    setPushAlerts,
    weeklyReport,
    setWeeklyReport,

    // Display settings
    darkMode,
    setDarkMode,
    compactView,
    setCompactView,
    showMetrics,
    setShowMetrics,

    // Alert thresholds
    crashThreshold,
    setCrashThreshold,
    declineThreshold,
    setDeclineThreshold,
    returnsThreshold,
    setReturnsThreshold,
  };
}
