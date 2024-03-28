
import * as React from 'react';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState,} from 'react';

import type {HistoryState} from '@lexical/react/LexicalHistoryPlugin';
import {createEmptyHistoryState} from '@lexical/react/LexicalHistoryPlugin';

const DEFAULT_SETTINGS = {
  disableBeforeInput: false,
  emptyEditor: true,
  isAutocomplete: false,
  isCharLimit: false,
  isCharLimitUtf8: false,
  isCollab: false,
  isMaxLength: false,
  isRichText: true,
  measureTypingPerf: false,
  shouldUseLexicalContextMenu: false,
  showNestedEditorTreeView: false,
  showTableOfContents: false,
  showTreeView: true,
  tableCellBackgroundColor: true,
  tableCellMerge: true,
};

type SettingName = keyof typeof DEFAULT_SETTINGS;

const ContextHistoShared: React.Context<{
  historyState?: HistoryState;
}> = createContext({});

export const SharedHistoryContext = ({children,}: {children: ReactNode;}): JSX.Element => {
  const historyContext = useMemo(
    () => ({historyState: createEmptyHistoryState()}),
    [],
  );
  return <ContextHistoShared.Provider value={historyContext}>{children}</ContextHistoShared.Provider>;
};

export const useSharedHistoryContext = (): {
  historyState?: HistoryState;
} => {
  return useContext(ContextHistoShared);
};

type Suggestion = null | string;
type CallbackFn = (newSuggestion: Suggestion) => void;
type SubscribeFn = (callbackFn: CallbackFn) => () => void;
type PublishFn = (newSuggestion: Suggestion) => void;
type ContextShape = [SubscribeFn, PublishFn];
type HookShape = [suggestion: Suggestion, setSuggestion: PublishFn];

const ContextSharedAutocomplete: React.Context<ContextShape> = createContext([
  (_cb) => () => {return;},
  (_newSuggestion: Suggestion) => {return;},
]);

export const SharedAutocompleteContext = ({children,}: {children: ReactNode;}): JSX.Element => {
  const context: ContextShape = useMemo(() => {
    let suggestion: Suggestion | null = null;
    const listeners: Set<CallbackFn> = new Set();
    return [
      (cb: (newSuggestion: Suggestion) => void) => {
        cb(suggestion);
        listeners.add(cb);
        return () => {listeners.delete(cb);};
      },
      (newSuggestion: Suggestion) => {
        suggestion = newSuggestion;
        for (const listener of Array.from(listeners)) {listener(newSuggestion);}
      },
    ];
  }, []);
  return <ContextSharedAutocomplete.Provider value={context}>{children}</ContextSharedAutocomplete.Provider>;
};

export const useSharedAutocompleteContext = (): HookShape => {
  const [subscribe, publish]: ContextShape = useContext(ContextSharedAutocomplete);
  const [suggestion, setSuggestion] = useState<Suggestion>(null);
  useEffect(() => {
    return subscribe((newSuggestion: Suggestion) => {
      setSuggestion(newSuggestion);
    });
  }, [subscribe]);
  return [suggestion, publish];
};




type SettingsContextShape = {
  setOption: (name: SettingName, value: boolean) => void;
  settings: Record<SettingName, boolean>;
};

const ContextSettings: React.Context<SettingsContextShape> = createContext({
  setOption: (name: SettingName, value: boolean) => {
    return;
  },
  settings: DEFAULT_SETTINGS,
});

export const SettingsContext = ({
  children,
}: {
  children: ReactNode;
}): JSX.Element => {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  const setOption = useCallback((setting: SettingName, value: boolean) => {
    setSettings((options) => ({
      ...options,
      [setting as string]: value,
    }));
    if (DEFAULT_SETTINGS[setting] === value) {
      setURLParam(setting, null);
    } else {
      setURLParam(setting, value);
    }
  }, []);

  const contextValue = useMemo(() => {
    return {setOption, settings};
  }, [setOption, settings]);

  return <ContextSettings.Provider value={contextValue}>{children}</ContextSettings.Provider>;
};

export const useSettings = (): SettingsContextShape => {return useContext(ContextSettings);};

function setURLParam(param: SettingName, value: null | boolean) {
  const url = new URL(window.location.href);
  const params = new URLSearchParams(url.search);
  if (value !== null) {
    if (params.has(param)) {
      params.set(param, String(value));
    } else {
      params.append(param, String(value));
    }
  } else {
    if (params.has(param)) {
      params.delete(param);
    }
  }
  url.search = params.toString();
  window.history.pushState(null, '', url.toString());
}
