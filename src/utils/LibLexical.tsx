import * as React from 'react';
import {useState} from 'react';
import {
    joinClasses, Point, Rect, addSwipeDownListener, addSwipeLeftListener, addSwipeRightListener,
    addSwipeUpListener, getDOMRangeRect, getSelectedNode, isHTMLElement, isPoint, sanitizeUrl, setFloatingElemPosition,
    setFloatingElemPositionForLinkEditor, validateUrl
} from './utils';
import katex from 'katex';
import type {Ref, RefObject} from 'react';
import {ChangeEvent, forwardRef, useEffect, useRef,HTMLInputTypeAttribute, ReactNode, useMemo,useCallback, useState } from 'react';
import {createPortal} from 'react-dom';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

import {ContentEditable} from '@lexical/react/LexicalContentEditable';


import {$isCodeNode} from '@lexical/code';
import {
  $getNearestNodeFromDOMNode,
  $getSelection,
  $setSelection,
  LexicalEditor,
} from 'lexical';

import {useDebounce} from './hooks';
import {Options} from 'prettier';

interface Props {
  lang: string;
  editor: LexicalEditor;
  getCodeDOMNode: () => HTMLElement | null;
}

const PRETTIER_PARSER_MODULES = {
  css: () => import('prettier/parser-postcss'),
  html: () => import('prettier/parser-html'),
  js: () => import('prettier/parser-babel'),
  markdown: () => import('prettier/parser-markdown'),
} as const;

type LanguagesType = keyof typeof PRETTIER_PARSER_MODULES;

async function loadPrettierParserByLang(lang: string) {
  const dynamicImport = PRETTIER_PARSER_MODULES[lang as LanguagesType];
  return await dynamicImport();
}

async function loadPrettierFormat() {
  const {format} = await import('prettier/standalone');
  return format;
}

const PRETTIER_OPTIONS_BY_LANG: Record<string, Options> = {
  css: {
    parser: 'css',
  },
  html: {
    parser: 'html',
  },
  js: {
    parser: 'babel',
  },
  markdown: {
    parser: 'markdown',
  },
};

const LANG_CAN_BE_PRETTIER = Object.keys(PRETTIER_OPTIONS_BY_LANG);

export function canBePrettier(lang: string): boolean {
  return LANG_CAN_BE_PRETTIER.includes(lang);
}

function getPrettierOptions(lang: string): Options {
  const options = PRETTIER_OPTIONS_BY_LANG[lang];
  if (!options) {
    throw new Error(
      `CodeActionMenuPlugin: Prettier does not support this language: ${lang}`,
    );
  }

  return options;
}

export function PrettierButton({lang, editor, getCodeDOMNode}: Props) {
  const [syntaxError, setSyntaxError] = useState<string>('');
  const [tipsVisible, setTipsVisible] = useState<boolean>(false);

  async function handleClick(): Promise<void> {
    const codeDOMNode = getCodeDOMNode();

    try {
      const format = await loadPrettierFormat();
      const options = getPrettierOptions(lang);
      options.plugins = [await loadPrettierParserByLang(lang)];

      if (!codeDOMNode) {
        return;
      }

      editor.update(() => {
        const codeNode = $getNearestNodeFromDOMNode(codeDOMNode);

        if ($isCodeNode(codeNode)) {
          const content = codeNode.getTextContent();

          let parsed = '';

          try {
            parsed = format(content, options);
          } catch (error: unknown) {
            setError(error);
          }

          if (parsed !== '') {
            const selection = codeNode.select(0);
            selection.insertText(parsed);
            setSyntaxError('');
            setTipsVisible(false);
          }
        }
      });
    } catch (error: unknown) {
      setError(error);
    }
  }

  function setError(error: unknown) {
    if (error instanceof Error) {
      setSyntaxError(error.message);
      setTipsVisible(true);
    } else {
      console.error('Unexpected error: ', error);
    }
  }

  function handleMouseEnter() {
    if (syntaxError !== '') {
      setTipsVisible(true);
    }
  }

  function handleMouseLeave() {
    if (syntaxError !== '') {
      setTipsVisible(false);
    }
  }

  return (
    <div className="prettier-wrapper">
      <button
        className="menu-item"
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        aria-label="prettier">
        {syntaxError ? (
          <i className="format prettier-error" />
        ) : (
          <i className="format prettier" />
        )}
      </button>
      {tipsVisible ? (
        <pre className="code-error-tips">{syntaxError}</pre>
      ) : null}
    </div>
  );
}

interface Props {
  editor: LexicalEditor;
  getCodeDOMNode: () => HTMLElement | null;
}

export function CopyButton({editor, getCodeDOMNode}: Props) {
  const [isCopyCompleted, setCopyCompleted] = useState<boolean>(false);

  const removeSuccessIcon = useDebounce(() => {
    setCopyCompleted(false);
  }, 1000);

  async function handleClick(): Promise<void> {
    const codeDOMNode = getCodeDOMNode();

    if (!codeDOMNode) {
      return;
    }

    let content = '';

    editor.update(() => {
      const codeNode = $getNearestNodeFromDOMNode(codeDOMNode);

      if ($isCodeNode(codeNode)) {
        content = codeNode.getTextContent();
      }

      const selection = $getSelection();
      $setSelection(selection);
    });

    try {
      await navigator.clipboard.writeText(content);
      setCopyCompleted(true);
      removeSuccessIcon();
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  }

  return (
    <button className="menu-item" onClick={handleClick} aria-label="copy">
      {isCopyCompleted ? (
        <i className="format success" />
      ) : (
        <i className="format copy" />
      )}
    </button>
  );
}




export function LexicalContentEditable({
  className,
}: {
  className?: string;
}): JSX.Element {
  return <ContentEditable className={className || 'ContentEditable__root'} />;
}


export function DropdownColorPicker({
    disabled = false,
    stopCloseOnClickSelf = true,
    color,
    onChange,
    ...rest
  }: {
    disabled?: boolean;
    buttonAriaLabel?: string;
    buttonClassName: string;
    buttonIconClassName?: string;
    buttonLabel?: string;
    title?: string;
    stopCloseOnClickSelf?: boolean;
    color: string;
    onChange?: (color: string, skipHistoryStack: boolean) => void;
  }) {
    return (
      <DropDown
        {...rest}
        disabled={disabled}
        stopCloseOnClickSelf={stopCloseOnClickSelf}>
        <ColorPicker color={color} onChange={onChange} />
      </DropDown>
    );
  }

let skipAddingToHistoryStack = false;

interface ColorPickerProps {
  color: string;
  onChange?: (value: string, skipHistoryStack: boolean) => void;
}

const basicColors = [
  '#d0021b',
  '#f5a623',
  '#f8e71c',
  '#8b572a',
  '#7ed321',
  '#417505',
  '#bd10e0',
  '#9013fe',
  '#4a90e2',
  '#50e3c2',
  '#b8e986',
  '#000000',
  '#4a4a4a',
  '#9b9b9b',
  '#ffffff',
];

const WIDTH = 214;
const HEIGHT = 150;

export function ColorPicker({
  color,
  onChange,
}: Readonly<ColorPickerProps>): JSX.Element {
  const [selfColor, setSelfColor] = useState(transformColor('hex', color));
  const [inputColor, setInputColor] = useState(color);
  const innerDivRef = useRef(null);

  const saturationPosition = useMemo(
    () => ({
      x: (selfColor.hsv.s / 100) * WIDTH,
      y: ((100 - selfColor.hsv.v) / 100) * HEIGHT,
    }),
    [selfColor.hsv.s, selfColor.hsv.v],
  );

  const huePosition = useMemo(
    () => ({
      x: (selfColor.hsv.h / 360) * WIDTH,
    }),
    [selfColor.hsv],
  );

  const onSetHex = (hex: string) => {
    setInputColor(hex);
    if (/^#[0-9A-Fa-f]{6}$/i.test(hex)) {
      const newColor = transformColor('hex', hex);
      setSelfColor(newColor);
    }
  };

  const onMoveSaturation = ({x, y}: Position) => {
    const newHsv = {
      ...selfColor.hsv,
      s: (x / WIDTH) * 100,
      v: 100 - (y / HEIGHT) * 100,
    };
    const newColor = transformColor('hsv', newHsv);
    setSelfColor(newColor);
    setInputColor(newColor.hex);
  };

  const onMoveHue = ({x}: Position) => {
    const newHsv = {...selfColor.hsv, h: (x / WIDTH) * 360};
    const newColor = transformColor('hsv', newHsv);

    setSelfColor(newColor);
    setInputColor(newColor.hex);
  };

  useEffect(() => {
    // Check if the dropdown is actually active
    if (innerDivRef.current !== null && onChange) {
      onChange(selfColor.hex, skipAddingToHistoryStack);
      setInputColor(selfColor.hex);
    }
  }, [selfColor, onChange]);

  useEffect(() => {
    if (color === undefined) {
      return;
    }
    const newColor = transformColor('hex', color);
    setSelfColor(newColor);
    setInputColor(newColor.hex);
  }, [color]);

  return (
    <div
      className="color-picker-wrapper"
      style={{width: WIDTH}}
      ref={innerDivRef}>
      <TextInput label="Hex" onChange={onSetHex} value={inputColor} />
      <div className="color-picker-basic-color">
        {basicColors.map((basicColor) => (
          <button
            className={basicColor === selfColor.hex ? ' active' : ''}
            key={basicColor}
            style={{backgroundColor: basicColor}}
            onClick={() => {
              setInputColor(basicColor);
              setSelfColor(transformColor('hex', basicColor));
            }}
          />
        ))}
      </div>
      <MoveWrapper
        className="color-picker-saturation"
        style={{backgroundColor: `hsl(${selfColor.hsv.h}, 100%, 50%)`}}
        onChange={onMoveSaturation}>
        <div
          className="color-picker-saturation_cursor"
          style={{
            backgroundColor: selfColor.hex,
            left: saturationPosition.x,
            top: saturationPosition.y,
          }}
        />
      </MoveWrapper>
      <MoveWrapper className="color-picker-hue" onChange={onMoveHue}>
        <div
          className="color-picker-hue_cursor"
          style={{
            backgroundColor: `hsl(${selfColor.hsv.h}, 100%, 50%)`,
            left: huePosition.x,
          }}
        />
      </MoveWrapper>
      <div
        className="color-picker-color"
        style={{backgroundColor: selfColor.hex}}
      />
    </div>
  );
}

export interface Position {
  x: number;
  y: number;
}

interface MoveWrapperProps {
  className?: string;
  style?: React.CSSProperties;
  onChange: (position: Position) => void;
  children: JSX.Element;
}

function MoveWrapper({className, style, onChange, children}: MoveWrapperProps) {
  const divRef = useRef<HTMLDivElement>(null);
  const draggedRef = useRef(false);

  const move = (e: React.MouseEvent | MouseEvent): void => {
    if (divRef.current) {
      const {current: div} = divRef;
      const {width, height, left, top} = div.getBoundingClientRect();

      const x = clamp(e.clientX - left, width, 0);
      const y = clamp(e.clientY - top, height, 0);

      onChange({x, y});
    }
  };

  const onMouseDown = (e: React.MouseEvent): void => {
    if (e.button !== 0) {
      return;
    }

    move(e);

    const onMouseMove = (_e: MouseEvent): void => {
      draggedRef.current = true;
      skipAddingToHistoryStack = true;
      move(_e);
    };

    const onMouseUp = (_e: MouseEvent): void => {
      if (draggedRef.current) {
        skipAddingToHistoryStack = false;
      }

      document.removeEventListener('mousemove', onMouseMove, false);
      document.removeEventListener('mouseup', onMouseUp, false);

      move(_e);
      draggedRef.current = false;
    };

    document.addEventListener('mousemove', onMouseMove, false);
    document.addEventListener('mouseup', onMouseUp, false);
  };

  return (
    <div
      ref={divRef}
      className={className}
      style={style}
      onMouseDown={onMouseDown}>
      {children}
    </div>
  );
}

function clamp(value: number, max: number, min: number) {
  return value > max ? max : value < min ? min : value;
}

interface RGB {
  b: number;
  g: number;
  r: number;
}
interface HSV {
  h: number;
  s: number;
  v: number;
}
interface Color {
  hex: string;
  hsv: HSV;
  rgb: RGB;
}

export function toHex(value: string): string {
  if (!value.startsWith('#')) {
    const ctx = document.createElement('canvas').getContext('2d');

    if (!ctx) {
      throw new Error('2d context not supported or canvas already initialized');
    }

    ctx.fillStyle = value;

    return ctx.fillStyle;
  } else if (value.length === 4 || value.length === 5) {
    value = value
      .split('')
      .map((v, i) => (i ? v + v : '#'))
      .join('');

    return value;
  } else if (value.length === 7 || value.length === 9) {
    return value;
  }

  return '#000000';
}

function hex2rgb(hex: string): RGB {
  const rbgArr = (
    hex
      .replace(
        /^#?([a-f\d])([a-f\d])([a-f\d])$/i,
        (m, r, g, b) => '#' + r + r + g + g + b + b,
      )
      .substring(1)
      .match(/.{2}/g) || []
  ).map((x) => parseInt(x, 16));

  return {
    b: rbgArr[2],
    g: rbgArr[1],
    r: rbgArr[0],
  };
}

function rgb2hsv({r, g, b}: RGB): HSV {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);

  const h = d
    ? (max === r
        ? (g - b) / d + (g < b ? 6 : 0)
        : max === g
        ? 2 + (b - r) / d
        : 4 + (r - g) / d) * 60
    : 0;
  const s = max ? (d / max) * 100 : 0;
  const v = max * 100;

  return {h, s, v};
}

function hsv2rgb({h, s, v}: HSV): RGB {
  s /= 100;
  v /= 100;

  const i = ~~(h / 60);
  const f = h / 60 - i;
  const p = v * (1 - s);
  const q = v * (1 - s * f);
  const t = v * (1 - s * (1 - f));
  const index = i % 6;

  const r = Math.round([v, q, p, p, t, v][index] * 255);
  const g = Math.round([t, v, v, q, p, p][index] * 255);
  const b = Math.round([p, p, t, v, v, q][index] * 255);

  return {b, g, r};
}

function rgb2hex({b, g, r}: RGB): string {
  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

function transformColor<M extends keyof Color, C extends Color[M]>(
  format: M,
  color: C,
): Color {
  let hex: Color['hex'] = toHex('#121212');
  let rgb: Color['rgb'] = hex2rgb(hex);
  let hsv: Color['hsv'] = rgb2hsv(rgb);

  if (format === 'hex') {
    const value = color as Color['hex'];

    hex = toHex(value);
    rgb = hex2rgb(hex);
    hsv = rgb2hsv(rgb);
  } else if (format === 'rgb') {
    const value = color as Color['rgb'];

    rgb = value;
    hex = rgb2hex(rgb);
    hsv = rgb2hsv(rgb);
  } else if (format === 'hsv') {
    const value = color as Color['hsv'];

    hsv = value;
    rgb = hsv2rgb(hsv);
    hex = rgb2hex(rgb);
  }

  return {hex, hsv, rgb};
}




export function DialogButtonsList({children}: Readonly<{
    'data-test-id'?: string;
    children: ReactNode;
  }>): JSX.Element {
    return <div className="DialogButtonsList">{children}</div>;
  }
  
  export function DialogActions({
    'data-test-id': dataTestId,
    children,
  }: Readonly<{
    'data-test-id'?: string;
    children: ReactNode;
  }>): JSX.Element {
    return (
      <div className="DialogActions" data-test-id={dataTestId}>
        {children}
      </div>
    );
  }
  

type DropDownContextType = {registerItem: (ref: React.RefObject<HTMLButtonElement>) => void;};

const DropDownContext = React.createContext<DropDownContextType | null>(null);

const dropDownPadding = 4;

export function DropDownItem({
  children,
  className,
  onClick,
  title,
}: {
  children: React.ReactNode;
  className: string;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  title?: string;
}) {
  const ref = useRef<HTMLButtonElement>(null);

  const dropDownContext = React.useContext(DropDownContext);

  if (dropDownContext === null) {
    throw new Error('DropDownItem must be used within a DropDown');
  }

  const {registerItem} = dropDownContext;

  useEffect(() => {
    if (ref && ref.current) {
      registerItem(ref);
    }
  }, [ref, registerItem]);

  return (
    <button
      className={className}
      onClick={onClick}
      ref={ref}
      title={title}
      type="button">
      {children}
    </button>
  );
}

function DropDownItems({
  children,
  dropDownRef,
  onClose,
}: {
  children: React.ReactNode;
  dropDownRef: React.Ref<HTMLDivElement>;
  onClose: () => void;
}) {
  const [items, setItems] = useState<React.RefObject<HTMLButtonElement>[]>();
  const [highlightedItem, setHighlightedItem] =
    useState<React.RefObject<HTMLButtonElement>>();

  const registerItem = useCallback(
    (itemRef: React.RefObject<HTMLButtonElement>) => {
      setItems((prev) => (prev ? [...prev, itemRef] : [itemRef]));
    },
    [setItems],
  );

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!items) {
      return;
    }

    const key = event.key;

    if (['Escape', 'ArrowUp', 'ArrowDown', 'Tab'].includes(key)) {
      event.preventDefault();
    }

    if (key === 'Escape' || key === 'Tab') {
      onClose();
    } else if (key === 'ArrowUp') {
      setHighlightedItem((prev) => {
        if (!prev) {
          return items[0];
        }
        const index = items.indexOf(prev) - 1;
        return items[index === -1 ? items.length - 1 : index];
      });
    } else if (key === 'ArrowDown') {
      setHighlightedItem((prev) => {
        if (!prev) {
          return items[0];
        }
        return items[items.indexOf(prev) + 1];
      });
    }
  };

  const contextValue = useMemo(
    () => ({
      registerItem,
    }),
    [registerItem],
  );

  useEffect(() => {
    if (items && !highlightedItem) {
      setHighlightedItem(items[0]);
    }

    if (highlightedItem && highlightedItem.current) {
      highlightedItem.current.focus();
    }
  }, [items, highlightedItem]);

  return (
    <DropDownContext.Provider value={contextValue}>
      <div className="dropdown" ref={dropDownRef} onKeyDown={handleKeyDown}>
        {children}
      </div>
    </DropDownContext.Provider>
  );
}

export function DropDown({
  disabled = false,
  buttonLabel,
  buttonAriaLabel,
  buttonClassName,
  buttonIconClassName,
  children,
  stopCloseOnClickSelf,
}: {
  disabled?: boolean;
  buttonAriaLabel?: string;
  buttonClassName: string;
  buttonIconClassName?: string;
  buttonLabel?: string;
  children: ReactNode;
  stopCloseOnClickSelf?: boolean;
}): JSX.Element {
  const dropDownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [showDropDown, setShowDropDown] = useState(false);

  const handleClose = () => {
    setShowDropDown(false);
    if (buttonRef && buttonRef.current) {
      buttonRef.current.focus();
    }
  };

  useEffect(() => {
    const button = buttonRef.current;
    const dropDown = dropDownRef.current;

    if (showDropDown && button !== null && dropDown !== null) {
      const {top, left} = button.getBoundingClientRect();
      dropDown.style.top = `${top + button.offsetHeight + dropDownPadding}px`;
      dropDown.style.left = `${Math.min(
        left,
        window.innerWidth - dropDown.offsetWidth - 20,
      )}px`;
    }
  }, [dropDownRef, buttonRef, showDropDown]);

  useEffect(() => {
    const button = buttonRef.current;

    if (button !== null && showDropDown) {
      const handle = (event: MouseEvent) => {
        const target = event.target;
        if (stopCloseOnClickSelf) {
          if (
            dropDownRef.current &&
            dropDownRef.current.contains(target as Node)
          ) {
            return;
          }
        }
        if (!button.contains(target as Node)) {
          setShowDropDown(false);
        }
      };
      document.addEventListener('click', handle);

      return () => {
        document.removeEventListener('click', handle);
      };
    }
  }, [dropDownRef, buttonRef, showDropDown, stopCloseOnClickSelf]);

  useEffect(() => {
    const handleButtonPositionUpdate = () => {
      if (showDropDown) {
        const button = buttonRef.current;
        const dropDown = dropDownRef.current;
        if (button !== null && dropDown !== null) {
          const {top} = button.getBoundingClientRect();
          const newPosition = top + button.offsetHeight + dropDownPadding;
          if (newPosition !== dropDown.getBoundingClientRect().top) {
            dropDown.style.top = `${newPosition}px`;
          }
        }
      }
    };

    document.addEventListener('scroll', handleButtonPositionUpdate);

    return () => {
      document.removeEventListener('scroll', handleButtonPositionUpdate);
    };
  }, [buttonRef, dropDownRef, showDropDown]);

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        aria-label={buttonAriaLabel || buttonLabel}
        className={buttonClassName}
        onClick={() => setShowDropDown(!showDropDown)}
        ref={buttonRef}>
        {buttonIconClassName && <span className={buttonIconClassName} />}
        {buttonLabel && (
          <span className="text dropdown-button-text">{buttonLabel}</span>
        )}
        <i className="chevron-down" />
      </button>

      {showDropDown &&
        createPortal(
          <DropDownItems dropDownRef={dropDownRef} onClose={handleClose}>
            {children}
          </DropDownItems>,
          document.body,
        )}
    </>
  );
}



type BaseEquationEditorProps = {
    equation: string;
    inline: boolean;
    setEquation: (equation: string) => void;
  };
  
  function _EquationEditor(
    {equation, setEquation, inline}: BaseEquationEditorProps,
    forwardedRef: Ref<HTMLInputElement | HTMLTextAreaElement>,
  ): JSX.Element {
    const onChange = (event: ChangeEvent) => {
      setEquation((event.target as HTMLInputElement).value);
    };
  
    return inline && forwardedRef instanceof HTMLInputElement ? (
      <span className="EquationEditor_inputBackground">
        <span className="EquationEditor_dollarSign">$</span>
        <input
          className="EquationEditor_inlineEditor"
          value={equation}
          onChange={onChange}
          autoFocus={true}
          ref={forwardedRef as RefObject<HTMLInputElement>}
        />
        <span className="EquationEditor_dollarSign">$</span>
      </span>
    ) : (
      <div className="EquationEditor_inputBackground">
        <span className="EquationEditor_dollarSign">{'$$\n'}</span>
        <textarea
          className="EquationEditor_blockEditor"
          value={equation}
          onChange={onChange}
          ref={forwardedRef as RefObject<HTMLTextAreaElement>}
        />
        <span className="EquationEditor_dollarSign">{'\n$$'}</span>
      </div>
    );
  }
  
  export const EquationEditor=  forwardRef(_EquationEditor);


export function FileInput({
    accept,
    label,
    onChange,
    'data-test-id': dataTestId,
  }: Readonly<{
    'data-test-id'?: string;
    accept?: string;
    label: string;
    onChange: (files: FileList | null) => void;
  }>): JSX.Element {
    return (
      <div className="Input__wrapper">
        <label className="Input__label">{label}</label>
        <input
          type="file"
          accept={accept}
          className="Input__input"
          onChange={(e) => onChange(e.target.files)}
          data-test-id={dataTestId}
        />
      </div>
    );
  }


export function KatexEquationAlterer({
    onConfirm,
    initialEquation = '',
  }: {
    initialEquation?: string;
    onConfirm: (equation: string, inline: boolean) => void;
  }): JSX.Element {
    const [editor] = useLexicalComposerContext();
    const [equation, setEquation] = useState<string>(initialEquation);
    const [inline, setInline] = useState<boolean>(true);
  
    const onClick = useCallback(() => {
      onConfirm(equation, inline);
    }, [onConfirm, equation, inline]);
  
    const onCheckboxChange = useCallback(() => {
      setInline(!inline);
    }, [setInline, inline]);
  
    return (
      <>
        <div className="KatexEquationAlterer_defaultRow">
          Inline
          <input type="checkbox" checked={inline} onChange={onCheckboxChange} />
        </div>
        <div className="KatexEquationAlterer_defaultRow">Equation </div>
        <div className="KatexEquationAlterer_centerRow">
          {inline ? (
            <input
              onChange={(event) => {
                setEquation(event.target.value);
              }}
              value={equation}
              className="KatexEquationAlterer_textArea"
            />
          ) : (
            <textarea
              onChange={(event) => {
                setEquation(event.target.value);
              }}
              value={equation}
              className="KatexEquationAlterer_textArea"
            />
          )}
        </div>
        <div className="KatexEquationAlterer_defaultRow">Visualization </div>
        <div className="KatexEquationAlterer_centerRow">
          <ErrorBoundary onError={(e) => editor._onError(e)} fallback={null}>
            <KatexRenderer
              equation={equation}
              inline={false}
              onDoubleClick={() => null}
            />
          </ErrorBoundary>
        </div>
        <div className="KatexEquationAlterer_dialogActions">
          <Button onClick={onClick}>Confirm</Button>
        </div>
      </>
    );
  }


function clamp(value: number, min: number, max: number) {return Math.min(Math.max(value, min), max);}

const Direction = { east: 1 << 0, north: 1 << 3, south: 1 << 1, west: 1 << 2,};

export function ImageResizer({
  onResizeStart,
  onResizeEnd,
  buttonRef,
  imageRef,
  maxWidth,
  editor,
  showCaption,
  setShowCaption,
  captionsEnabled,
}: {
  editor: LexicalEditor;
  buttonRef: {current: null | HTMLButtonElement};
  imageRef: {current: null | HTMLElement};
  maxWidth?: number;
  onResizeEnd: (width: 'inherit' | number, height: 'inherit' | number) => void;
  onResizeStart: () => void;
  setShowCaption: (show: boolean) => void;
  showCaption: boolean;
  captionsEnabled: boolean;
}): JSX.Element {
  const controlWrapperRef = useRef<HTMLDivElement>(null);
  const userSelect = useRef({
    priority: '',
    value: 'default',
  });
  const positioningRef = useRef<{
    currentHeight: 'inherit' | number;
    currentWidth: 'inherit' | number;
    direction: number;
    isResizing: boolean;
    ratio: number;
    startHeight: number;
    startWidth: number;
    startX: number;
    startY: number;
  }>({
    currentHeight: 0,
    currentWidth: 0,
    direction: 0,
    isResizing: false,
    ratio: 0,
    startHeight: 0,
    startWidth: 0,
    startX: 0,
    startY: 0,
  });
  const editorRootElement = editor.getRootElement();
  // Find max width, accounting for editor padding.
  const maxWidthContainer = maxWidth
    ? maxWidth
    : editorRootElement !== null
    ? editorRootElement.getBoundingClientRect().width - 20
    : 100;
  const maxHeightContainer =
    editorRootElement !== null
      ? editorRootElement.getBoundingClientRect().height - 20
      : 100;

  const minWidth = 100;
  const minHeight = 100;

  const setStartCursor = (direction: number) => {
    const ew = direction === Direction.east || direction === Direction.west;
    const ns = direction === Direction.north || direction === Direction.south;
    const nwse =
      (direction & Direction.north && direction & Direction.west) ||
      (direction & Direction.south && direction & Direction.east);

    const cursorDir = ew ? 'ew' : ns ? 'ns' : nwse ? 'nwse' : 'nesw';

    if (editorRootElement !== null) {
      editorRootElement.style.setProperty(
        'cursor',
        `${cursorDir}-resize`,
        'important',
      );
    }
    if (document.body !== null) {
      document.body.style.setProperty(
        'cursor',
        `${cursorDir}-resize`,
        'important',
      );
      userSelect.current.value = document.body.style.getPropertyValue(
        '-webkit-user-select',
      );
      userSelect.current.priority = document.body.style.getPropertyPriority(
        '-webkit-user-select',
      );
      document.body.style.setProperty(
        '-webkit-user-select',
        `none`,
        'important',
      );
    }
  };

  const setEndCursor = () => {
    if (editorRootElement !== null) {
      editorRootElement.style.setProperty('cursor', 'text');
    }
    if (document.body !== null) {
      document.body.style.setProperty('cursor', 'default');
      document.body.style.setProperty(
        '-webkit-user-select',
        userSelect.current.value,
        userSelect.current.priority,
      );
    }
  };

  const handlePointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
    direction: number,
  ) => {
    if (!editor.isEditable()) {
      return;
    }

    const image = imageRef.current;
    const controlWrapper = controlWrapperRef.current;

    if (image !== null && controlWrapper !== null) {
      event.preventDefault();
      const {width, height} = image.getBoundingClientRect();
      const positioning = positioningRef.current;
      positioning.startWidth = width;
      positioning.startHeight = height;
      positioning.ratio = width / height;
      positioning.currentWidth = width;
      positioning.currentHeight = height;
      positioning.startX = event.clientX;
      positioning.startY = event.clientY;
      positioning.isResizing = true;
      positioning.direction = direction;

      setStartCursor(direction);
      onResizeStart();

      controlWrapper.classList.add('image-control-wrapper--resizing');
      image.style.height = `${height}px`;
      image.style.width = `${width}px`;

      document.addEventListener('pointermove', handlePointerMove);
      document.addEventListener('pointerup', handlePointerUp);
    }
  };
  const handlePointerMove = (event: PointerEvent) => {
    const image = imageRef.current;
    const positioning = positioningRef.current;

    const isHorizontal =
      positioning.direction & (Direction.east | Direction.west);
    const isVertical =
      positioning.direction & (Direction.south | Direction.north);

    if (image !== null && positioning.isResizing) {
      // Corner cursor
      if (isHorizontal && isVertical) {
        let diff = Math.floor(positioning.startX - event.clientX);
        diff = positioning.direction & Direction.east ? -diff : diff;

        const width = clamp(
          positioning.startWidth + diff,
          minWidth,
          maxWidthContainer,
        );

        const height = width / positioning.ratio;
        image.style.width = `${width}px`;
        image.style.height = `${height}px`;
        positioning.currentHeight = height;
        positioning.currentWidth = width;
      } else if (isVertical) {
        let diff = Math.floor(positioning.startY - event.clientY);
        diff = positioning.direction & Direction.south ? -diff : diff;

        const height = clamp(
          positioning.startHeight + diff,
          minHeight,
          maxHeightContainer,
        );

        image.style.height = `${height}px`;
        positioning.currentHeight = height;
      } else {
        let diff = Math.floor(positioning.startX - event.clientX);
        diff = positioning.direction & Direction.east ? -diff : diff;

        const width = clamp(
          positioning.startWidth + diff,
          minWidth,
          maxWidthContainer,
        );

        image.style.width = `${width}px`;
        positioning.currentWidth = width;
      }
    }
  };
  const handlePointerUp = () => {
    const image = imageRef.current;
    const positioning = positioningRef.current;
    const controlWrapper = controlWrapperRef.current;
    if (image !== null && controlWrapper !== null && positioning.isResizing) {
      const width = positioning.currentWidth;
      const height = positioning.currentHeight;
      positioning.startWidth = 0;
      positioning.startHeight = 0;
      positioning.ratio = 0;
      positioning.startX = 0;
      positioning.startY = 0;
      positioning.currentWidth = 0;
      positioning.currentHeight = 0;
      positioning.isResizing = false;

      controlWrapper.classList.remove('image-control-wrapper--resizing');

      setEndCursor();
      onResizeEnd(width, height);

      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    }
  };
  return (
    <div ref={controlWrapperRef}>
      {!showCaption && captionsEnabled && (
        <button
          className="image-caption-button"
          ref={buttonRef}
          onClick={() => {
            setShowCaption(!showCaption);
          }}>
          Add Caption
        </button>
      )}
      <div
        className="image-resizer image-resizer-n"
        onPointerDown={(event) => {
          handlePointerDown(event, Direction.north);
        }}
      />
      <div
        className="image-resizer image-resizer-ne"
        onPointerDown={(event) => {
          handlePointerDown(event, Direction.north | Direction.east);
        }}
      />
      <div
        className="image-resizer image-resizer-e"
        onPointerDown={(event) => {
          handlePointerDown(event, Direction.east);
        }}
      />
      <div
        className="image-resizer image-resizer-se"
        onPointerDown={(event) => {
          handlePointerDown(event, Direction.south | Direction.east);
        }}
      />
      <div
        className="image-resizer image-resizer-s"
        onPointerDown={(event) => {
          handlePointerDown(event, Direction.south);
        }}
      />
      <div
        className="image-resizer image-resizer-sw"
        onPointerDown={(event) => {
          handlePointerDown(event, Direction.south | Direction.west);
        }}
      />
      <div
        className="image-resizer image-resizer-w"
        onPointerDown={(event) => {
          handlePointerDown(event, Direction.west);
        }}
      />
      <div
        className="image-resizer image-resizer-nw"
        onPointerDown={(event) => {
          handlePointerDown(event, Direction.north | Direction.west);
        }}
      />
    </div>
  );
}

export function Switch({
    checked,
    onClick,
    text,
    id,
  }: Readonly<{
    checked: boolean;
    id?: string;
    onClick: (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
    text: string;
  }>): JSX.Element {
    const buttonId = useMemo(() => 'id_' + Math.floor(Math.random() * 10000), []);
    return (
      <div className="switch" id={id}>
        <label htmlFor={buttonId}>{text}</label>
        <button
          role="switch"
          aria-checked={checked}
          id={buttonId}
          onClick={onClick}>
          <span />
        </button>
      </div>
    );
  }

type SelectIntrinsicProps = JSX.IntrinsicElements['select'];
interface SelectProps extends SelectIntrinsicProps {
  label: string;
}

export function Select({
  children,
  label,
  className,
  ...other
}: SelectProps): JSX.Element {
  return (
    <div className="Input__wrapper">
      <label style={{marginTop: '-1em'}} className="Input__label">
        {label}
      </label>
      <select {...other} className={className || 'select'}>
        {children}
      </select>
    </div>
  );
}



export function Placeholder({
    children,
    className,
  }: {
    children: ReactNode;
    className?: string;
  }): JSX.Element {
    return <div className={className || 'Placeholder__root'}>{children}</div>;
  }




function PortalImpl({
  onClose,
  children,
  title,
  closeOnClickOutside,
}: {
  children: ReactNode;
  closeOnClickOutside: boolean;
  onClose: () => void;
  title: string;
}) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (modalRef.current !== null) {
      modalRef.current.focus();
    }
  }, []);

  useEffect(() => {
    let modalOverlayElement: HTMLElement | null = null;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    const clickOutsideHandler = (event: MouseEvent) => {
      const target = event.target;
      if (
        modalRef.current !== null &&
        !modalRef.current.contains(target as Node) &&
        closeOnClickOutside
      ) {
        onClose();
      }
    };
    const modelElement = modalRef.current;
    if (modelElement !== null) {
      modalOverlayElement = modelElement.parentElement;
      if (modalOverlayElement !== null) {
        modalOverlayElement.addEventListener('click', clickOutsideHandler);
      }
    }

    window.addEventListener('keydown', handler);

    return () => {
      window.removeEventListener('keydown', handler);
      if (modalOverlayElement !== null) {
        modalOverlayElement?.removeEventListener('click', clickOutsideHandler);
      }
    };
  }, [closeOnClickOutside, onClose]);

  return (
    <div className="Modal__overlay" role="dialog">
      <div className="Modal__modal" tabIndex={-1} ref={modalRef}>
        <h2 className="Modal__title">{title}</h2>
        <button
          className="Modal__closeButton"
          aria-label="Close modal"
          type="button"
          onClick={onClose}>
          X
        </button>
        <div className="Modal__content">{children}</div>
      </div>
    </div>
  );
}

export function Modal({
  onClose,
  children,
  title,
  closeOnClickOutside = false,
}: {
  children: ReactNode;
  closeOnClickOutside?: boolean;
  onClose: () => void;
  title: string;
}): JSX.Element {
  return createPortal(
    <PortalImpl
      onClose={onClose}
      title={title}
      closeOnClickOutside={closeOnClickOutside}>
      {children}
    </PortalImpl>,
    document.body,
  );
}

export function TextInput({
    label,
    value,
    onChange,
    placeholder = '',
    'data-test-id': dataTestId,
    type = 'text',
}: Readonly<{
    'data-test-id'?: string;
    label: string;
    onChange: (val: string) => void;
    placeholder?: string;
    value: string;
    type?: HTMLInputTypeAttribute;
}>): JSX.Element {
    return (
        <div className="Input__wrapper">
            <label className="Input__label">{label}</label>
            <input
                type={type}
                className="Input__input"
                placeholder={placeholder}
                value={value}
                onChange={(e) => {
                    onChange(e.target.value);
                }}
                data-test-id={dataTestId}
            />
        </div>
    );
}
export function KatexRenderer({
    equation,
    inline,
    onDoubleClick,
}: Readonly<{
    equation: string;
    inline: boolean;
    onDoubleClick: () => void;
}>): JSX.Element {
    const katexElementRef = useRef(null);

    useEffect(() => {
        const katexElement = katexElementRef.current;

        if (katexElement !== null) {
            katex.render(equation, katexElement, {
                displayMode: !inline, // true === block display //
                errorColor: '#cc0000',
                output: 'html',
                strict: 'warn',
                throwOnError: false,
                trust: false,
            });
        }
    }, [equation, inline]);

    return (
        // We use an empty image tag either side to ensure Android doesn't try and compose from the
        // inner text from Katex. There didn't seem to be any other way of making this work,
        // without having a physical space.
        <>
            <img src="#" alt="" />
            <span
                role="button"
                tabIndex={-1}
                onDoubleClick={onDoubleClick}
                ref={katexElementRef}
            />
            <img src="#" alt="" />
        </>
    );
}

export function Button({
    'data-test-id': dataTestId,
    children,
    className,
    onClick,
    disabled,
    small,
    title,
}: {
    'data-test-id'?: string;
    children: ReactNode;
    className?: string;
    disabled?: boolean;
    onClick: () => void;
    small?: boolean;
    title?: string;
}): JSX.Element {
    return (
        <button
            disabled={disabled}
            className={joinClasses(
                'Button__root',
                disabled && 'Button__disabled',
                small && 'Button__small',
                className,
            )}
            onClick={onClick}
            title={title}
            aria-label={title}
            {...(dataTestId && { 'data-test-id': dataTestId })}>
            {children}
        </button>
    );
}
