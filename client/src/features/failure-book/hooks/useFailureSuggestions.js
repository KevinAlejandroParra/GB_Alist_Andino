'use client';

import { useState, useEffect, useRef } from 'react';
import { fetchFailureSuggestions } from '../../../utils/failureBookApi';
import { buildGroupedSuggestions } from '../utils/failureBookHelpers';

export function useFailureSuggestions(searchQuery, failuresFallback = []) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [groupedSuggestions, setGroupedSuggestions] = useState({
    devices: [],
    failures: [],
    technicians: []
  });
  const searchContainerRef = useRef(null);
  const suggestTimerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setGroupedSuggestions({ devices: [], failures: [], technicians: [] });
      return;
    }

    const token = localStorage.getItem('authToken');
    clearTimeout(suggestTimerRef.current);
    suggestTimerRef.current = setTimeout(async () => {
      try {
        const data = await fetchFailureSuggestions(searchQuery.trim(), token);
        setGroupedSuggestions(data);
      } catch {
        setGroupedSuggestions(buildGroupedSuggestions(searchQuery, failuresFallback));
      }
    }, 300);

    return () => clearTimeout(suggestTimerRef.current);
  }, [searchQuery, failuresFallback]);

  const applySearchSuggestion = (value, setSearchQuery) => {
    setSearchQuery(value);
    setShowSuggestions(false);
  };

  const hasSuggestionResults =
    groupedSuggestions.devices.length > 0 ||
    groupedSuggestions.failures.length > 0 ||
    groupedSuggestions.technicians.length > 0;

  return {
    searchContainerRef,
    showSuggestions,
    setShowSuggestions,
    groupedSuggestions,
    applySearchSuggestion,
    hasSuggestionResults
  };
}
