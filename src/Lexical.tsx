import { $createLinkNode } from '@lexical/link';
import { $createListItemNode, $createListNode } from '@lexical/list';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { $createHeadingNode, $createQuoteNode } from '@lexical/rich-text';
import { $createParagraphNode, $createTextNode, $getRoot, EditorState } from 'lexical';
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';
import { CharacterLimitPlugin } from '@lexical/react/LexicalCharacterLimitPlugin';
import { CheckListPlugin } from '@lexical/react/LexicalCheckListPlugin';
import { ClearEditorPlugin } from '@lexical/react/LexicalClearEditorPlugin';
import LexicalClickableLinkPlugin from '@lexical/react/LexicalClickableLinkPlugin';
import { CollaborationPlugin } from '@lexical/react/LexicalCollaborationPlugin';
import LexicalErrorBoundary from '@lexical/react/LexicalErrorBoundary';
import { HashtagPlugin } from '@lexical/react/LexicalHashtagPlugin';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { HorizontalRulePlugin } from '@lexical/react/LexicalHorizontalRulePlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { PlainTextPlugin } from '@lexical/react/LexicalPlainTextPlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { TabIndentationPlugin } from '@lexical/react/LexicalTabIndentationPlugin';
import useLexicalEditable from '@lexical/react/useLexicalEditable';
import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { useSharedHistoryContext, useSettings, SettingsContext, SharedAutocompleteContext, SharedHistoryContext } from './utils/context';
import { PlaygroundNodes } from "./utils/NODES"

import { Placeholder, Switch } from './utils/LibLexical';
import { baseTheme } from './utils/utils';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import ActionsPlugin from './utils/plugin/ActionsPlugin';
import AutoEmbedPlugin from './utils/plugin/AutoEmbedPlugin';
import AutocompletePlugin from './utils/plugin/AutocompletePlugin';
import CodeActionMenuPlugin from './utils/plugin/CodeActionMenuPlugin';
import CodeHighlightPlugin from './utils/plugin/CodeHighlightPlugin';
import CollapsiblePlugin from './utils/plugin/CollapsiblePlugin';
import CommentPlugin from './utils/plugin/CommentPlugin';
import ContextMenuPlugin from './utils/plugin/ContextMenuPlugin';
import DragDropPaste from './utils/plugin/DragDropPastePlugin';
import DraggableBlockPlugin from './utils/plugin/DraggableBlockPlugin';
import EmojiPickerPlugin from './utils/plugin/EmojiPickerPlugin';
import EmojisPlugin from './utils/plugin/EmojisPlugin';
import EquationsPlugin from './utils/plugin/EquationsPlugin';
import ExcalidrawPlugin from './utils/plugin/ExcalidrawPlugin';
import FigmaPlugin from './utils/plugin/FigmaPlugin';
import FloatingLinkEditorPlugin from './utils/plugin/FloatingLinkEditorPlugin';
import FloatingTextFormatToolbarPlugin from './utils/plugin/FloatingTextFormatToolbarPlugin';
import InlineImagePlugin from './utils/plugin/InlineImagePlugin';
import KeywordsPlugin from './utils/plugin/KeywordsPlugin';
import { LayoutPlugin } from './utils/plugin/LayoutPlugin/LayoutPlugin';
import ListMaxIndentLevelPlugin from './utils/plugin/ListMaxIndentLevelPlugin';
import { MaxLengthPlugin } from './utils/plugin/MaxLengthPlugin';
import PageBreakPlugin from './utils/plugin/PageBreakPlugin';
import PollPlugin from './utils/plugin/PollPlugin';
import TabFocusPlugin from './utils/plugin/TabFocusPlugin';
import TableOfContentsPlugin from './utils/plugin/TableOfContentsPlugin';
import { TablePlugin } from '@lexical/react/LexicalTablePlugin';
import { TableContext } from './utils/plugin/TablePlugin';
import ToolbarPlugin from './utils/plugin/ToolbarPlugin';
import TreeViewPlugin from './utils/plugin/TreeViewPlugin';
import TwitterPlugin from './utils/plugin/TwitterPlugin';
import ImagesPlugin from './utils/plugin/ImagesPlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import TableCellResizer from './utils/plugin/TableCellResizer';
import YouTubePlugin from './utils/plugin/YouTubePlugin';
import { AutoLinkPlugin } from '@lexical/react/LexicalAutoLinkPlugin';
import ComponentPickerPlugin from './utils/plugin/ComponentPickerPlugin';
import MentionsPlugin from './utils/plugin/MentionsPlugin';
import SpeechToTextPlugin from './utils/plugin/SpeechToTextPlugin';
import { useDebouncedCallback } from '@react-hookz/web';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';


function useDebouncedLexicalOnChange<T>(
  getEditorState: (editorState: EditorState) => T,
  callback: (value: T) => void,
  delay: number
) {
  const lastPayloadRef = useRef<T | null>(null);
  const callbackRef = useRef<(arg: T) => void | null>(callback);
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  const callCallbackWithLastPayload = useCallback(() => {
    if (lastPayloadRef.current) {
      callbackRef.current?.(lastPayloadRef.current);
    }
  }, []);
  const call = useDebouncedCallback(callCallbackWithLastPayload, [lastPayloadRef.current], delay);
  const onChange = useCallback(
    (editorState: any) => {
      editorState.read(() => {
        lastPayloadRef.current = getEditorState(editorState);
        call();
      });
    },
    [call, getEditorState]
  );
  return onChange;
}

// ...

const getEditorState = (editorState: EditorState) => ({
  text: $getRoot().getTextContent(),
  stateJson: JSON.stringify(editorState)
});




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

type Settings = typeof DEFAULT_SETTINGS;
function Settings(): JSX.Element {
  const { setOption, settings: { showTreeView, showNestedEditorTreeView }, } = useSettings();
  const [showSettings, setShowSettings] = useState(false);

  return (
    <>
      <button
        id="options-button"
        className={`editor-dev-button ${showSettings ? 'active' : ''}`}
        onClick={() => setShowSettings(!showSettings)}
      />
      {showSettings ? (
        <div className="switches">
          <Switch
            onClick={() => setOption('showTreeView', !showTreeView)}
            checked={showTreeView}
            text="Debug View"
          />
          <Switch
            onClick={() => setOption('showNestedEditorTreeView', !showNestedEditorTreeView)}
            checked={showNestedEditorTreeView}
            text="Nested Editors Debug View"
          />
        </div>
      ) : null}
    </>
  );
}

export function Editor({ onChange_ }: { onChange_: (data: any) => void }): JSX.Element {
  const { historyState } = useSharedHistoryContext();
  const {
    settings: { isRichText, showTreeView, tableCellMerge, tableCellBackgroundColor, showNestedEditorTreeView },
  } = useSettings();
  const isEditable = useLexicalEditable();
  const text = isRichText
    ? 'Enter some rich text...'
    : 'Enter some plain text...';
  const placeholder = <Placeholder>{text}</Placeholder>;
  const [floatingAnchorElem, setFloatingAnchorElem] = useState<HTMLDivElement | null>(null);
  const [isSmallWidthViewport, setIsSmallWidthViewport] = useState<boolean>(false);
  const [isLinkEditMode, setIsLinkEditMode] = useState<boolean>(false);

  const onRef = (_floatingAnchorElem: HTMLDivElement) => { if (_floatingAnchorElem !== null) { setFloatingAnchorElem(_floatingAnchorElem); } };
  const debouncedOnChange = useCallback((value: any) => { onChange_(value) }, []);
  const onChange = useDebouncedLexicalOnChange(getEditorState, debouncedOnChange, 1000);
  useEffect(() => {
    const updateViewPortWidth = () => {
      const isNextSmallWidthViewport = false
      if (isNextSmallWidthViewport !== isSmallWidthViewport) {
        setIsSmallWidthViewport(isNextSmallWidthViewport);
      }
    };
    updateViewPortWidth();
    window.addEventListener('resize', updateViewPortWidth);

    return () => {
      window.removeEventListener('resize', updateViewPortWidth);
    };
  }, [isSmallWidthViewport]);
  const [CHAR_LIMIT, setLimitChar] = useState(2048);

  {/* <>
            <PlainTextPlugin
              contentEditable={<ContentEditable />}
              placeholder={placeholder}
              ErrorBoundary={LexicalErrorBoundary}
            />
          </> */};

  return (
    <>
      <ToolbarPlugin setIsLinkEditMode={setIsLinkEditMode} />
      <div className={`editor-container ${showTreeView ? 'tree-view' : ''} ${!isRichText ? 'plain-text' : ''}`}>
        <DragDropPaste /> <AutoFocusPlugin /> <ClearEditorPlugin /> <ComponentPickerPlugin /> <EmojiPickerPlugin />
        <AutoEmbedPlugin /> <MentionsPlugin /> <EmojisPlugin /> <HashtagPlugin /> <KeywordsPlugin /><CommentPlugin />
        <SpeechToTextPlugin /> <AutoLinkPlugin matchers={[]} />
        <>
          <HistoryPlugin externalHistoryState={historyState} />
          <RichTextPlugin
            contentEditable={
              <div className="editor-scroller">
                <div className="editor" ref={onRef}>
                  <ContentEditable />
                </div>
              </div>
            }
            placeholder={placeholder}
            ErrorBoundary={LexicalErrorBoundary}
          />
          <MarkdownShortcutPlugin /> <CodeHighlightPlugin /> <ListPlugin /> <CheckListPlugin />
          <ListMaxIndentLevelPlugin maxDepth={7} />
          <TablePlugin
            hasCellMerge={tableCellMerge}
            hasCellBackgroundColor={tableCellBackgroundColor}
          />
          <TableCellResizer /> <ImagesPlugin /> <InlineImagePlugin /> <LinkPlugin /> <PollPlugin /> <TwitterPlugin />
          <YouTubePlugin /> <FigmaPlugin />
          {!isEditable && <LexicalClickableLinkPlugin />} <HorizontalRulePlugin />
          <EquationsPlugin /> <ExcalidrawPlugin /> <TabFocusPlugin /> <TabIndentationPlugin /> <CollapsiblePlugin />
          <PageBreakPlugin /><LayoutPlugin />
          {floatingAnchorElem && !isSmallWidthViewport && (
            <>
              <DraggableBlockPlugin anchorElem={floatingAnchorElem} />
              <CodeActionMenuPlugin anchorElem={floatingAnchorElem} />
              <FloatingLinkEditorPlugin
                anchorElem={floatingAnchorElem}
                isLinkEditMode={isLinkEditMode}
                setIsLinkEditMode={setIsLinkEditMode}
              />
              <FloatingTextFormatToolbarPlugin anchorElem={floatingAnchorElem} />
            </>
          )}
        </>
        <CharacterLimitPlugin charset={'UTF-16'} maxLength={CHAR_LIMIT} />
        <MaxLengthPlugin maxLength={CHAR_LIMIT} /> <AutocompletePlugin /> <TableOfContentsPlugin /> <ContextMenuPlugin />
        <ActionsPlugin isRichText={isRichText} />
      </div>
      <OnChangePlugin onChange={onChange} />
      {/* {showTreeView && <TreeViewPlugin />} */}
      <input value={CHAR_LIMIT} onChange={(e) => setLimitChar(parseInt(e.currentTarget.value, 10))} />
    </>
  );
}



function prepopulatedRichText() {
  const root = $getRoot();
  if (root.getFirstChild() === null) {
    const heading = $createHeadingNode('h1');
    heading.append($createTextNode('Welcome to the playground'));
    root.append(heading);
    const quote = $createQuoteNode();
    quote.append(
      $createTextNode(
        `In case you were wondering what the black box at the bottom is – it's the debug view, showing the current state of the editor. ` +
        `You can disable it by pressing on the settings control in the bottom-left of your screen and toggling the debug view setting.`,
      ),
    );
    root.append(quote);
    const paragraph = $createParagraphNode();
    paragraph.append(
      $createTextNode('The playground is a demo environment built with '),
      $createTextNode('@lexical/react').toggleFormat('code'),
      $createTextNode('.'),
      $createTextNode(' Try typing in '),
      $createTextNode('some text').toggleFormat('bold'),
      $createTextNode(' with '),
      $createTextNode('different').toggleFormat('italic'),
      $createTextNode(' formats.'),
    );
    root.append(paragraph);
    const paragraph2 = $createParagraphNode();
    paragraph2.append(
      $createTextNode(
        'Make sure to check out the various plugins in the toolbar. You can also use #hashtags or @-mentions too!',
      ),
    );
    root.append(paragraph2);
    const paragraph3 = $createParagraphNode();
    paragraph3.append(
      $createTextNode(`If you'd like to find out more about Lexical, you can:`),
    );
    root.append(paragraph3);
    const list = $createListNode('bullet');
    list.append(
      $createListItemNode().append(
        $createTextNode(`Visit the `),
        $createLinkNode('https://lexical.dev/').append(
          $createTextNode('Lexical website'),
        ),
        $createTextNode(` for documentation and more information.`),
      ),
      $createListItemNode().append(
        $createTextNode(`Check out the code on our `),
        $createLinkNode('https://github.com/facebook/lexical').append(
          $createTextNode('GitHub repository'),
        ),
        $createTextNode(`.`),
      ),
      $createListItemNode().append(
        $createTextNode(`Playground code can be found `),
        $createLinkNode(
          'https://github.com/facebook/lexical/tree/main/packages/lexical-playground',
        ).append($createTextNode('here')),
        $createTextNode(`.`),
      ),
      $createListItemNode().append(
        $createTextNode(`Join our `),
        $createLinkNode('https://discord.com/invite/KmG4wQnnD9').append(
          $createTextNode('Discord Server'),
        ),
        $createTextNode(` and chat with the team.`),
      ),
    );
    root.append(list);
    const paragraph4 = $createParagraphNode();
    paragraph4.append(
      $createTextNode(
        `Lastly, we're constantly adding cool new features to this playground. So make sure you check back here when you next get a chance :).`,
      ),
    );
    root.append(paragraph4);
  }
}

function App({ onChange, initLexicalData }: { onChange: (data: any) => void, initLexicalData: any }): JSX.Element {
  const { settings: { isCollab, emptyEditor, measureTypingPerf }, } = useSettings();

  const initialConfig = {
    editorState: isCollab ? null : initLexicalData,
    namespace: 'Playground',
    nodes: [...PlaygroundNodes],
    onError: (error: Error) => { throw error; },
    theme: baseTheme,
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <SharedHistoryContext>
        <TableContext>
          <SharedAutocompleteContext>
            <div className="editor-shell"><Editor onChange_={onChange} /></div>
            <Settings />
          </SharedAutocompleteContext>
        </TableContext>
      </SharedHistoryContext>
    </LexicalComposer>
  );
}

export function PlaygroundApp({ initLexicalData, onChange }: { initLexicalData?: any, onChange: (data: any) => void }): JSX.Element {
  return (<div className='Playground_Cpnt'>
    <SettingsContext>
      <App initLexicalData={initLexicalData} onChange={onChange} />
    </SettingsContext>
  </div>
  );
}
