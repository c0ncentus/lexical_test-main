// import {
//     CollapsibleTitleNode, CollapsibleContentNode, CollapsibleContainerNode, EmojisPlugin, FloatingTextFormatToolbarPlugin,
//     KeywordsPlugin, LinkPlugin, TreeViewPlugin
// } from './plugin';
import { BlockWithAlignableContents } from '@lexical/react/LexicalBlockWithAlignableContents';
import { CodeNode, CodeHighlightNode } from '@lexical/code';
import { AutoLinkNode, LinkNode } from '@lexical/link';
import { $createTableCellNode, $createTableNode, $createTableRowNode, $isTableCellNode, $isTableNode, $isTableRowNode, TableCellHeaderStates, TableCellNode, TableNode, TableRowNode } from '@lexical/table';
import { ListNode, ListItemNode } from '@lexical/list';
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';
import { CollaborationPlugin } from '@lexical/react/LexicalCollaborationPlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import LexicalErrorBoundary from '@lexical/react/LexicalErrorBoundary';
import { HashtagPlugin } from '@lexical/react/LexicalHashtagPlugin';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { PlainTextPlugin } from '@lexical/react/LexicalPlainTextPlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { LexicalNestedComposer } from '@lexical/react/LexicalNestedComposer';
import { $convertFromMarkdownString, $convertToMarkdownString, CHECK_LIST, ELEMENT_TRANSFORMERS, ElementTransformer, TEXT_FORMAT_TRANSFORMERS, TEXT_MATCH_TRANSFORMERS, TextMatchTransformer, Transformer, } from '@lexical/markdown';
import { ExcalidrawElement, NonDeleted } from '@excalidraw/excalidraw/types/element/types';
import { AppState, BinaryFiles, ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types/types';
import { addClassNamesToElement, mergeRegister } from '@lexical/utils';
import { $createHorizontalRuleNode, $isHorizontalRuleNode, HorizontalRuleNode } from '@lexical/react/LexicalHorizontalRuleNode';
import { SerializedDecoratorBlockNode, DecoratorBlockNode } from '@lexical/react/LexicalDecoratorBlockNode';
import katex from 'katex';
import { Klass, LexicalNode, $createTextNode, $isParagraphNode, $isTextNode, Spread, SerializedLexicalNode, DOMConversionOutput, DecoratorNode, NodeKey, EditorConfig, DOMConversionMap, LexicalEditor, DOMExportOutput, $isNodeSelection, $getSelection, $getNodeByKey, CLICK_COMMAND, COMMAND_PRIORITY_LOW, KEY_DELETE_COMMAND, KEY_BACKSPACE_COMMAND, ElementFormatType, SerializedEditor, createEditor, $setSelection, BaseSelection, SELECTION_CHANGE_COMMAND, COMMAND_PRIORITY_HIGH, KEY_ESCAPE_COMMAND, $applyNodeReplacement, LexicalCommand, createCommand, $isRangeSelection, DRAGSTART_COMMAND, KEY_ENTER_COMMAND, SerializedTextNode, TextNode, SerializedElementNode, ElementNode } from 'lexical';
import React, { Suspense, ReactPortal, useRef, useState, useEffect, useLayoutEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ErrorBoundary } from 'react-error-boundary';


import { Modal, Button, ImageResizer, Placeholder, EquationEditor, KatexRenderer, TextInput, Select, DialogActions } from './LibLexical';
import { useSharedHistoryContext, useSettings, useSharedAutocompleteContext } from './context';
import emojiList from './emoji-list';
import { useModal } from './hooks';
import { joinClasses, } from './utils';
import { Excalidraw, exportToSvg } from '@excalidraw/excalidraw';
import { useCollaborationContext } from '@lexical/react/LexicalCollaborationContext';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { CollapsibleContainerNode } from './plugin/CollapsiblePlugin/CollapsibleContainerNode';
import { CollapsibleContentNode } from './plugin/CollapsiblePlugin/CollapsibleContentNode';
import { CollapsibleTitleNode } from './plugin/CollapsiblePlugin/CollapsibleTitleNode';
import EmojisPlugin from './plugin/EmojisPlugin';
import FloatingTextFormatToolbarPlugin from './plugin/FloatingTextFormatToolbarPlugin';
import KeywordsPlugin from './plugin/KeywordsPlugin';
import TreeViewPlugin from './plugin/TreeViewPlugin';

// const PollComponent = React.lazy(() => import('./PollComponent'));
// const ImageComponent = React.lazy(() => import('./ImageComponent'));
// const EquationComponent = React.lazy(() => import('./EquationComponent'));
// const StickyComponent = React.lazy(() => import('./StickyComponent'));

type EquationComponentProps = {
    equation: string;
    inline: boolean;
    nodeKey: NodeKey;
  };
  
  export function EquationComponent({
    equation,
    inline,
    nodeKey,
  }: EquationComponentProps): JSX.Element {
    const [editor] = useLexicalComposerContext();
    const [equationValue, setEquationValue] = useState(equation);
    const [showEquationEditor, setShowEquationEditor] = useState<boolean>(false);
    const inputRef = useRef(null);
  
    const onHide = useCallback(
      (restoreSelection?: boolean) => {
        setShowEquationEditor(false);
        editor.update(() => {
          const node = $getNodeByKey(nodeKey);
          if ($isEquationNode(node)) {
            node.setEquation(equationValue);
            if (restoreSelection) {
              node.selectNext(0, 0);
            }
          }
        });
      },
      [editor, equationValue, nodeKey],
    );
  
    useEffect(() => {
      if (!showEquationEditor && equationValue !== equation) {
        setEquationValue(equation);
      }
    }, [showEquationEditor, equation, equationValue]);
  
    useEffect(() => {
      if (showEquationEditor) {
        return mergeRegister(
          editor.registerCommand(
            SELECTION_CHANGE_COMMAND,
            (payload) => {
              const activeElement = document.activeElement;
              const inputElem = inputRef.current;
              if (inputElem !== activeElement) {
                onHide();
              }
              return false;
            },
            COMMAND_PRIORITY_HIGH,
          ),
          editor.registerCommand(
            KEY_ESCAPE_COMMAND,
            (payload) => {
              const activeElement = document.activeElement;
              const inputElem = inputRef.current;
              if (inputElem === activeElement) {
                onHide(true);
                return true;
              }
              return false;
            },
            COMMAND_PRIORITY_HIGH,
          ),
        );
      } else {
        return editor.registerUpdateListener(({editorState}) => {
          const isSelected = editorState.read(() => {
            const selection = $getSelection();
            return (
              $isNodeSelection(selection) &&
              selection.has(nodeKey) &&
              selection.getNodes().length === 1
            );
          });
          if (isSelected) {
            setShowEquationEditor(true);
          }
        });
      }
    }, [editor, nodeKey, onHide, showEquationEditor]);
  
    return (
      <>
        {showEquationEditor ? (
          <EquationEditor
            equation={equationValue}
            setEquation={setEquationValue}
            inline={inline}
            ref={inputRef}
          />
        ) : (
          <ErrorBoundary onError={(e) => editor._onError(e)} fallback={null}>
            <KatexRenderer
              equation={equationValue}
              inline={inline}
              onDoubleClick={() => setShowEquationEditor(true)}
            />
          </ErrorBoundary>
        )}
      </>
    );
  }
  
function LazyImage_({
    altText,
    className,
    imageRef,
    src,
    width,
    height,
    position,
}: {
    altText: string;
    className: string | null;
    height: 'inherit' | number;
    imageRef: { current: null | HTMLImageElement };
    src: string;
    width: 'inherit' | number;
    position: Position;
}): JSX.Element {
    useSuspenseImage(src);
    return (
        <img
            className={className || undefined}
            src={src}
            alt={altText}
            ref={imageRef}
            data-position={position}
            style={{
                display: 'block',
                height,
                width,
            }}
            draggable="false"
        />
    );
}

export function InlineImageComponent({
    src,
    altText,
    nodeKey,
    width,
    height,
    showCaption,
    caption,
    position,
}: {
    altText: string;
    caption: LexicalEditor;
    height: 'inherit' | number;
    nodeKey: NodeKey;
    showCaption: boolean;
    src: string;
    width: 'inherit' | number;
    position: Position;
}): JSX.Element {
    const [modal, showModal] = useModal();
    const imageRef = useRef<null | HTMLImageElement>(null);
    const buttonRef = useRef<HTMLButtonElement | null>(null);
    const [isSelected, setSelected, clearSelection] =
        useLexicalNodeSelection(nodeKey);
    const [editor] = useLexicalComposerContext();
    const [selection, setSelection] = useState<BaseSelection | null>(null);
    const activeEditorRef = useRef<LexicalEditor | null>(null);

    const onDelete = useCallback(
        (payload: KeyboardEvent) => {
            if (isSelected && $isNodeSelection($getSelection())) {
                const event: KeyboardEvent = payload;
                event.preventDefault();
                const node = $getNodeByKey(nodeKey);
                if ($isInlineImageNode(node)) {
                    node.remove();
                    return true;
                }
            }
            return false;
        },
        [isSelected, nodeKey],
    );

    const onEnter = useCallback(
        (event: KeyboardEvent) => {
            const latestSelection = $getSelection();
            const buttonElem = buttonRef.current;
            if (
                isSelected &&
                $isNodeSelection(latestSelection) &&
                latestSelection.getNodes().length === 1
            ) {
                if (showCaption) {
                    // Move focus into nested editor
                    $setSelection(null);
                    event.preventDefault();
                    caption.focus();
                    return true;
                } else if (
                    buttonElem !== null &&
                    buttonElem !== document.activeElement
                ) {
                    event.preventDefault();
                    buttonElem.focus();
                    return true;
                }
            }
            return false;
        },
        [caption, isSelected, showCaption],
    );

    const onEscape = useCallback(
        (event: KeyboardEvent) => {
            if (
                activeEditorRef.current === caption ||
                buttonRef.current === event.target
            ) {
                $setSelection(null);
                editor.update(() => {
                    setSelected(true);
                    const parentRootElement = editor.getRootElement();
                    if (parentRootElement !== null) {
                        parentRootElement.focus();
                    }
                });
                return true;
            }
            return false;
        },
        [caption, editor, setSelected],
    );

    useEffect(() => {
        let isMounted = true;
        const unregister = mergeRegister(
            editor.registerUpdateListener(({ editorState }) => {
                if (isMounted) {
                    setSelection(editorState.read(() => $getSelection()));
                }
            }),
            editor.registerCommand(
                SELECTION_CHANGE_COMMAND,
                (_, activeEditor) => {
                    activeEditorRef.current = activeEditor;
                    return false;
                },
                COMMAND_PRIORITY_LOW,
            ),
            editor.registerCommand<MouseEvent>(
                CLICK_COMMAND,
                (payload) => {
                    const event = payload;
                    if (event.target === imageRef.current) {
                        if (event.shiftKey) {
                            setSelected(!isSelected);
                        } else {
                            clearSelection();
                            setSelected(true);
                        }
                        return true;
                    }

                    return false;
                },
                COMMAND_PRIORITY_LOW,
            ),
            editor.registerCommand(
                DRAGSTART_COMMAND,
                (event) => {
                    if (event.target === imageRef.current) {
                        // TODO This is just a temporary workaround for FF to behave like other browsers.
                        // Ideally, this handles drag & drop too (and all browsers).
                        event.preventDefault();
                        return true;
                    }
                    return false;
                },
                COMMAND_PRIORITY_LOW,
            ),
            editor.registerCommand(
                KEY_DELETE_COMMAND,
                onDelete,
                COMMAND_PRIORITY_LOW,
            ),
            editor.registerCommand(
                KEY_BACKSPACE_COMMAND,
                onDelete,
                COMMAND_PRIORITY_LOW,
            ),
            editor.registerCommand(KEY_ENTER_COMMAND, onEnter, COMMAND_PRIORITY_LOW),
            editor.registerCommand(
                KEY_ESCAPE_COMMAND,
                onEscape,
                COMMAND_PRIORITY_LOW,
            ),
        );
        return () => {
            isMounted = false;
            unregister();
        };
    }, [
        clearSelection,
        editor,
        isSelected,
        nodeKey,
        onDelete,
        onEnter,
        onEscape,
        setSelected,
    ]);

    const draggable = isSelected && $isNodeSelection(selection);
    const isFocused = isSelected;
    return (
        <Suspense fallback={null}>
            <>
                <div draggable={draggable}>
                    <button
                        className="image-edit-button"
                        ref={buttonRef}
                        onClick={() => {
                            showModal('Update Inline Image', (onClose) => (
                                <UpdateInlineImageDialog
                                    activeEditor={editor}
                                    nodeKey={nodeKey}
                                    onClose={onClose}
                                />
                            ));
                        }}>
                        Edit
                    </button>
                    <LazyImage_
                        className={
                            isFocused
                                ? `focused ${$isNodeSelection(selection) ? 'draggable' : ''}`
                                : null
                        }
                        src={src}
                        altText={altText}
                        imageRef={imageRef}
                        width={width}
                        height={height}
                        position={position}
                    />
                </div>
                {showCaption && (
                    <div className="image-caption-container">
                        <LexicalNestedComposer initialEditor={caption}>
                            <AutoFocusPlugin />
                            <LinkPlugin />
                            <FloatingTextFormatToolbarPlugin />
                            <RichTextPlugin
                                contentEditable={
                                    <ContentEditable className="InlineImageNode__contentEditable" />
                                }
                                placeholder={
                                    <Placeholder className="InlineImageNode__placeholder">
                                        Enter a caption...
                                    </Placeholder>
                                }
                                ErrorBoundary={LexicalErrorBoundary}
                            />
                        </LexicalNestedComposer>
                    </div>
                )}
            </>
            {modal}
        </Suspense>
    );
}

export class YouTubeNode extends DecoratorBlockNode {
    __id: string;

    static getType(): string {
        return 'youtube';
    }

    static clone(node: YouTubeNode): YouTubeNode {
        return new YouTubeNode(node.__id, node.__format, node.__key);
    }

    static importJSON(serializedNode: SerializedYouTubeNode): YouTubeNode {
        const node = $createYouTubeNode(serializedNode.videoID);
        node.setFormat(serializedNode.format);
        return node;
    }

    exportJSON(): SerializedYouTubeNode {
        return {
            ...super.exportJSON(),
            type: 'youtube',
            version: 1,
            videoID: this.__id,
        };
    }

    constructor(id: string, format?: ElementFormatType, key?: NodeKey) {
        super(format, key);
        this.__id = id;
    }

    exportDOM(): DOMExportOutput {
        const element = document.createElement('iframe');
        element.setAttribute('data-lexical-youtube', this.__id);
        element.setAttribute('width', '560');
        element.setAttribute('height', '315');
        element.setAttribute(
            'src',
            `https://www.youtube-nocookie.com/embed/${this.__id}`,
        );
        element.setAttribute('frameborder', '0');
        element.setAttribute(
            'allow',
            'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
        );
        element.setAttribute('allowfullscreen', 'true');
        element.setAttribute('title', 'YouTube video');
        return { element };
    }

    static importDOM(): DOMConversionMap | null {
        return {
            iframe: (domNode: HTMLElement) => {
                if (!domNode.hasAttribute('data-lexical-youtube')) {
                    return null;
                }
                return {
                    conversion: convertYoutubeElement,
                    priority: 1,
                };
            },
        };
    }

    updateDOM(): false {
        return false;
    }

    getId(): string {
        return this.__id;
    }

    getTextContent(
        _includeInert?: boolean | undefined,
        _includeDirectionless?: false | undefined,
    ): string {
        return `https://www.youtube.com/watch?v=${this.__id}`;
    }

    decorate(_editor: LexicalEditor, config: EditorConfig): JSX.Element {
        const embedBlockTheme = config.theme.embedBlock || {};
        const className = {
            base: embedBlockTheme.base || '',
            focus: embedBlockTheme.focus || '',
        };
        return (
            <YouTubeComponent
                className={className}
                format={this.__format}
                nodeKey={this.getKey()}
                videoID={this.__id}
            />
        );
    }
}

export class TweetNode extends DecoratorBlockNode {
    __id: string;

    static getType(): string {
        return 'tweet';
    }

    static clone(node: TweetNode): TweetNode {
        return new TweetNode(node.__id, node.__format, node.__key);
    }

    static importJSON(serializedNode: SerializedTweetNode): TweetNode {
        const node = $createTweetNode(serializedNode.id);
        node.setFormat(serializedNode.format);
        return node;
    }

    exportJSON(): SerializedTweetNode {
        return {
            ...super.exportJSON(),
            id: this.getId(),
            type: 'tweet',
            version: 1,
        };
    }

    static importDOM(): DOMConversionMap<HTMLDivElement> | null {
        return {
            div: (domNode: HTMLDivElement) => {
                if (!domNode.hasAttribute('data-lexical-tweet-id')) {
                    return null;
                }
                return {
                    conversion: convertTweetElement,
                    priority: 2,
                };
            },
        };
    }

    exportDOM(): DOMExportOutput {
        const element = document.createElement('div');
        element.setAttribute('data-lexical-tweet-id', this.__id);
        const text = document.createTextNode(this.getTextContent());
        element.append(text);
        return { element };
    }

    constructor(id: string, format?: ElementFormatType, key?: NodeKey) {
        super(format, key);
        this.__id = id;
    }

    getId(): string {
        return this.__id;
    }

    getTextContent(
        _includeInert?: boolean | undefined,
        _includeDirectionless?: false | undefined,
    ): string {
        return `https://x.com/i/web/status/${this.__id}`;
    }

    decorate(editor: LexicalEditor, config: EditorConfig): JSX.Element {
        const embedBlockTheme = config.theme.embedBlock || {};
        const className = {
            base: embedBlockTheme.base || '',
            focus: embedBlockTheme.focus || '',
        };
        return (
            <TweetComponent
                className={className}
                format={this.__format}
                loadingComponent="Loading..."
                nodeKey={this.getKey()}
                tweetID={this.__id}
            />
        );
    }
}
export class StickyNode extends DecoratorNode<JSX.Element> {
    __x: number;
    __y: number;
    __color: StickyNoteColor;
    __caption: LexicalEditor;

    static getType(): string {
        return 'sticky';
    }

    static clone(node: StickyNode): StickyNode {
        return new StickyNode(
            node.__x,
            node.__y,
            node.__color,
            node.__caption,
            node.__key,
        );
    }
    static importJSON(serializedNode: SerializedStickyNode): StickyNode {
        const stickyNode = new StickyNode(
            serializedNode.xOffset,
            serializedNode.yOffset,
            serializedNode.color,
        );
        const caption = serializedNode.caption;
        const nestedEditor = stickyNode.__caption;
        const editorState = nestedEditor.parseEditorState(caption.editorState);
        if (!editorState.isEmpty()) {
            nestedEditor.setEditorState(editorState);
        }
        return stickyNode;
    }

    constructor(
        x: number,
        y: number,
        color: 'pink' | 'yellow',
        caption?: LexicalEditor,
        key?: NodeKey,
    ) {
        super(key);
        this.__x = x;
        this.__y = y;
        this.__caption = caption || createEditor();
        this.__color = color;
    }

    exportJSON(): SerializedStickyNode {
        return {
            caption: this.__caption.toJSON(),
            color: this.__color,
            type: 'sticky',
            version: 1,
            xOffset: this.__x,
            yOffset: this.__y,
        };
    }

    createDOM(config: EditorConfig): HTMLElement {
        const div = document.createElement('div');
        div.style.display = 'contents';
        return div;
    }

    updateDOM(): false {
        return false;
    }

    setPosition(x: number, y: number): void {
        const writable = this.getWritable();
        writable.__x = x;
        writable.__y = y;
        $setSelection(null);
    }

    toggleColor(): void {
        const writable = this.getWritable();
        writable.__color = writable.__color === 'pink' ? 'yellow' : 'pink';
    }

    decorate(editor: LexicalEditor, config: EditorConfig): JSX.Element {
        return createPortal(
            <Suspense fallback={null}>
                <StickyComponent
                    color={this.__color}
                    x={this.__x}
                    y={this.__y}
                    nodeKey={this.getKey()}
                    caption={this.__caption}
                />
            </Suspense>,
            document.body,
        );
    }

    isIsolated(): true {
        return true;
    }
}
export class PollNode extends DecoratorNode<JSX.Element> {
    __question: string;
    __options: Options;

    static getType(): string {
        return 'poll';
    }

    static clone(node: PollNode): PollNode {
        return new PollNode(node.__question, node.__options, node.__key);
    }

    static importJSON(serializedNode: SerializedPollNode): PollNode {
        const node = $createPollNode(
            serializedNode.question,
            serializedNode.options,
        );
        serializedNode.options.forEach(node.addOption);
        return node;
    }

    constructor(question: string, options: Options, key?: NodeKey) {
        super(key);
        this.__question = question;
        this.__options = options;
    }

    exportJSON(): SerializedPollNode {
        return {
            options: this.__options,
            question: this.__question,
            type: 'poll',
            version: 1,
        };
    }

    addOption(option: Option): void {
        const self = this.getWritable();
        const options = Array.from(self.__options);
        options.push(option);
        self.__options = options;
    }

    deleteOption(option: Option): void {
        const self = this.getWritable();
        const options = Array.from(self.__options);
        const index = options.indexOf(option);
        options.splice(index, 1);
        self.__options = options;
    }

    setOptionText(option: Option, text: string): void {
        const self = this.getWritable();
        const clonedOption = cloneOption(option, text);
        const options = Array.from(self.__options);
        const index = options.indexOf(option);
        options[index] = clonedOption;
        self.__options = options;
    }

    toggleVote(option: Option, clientID: number): void {
        const self = this.getWritable();
        const votes = option.votes;
        const votesClone = Array.from(votes);
        const voteIndex = votes.indexOf(clientID);
        if (voteIndex === -1) {
            votesClone.push(clientID);
        } else {
            votesClone.splice(voteIndex, 1);
        }
        const clonedOption = cloneOption(option, option.text, votesClone);
        const options = Array.from(self.__options);
        const index = options.indexOf(option);
        options[index] = clonedOption;
        self.__options = options;
    }

    static importDOM(): DOMConversionMap | null {
        return {
            span: (domNode: HTMLElement) => {
                if (!domNode.hasAttribute('data-lexical-poll-question')) {
                    return null;
                }
                return {
                    conversion: convertPollElement,
                    priority: 2,
                };
            },
        };
    }

    exportDOM(): DOMExportOutput {
        const element = document.createElement('span');
        element.setAttribute('data-lexical-poll-question', this.__question);
        element.setAttribute(
            'data-lexical-poll-options',
            JSON.stringify(this.__options),
        );
        return { element };
    }

    createDOM(): HTMLElement {
        const elem = document.createElement('span');
        elem.style.display = 'inline-block';
        return elem;
    }

    updateDOM(): false {
        return false;
    }

    decorate(): JSX.Element {
        return (
            <Suspense fallback={null}>
                <PollComponent
                    question={this.__question}
                    options={this.__options}
                    nodeKey={this.__key}
                />
            </Suspense>
        );
    }
}

export class ImageNode extends DecoratorNode<JSX.Element> {
    __src: string;
    __altText: string;
    __width: 'inherit' | number;
    __height: 'inherit' | number;
    __maxWidth: number;
    __showCaption: boolean;
    __caption: LexicalEditor;
    // Captions cannot yet be used within editor cells
    __captionsEnabled: boolean;

    static getType(): string {
        return 'image';
    }

    static clone(node: ImageNode): ImageNode {
        return new ImageNode(
            node.__src,
            node.__altText,
            node.__maxWidth,
            node.__width,
            node.__height,
            node.__showCaption,
            node.__caption,
            node.__captionsEnabled,
            node.__key,
        );
    }

    static importJSON(serializedNode: SerializedImageNode): ImageNode {
        const { altText, height, width, maxWidth, caption, src, showCaption } =
            serializedNode;
        const node = $createImageNode({
            altText,
            height,
            maxWidth,
            showCaption,
            src,
            width,
        });
        const nestedEditor = node.__caption;
        const editorState = nestedEditor.parseEditorState(caption.editorState);
        if (!editorState.isEmpty()) {
            nestedEditor.setEditorState(editorState);
        }
        return node;
    }

    exportDOM(): DOMExportOutput {
        const element = document.createElement('img');
        element.setAttribute('src', this.__src);
        element.setAttribute('alt', this.__altText);
        element.setAttribute('width', this.__width.toString());
        element.setAttribute('height', this.__height.toString());
        return { element };
    }

    static importDOM(): DOMConversionMap | null {
        return {
            img: (node: Node) => ({
                conversion: convertImageElement,
                priority: 0,
            }),
        };
    }

    constructor(
        src: string,
        altText: string,
        maxWidth: number,
        width?: 'inherit' | number,
        height?: 'inherit' | number,
        showCaption?: boolean,
        caption?: LexicalEditor,
        captionsEnabled?: boolean,
        key?: NodeKey,
    ) {
        super(key);
        this.__src = src;
        this.__altText = altText;
        this.__maxWidth = maxWidth;
        this.__width = width || 'inherit';
        this.__height = height || 'inherit';
        this.__showCaption = showCaption || false;
        this.__caption = caption || createEditor();
        this.__captionsEnabled = captionsEnabled || captionsEnabled === undefined;
    }

    exportJSON(): SerializedImageNode {
        return {
            altText: this.getAltText(),
            caption: this.__caption.toJSON(),
            height: this.__height === 'inherit' ? 0 : this.__height,
            maxWidth: this.__maxWidth,
            showCaption: this.__showCaption,
            src: this.getSrc(),
            type: 'image',
            version: 1,
            width: this.__width === 'inherit' ? 0 : this.__width,
        };
    }

    setWidthAndHeight(
        width: 'inherit' | number,
        height: 'inherit' | number,
    ): void {
        const writable = this.getWritable();
        writable.__width = width;
        writable.__height = height;
    }

    setShowCaption(showCaption: boolean): void {
        const writable = this.getWritable();
        writable.__showCaption = showCaption;
    }

    // View

    createDOM(config: EditorConfig): HTMLElement {
        const span = document.createElement('span');
        const theme = config.theme;
        const className = theme.image;
        if (className !== undefined) {
            span.className = className;
        }
        return span;
    }

    updateDOM(): false {
        return false;
    }

    getSrc(): string {
        return this.__src;
    }

    getAltText(): string {
        return this.__altText;
    }

    decorate(): JSX.Element {
        return (
            <Suspense fallback={null}>
                <ImageComponent
                    src={this.__src}
                    altText={this.__altText}
                    width={this.__width}
                    height={this.__height}
                    maxWidth={this.__maxWidth}
                    nodeKey={this.getKey()}
                    showCaption={this.__showCaption}
                    caption={this.__caption}
                    captionsEnabled={this.__captionsEnabled}
                    resizable={true}
                />
            </Suspense>
        );
    }
}

export class ExcalidrawNode extends DecoratorNode<JSX.Element> {
    __data: string;
    __width: Dimension;
    __height: Dimension;

    static getType(): string {
        return 'excalidraw';
    }

    static clone(node: ExcalidrawNode): ExcalidrawNode {
        return new ExcalidrawNode(
            node.__data,
            node.__width,
            node.__height,
            node.__key,
        );
    }

    static importJSON(serializedNode: SerializedExcalidrawNode): ExcalidrawNode {
        return new ExcalidrawNode(
            serializedNode.data,
            serializedNode.width,
            serializedNode.height,
        );
    }

    exportJSON(): SerializedExcalidrawNode {
        return {
            data: this.__data,
            height: this.__height,
            type: 'excalidraw',
            version: 1,
            width: this.__width,
        };
    }

    constructor(
        data = '[]',
        width: Dimension = 'inherit',
        height: Dimension = 'inherit',
        key?: NodeKey,
    ) {
        super(key);
        this.__data = data;
        this.__width = width;
        this.__height = height;
    }

    // View
    createDOM(config: EditorConfig): HTMLElement {
        const span = document.createElement('span');
        const theme = config.theme;
        const className = theme.image;

        span.style.width =
            this.__width === 'inherit' ? 'inherit' : `${this.__width}px`;
        span.style.height =
            this.__height === 'inherit' ? 'inherit' : `${this.__height}px`;

        if (className !== undefined) {
            span.className = className;
        }
        return span;
    }

    updateDOM(): false {
        return false;
    }

    static importDOM(): DOMConversionMap<HTMLSpanElement> | null {
        return {
            span: (domNode: HTMLSpanElement) => {
                if (!domNode.hasAttribute('data-lexical-excalidraw-json')) {
                    return null;
                }
                return {
                    conversion: convertExcalidrawElement,
                    priority: 1,
                };
            },
        };
    }

    exportDOM(editor: LexicalEditor): DOMExportOutput {
        const element = document.createElement('span');

        element.style.display = 'inline-block';

        const content = editor.getElementByKey(this.getKey());
        if (content !== null) {
            const svg = content.querySelector('svg');
            if (svg !== null) {
                element.innerHTML = svg.outerHTML;
            }
        }

        element.style.width =
            this.__width === 'inherit' ? 'inherit' : `${this.__width}px`;
        element.style.height =
            this.__height === 'inherit' ? 'inherit' : `${this.__height}px`;

        element.setAttribute('data-lexical-excalidraw-json', this.__data);
        return { element };
    }

    setData(data: string): void {
        const self = this.getWritable();
        self.__data = data;
    }

    setWidth(width: Dimension): void {
        const self = this.getWritable();
        self.__width = width;
    }

    setHeight(height: Dimension): void {
        const self = this.getWritable();
        self.__height = height;
    }

    decorate(editor: LexicalEditor, config: EditorConfig): JSX.Element {
        return (
            <Suspense fallback={null}>
                <ExcalidrawComponent nodeKey={this.getKey()} data={this.__data} />
            </Suspense>
        );
    }
}



export const HR: ElementTransformer = {
    dependencies: [HorizontalRuleNode],
    export: (node: LexicalNode) => {
        return $isHorizontalRuleNode(node) ? '***' : null;
    },
    regExp: /^(---|\*\*\*|___)\s?$/,
    replace: (parentNode, _1, _2, isImport) => {
        const line = $createHorizontalRuleNode();

        // TODO: Get rid of isImport flag
        if (isImport || parentNode.getNextSibling() != null) {
            parentNode.replace(line);
        } else {
            parentNode.insertBefore(line);
        }

        line.selectNext();
    },
    type: 'element',
};

export const IMAGE: TextMatchTransformer = {
    dependencies: [ImageNode],
    export: (node) => {
        if (!$isImageNode(node)) {
            return null;
        }

        return `![${node.getAltText()}](${node.getSrc()})`;
    },
    importRegExp: /!(?:\[([^[]*)\])(?:\(([^(]+)\))/,
    regExp: /!(?:\[([^[]*)\])(?:\(([^(]+)\))$/,
    replace: (textNode, match) => {
        const [, altText, src] = match;
        const imageNode = $createImageNode({
            altText,
            maxWidth: 800,
            src,
        });
        textNode.replace(imageNode);
    },
    trigger: ')',
    type: 'text-match',
};

export const EMOJI: TextMatchTransformer = {
    dependencies: [],
    export: () => null,
    importRegExp: /:([a-z0-9_]+):/,
    regExp: /:([a-z0-9_]+):/,
    replace: (textNode, [, name]) => {
        const emoji = emojiList.find((e) => e.aliases.includes(name))?.emoji;
        if (emoji) {
            textNode.replace($createTextNode(emoji));
        }
    },
    trigger: ':',
    type: 'text-match',
};

export const EQUATION: TextMatchTransformer = {
    dependencies: [EquationNode],
    export: (node) => {
        if (!$isEquationNode(node)) {
            return null;
        }

        return `$${node.getEquation()}$`;
    },
    importRegExp: /\$([^$]+?)\$/,
    regExp: /\$([^$]+?)\$$/,
    replace: (textNode, match) => {
        const [, equation] = match;
        const equationNode = $createEquationNode(equation, true);
        textNode.replace(equationNode);
    },
    trigger: '$',
    type: 'text-match',
};

export const TWEET: ElementTransformer = {
    dependencies: [TweetNode],
    export: (node) => {
        if (!$isTweetNode(node)) {
            return null;
        }

        return `<tweet id="${node.getId()}" />`;
    },
    regExp: /<tweet id="([^"]+?)"\s?\/>\s?$/,
    replace: (textNode, _1, match) => {
        const [, id] = match;
        const tweetNode = $createTweetNode(id);
        textNode.replace(tweetNode);
    },
    type: 'element',
};

// Very primitive table setup
const TABLE_ROW_REG_EXP = /^(?:\|)(.+)(?:\|)\s?$/;
const TABLE_ROW_DIVIDER_REG_EXP = /^(\| ?:?-*:? ?)+\|\s?$/;

export const TABLE: ElementTransformer = {
    dependencies: [TableNode, TableRowNode, TableCellNode],
    export: (node: LexicalNode) => {
        if (!$isTableNode(node)) {
            return null;
        }

        const output: string[] = [];

        for (const row of node.getChildren()) {
            const rowOutput = [];
            if (!$isTableRowNode(row)) {
                continue;
            }

            let isHeaderRow = false;
            for (const cell of row.getChildren()) {
                // It's TableCellNode so it's just to make flow happy
                if ($isTableCellNode(cell)) {
                    rowOutput.push(
                        $convertToMarkdownString(PLAYGROUND_TRANSFORMERS, cell).replace(
                            /\n/g,
                            '\\n',
                        ),
                    );
                    if (cell.__headerState === TableCellHeaderStates.ROW) {
                        isHeaderRow = true;
                    }
                }
            }

            output.push(`| ${rowOutput.join(' | ')} |`);
            if (isHeaderRow) {
                output.push(`| ${rowOutput.map((_) => '---').join(' | ')} |`);
            }
        }

        return output.join('\n');
    },
    regExp: TABLE_ROW_REG_EXP,
    replace: (parentNode, _1, match) => {
        // Header row
        if (TABLE_ROW_DIVIDER_REG_EXP.test(match[0])) {
            const table = parentNode.getPreviousSibling();
            if (!table || !$isTableNode(table)) {
                return;
            }

            const rows = table.getChildren();
            const lastRow = rows[rows.length - 1];
            if (!lastRow || !$isTableRowNode(lastRow)) {
                return;
            }

            // Add header state to row cells
            lastRow.getChildren().forEach((cell) => {
                if (!$isTableCellNode(cell)) {
                    return;
                }
                cell.toggleHeaderStyle(TableCellHeaderStates.ROW);
            });

            // Remove line
            parentNode.remove();
            return;
        }

        const matchCells = mapToTableCells(match[0]);

        if (matchCells == null) {
            return;
        }

        const rows = [matchCells];
        let sibling = parentNode.getPreviousSibling();
        let maxCells = matchCells.length;

        while (sibling) {
            if (!$isParagraphNode(sibling)) {
                break;
            }

            if (sibling.getChildrenSize() !== 1) {
                break;
            }

            const firstChild = sibling.getFirstChild();

            if (!$isTextNode(firstChild)) {
                break;
            }

            const cells = mapToTableCells(firstChild.getTextContent());

            if (cells == null) {
                break;
            }

            maxCells = Math.max(maxCells, cells.length);
            rows.unshift(cells);
            const previousSibling = sibling.getPreviousSibling();
            sibling.remove();
            sibling = previousSibling;
        }

        const table = $createTableNode();

        for (const cells of rows) {
            const tableRow = $createTableRowNode();
            table.append(tableRow);

            for (let i = 0; i < maxCells; i++) {
                tableRow.append(i < cells.length ? cells[i] : createTableCell(''));
            }
        }

        const previousSibling = parentNode.getPreviousSibling();
        if (
            $isTableNode(previousSibling) &&
            getTableColumnsSize(previousSibling) === maxCells
        ) {
            previousSibling.append(...table.getChildren());
            parentNode.remove();
        } else {
            parentNode.replace(table);
        }

        table.selectEnd();
    },
    type: 'element',
};

function getTableColumnsSize(table: TableNode) {
    const row = table.getFirstChild();
    return $isTableRowNode(row) ? row.getChildrenSize() : 0;
}

const createTableCell = (textContent: string): TableCellNode => {
    textContent = textContent.replace(/\\n/g, '\n');
    const cell = $createTableCellNode(TableCellHeaderStates.NO_STATUS);
    $convertFromMarkdownString(textContent, PLAYGROUND_TRANSFORMERS, cell);
    return cell;
};

const mapToTableCells = (textContent: string): Array<TableCellNode> | null => {
    const match = textContent.match(TABLE_ROW_REG_EXP);
    if (!match || !match[1]) {
        return null;
    }
    return match[1].split('|').map((text) => createTableCell(text));
};

export const PLAYGROUND_TRANSFORMERS: Array<Transformer> = [
    TABLE,
    HR,
    IMAGE,
    EMOJI,
    EQUATION,
    TWEET,
    CHECK_LIST,
    ...ELEMENT_TRANSFORMERS,
    ...TEXT_FORMAT_TRANSFORMERS,
    ...TEXT_MATCH_TRANSFORMERS,
];









type Dimension = number | 'inherit';


export type SerializedExcalidrawNode = Spread<
    {
        data: string;
        width: Dimension;
        height: Dimension;
    },
    SerializedLexicalNode
>;

function convertExcalidrawElement(
    domNode: HTMLElement,
): DOMConversionOutput | null {
    const excalidrawData = domNode.getAttribute('data-lexical-excalidraw-json');
    const styleAttributes = window.getComputedStyle(domNode);
    const heightStr = styleAttributes.getPropertyValue('height');
    const widthStr = styleAttributes.getPropertyValue('width');
    const height =
        !heightStr || heightStr === 'inherit' ? 'inherit' : parseInt(heightStr, 10);
    const width =
        !widthStr || widthStr === 'inherit' ? 'inherit' : parseInt(widthStr, 10);

    if (excalidrawData) {
        const node = $createExcalidrawNode();
        node.__data = excalidrawData;
        node.__height = height;
        node.__width = width;
        return {
            node,
        };
    }
    return null;
}



export function $createExcalidrawNode(): ExcalidrawNode {
    return new ExcalidrawNode();
}

export function $isExcalidrawNode(
    node: LexicalNode | null,
): node is ExcalidrawNode {
    return node instanceof ExcalidrawNode;
}



export type ExcalidrawElementFragment = {
    isDeleted?: boolean;
};

type Props = {
    closeOnClickOutside?: boolean;
    /**
     * The initial set of elements to draw into the scene
     */
    initialElements: ReadonlyArray<ExcalidrawElementFragment>;
    /**
     * The initial set of elements to draw into the scene
     */
    initialAppState: AppState;
    /**
     * The initial set of elements to draw into the scene
     */
    initialFiles: BinaryFiles;
    /**
     * Controls the visibility of the modal
     */
    isShown?: boolean;
    /**
     * Callback when closing and discarding the new changes
     */
    onClose: () => void;
    /**
     * Completely remove Excalidraw component
     */
    onDelete: () => void;
    /**
     * Callback when the save button is clicked
     */
    onSave: (
        elements: ReadonlyArray<ExcalidrawElementFragment>,
        appState: Partial<AppState>,
        files: BinaryFiles,
    ) => void;
};

export const useCallbackRefState = () => {
    const [refValue, setRefValue] =
        React.useState<ExcalidrawImperativeAPI | null>(null);
    const refCallback = React.useCallback(
        (value: ExcalidrawImperativeAPI | null) => setRefValue(value),
        [],
    );
    return [refValue, refCallback] as const;
};

/**
 * @explorer-desc
 * A component which renders a modal with Excalidraw (a painting app)
 * which can be used to export an editable image
 */
export function ExcalidrawModal({
    closeOnClickOutside = false,
    onSave,
    initialElements,
    initialAppState,
    initialFiles,
    isShown = false,
    onDelete,
    onClose,
}: Props): ReactPortal | null {
    const excaliDrawModelRef = useRef<HTMLDivElement | null>(null);
    const [excalidrawAPI, excalidrawAPIRefCallback] = useCallbackRefState();
    const [discardModalOpen, setDiscardModalOpen] = useState(false);
    const [elements, setElements] =
        useState<ReadonlyArray<ExcalidrawElementFragment>>(initialElements);
    const [files, setFiles] = useState<BinaryFiles>(initialFiles);

    useEffect(() => {
        if (excaliDrawModelRef.current !== null) {
            excaliDrawModelRef.current.focus();
        }
    }, []);

    useEffect(() => {
        let modalOverlayElement: HTMLElement | null = null;

        const clickOutsideHandler = (event: MouseEvent) => {
            const target = event.target;
            if (
                excaliDrawModelRef.current !== null &&
                !excaliDrawModelRef.current.contains(target as Node) &&
                closeOnClickOutside
            ) {
                onDelete();
            }
        };

        if (excaliDrawModelRef.current !== null) {
            modalOverlayElement = excaliDrawModelRef.current?.parentElement;
            if (modalOverlayElement !== null) {
                modalOverlayElement?.addEventListener('click', clickOutsideHandler);
            }
        }

        return () => {
            if (modalOverlayElement !== null) {
                modalOverlayElement?.removeEventListener('click', clickOutsideHandler);
            }
        };
    }, [closeOnClickOutside, onDelete]);

    useLayoutEffect(() => {
        const currentModalRef = excaliDrawModelRef.current;

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onDelete();
            }
        };

        if (currentModalRef !== null) {
            currentModalRef.addEventListener('keydown', onKeyDown);
        }

        return () => {
            if (currentModalRef !== null) {
                currentModalRef.removeEventListener('keydown', onKeyDown);
            }
        };
    }, [elements, files, onDelete]);

    const save = () => {
        if (elements.filter((el) => !el.isDeleted).length > 0) {
            const appState = excalidrawAPI!.getAppState();
            // We only need a subset of the state
            const partialState: Partial<AppState> = {
                exportBackground: appState.exportBackground,
                exportScale: appState.exportScale,
                exportWithDarkMode: appState.theme === 'dark',
                isBindingEnabled: appState.isBindingEnabled,
                isLoading: appState.isLoading,
                name: appState.name,
                theme: appState.theme,
                viewBackgroundColor: appState.viewBackgroundColor,
                viewModeEnabled: appState.viewModeEnabled,
                zenModeEnabled: appState.zenModeEnabled,
                zoom: appState.zoom,
            };
            onSave(elements, partialState, files);
        } else {
            // delete node if the scene is clear
            onDelete();
        }
    };

    const discard = () => {
        if (elements.filter((el) => !el.isDeleted).length === 0) {
            // delete node if the scene is clear
            onDelete();
        } else {
            //Otherwise, show confirmation dialog before closing
            setDiscardModalOpen(true);
        }
    };

    function ShowDiscardDialog(): JSX.Element {
        return (
            <Modal
                title="Discard"
                onClose={() => {
                    setDiscardModalOpen(false);
                }}
                closeOnClickOutside={false}>
                Are you sure you want to discard the changes?
                <div className="ExcalidrawModal__discardModal">
                    <Button
                        onClick={() => {
                            setDiscardModalOpen(false);
                            onClose();
                        }}>
                        Discard
                    </Button>{' '}
                    <Button
                        onClick={() => {
                            setDiscardModalOpen(false);
                        }}>
                        Cancel
                    </Button>
                </div>
            </Modal>
        );
    }

    if (isShown === false) {
        return null;
    }

    const onChange = (
        els: ReadonlyArray<ExcalidrawElementFragment>,
        _: AppState,
        fls: BinaryFiles,
    ) => {
        setElements(els);
        setFiles(fls);
    };

    return createPortal(
        <div className="ExcalidrawModal__overlay" role="dialog">
            <div
                className="ExcalidrawModal__modal"
                ref={excaliDrawModelRef}
                tabIndex={-1}>
                <div className="ExcalidrawModal__row">
                    {discardModalOpen && <ShowDiscardDialog />}
                    <Excalidraw
                        onChange={onChange}
                        excalidrawAPI={excalidrawAPIRefCallback}
                        initialData={{
                            appState: initialAppState || { isLoading: false },
                            elements: initialElements,
                            files: initialFiles,
                        }}
                    />
                    <div className="ExcalidrawModal__actions">
                        <button className="action-button" onClick={discard}>
                            Discard
                        </button>
                        <button className="action-button" onClick={save}>
                            Save
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body,
    );
}



type ImageType = 'svg' | 'canvas';


// exportToSvg has fonts from excalidraw.com
// We don't want them to be used in open source
const removeStyleFromSvg_HACK = (svg: SVGElement) => {
    const styleTag = svg?.firstElementChild?.firstElementChild;

    // Generated SVG is getting double-sized by height and width attributes
    // We want to match the real size of the SVG element
    const viewBox = svg.getAttribute('viewBox');
    if (viewBox != null) {
        const viewBoxDimensions = viewBox.split(' ');
        svg.setAttribute('width', viewBoxDimensions[2]);
        svg.setAttribute('height', viewBoxDimensions[3]);
    }

    if (styleTag && styleTag.tagName === 'style') {
        styleTag.remove();
    }
};


export function ExcalidrawImage({ elements, files, imageContainerRef, appState, rootClassName = null }: {
    appState: AppState;
    className?: string;
    elements: NonDeleted<ExcalidrawElement>[];
    files: BinaryFiles;
    height?: number | null;
    imageContainerRef: { current: null | HTMLDivElement };
    imageType?: ImageType;
    rootClassName?: string | null;
    width?: number | null;
}): JSX.Element {
    const [Svg, setSvg] = useState<SVGElement | null>(null);

    useEffect(() => {
        const setContent = async () => {
            const svg: SVGElement = await exportToSvg({
                appState,
                elements,
                files,
            });
            removeStyleFromSvg_HACK(svg);

            svg.setAttribute('width', '100%');
            svg.setAttribute('height', '100%');
            svg.setAttribute('display', 'block');

            setSvg(svg);
        };
        setContent();
    }, [elements, files, appState]);

    return (
        <div
            ref={imageContainerRef}
            className={rootClassName ?? ''}
            dangerouslySetInnerHTML={{ __html: Svg?.outerHTML ?? '' }}
        />
    );
}



export function ExcalidrawComponent({
    nodeKey,
    data,
}: {
    data: string;
    nodeKey: NodeKey;
}): JSX.Element {
    const [editor] = useLexicalComposerContext();
    const [isModalOpen, setModalOpen] = useState<boolean>(
        data === '[]' && editor.isEditable(),
    );
    const imageContainerRef = useRef<HTMLImageElement | null>(null);
    const buttonRef = useRef<HTMLButtonElement | null>(null);
    const captionButtonRef = useRef<HTMLButtonElement | null>(null);
    const [isSelected, setSelected, clearSelection] =
        useLexicalNodeSelection(nodeKey);
    const [isResizing, setIsResizing] = useState<boolean>(false);

    const onDelete = useCallback(
        (event: KeyboardEvent) => {
            if (isSelected && $isNodeSelection($getSelection())) {
                event.preventDefault();
                editor.update(() => {
                    const node = $getNodeByKey(nodeKey);
                    if ($isExcalidrawNode(node)) {
                        node.remove();
                        return true;
                    }
                });
            }
            return false;
        },
        [editor, isSelected, nodeKey],
    );

    // Set editor to readOnly if excalidraw is open to prevent unwanted changes
    useEffect(() => {
        if (isModalOpen) {
            editor.setEditable(false);
        } else {
            editor.setEditable(true);
        }
    }, [isModalOpen, editor]);

    useEffect(() => {
        return mergeRegister(
            editor.registerCommand(
                CLICK_COMMAND,
                (event: MouseEvent) => {
                    const buttonElem = buttonRef.current;
                    const eventTarget = event.target;

                    if (isResizing) {
                        return true;
                    }

                    if (buttonElem !== null && buttonElem.contains(eventTarget as Node)) {
                        if (!event.shiftKey) {
                            clearSelection();
                        }
                        setSelected(!isSelected);
                        if (event.detail > 1) {
                            setModalOpen(true);
                        }
                        return true;
                    }

                    return false;
                },
                COMMAND_PRIORITY_LOW,
            ),
            editor.registerCommand(
                KEY_DELETE_COMMAND,
                onDelete,
                COMMAND_PRIORITY_LOW,
            ),
            editor.registerCommand(
                KEY_BACKSPACE_COMMAND,
                onDelete,
                COMMAND_PRIORITY_LOW,
            ),
        );
    }, [clearSelection, editor, isSelected, isResizing, onDelete, setSelected]);

    const deleteNode = useCallback(() => {
        setModalOpen(false);
        return editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            if ($isExcalidrawNode(node)) {
                node.remove();
            }
        });
    }, [editor, nodeKey]);

    const setData = (
        els: ReadonlyArray<ExcalidrawElementFragment>,
        aps: Partial<AppState>,
        fls: BinaryFiles,
    ) => {
        if (!editor.isEditable()) {
            return;
        }
        return editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            if ($isExcalidrawNode(node)) {
                if (els.length > 0 || Object.keys(fls).length > 0) {
                    node.setData(
                        JSON.stringify({
                            appState: aps,
                            elements: els,
                            files: fls,
                        }),
                    );
                } else {
                    node.remove();
                }
            }
        });
    };

    const onResizeStart = () => {
        setIsResizing(true);
    };

    const onResizeEnd = (
        nextWidth: 'inherit' | number,
        nextHeight: 'inherit' | number,
    ) => {
        // Delay hiding the resize bars for click case
        setTimeout(() => {
            setIsResizing(false);
        }, 200);

        editor.update(() => {
            const node = $getNodeByKey(nodeKey);

            if ($isExcalidrawNode(node)) {
                node.setWidth(nextWidth);
                node.setHeight(nextHeight);
            }
        });
    };

    const openModal = useCallback(() => {
        setModalOpen(true);
    }, []);

    const {
        elements = [],
        files = {},
        appState = {},
    } = useMemo(() => JSON.parse(data), [data]);

    return (
        <>
            <ExcalidrawModal
                initialElements={elements}
                initialFiles={files}
                initialAppState={appState}
                isShown={isModalOpen}
                onDelete={deleteNode}
                onClose={() => setModalOpen(false)}
                onSave={(els, aps, fls) => {
                    editor.setEditable(true);
                    setData(els, aps, fls);
                    setModalOpen(false);
                }}
                closeOnClickOutside={false}
            />
            {elements.length > 0 && (
                <button
                    ref={buttonRef}
                    className={`excalidraw-button ${isSelected ? 'selected' : ''}`}>
                    <ExcalidrawImage
                        imageContainerRef={imageContainerRef}
                        className="image"
                        elements={elements}
                        files={files}
                        appState={appState}
                    />
                    {isSelected && (
                        <div
                            className="image-edit-button"
                            role="button"
                            tabIndex={0}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={openModal}
                        />
                    )}
                    {(isSelected || isResizing) && (
                        <ImageResizer
                            buttonRef={captionButtonRef}
                            showCaption={true}
                            setShowCaption={() => null}
                            imageRef={imageContainerRef}
                            editor={editor}
                            onResizeStart={onResizeStart}
                            onResizeEnd={onResizeEnd}
                            captionsEnabled={true}
                        />
                    )}
                </button>
            )}
        </>
    );
}


type YouTubeComponentProps = Readonly<{
    className: Readonly<{
        base: string;
        focus: string;
    }>;
    format: ElementFormatType | null;
    nodeKey: NodeKey;
    videoID: string;
}>;

function YouTubeComponent({
    className,
    format,
    nodeKey,
    videoID,
}: YouTubeComponentProps) {
    return (
        <BlockWithAlignableContents
            className={className}
            format={format}
            nodeKey={nodeKey}>
            <iframe
                width="560"
                height="315"
                src={`https://www.youtube-nocookie.com/embed/${videoID}`}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen={true}
                title="YouTube video"
            />
        </BlockWithAlignableContents>
    );
}

export type SerializedYouTubeNode = Spread<
    {
        videoID: string;
    },
    SerializedDecoratorBlockNode
>;

function convertYoutubeElement(
    domNode: HTMLElement,
): null | DOMConversionOutput {
    const videoID = domNode.getAttribute('data-lexical-youtube');
    if (videoID) {
        const node = $createYouTubeNode(videoID);
        return { node };
    }
    return null;
}



export function $createYouTubeNode(videoID: string): YouTubeNode {
    return new YouTubeNode(videoID);
}

export function $isYouTubeNode(
    node: YouTubeNode | LexicalNode | null | undefined,
): node is YouTubeNode {
    return node instanceof YouTubeNode;
}




const WIDGET_SCRIPT_URL = 'https://platform.twitter.com/widgets.js';

type TweetComponentProps = Readonly<{
    className: Readonly<{
        base: string;
        focus: string;
    }>;
    format: ElementFormatType | null;
    loadingComponent?: JSX.Element | string;
    nodeKey: NodeKey;
    onError?: (error: string) => void;
    onLoad?: () => void;
    tweetID: string;
}>;

function convertTweetElement(
    domNode: HTMLDivElement,
): DOMConversionOutput | null {
    const id = domNode.getAttribute('data-lexical-tweet-id');
    if (id) {
        const node = $createTweetNode(id);
        return { node };
    }
    return null;
}

let isTwitterScriptLoading = true;

function TweetComponent({
    className,
    format,
    loadingComponent,
    nodeKey,
    onError,
    onLoad,
    tweetID,
}: TweetComponentProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);

    const previousTweetIDRef = useRef<string>('');
    const [isTweetLoading, setIsTweetLoading] = useState(false);

    const createTweet = useCallback(async () => {
        try {
            // @ts-expect-error Twitter is attached to the window.
            await window.twttr.widgets.createTweet(tweetID, containerRef.current);

            setIsTweetLoading(false);
            isTwitterScriptLoading = false;

            if (onLoad) {
                onLoad();
            }
        } catch (error) {
            if (onError) {
                onError(String(error));
            }
        }
    }, [onError, onLoad, tweetID]);

    useEffect(() => {
        if (tweetID !== previousTweetIDRef.current) {
            setIsTweetLoading(true);

            if (isTwitterScriptLoading) {
                const script = document.createElement('script');
                script.src = WIDGET_SCRIPT_URL;
                script.async = true;
                document.body?.appendChild(script);
                script.onload = createTweet;
                if (onError) {
                    script.onerror = onError as OnErrorEventHandler;
                }
            } else {
                createTweet();
            }

            if (previousTweetIDRef) {
                previousTweetIDRef.current = tweetID;
            }
        }
    }, [createTweet, onError, tweetID]);

    return (
        <BlockWithAlignableContents
            className={className}
            format={format}
            nodeKey={nodeKey}>
            {isTweetLoading ? loadingComponent : null}
            <div
                style={{ display: 'inline-block', width: '550px' }}
                ref={containerRef}
            />
        </BlockWithAlignableContents>
    );
}

export type SerializedTweetNode = Spread<
    {
        id: string;
    },
    SerializedDecoratorBlockNode
>;



export function $createTweetNode(tweetID: string): TweetNode {
    return new TweetNode(tweetID);
}

export function $isTweetNode(
    node: TweetNode | LexicalNode | null | undefined,
): node is TweetNode {
    return node instanceof TweetNode;
}




type StickyNoteColor = 'pink' | 'yellow';

export type SerializedStickyNode = Spread<
    {
        xOffset: number;
        yOffset: number;
        color: StickyNoteColor;
        caption: SerializedEditor;
    },
    SerializedLexicalNode
>;



export function $isStickyNode(
    node: LexicalNode | null | undefined,
): node is StickyNode {
    return node instanceof StickyNode;
}

export function $createStickyNode(
    xOffset: number,
    yOffset: number,
): StickyNode {
    return new StickyNode(xOffset, yOffset, 'yellow');
}



type Positioning = {
    isDragging: boolean;
    offsetX: number;
    offsetY: number;
    rootElementRect: null | ClientRect;
    x: number;
    y: number;
};

function positionSticky(
    stickyElem: HTMLElement,
    positioning: Positioning,
): void {
    const style = stickyElem.style;
    const rootElementRect = positioning.rootElementRect;
    const rectLeft = rootElementRect !== null ? rootElementRect.left : 0;
    const rectTop = rootElementRect !== null ? rootElementRect.top : 0;
    style.top = rectTop + positioning.y + 'px';
    style.left = rectLeft + positioning.x + 'px';
}

export function StickyComponent({
    x,
    y,
    nodeKey,
    color,
    caption,
}: {
    caption: LexicalEditor;
    color: 'pink' | 'yellow';
    nodeKey: NodeKey;
    x: number;
    y: number;
}): JSX.Element {
    const [editor] = useLexicalComposerContext();
    const stickyContainerRef = useRef<null | HTMLDivElement>(null);
    const positioningRef = useRef<Positioning>({
        isDragging: false,
        offsetX: 0,
        offsetY: 0,
        rootElementRect: null,
        x: 0,
        y: 0,
    });
    const { isCollabActive } = useCollaborationContext();

    useEffect(() => {
        const position = positioningRef.current;
        position.x = x;
        position.y = y;

        const stickyContainer = stickyContainerRef.current;
        if (stickyContainer !== null) {
            positionSticky(stickyContainer, position);
        }
    }, [x, y]);

    useLayoutEffect(() => {
        const position = positioningRef.current;
        const resizeObserver = new ResizeObserver((entries) => {
            for (let i = 0; i < entries.length; i++) {
                const entry = entries[i];
                const { target } = entry;
                position.rootElementRect = target.getBoundingClientRect();
                const stickyContainer = stickyContainerRef.current;
                if (stickyContainer !== null) {
                    positionSticky(stickyContainer, position);
                }
            }
        });

        const removeRootListener = editor.registerRootListener(
            (nextRootElem, prevRootElem) => {
                if (prevRootElem !== null) {
                    resizeObserver.unobserve(prevRootElem);
                }
                if (nextRootElem !== null) {
                    resizeObserver.observe(nextRootElem);
                }
            },
        );

        const handleWindowResize = () => {
            const rootElement = editor.getRootElement();
            const stickyContainer = stickyContainerRef.current;
            if (rootElement !== null && stickyContainer !== null) {
                position.rootElementRect = rootElement.getBoundingClientRect();
                positionSticky(stickyContainer, position);
            }
        };

        window.addEventListener('resize', handleWindowResize);

        return () => {
            window.removeEventListener('resize', handleWindowResize);
            removeRootListener();
        };
    }, [editor]);

    useEffect(() => {
        const stickyContainer = stickyContainerRef.current;
        if (stickyContainer !== null) {
            // Delay adding transition so we don't trigger the
            // transition on load of the sticky.
            setTimeout(() => {
                stickyContainer.style.setProperty(
                    'transition',
                    'top 0.3s ease 0s, left 0.3s ease 0s',
                );
            }, 500);
        }
    }, []);

    const handlePointerMove = (event: PointerEvent) => {
        const stickyContainer = stickyContainerRef.current;
        const positioning = positioningRef.current;
        const rootElementRect = positioning.rootElementRect;
        if (
            stickyContainer !== null &&
            positioning.isDragging &&
            rootElementRect !== null
        ) {
            positioning.x = event.pageX - positioning.offsetX - rootElementRect.left;
            positioning.y = event.pageY - positioning.offsetY - rootElementRect.top;
            positionSticky(stickyContainer, positioning);
        }
    };

    const handlePointerUp = (event: PointerEvent) => {
        const stickyContainer = stickyContainerRef.current;
        const positioning = positioningRef.current;
        if (stickyContainer !== null) {
            positioning.isDragging = false;
            stickyContainer.classList.remove('dragging');
            editor.update(() => {
                const node = $getNodeByKey(nodeKey);
                if ($isStickyNode(node)) {
                    node.setPosition(positioning.x, positioning.y);
                }
            });
        }
        document.removeEventListener('pointermove', handlePointerMove);
        document.removeEventListener('pointerup', handlePointerUp);
    };

    const handleDelete = () => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            if ($isStickyNode(node)) {
                node.remove();
            }
        });
    };

    const handleColorChange = () => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            if ($isStickyNode(node)) {
                node.toggleColor();
            }
        });
    };

    const { historyState } = useSharedHistoryContext();

    return (
        <div ref={stickyContainerRef} className="sticky-note-container">
            <div
                className={`sticky-note ${color}`}
                onPointerDown={(event) => {
                    const stickyContainer = stickyContainerRef.current;
                    if (
                        stickyContainer == null ||
                        event.button === 2 ||
                        event.target !== stickyContainer.firstChild
                    ) {
                        // Right click or click on editor should not work
                        return;
                    }
                    const stickContainer = stickyContainer;
                    const positioning = positioningRef.current;
                    if (stickContainer !== null) {
                        const { top, left } = stickContainer.getBoundingClientRect();
                        positioning.offsetX = event.clientX - left;
                        positioning.offsetY = event.clientY - top;
                        positioning.isDragging = true;
                        stickContainer.classList.add('dragging');
                        document.addEventListener('pointermove', handlePointerMove);
                        document.addEventListener('pointerup', handlePointerUp);
                        event.preventDefault();
                    }
                }}>
                <button
                    onClick={handleDelete}
                    className="delete"
                    aria-label="Delete sticky note"
                    title="Delete">
                    X
                </button>
                <button
                    onClick={handleColorChange}
                    className="color"
                    aria-label="Change sticky note color"
                    title="Color">
                    <i className="bucket" />
                </button>
                <LexicalNestedComposer
                    initialEditor={caption}
                    initialTheme={StickyEditorTheme}>
                    {isCollabActive ? (
                        <CollaborationPlugin
                            id={caption.getKey()}
                            providerFactory={createWebsocketProvider}
                            shouldBootstrap={true}
                        />
                    ) : (
                        <HistoryPlugin externalHistoryState={historyState} />
                    )}
                    <PlainTextPlugin
                        contentEditable={
                            <ContentEditable className="StickyNode__contentEditable" />
                        }
                        placeholder={
                            <Placeholder className="StickyNode__placeholder">
                                What's up?
                            </Placeholder>
                        }
                        ErrorBoundary={LexicalErrorBoundary}
                    />
                </LexicalNestedComposer>
            </div>
        </div>
    );
}




export type Options = ReadonlyArray<Option>;

export type Option = Readonly<{
    text: string;
    uid: string;
    votes: Array<number>;
}>;



function createUID(): string {
    return Math.random()
        .toString(36)
        .replace(/[^a-z]+/g, '')
        .substr(0, 5);
}

export function createPollOption(text = ''): Option {
    return {
        text,
        uid: createUID(),
        votes: [],
    };
}

function cloneOption(
    option: Option,
    text: string,
    votes?: Array<number>,
): Option {
    return {
        text,
        uid: option.uid,
        votes: votes || Array.from(option.votes),
    };
}

export type SerializedPollNode = Spread<
    {
        question: string;
        options: Options;
    },
    SerializedLexicalNode
>;

function convertPollElement(domNode: HTMLElement): DOMConversionOutput | null {
    const question = domNode.getAttribute('data-lexical-poll-question');
    const options = domNode.getAttribute('data-lexical-poll-options');
    if (question !== null && options !== null) {
        const node = $createPollNode(question, JSON.parse(options));
        return { node };
    }
    return null;
}



export function $createPollNode(question: string, options: Options): PollNode {
    return new PollNode(question, options);
}

export function $isPollNode(
    node: LexicalNode | null | undefined,
): node is PollNode {
    return node instanceof PollNode;
}




function getTotalVotes(options: Options): number {
    return options.reduce((totalVotes, next) => {
        return totalVotes + next.votes.length;
    }, 0);
}

function PollOptionComponent({
    option,
    index,
    options,
    totalVotes,
    withPollNode,
}: {
    index: number;
    option: Option;
    options: Options;
    totalVotes: number;
    withPollNode: (
        cb: (pollNode: PollNode) => void,
        onSelect?: () => void,
    ) => void;
}): JSX.Element {
    const { clientID } = useCollaborationContext();
    const checkboxRef = useRef(null);
    const votesArray = option.votes;
    const checkedIndex = votesArray.indexOf(clientID);
    const checked = checkedIndex !== -1;
    const votes = votesArray.length;
    const text = option.text;

    return (
        <div className="PollNode__optionContainer">
            <div
                className={joinClasses(
                    'PollNode__optionCheckboxWrapper',
                    checked && 'PollNode__optionCheckboxChecked',
                )}>
                <input
                    ref={checkboxRef}
                    className="PollNode__optionCheckbox"
                    type="checkbox"
                    onChange={(e) => {
                        withPollNode((node) => {
                            node.toggleVote(option, clientID);
                        });
                    }}
                    checked={checked}
                />
            </div>
            <div className="PollNode__optionInputWrapper">
                <div
                    className="PollNode__optionInputVotes"
                    style={{ width: `${votes === 0 ? 0 : (votes / totalVotes) * 100}%` }}
                />
                <span className="PollNode__optionInputVotesCount">
                    {votes > 0 && (votes === 1 ? '1 vote' : `${votes} votes`)}
                </span>
                <input
                    className="PollNode__optionInput"
                    type="text"
                    value={text}
                    onChange={(e) => {
                        const target = e.target;
                        const value = target.value;
                        const selectionStart = target.selectionStart;
                        const selectionEnd = target.selectionEnd;
                        withPollNode(
                            (node) => {
                                node.setOptionText(option, value);
                            },
                            () => {
                                target.selectionStart = selectionStart;
                                target.selectionEnd = selectionEnd;
                            },
                        );
                    }}
                    placeholder={`Option ${index + 1}`}
                />
            </div>
            <button
                disabled={options.length < 3}
                className={joinClasses(
                    'PollNode__optionDelete',
                    options.length < 3 && 'PollNode__optionDeleteDisabled',
                )}
                aria-label="Remove"
                onClick={() => {
                    withPollNode((node) => {
                        node.deleteOption(option);
                    });
                }}
            />
        </div>
    );
}

export function PollComponent({
    question,
    options,
    nodeKey,
}: {
    nodeKey: NodeKey;
    options: Options;
    question: string;
}): JSX.Element {
    const [editor] = useLexicalComposerContext();
    const totalVotes = useMemo(() => getTotalVotes(options), [options]);
    const [isSelected, setSelected, clearSelection] =
        useLexicalNodeSelection(nodeKey);
    const [selection, setSelection] = useState<BaseSelection | null>(null);
    const ref = useRef(null);

    const onDelete = useCallback(
        (payload: KeyboardEvent) => {
            if (isSelected && $isNodeSelection($getSelection())) {
                const event: KeyboardEvent = payload;
                event.preventDefault();
                const node = $getNodeByKey(nodeKey);
                if ($isPollNode(node)) {
                    node.remove();
                    return true;
                }
            }
            return false;
        },
        [isSelected, nodeKey],
    );

    useEffect(() => {
        return mergeRegister(
            editor.registerUpdateListener(({ editorState }) => {
                setSelection(editorState.read(() => $getSelection()));
            }),
            editor.registerCommand<MouseEvent>(
                CLICK_COMMAND,
                (payload) => {
                    const event = payload;

                    if (event.target === ref.current) {
                        if (!event.shiftKey) {
                            clearSelection();
                        }
                        setSelected(!isSelected);
                        return true;
                    }

                    return false;
                },
                COMMAND_PRIORITY_LOW,
            ),
            editor.registerCommand(
                KEY_DELETE_COMMAND,
                onDelete,
                COMMAND_PRIORITY_LOW,
            ),
            editor.registerCommand(
                KEY_BACKSPACE_COMMAND,
                onDelete,
                COMMAND_PRIORITY_LOW,
            ),
        );
    }, [clearSelection, editor, isSelected, nodeKey, onDelete, setSelected]);

    const withPollNode = (
        cb: (node: PollNode) => void,
        onUpdate?: () => void,
    ): void => {
        editor.update(
            () => {
                const node = $getNodeByKey(nodeKey);
                if ($isPollNode(node)) {
                    cb(node);
                }
            },
            { onUpdate },
        );
    };

    const addOption = () => {
        withPollNode((node) => {
            node.addOption(createPollOption());
        });
    };

    const isFocused = $isNodeSelection(selection) && isSelected;

    return (
        <div
            className={`PollNode__container ${isFocused ? 'focused' : ''}`}
            ref={ref}>
            <div className="PollNode__inner">
                <h2 className="PollNode__heading">{question}</h2>
                {options.map((option, index) => {
                    const key = option.uid;
                    return (
                        <PollOptionComponent
                            key={key}
                            withPollNode={withPollNode}
                            option={option}
                            index={index}
                            options={options}
                            totalVotes={totalVotes}
                        />
                    );
                })}
                <div className="PollNode__footer">
                    <Button onClick={addOption} small={true}>
                        Add Option
                    </Button>
                </div>
            </div>
        </div>
    );
}



export type SerializedEquationNode = Spread<
    {
        equation: string;
        inline: boolean;
    },
    SerializedLexicalNode
>;

function convertEquationElement(
    domNode: HTMLElement,
): null | DOMConversionOutput {
    let equation = domNode.getAttribute('data-lexical-equation');
    const inline = domNode.getAttribute('data-lexical-inline') === 'true';
    // Decode the equation from base64
    equation = atob(equation || '');
    if (equation) {
        const node = $createEquationNode(equation, inline);
        return { node };
    }

    return null;
}

export class EquationNode extends DecoratorNode<JSX.Element> {
    __equation: string;
    __inline: boolean;

    static getType(): string {
        return 'equation';
    }

    static clone(node: EquationNode): EquationNode {
        return new EquationNode(node.__equation, node.__inline, node.__key);
    }

    constructor(equation: string, inline?: boolean, key?: NodeKey) {
        super(key);
        this.__equation = equation;
        this.__inline = inline ?? false;
    }

    static importJSON(serializedNode: SerializedEquationNode): EquationNode {
        const node = $createEquationNode(
            serializedNode.equation,
            serializedNode.inline,
        );
        return node;
    }

    exportJSON(): SerializedEquationNode {
        return {
            equation: this.getEquation(),
            inline: this.__inline,
            type: 'equation',
            version: 1,
        };
    }

    createDOM(_config: EditorConfig): HTMLElement {
        const element = document.createElement(this.__inline ? 'span' : 'div');
        // EquationNodes should implement `user-action:none` in their CSS to avoid issues with deletion on Android.
        element.className = 'editor-equation';
        return element;
    }

    exportDOM(): DOMExportOutput {
        const element = document.createElement(this.__inline ? 'span' : 'div');
        // Encode the equation as base64 to avoid issues with special characters
        const equation = btoa(this.__equation);
        element.setAttribute('data-lexical-equation', equation);
        element.setAttribute('data-lexical-inline', `${this.__inline}`);
        katex.render(this.__equation, element, {
            displayMode: !this.__inline, // true === block display //
            errorColor: '#cc0000',
            output: 'html',
            strict: 'warn',
            throwOnError: false,
            trust: false,
        });
        return { element };
    }

    static importDOM(): DOMConversionMap | null {
        return {
            div: (domNode: HTMLElement) => {
                if (!domNode.hasAttribute('data-lexical-equation')) {
                    return null;
                }
                return {
                    conversion: convertEquationElement,
                    priority: 2,
                };
            },
            span: (domNode: HTMLElement) => {
                if (!domNode.hasAttribute('data-lexical-equation')) {
                    return null;
                }
                return {
                    conversion: convertEquationElement,
                    priority: 1,
                };
            },
        };
    }

    updateDOM(prevNode: EquationNode): boolean {
        // If the inline property changes, replace the element
        return this.__inline !== prevNode.__inline;
    }

    getTextContent(): string {
        return this.__equation;
    }

    getEquation(): string {
        return this.__equation;
    }

    setEquation(equation: string): void {
        const writable = this.getWritable();
        writable.__equation = equation;
    }

    decorate(): JSX.Element {
        return (
            <Suspense fallback={null}>
                <EquationComponent
                    equation={this.__equation}
                    inline={this.__inline}
                    nodeKey={this.__key}
                />
            </Suspense>
        );
    }
}

export function $createEquationNode(
    equation = '',
    inline = false,
): EquationNode {
    const equationNode = new EquationNode(equation, inline);
    return $applyNodeReplacement(equationNode);
}

export function $isEquationNode(
    node: LexicalNode | null | undefined,
): node is EquationNode {
    return node instanceof EquationNode;
}



type FigmaComponentProps = Readonly<{
    className: Readonly<{
        base: string;
        focus: string;
    }>;
    format: ElementFormatType | null;
    nodeKey: NodeKey;
    documentID: string;
}>;

function FigmaComponent({
    className,
    format,
    nodeKey,
    documentID,
}: FigmaComponentProps) {
    return (
        <BlockWithAlignableContents
            className={className}
            format={format}
            nodeKey={nodeKey}>
            <iframe
                width="560"
                height="315"
                src={`https://www.figma.com/embed?embed_host=lexical&url=\
        https://www.figma.com/file/${documentID}`}
                allowFullScreen={true}
            />
        </BlockWithAlignableContents>
    );
}

export type SerializedFigmaNode = Spread<
    {
        documentID: string;
    },
    SerializedDecoratorBlockNode
>;

export class FigmaNode extends DecoratorBlockNode {
    __id: string;

    static getType(): string {
        return 'figma';
    }

    static clone(node: FigmaNode): FigmaNode {
        return new FigmaNode(node.__id, node.__format, node.__key);
    }

    static importJSON(serializedNode: SerializedFigmaNode): FigmaNode {
        const node = $createFigmaNode(serializedNode.documentID);
        node.setFormat(serializedNode.format);
        return node;
    }

    exportJSON(): SerializedFigmaNode {
        return {
            ...super.exportJSON(),
            documentID: this.__id,
            type: 'figma',
            version: 1,
        };
    }

    constructor(id: string, format?: ElementFormatType, key?: NodeKey) {
        super(format, key);
        this.__id = id;
    }

    updateDOM(): false {
        return false;
    }

    getId(): string {
        return this.__id;
    }

    getTextContent(
        _includeInert?: boolean | undefined,
        _includeDirectionless?: false | undefined,
    ): string {
        return `https://www.figma.com/file/${this.__id}`;
    }

    decorate(_editor: LexicalEditor, config: EditorConfig): JSX.Element {
        const embedBlockTheme = config.theme.embedBlock || {};
        const className = {
            base: embedBlockTheme.base || '',
            focus: embedBlockTheme.focus || '',
        };
        return (
            <FigmaComponent
                className={className}
                format={this.__format}
                nodeKey={this.getKey()}
                documentID={this.__id}
            />
        );
    }
}

export function $createFigmaNode(documentID: string): FigmaNode {
    return new FigmaNode(documentID);
}

export function $isFigmaNode(
    node: FigmaNode | LexicalNode | null | undefined,
): node is FigmaNode {
    return node instanceof FigmaNode;
}




const imageCache = new Set();

export const RIGHT_CLICK_IMAGE_COMMAND: LexicalCommand<MouseEvent> =
    createCommand('RIGHT_CLICK_IMAGE_COMMAND');

function useSuspenseImage(src: string) {
    if (!imageCache.has(src)) {
        throw new Promise((resolve) => {
            const img = new Image();
            img.src = src;
            img.onload = () => {
                imageCache.add(src);
                resolve(null);
            };
        });
    }
}

function LazyImage({
    altText,
    className,
    imageRef,
    src,
    width,
    height,
    maxWidth,
}: {
    altText: string;
    className: string | null;
    height: 'inherit' | number;
    imageRef: { current: null | HTMLImageElement };
    maxWidth: number;
    src: string;
    width: 'inherit' | number;
}): JSX.Element {
    useSuspenseImage(src);
    return (
        <img
            className={className || undefined}
            src={src}
            alt={altText}
            ref={imageRef}
            style={{
                height,
                maxWidth,
                width,
            }}
            draggable="false"
        />
    );
}

export function ImageComponent({
    src,
    altText,
    nodeKey,
    width,
    height,
    maxWidth,
    resizable,
    showCaption,
    caption,
    captionsEnabled,
}: {
    altText: string;
    caption: LexicalEditor;
    height: 'inherit' | number;
    maxWidth: number;
    nodeKey: NodeKey;
    resizable: boolean;
    showCaption: boolean;
    src: string;
    width: 'inherit' | number;
    captionsEnabled: boolean;
}): JSX.Element {
    const imageRef = useRef<null | HTMLImageElement>(null);
    const buttonRef = useRef<HTMLButtonElement | null>(null);
    const [isSelected, setSelected, clearSelection] =
        useLexicalNodeSelection(nodeKey);
    const [isResizing, setIsResizing] = useState<boolean>(false);
    const { isCollabActive } = useCollaborationContext();
    const [editor] = useLexicalComposerContext();
    const [selection, setSelection] = useState<BaseSelection | null>(null);
    const activeEditorRef = useRef<LexicalEditor | null>(null);

    const onDelete = useCallback(
        (payload: KeyboardEvent) => {
            if (isSelected && $isNodeSelection($getSelection())) {
                const event: KeyboardEvent = payload;
                event.preventDefault();
                const node = $getNodeByKey(nodeKey);
                if ($isImageNode(node)) {
                    node.remove();
                    return true;
                }
            }
            return false;
        },
        [isSelected, nodeKey],
    );

    const onEnter = useCallback(
        (event: KeyboardEvent) => {
            const latestSelection = $getSelection();
            const buttonElem = buttonRef.current;
            if (
                isSelected &&
                $isNodeSelection(latestSelection) &&
                latestSelection.getNodes().length === 1
            ) {
                if (showCaption) {
                    // Move focus into nested editor
                    $setSelection(null);
                    event.preventDefault();
                    caption.focus();
                    return true;
                } else if (
                    buttonElem !== null &&
                    buttonElem !== document.activeElement
                ) {
                    event.preventDefault();
                    buttonElem.focus();
                    return true;
                }
            }
            return false;
        },
        [caption, isSelected, showCaption],
    );

    const onEscape = useCallback(
        (event: KeyboardEvent) => {
            if (
                activeEditorRef.current === caption ||
                buttonRef.current === event.target
            ) {
                $setSelection(null);
                editor.update(() => {
                    setSelected(true);
                    const parentRootElement = editor.getRootElement();
                    if (parentRootElement !== null) {
                        parentRootElement.focus();
                    }
                });
                return true;
            }
            return false;
        },
        [caption, editor, setSelected],
    );

    const onClick = useCallback(
        (payload: MouseEvent) => {
            const event = payload;

            if (isResizing) {
                return true;
            }
            if (event.target === imageRef.current) {
                if (event.shiftKey) {
                    setSelected(!isSelected);
                } else {
                    clearSelection();
                    setSelected(true);
                }
                return true;
            }

            return false;
        },
        [isResizing, isSelected, setSelected, clearSelection],
    );

    const onRightClick = useCallback(
        (event: MouseEvent): void => {
            editor.getEditorState().read(() => {
                const latestSelection = $getSelection();
                const domElement = event.target as HTMLElement;
                if (
                    domElement.tagName === 'IMG' &&
                    $isRangeSelection(latestSelection) &&
                    latestSelection.getNodes().length === 1
                ) {
                    editor.dispatchCommand(
                        RIGHT_CLICK_IMAGE_COMMAND,
                        event as MouseEvent,
                    );
                }
            });
        },
        [editor],
    );

    useEffect(() => {
        let isMounted = true;
        const rootElement = editor.getRootElement();
        const unregister = mergeRegister(
            editor.registerUpdateListener(({ editorState }) => {
                if (isMounted) {
                    setSelection(editorState.read(() => $getSelection()));
                }
            }),
            editor.registerCommand(
                SELECTION_CHANGE_COMMAND,
                (_, activeEditor) => {
                    activeEditorRef.current = activeEditor;
                    return false;
                },
                COMMAND_PRIORITY_LOW,
            ),
            editor.registerCommand<MouseEvent>(
                CLICK_COMMAND,
                onClick,
                COMMAND_PRIORITY_LOW,
            ),
            editor.registerCommand<MouseEvent>(
                RIGHT_CLICK_IMAGE_COMMAND,
                onClick,
                COMMAND_PRIORITY_LOW,
            ),
            editor.registerCommand(
                DRAGSTART_COMMAND,
                (event) => {
                    if (event.target === imageRef.current) {
                        // TODO This is just a temporary workaround for FF to behave like other browsers.
                        // Ideally, this handles drag & drop too (and all browsers).
                        event.preventDefault();
                        return true;
                    }
                    return false;
                },
                COMMAND_PRIORITY_LOW,
            ),
            editor.registerCommand(
                KEY_DELETE_COMMAND,
                onDelete,
                COMMAND_PRIORITY_LOW,
            ),
            editor.registerCommand(
                KEY_BACKSPACE_COMMAND,
                onDelete,
                COMMAND_PRIORITY_LOW,
            ),
            editor.registerCommand(KEY_ENTER_COMMAND, onEnter, COMMAND_PRIORITY_LOW),
            editor.registerCommand(
                KEY_ESCAPE_COMMAND,
                onEscape,
                COMMAND_PRIORITY_LOW,
            ),
        );

        rootElement?.addEventListener('contextmenu', onRightClick);

        return () => {
            isMounted = false;
            unregister();
            rootElement?.removeEventListener('contextmenu', onRightClick);
        };
    }, [
        clearSelection,
        editor,
        isResizing,
        isSelected,
        nodeKey,
        onDelete,
        onEnter,
        onEscape,
        onClick,
        onRightClick,
        setSelected,
    ]);

    const setShowCaption = () => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            if ($isImageNode(node)) {
                node.setShowCaption(true);
            }
        });
    };

    const onResizeEnd = (
        nextWidth: 'inherit' | number,
        nextHeight: 'inherit' | number,
    ) => {
        // Delay hiding the resize bars for click case
        setTimeout(() => {
            setIsResizing(false);
        }, 200);

        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            if ($isImageNode(node)) {
                node.setWidthAndHeight(nextWidth, nextHeight);
            }
        });
    };

    const onResizeStart = () => {
        setIsResizing(true);
    };

    const { historyState } = useSharedHistoryContext();
    const {
        settings: { showNestedEditorTreeView },
    } = useSettings();

    const draggable = isSelected && $isNodeSelection(selection) && !isResizing;
    const isFocused = isSelected || isResizing;
    return (
        <Suspense fallback={null}>
            <>
                <div draggable={draggable}>
                    <LazyImage
                        className={
                            isFocused
                                ? `focused ${$isNodeSelection(selection) ? 'draggable' : ''}`
                                : null
                        }
                        src={src}
                        altText={altText}
                        imageRef={imageRef}
                        width={width}
                        height={height}
                        maxWidth={maxWidth}
                    />
                </div>
                {showCaption && (
                    <div className="image-caption-container">
                        <LexicalNestedComposer initialEditor={caption}>
                            <AutoFocusPlugin />
                            {/* <MentionsPlugin /> */}
                            <LinkPlugin />
                            <EmojisPlugin />
                            <HashtagPlugin />
                            <KeywordsPlugin />
                            {isCollabActive ? (<></>
                                // <CollaborationPlugin
                                //     id={caption.getKey()}
                                //     providerFactory={createWebsocketProvider}
                                //     shouldBootstrap={true}
                                // />
                            ) : (
                                <HistoryPlugin externalHistoryState={historyState} />
                            )}
                            <RichTextPlugin
                                contentEditable={
                                    <ContentEditable className="ImageNode__contentEditable" />
                                }
                                placeholder={
                                    <Placeholder className="ImageNode__placeholder">
                                        Enter a caption...
                                    </Placeholder>
                                }
                                ErrorBoundary={LexicalErrorBoundary}
                            />
                            {showNestedEditorTreeView === true ? <TreeViewPlugin /> : null}
                        </LexicalNestedComposer>
                    </div>
                )}
                {resizable && $isNodeSelection(selection) && isFocused && (
                    <ImageResizer
                        showCaption={showCaption}
                        setShowCaption={setShowCaption}
                        editor={editor}
                        buttonRef={buttonRef}
                        imageRef={imageRef}
                        maxWidth={maxWidth}
                        onResizeStart={onResizeStart}
                        onResizeEnd={onResizeEnd}
                        captionsEnabled={captionsEnabled}
                    />
                )}
            </>
        </Suspense>
    );
}





export interface ImagePayload {
    altText: string;
    caption?: LexicalEditor;
    height?: number;
    key?: NodeKey;
    maxWidth?: number;
    showCaption?: boolean;
    src: string;
    width?: number;
    captionsEnabled?: boolean;
}

function convertImageElement(domNode: Node): null | DOMConversionOutput {
    const img = domNode as HTMLImageElement;
    if (img.src.startsWith('file:///')) {
        return null;
    }
    const { alt: altText, src, width, height } = img;
    const node = $createImageNode({ altText, height, src, width });
    return { node };
}

export type SerializedImageNode = Spread<
    {
        altText: string;
        caption: SerializedEditor;
        height?: number;
        maxWidth: number;
        showCaption: boolean;
        src: string;
        width?: number;
    },
    SerializedLexicalNode
>;



export function $createImageNode({
    altText,
    height,
    maxWidth = 500,
    captionsEnabled,
    src,
    width,
    showCaption,
    caption,
    key,
}: ImagePayload): ImageNode {
    return $applyNodeReplacement(
        new ImageNode(
            src,
            altText,
            maxWidth,
            width,
            height,
            showCaption,
            caption,
            captionsEnabled,
            key,
        ),
    );
}

export function $isImageNode(
    node: LexicalNode | null | undefined,
): node is ImageNode {
    return node instanceof ImageNode;
}

export function UpdateInlineImageDialog({
    activeEditor,
    nodeKey,
    onClose,
}: {
    activeEditor: LexicalEditor;
    nodeKey: NodeKey;
    onClose: () => void;
}): JSX.Element {
    const editorState = activeEditor.getEditorState();
    const node = editorState.read(
        () => $getNodeByKey(nodeKey) as InlineImageNode,
    );
    const [altText, setAltText] = useState(node.getAltText());
    const [showCaption, setShowCaption] = useState(node.getShowCaption());
    const [position, setPosition] = useState<Position>(node.getPosition());

    const handleShowCaptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setShowCaption(e.target.checked);
    };

    const handlePositionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setPosition(e.target.value as Position);
    };

    const handleOnConfirm = () => {
        const payload = { altText, position, showCaption };
        if (node) {
            activeEditor.update(() => {
                node.update(payload);
            });
        }
        onClose();
    };

    return (
        <>
            <div style={{ marginBottom: '1em' }}>
                <TextInput
                    label="Alt Text"
                    placeholder="Descriptive alternative text"
                    onChange={setAltText}
                    value={altText}
                    data-test-id="image-modal-alt-text-input"
                />
            </div>

            <Select
                style={{ marginBottom: '1em', width: '208px' }}
                value={position}
                label="Position"
                name="position"
                id="position-select"
                onChange={handlePositionChange}>
                <option value="left">Left</option>
                <option value="right">Right</option>
                <option value="full">Full Width</option>
            </Select>

            <div className="Input__wrapper">
                <input
                    id="caption"
                    type="checkbox"
                    checked={showCaption}
                    onChange={handleShowCaptionChange}
                />
                <label htmlFor="caption">Show Caption</label>
            </div>

            <DialogActions>
                <Button
                    data-test-id="image-modal-file-upload-btn"
                    onClick={() => handleOnConfirm()}>
                    Confirm
                </Button>
            </DialogActions>
        </>
    );
}


export type Position = 'left' | 'right' | 'full' | undefined;

export interface InlineImagePayload {
    altText: string;
    caption?: LexicalEditor;
    height?: number;
    key?: NodeKey;
    showCaption?: boolean;
    src: string;
    width?: number;
    position?: Position;
}

export interface UpdateInlineImagePayload {
    altText?: string;
    showCaption?: boolean;
    position?: Position;
}

function convertInlineImageElement(domNode: Node): null | DOMConversionOutput {
    if (domNode instanceof HTMLImageElement) {
        const { alt: altText, src, width, height } = domNode;
        const node = $createInlineImageNode({ altText, height, src, width });
        return { node };
    }
    return null;
}

export type SerializedInlineImageNode = Spread<
    {
        altText: string;
        caption: SerializedEditor;
        height?: number;
        showCaption: boolean;
        src: string;
        width?: number;
        position?: Position;
    },
    SerializedLexicalNode
>;

export class InlineImageNode extends DecoratorNode<JSX.Element> {
    __src: string;
    __altText: string;
    __width: 'inherit' | number;
    __height: 'inherit' | number;
    __showCaption: boolean;
    __caption: LexicalEditor;
    __position: Position;

    static getType(): string {
        return 'inline-image';
    }

    static clone(node: InlineImageNode): InlineImageNode {
        return new InlineImageNode(
            node.__src,
            node.__altText,
            node.__position,
            node.__width,
            node.__height,
            node.__showCaption,
            node.__caption,
            node.__key,
        );
    }

    static importJSON(
        serializedNode: SerializedInlineImageNode,
    ): InlineImageNode {
        const { altText, height, width, caption, src, showCaption, position } =
            serializedNode;
        const node = $createInlineImageNode({
            altText,
            height,
            position,
            showCaption,
            src,
            width,
        });
        const nestedEditor = node.__caption;
        const editorState = nestedEditor.parseEditorState(caption.editorState);
        if (!editorState.isEmpty()) {
            nestedEditor.setEditorState(editorState);
        }
        return node;
    }

    static importDOM(): DOMConversionMap | null {
        return {
            img: (node: Node) => ({
                conversion: convertInlineImageElement,
                priority: 0,
            }),
        };
    }

    constructor(
        src: string,
        altText: string,
        position: Position,
        width?: 'inherit' | number,
        height?: 'inherit' | number,
        showCaption?: boolean,
        caption?: LexicalEditor,
        key?: NodeKey,
    ) {
        super(key);
        this.__src = src;
        this.__altText = altText;
        this.__width = width || 'inherit';
        this.__height = height || 'inherit';
        this.__showCaption = showCaption || false;
        this.__caption = caption || createEditor();
        this.__position = position;
    }

    exportDOM(): DOMExportOutput {
        const element = document.createElement('img');
        element.setAttribute('src', this.__src);
        element.setAttribute('alt', this.__altText);
        element.setAttribute('width', this.__width.toString());
        element.setAttribute('height', this.__height.toString());
        return { element };
    }

    exportJSON(): SerializedInlineImageNode {
        return {
            altText: this.getAltText(),
            caption: this.__caption.toJSON(),
            height: this.__height === 'inherit' ? 0 : this.__height,
            position: this.__position,
            showCaption: this.__showCaption,
            src: this.getSrc(),
            type: 'inline-image',
            version: 1,
            width: this.__width === 'inherit' ? 0 : this.__width,
        };
    }

    getSrc(): string {
        return this.__src;
    }

    getAltText(): string {
        return this.__altText;
    }

    setAltText(altText: string): void {
        const writable = this.getWritable();
        writable.__altText = altText;
    }

    setWidthAndHeight(
        width: 'inherit' | number,
        height: 'inherit' | number,
    ): void {
        const writable = this.getWritable();
        writable.__width = width;
        writable.__height = height;
    }

    getShowCaption(): boolean {
        return this.__showCaption;
    }

    setShowCaption(showCaption: boolean): void {
        const writable = this.getWritable();
        writable.__showCaption = showCaption;
    }

    getPosition(): Position {
        return this.__position;
    }

    setPosition(position: Position): void {
        const writable = this.getWritable();
        writable.__position = position;
    }

    update(payload: UpdateInlineImagePayload): void {
        const writable = this.getWritable();
        const { altText, showCaption, position } = payload;
        if (altText !== undefined) {
            writable.__altText = altText;
        }
        if (showCaption !== undefined) {
            writable.__showCaption = showCaption;
        }
        if (position !== undefined) {
            writable.__position = position;
        }
    }

    // View

    createDOM(config: EditorConfig): HTMLElement {
        const span = document.createElement('span');
        const className = `${config.theme.inlineImage} position-${this.__position}`;
        if (className !== undefined) {
            span.className = className;
        }
        return span;
    }

    updateDOM(
        prevNode: InlineImageNode,
        dom: HTMLElement,
        config: EditorConfig,
    ): false {
        const position = this.__position;
        if (position !== prevNode.__position) {
            const className = `${config.theme.inlineImage} position-${position}`;
            if (className !== undefined) {
                dom.className = className;
            }
        }
        return false;
    }

    decorate(): JSX.Element {
        return (
            <Suspense fallback={null}>
                <InlineImageComponent
                    src={this.__src}
                    altText={this.__altText}
                    width={this.__width}
                    height={this.__height}
                    nodeKey={this.getKey()}
                    showCaption={this.__showCaption}
                    caption={this.__caption}
                    position={this.__position}
                />
            </Suspense>
        );
    }
}

export function $createInlineImageNode({
    altText,
    position,
    height,
    src,
    width,
    showCaption,
    caption,
    key,
}: InlineImagePayload): InlineImageNode {
    return $applyNodeReplacement(
        new InlineImageNode(
            src,
            altText,
            position,
            width,
            height,
            showCaption,
            caption,
            key,
        ),
    );
}

export function $isInlineImageNode(
    node: LexicalNode | null | undefined,
): node is InlineImageNode {
    return node instanceof InlineImageNode;
}



export type SerializedKeywordNode = SerializedTextNode;

export class KeywordNode extends TextNode {
    static getType(): string {
        return 'keyword';
    }

    static clone(node: KeywordNode): KeywordNode {
        return new KeywordNode(node.__text, node.__key);
    }

    static importJSON(serializedNode: SerializedKeywordNode): KeywordNode {
        const node = $createKeywordNode(serializedNode.text);
        node.setFormat(serializedNode.format);
        node.setDetail(serializedNode.detail);
        node.setMode(serializedNode.mode);
        node.setStyle(serializedNode.style);
        return node;
    }

    exportJSON(): SerializedKeywordNode {
        return {
            ...super.exportJSON(),
            type: 'keyword',
            version: 1,
        };
    }

    createDOM(config: EditorConfig): HTMLElement {
        const dom = super.createDOM(config);
        dom.style.cursor = 'default';
        dom.className = 'keyword';
        return dom;
    }

    canInsertTextBefore(): boolean {
        return false;
    }

    canInsertTextAfter(): boolean {
        return false;
    }

    isTextEntity(): true {
        return true;
    }
}

export function $createKeywordNode(keyword: string): KeywordNode {
    return new KeywordNode(keyword);
}

export function $isKeywordNode(node: LexicalNode | null | undefined): boolean {
    return node instanceof KeywordNode;
}



export type SerializedLayoutContainerNode = Spread<
    {
        templateColumns: string;
    },
    SerializedElementNode
>;

function convertLayoutContainerElement(
    domNode: HTMLElement,
): DOMConversionOutput | null {
    const styleAttributes = window.getComputedStyle(domNode);
    const templateColumns = styleAttributes.getPropertyValue(
        'grid-template-columns',
    );
    if (templateColumns) {
        const node = $createLayoutContainerNode(templateColumns);
        return { node };
    }
    return null;
}

export class LayoutContainerNode extends ElementNode {
    __templateColumns: string;

    constructor(templateColumns: string, key?: NodeKey) {
        super(key);
        this.__templateColumns = templateColumns;
    }

    static getType(): string {
        return 'layout-container';
    }

    static clone(node: LayoutContainerNode): LayoutContainerNode {
        return new LayoutContainerNode(node.__templateColumns, node.__key);
    }

    createDOM(config: EditorConfig): HTMLElement {
        const dom = document.createElement('div');
        dom.style.gridTemplateColumns = this.__templateColumns;
        if (typeof config.theme.layoutContainer === 'string') {
            addClassNamesToElement(dom, config.theme.layoutContainer);
        }
        return dom;
    }

    exportDOM(): DOMExportOutput {
        const element = document.createElement('div');
        element.style.gridTemplateColumns = this.__templateColumns;
        element.setAttribute('data-lexical-layout-container', 'true');
        return { element };
    }

    updateDOM(prevNode: LayoutContainerNode, dom: HTMLElement): boolean {
        if (prevNode.__templateColumns !== this.__templateColumns) {
            dom.style.gridTemplateColumns = this.__templateColumns;
        }
        return false;
    }

    static importDOM(): DOMConversionMap | null {
        return {
            div: (domNode: HTMLElement) => {
                if (!domNode.hasAttribute('data-lexical-layout-container')) {
                    return null;
                }
                return {
                    conversion: convertLayoutContainerElement,
                    priority: 2,
                };
            },
        };
    }

    static importJSON(json: SerializedLayoutContainerNode): LayoutContainerNode {
        return $createLayoutContainerNode(json.templateColumns);
    }

    isShadowRoot(): boolean {
        return true;
    }

    canBeEmpty(): boolean {
        return false;
    }

    exportJSON(): SerializedLayoutContainerNode {
        return {
            ...super.exportJSON(),
            templateColumns: this.__templateColumns,
            type: 'layout-container',
            version: 1,
        };
    }

    getTemplateColumns(): string {
        return this.getLatest().__templateColumns;
    }

    setTemplateColumns(templateColumns: string) {
        this.getWritable().__templateColumns = templateColumns;
    }
}

export function $createLayoutContainerNode(
    templateColumns: string,
): LayoutContainerNode {
    return new LayoutContainerNode(templateColumns);
}

export function $isLayoutContainerNode(
    node: LexicalNode | null | undefined,
): node is LayoutContainerNode {
    return node instanceof LayoutContainerNode;
}


export type SerializedLayoutItemNode = SerializedElementNode;

export class LayoutItemNode extends ElementNode {
    static getType(): string {
        return 'layout-item';
    }

    static clone(node: LayoutItemNode): LayoutItemNode {
        return new LayoutItemNode(node.__key);
    }

    createDOM(config: EditorConfig): HTMLElement {
        const dom = document.createElement('div');
        if (typeof config.theme.layoutItem === 'string') {
            addClassNamesToElement(dom, config.theme.layoutItem);
        }
        return dom;
    }

    updateDOM(): boolean {
        return false;
    }

    static importDOM(): DOMConversionMap | null {
        return {};
    }

    static importJSON(): LayoutItemNode {
        return $createLayoutItemNode();
    }

    isShadowRoot(): boolean {
        return true;
    }

    exportJSON(): SerializedLayoutItemNode {
        return {
            ...super.exportJSON(),
            type: 'layout-item',
            version: 1,
        };
    }
}

export function $createLayoutItemNode(): LayoutItemNode {
    return new LayoutItemNode();
}

export function $isLayoutItemNode(
    node: LexicalNode | null | undefined,
): node is LayoutItemNode {
    return node instanceof LayoutItemNode;
}



export type SerializedMentionNode = Spread<
    {
        mentionName: string;
    },
    SerializedTextNode
>;

function convertMentionElement(
    domNode: HTMLElement,
): DOMConversionOutput | null {
    const textContent = domNode.textContent;

    if (textContent !== null) {
        const node = $createMentionNode(textContent);
        return {
            node,
        };
    }

    return null;
}

const mentionStyle = 'background-color: rgba(24, 119, 232, 0.2)';
export class MentionNode extends TextNode {
    __mention: string;

    static getType(): string {
        return 'mention';
    }

    static clone(node: MentionNode): MentionNode {
        return new MentionNode(node.__mention, node.__text, node.__key);
    }
    static importJSON(serializedNode: SerializedMentionNode): MentionNode {
        const node = $createMentionNode(serializedNode.mentionName);
        node.setTextContent(serializedNode.text);
        node.setFormat(serializedNode.format);
        node.setDetail(serializedNode.detail);
        node.setMode(serializedNode.mode);
        node.setStyle(serializedNode.style);
        return node;
    }

    constructor(mentionName: string, text?: string, key?: NodeKey) {
        super(text ?? mentionName, key);
        this.__mention = mentionName;
    }

    exportJSON(): SerializedMentionNode {
        return {
            ...super.exportJSON(),
            mentionName: this.__mention,
            type: 'mention',
            version: 1,
        };
    }

    createDOM(config: EditorConfig): HTMLElement {
        const dom = super.createDOM(config);
        dom.style.cssText = mentionStyle;
        dom.className = 'mention';
        return dom;
    }

    exportDOM(): DOMExportOutput {
        const element = document.createElement('span');
        element.setAttribute('data-lexical-mention', 'true');
        element.textContent = this.__text;
        return { element };
    }

    static importDOM(): DOMConversionMap | null {
        return {
            span: (domNode: HTMLElement) => {
                if (!domNode.hasAttribute('data-lexical-mention')) {
                    return null;
                }
                return {
                    conversion: convertMentionElement,
                    priority: 1,
                };
            },
        };
    }

    isTextEntity(): true {
        return true;
    }

    canInsertTextBefore(): boolean {
        return false;
    }

    canInsertTextAfter(): boolean {
        return false;
    }
}

export function $createMentionNode(mentionName: string): MentionNode {
    const mentionNode = new MentionNode(mentionName);
    mentionNode.setMode('segmented').toggleDirectionless();
    return $applyNodeReplacement(mentionNode);
}

export function $isMentionNode(
    node: LexicalNode | null | undefined,
): node is MentionNode {
    return node instanceof MentionNode;
}



export type SerializedEmojiNode = Spread<
    {
        className: string;
    },
    SerializedTextNode
>;

export class EmojiNode extends TextNode {
    __className: string;

    static getType(): string {
        return 'emoji';
    }

    static clone(node: EmojiNode): EmojiNode {
        return new EmojiNode(node.__className, node.__text, node.__key);
    }

    constructor(className: string, text: string, key?: NodeKey) {
        super(text, key);
        this.__className = className;
    }

    createDOM(config: EditorConfig): HTMLElement {
        const dom = document.createElement('span');
        const inner = super.createDOM(config);
        dom.className = this.__className;
        inner.className = 'emoji-inner';
        dom.appendChild(inner);
        return dom;
    }

    updateDOM(
        prevNode: TextNode,
        dom: HTMLElement,
        config: EditorConfig,
    ): boolean {
        const inner = dom.firstChild;
        if (inner === null) {
            return true;
        }
        super.updateDOM(prevNode, inner as HTMLElement, config);
        return false;
    }

    static importJSON(serializedNode: SerializedEmojiNode): EmojiNode {
        const node = $createEmojiNode(
            serializedNode.className,
            serializedNode.text,
        );
        node.setFormat(serializedNode.format);
        node.setDetail(serializedNode.detail);
        node.setMode(serializedNode.mode);
        node.setStyle(serializedNode.style);
        return node;
    }

    exportJSON(): SerializedEmojiNode {
        return {
            ...super.exportJSON(),
            className: this.getClassName(),
            type: 'emoji',
        };
    }

    getClassName(): string {
        const self = this.getLatest();
        return self.__className;
    }
}

export function $isEmojiNode(
    node: LexicalNode | null | undefined,
): node is EmojiNode {
    return node instanceof EmojiNode;
}

export function $createEmojiNode(
    className: string,
    emojiText: string,
): EmojiNode {
    const node = new EmojiNode(className, emojiText).setMode('token');
    return $applyNodeReplacement(node);
}


declare global {
    interface Navigator {
        userAgentData?: {
            mobile: boolean;
        };
    }
}

export type SerializedAutocompleteNode = Spread<
    {
        uuid: string;
    },
    SerializedLexicalNode
>;

export class AutocompleteNode extends DecoratorNode<JSX.Element | null> {
    // TODO add comment
    __uuid: string;

    static clone(node: AutocompleteNode): AutocompleteNode {
        return new AutocompleteNode(node.__uuid, node.__key);
    }

    static getType(): 'autocomplete' {
        return 'autocomplete';
    }

    static importJSON(
        serializedNode: SerializedAutocompleteNode,
    ): AutocompleteNode {
        const node = $createAutocompleteNode(serializedNode.uuid);
        return node;
    }

    exportJSON(): SerializedAutocompleteNode {
        return {
            ...super.exportJSON(),
            type: 'autocomplete',
            uuid: this.__uuid,
            version: 1,
        };
    }

    constructor(uuid: string, key?: NodeKey) {
        super(key);
        this.__uuid = uuid;
    }

    updateDOM(
        prevNode: unknown,
        dom: HTMLElement,
        config: EditorConfig,
    ): boolean {
        return false;
    }

    createDOM(config: EditorConfig): HTMLElement {
        return document.createElement('span');
    }

    decorate(): JSX.Element | null {
        if (this.__uuid !== UUID) {
            return null;
        }
        return <AutocompleteComponent />;
    }
}

export function $createAutocompleteNode(uuid: string): AutocompleteNode {
    return new AutocompleteNode(uuid);
}

function AutocompleteComponent(): JSX.Element {
    const [suggestion] = useSharedAutocompleteContext();
    const userAgentData = window.navigator.userAgentData;
    const isMobile =
        userAgentData !== undefined
            ? userAgentData.mobile
            : window.innerWidth <= 800 && window.innerHeight <= 600;
    // TODO Move to theme
    return (
        <span style={{ color: '#ccc' }} spellCheck="false">
            {suggestion} {isMobile ? '(SWIPE \u2B95)' : '(TAB)'}
        </span>
    );
}

export type SerializedPageBreakNode = SerializedLexicalNode;

function PageBreakComponent({ nodeKey }: { nodeKey: NodeKey }) {
    const [editor] = useLexicalComposerContext();
    const [isSelected, setSelected, clearSelection] =
        useLexicalNodeSelection(nodeKey);

    const onDelete = useCallback(
        (event: KeyboardEvent) => {
            event.preventDefault();
            if (isSelected && $isNodeSelection($getSelection())) {
                const node = $getNodeByKey(nodeKey);
                if ($isPageBreakNode(node)) {
                    node.remove();
                    return true;
                }
            }
            return false;
        },
        [isSelected, nodeKey],
    );

    useEffect(() => {
        return mergeRegister(
            editor.registerCommand(
                CLICK_COMMAND,
                (event: MouseEvent) => {
                    const pbElem = editor.getElementByKey(nodeKey);

                    if (event.target === pbElem) {
                        if (!event.shiftKey) {
                            clearSelection();
                        }
                        setSelected(!isSelected);
                        return true;
                    }

                    return false;
                },
                COMMAND_PRIORITY_LOW,
            ),
            editor.registerCommand(
                KEY_DELETE_COMMAND,
                onDelete,
                COMMAND_PRIORITY_LOW,
            ),
            editor.registerCommand(
                KEY_BACKSPACE_COMMAND,
                onDelete,
                COMMAND_PRIORITY_LOW,
            ),
        );
    }, [clearSelection, editor, isSelected, nodeKey, onDelete, setSelected]);

    useEffect(() => {
        const pbElem = editor.getElementByKey(nodeKey);
        if (pbElem !== null) {
            pbElem.className = isSelected ? 'selected' : '';
        }
    }, [editor, isSelected, nodeKey]);

    return null;
}

export class PageBreakNode extends DecoratorNode<JSX.Element> {
    static getType(): string {
        return 'page-break';
    }

    static clone(node: PageBreakNode): PageBreakNode {
        return new PageBreakNode(node.__key);
    }

    static importJSON(serializedNode: SerializedPageBreakNode): PageBreakNode {
        return $createPageBreakNode();
    }

    static importDOM(): DOMConversionMap | null {
        return {
            figure: (domNode: HTMLElement) => {
                const tp = domNode.getAttribute('type');
                if (tp !== this.getType()) {
                    return null;
                }

                return {
                    conversion: convertPageBreakElement,
                    priority: COMMAND_PRIORITY_HIGH,
                };
            },
        };
    }

    exportJSON(): SerializedLexicalNode {
        return {
            type: this.getType(),
            version: 1,
        };
    }

    createDOM(): HTMLElement {
        const el = document.createElement('figure');
        el.style.pageBreakAfter = 'always';
        el.setAttribute('type', this.getType());
        return el;
    }

    getTextContent(): string {
        return '\n';
    }

    isInline(): false {
        return false;
    }

    updateDOM(): boolean {
        return false;
    }

    decorate(): JSX.Element {
        return <PageBreakComponent nodeKey={this.__key} />;
    }
}

function convertPageBreakElement(): DOMConversionOutput {
    return { node: $createPageBreakNode() };
}

export function $createPageBreakNode(): PageBreakNode {
    return new PageBreakNode();
}

export function $isPageBreakNode(
    node: LexicalNode | null | undefined,
): node is PageBreakNode {
    return node instanceof PageBreakNode;
}



export const PlaygroundNodes: Array<Klass<LexicalNode>> = [
    HeadingNode, ListNode, ListItemNode, QuoteNode, CodeNode, CodeHighlightNode, AutoLinkNode, LinkNode, PollNode, StickyNode,
    ImageNode, InlineImageNode, MentionNode, EmojiNode, HorizontalRuleNode, TweetNode, YouTubeNode, FigmaNode, CollapsibleContainerNode,
    CollapsibleContentNode, CollapsibleTitleNode, ExcalidrawNode, EquationNode, AutocompleteNode, KeywordNode, PageBreakNode,
    LayoutContainerNode, LayoutItemNode, // MarkNode,OverflowNode,TableNode, TableCellNode, TableRowNode, HashtagNode,
];