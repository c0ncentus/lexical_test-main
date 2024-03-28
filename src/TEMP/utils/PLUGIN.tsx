import * as React from 'react';
import { 
    useEffect, useRef, useState, createContext, useContext, useMemo,useCallback ,Dispatch,   
     MouseEventHandler, ReactPortal, DragEvent as ReactDragEvent
    } from 'react';


const CODE_PADDING = 8;

interface Position {
    top: string;
    right: string;
}

function CodeActionMenuContainer({
    anchorElem,
}: {
    anchorElem: HTMLElement;
}): JSX.Element {
    const [editor] = useLexicalComposerContext();

    const [lang, setLang] = useState('');
    const [isShown, setShown] = useState<boolean>(false);
    const [shouldListenMouseMove, setShouldListenMouseMove] =
        useState<boolean>(false);
    const [position, setPosition] = useState<Position>({
        right: '0',
        top: '0',
    });
    const codeSetRef = useRef<Set<string>>(new Set());
    const codeDOMNodeRef = useRef<HTMLElement | null>(null);

    function getCodeDOMNode(): HTMLElement | null {
        return codeDOMNodeRef.current;
    }

    const debouncedOnMouseMove = useDebounce(
        (event: MouseEvent) => {
            const { codeDOMNode, isOutside } = getMouseInfo(event);
            if (isOutside) {
                setShown(false);
                return;
            }

            if (!codeDOMNode) {
                return;
            }

            codeDOMNodeRef.current = codeDOMNode;

            let codeNode: CodeNode | null = null;
            let _lang = '';

            editor.update(() => {
                const maybeCodeNode = $getNearestNodeFromDOMNode(codeDOMNode);

                if ($isCodeNode(maybeCodeNode)) {
                    codeNode = maybeCodeNode;
                    _lang = codeNode.getLanguage() || '';
                }
            });

            if (codeNode) {
                const { y: editorElemY, right: editorElemRight } =
                    anchorElem.getBoundingClientRect();
                const { y, right } = codeDOMNode.getBoundingClientRect();
                setLang(_lang);
                setShown(true);
                setPosition({
                    right: `${editorElemRight - right + CODE_PADDING}px`,
                    top: `${y - editorElemY}px`,
                });
            }
        },
        50,
        1000,
    );

    useEffect(() => {
        if (!shouldListenMouseMove) {
            return;
        }

        document.addEventListener('mousemove', debouncedOnMouseMove);

        return () => {
            setShown(false);
            debouncedOnMouseMove.cancel();
            document.removeEventListener('mousemove', debouncedOnMouseMove);
        };
    }, [shouldListenMouseMove, debouncedOnMouseMove]);

    editor.registerMutationListener(CodeNode, (mutations) => {
        editor.getEditorState().read(() => {
            for (const [key, type] of mutations) {
                switch (type) {
                    case 'created':
                        codeSetRef.current.add(key);
                        setShouldListenMouseMove(codeSetRef.current.size > 0);
                        break;

                    case 'destroyed':
                        codeSetRef.current.delete(key);
                        setShouldListenMouseMove(codeSetRef.current.size > 0);
                        break;

                    default:
                        break;
                }
            }
        });
    });
    const normalizedLang = normalizeCodeLang(lang);
    const codeFriendlyName = getLanguageFriendlyName(lang);

    return (
        <>
        {
            isShown?(
          <div className = "code-action-menu-container" style = {{ ...position }} >
        <div className= "code-highlight-language" > { codeFriendlyName } < /div>
        < CopyButton editor = { editor } getCodeDOMNode = { getCodeDOMNode } />
            { canBePrettier(normalizedLang) ? (
                <PrettierButton
                editor={ editor }
                getCodeDOMNode = { getCodeDOMNode }
                lang = { normalizedLang }
                />
            ) : null
}
</div>
        ) : null}
</>
    );
  }

function getMouseInfo(event: MouseEvent): {
    codeDOMNode: HTMLElement | null;
    isOutside: boolean;
} {
    const target = event.target;

    if (target && target instanceof HTMLElement) {
        const codeDOMNode = target.closest<HTMLElement>(
            'code.PlaygroundEditorTheme__code',
        );
        const isOutside = !(
            codeDOMNode ||
            target.closest<HTMLElement>('div.code-action-menu-container')
        );

        return { codeDOMNode, isOutside };
    } else {
        return { codeDOMNode: null, isOutside: true };
    }
}

export function CodeActionMenuPlugin({
    anchorElem = document.body,
}: {
    anchorElem?: HTMLElement;
}): React.ReactPortal | null {
    return createPortal(
        <CodeActionMenuContainer anchorElem={ anchorElem } />,
        anchorElem,
    );
}










const URL_REGEX =
    /((https?:\/\/(www\.)?)|(www\.))[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/;

const EMAIL_REGEX =
    /(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))/;

const MATCHERS = [
    createLinkMatcherWithRegExp(URL_REGEX, (text) => {
        return text.startsWith('http') ? text : `https://${text}`;
    }),
    createLinkMatcherWithRegExp(EMAIL_REGEX, (text) => {
        return `mailto:${text}`;
    }),
];

export function LexicalAutoLinkPlugin(): JSX.Element {
    return <AutoLinkPlugin matchers={ MATCHERS } />;
}







interface PlaygroundEmbedConfig extends EmbedConfig {
    // Human readable name of the embeded content e.g. Tweet or Google Map.
    contentName: string;

    // Icon for display.
    icon?: JSX.Element;

    // An example of a matching url https://twitter.com/jack/status/20
    exampleUrl: string;

    // For extra searching.
    keywords: Array<string>;

    // Embed a Figma Project.
    description?: string;
}

export const YoutubeEmbedConfig: PlaygroundEmbedConfig = {
    contentName: 'Youtube Video',

    exampleUrl: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',

    // Icon for display.
    icon: <i className="icon youtube" />,

  insertNode: (editor: LexicalEditor, result: EmbedMatchResult) => {
        editor.dispatchCommand(INSERT_YOUTUBE_COMMAND, result.id);
    },

    keywords: ['youtube', 'video'],

    // Determine if a given URL is a match and return url data.
    parseUrl: async (url: string) => {
        const match =
            /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/.exec(url);

        const id = match ? (match?.[2].length === 11 ? match[2] : null) : null;

        if (id != null) {
            return {
                id,
                url,
            };
        }

        return null;
    },

    type: 'youtube-video',
};

export const TwitterEmbedConfig: PlaygroundEmbedConfig = {
    // e.g. Tweet or Google Map.
    contentName: 'Tweet',

    exampleUrl: 'https://twitter.com/jack/status/20',

    // Icon for display.
    icon: <i className="icon tweet" />,

  // Create the Lexical embed node from the url data.
  insertNode: (editor: LexicalEditor, result: EmbedMatchResult) => {
        editor.dispatchCommand(INSERT_TWEET_COMMAND, result.id);
    },

    // For extra searching.
    keywords: ['tweet', 'twitter'],

    // Determine if a given URL is a match and return url data.
    parseUrl: (text: string) => {
        const match =
            /^https:\/\/(twitter|x)\.com\/(#!\/)?(\w+)\/status(es)*\/(\d+)/.exec(
                text,
            );

        if (match != null) {
            return {
                id: match[5],
                url: match[1],
            };
        }

        return null;
    },

    type: 'tweet',
};

export const FigmaEmbedConfig: PlaygroundEmbedConfig = {
    contentName: 'Figma Document',

    exampleUrl: 'https://www.figma.com/file/LKQ4FJ4bTnCSjedbRpk931/Sample-File',

    icon: <i className="icon figma" />,

  insertNode: (editor: LexicalEditor, result: EmbedMatchResult) => {
        editor.dispatchCommand(INSERT_FIGMA_COMMAND, result.id);
    },

    keywords: ['figma', 'figma.com', 'mock-up'],

    // Determine if a given URL is a match and return url data.
    parseUrl: (text: string) => {
        const match =
            /https:\/\/([\w.-]+\.)?figma.com\/(file|proto)\/([0-9a-zA-Z]{22,128})(?:\/.*)?$/.exec(
                text,
            );

        if (match != null) {
            return {
                id: match[3],
                url: match[0],
            };
        }

        return null;
    },

    type: 'figma',
};

export const EmbedConfigs = [
    TwitterEmbedConfig,
    YoutubeEmbedConfig,
    FigmaEmbedConfig,
];

function AutoEmbedMenuItem({
    index,
    isSelected,
    onClick,
    onMouseEnter,
    option,
}: {
    index: number;
    isSelected: boolean;
    onClick: () => void;
    onMouseEnter: () => void;
    option: AutoEmbedOption;
}) {
    let className = 'item';
    if (isSelected) {
        className += ' selected';
    }
    return (
        <li
      key= { option.key }
    tabIndex = {- 1
}
className = { className }
ref = { option.setRefElement }
role = "option"
aria - selected={ isSelected }
id = { 'typeahead-item-' + index }
onMouseEnter = { onMouseEnter }
onClick = { onClick } >
    <span className="text" > { option.title } < /span>
        < /li>
  );
}

function AutoEmbedMenu({
    options,
    selectedItemIndex,
    onOptionClick,
    onOptionMouseEnter,
}: {
    selectedItemIndex: number | null;
    onOptionClick: (option: AutoEmbedOption, index: number) => void;
    onOptionMouseEnter: (index: number) => void;
    options: Array<AutoEmbedOption>;
}) {
    return (
        <div className= "typeahead-popover" >
        <ul>
        {
            options.map((option: AutoEmbedOption, i: number) => (
                <AutoEmbedMenuItem
            index= { i }
            isSelected = { selectedItemIndex === i}
    onClick = {() => onOptionClick(option, i)
}
onMouseEnter = {() => onOptionMouseEnter(i)}
key = { option.key }
option = { option }
    />
        ))}
</ul>
    < /div>
  );
}

const debounce = (callback: (text: string) => void, delay: number) => {
    let timeoutId: number;
    return (text: string) => {
        window.clearTimeout(timeoutId);
        timeoutId = window.setTimeout(() => {
            callback(text);
        }, delay);
    };
};

export function AutoEmbedDialog({
    embedConfig,
    onClose,
}: {
    embedConfig: PlaygroundEmbedConfig;
    onClose: () => void;
}): JSX.Element {
    const [text, setText] = useState('');
    const [editor] = useLexicalComposerContext();
    const [embedResult, setEmbedResult] = useState<EmbedMatchResult | null>(null);

    const validateText = useMemo(
        () =>
            debounce((inputText: string) => {
                const urlMatch = URL_MATCHER.exec(inputText);
                if (embedConfig != null && inputText != null && urlMatch != null) {
                    Promise.resolve(embedConfig.parseUrl(inputText)).then(
                        (parseResult) => {
                            setEmbedResult(parseResult);
                        },
                    );
                } else if (embedResult != null) {
                    setEmbedResult(null);
                }
            }, 200),
        [embedConfig, embedResult],
    );

    const onClick = () => {
        if (embedResult != null) {
            embedConfig.insertNode(editor, embedResult);
            onClose();
        }
    };

    return (
        <div style= {{ width: '600px' }
}>
    <div className="Input__wrapper" >
        <input
          type="text"
className = "Input__input"
placeholder = { embedConfig.exampleUrl }
value = { text }
data - test - id={ `${embedConfig.type}-embed-modal-url` }
onChange = {(e) => {
    const { value } = e.target;
    setText(value);
    validateText(value);
}}
/>
    < /div>
    < DialogActions >
    <Button
          disabled={ !embedResult }
onClick = { onClick }
data - test - id={ `${embedConfig.type}-embed-modal-submit-btn` }>
    Embed
    < /Button>
    < /DialogActions>
    < /div>
  );
}

export function AutoEmbedPlugin(): JSX.Element {
    const [modal, showModal] = useModal();

    const openEmbedModal = (embedConfig: PlaygroundEmbedConfig) => {
        showModal(`Embed ${embedConfig.contentName}`, (onClose) => (
            <AutoEmbedDialog embedConfig= { embedConfig } onClose = { onClose } />
    ));
    };

    const getMenuOptions = (
        activeEmbedConfig: PlaygroundEmbedConfig,
        embedFn: () => void,
        dismissFn: () => void,
    ) => {
        return [
            new AutoEmbedOption('Dismiss', {
                onSelect: dismissFn,
            }),
            new AutoEmbedOption(`Embed ${activeEmbedConfig.contentName}`, {
                onSelect: embedFn,
            }),
        ];
    };

    return (
        <>
        { modal }
        < LexicalAutoEmbedPlugin<PlaygroundEmbedConfig>
        embedConfigs = { EmbedConfigs }
    onOpenEmbedModalForConfig = { openEmbedModal }
    getMenuOptions = { getMenuOptions }
    menuRenderFn = {(
        anchorElementRef,
        { selectedIndex, options, selectOptionAndCleanUp, setHighlightedIndex },
    ) =>
    anchorElementRef.current
        ? ReactDOM.createPortal(
            <div
                  className="typeahead-popover auto-embed-menu"
                  style = {{
            marginLeft: anchorElementRef.current.style.width,
            width: 200,
        }}>
            <AutoEmbedMenu
                    options={ options }
selectedItemIndex = { selectedIndex }
onOptionClick = {(option: AutoEmbedOption, index: number) => {
    setHighlightedIndex(index);
    selectOptionAndCleanUp(option);
}}
onOptionMouseEnter = {(index: number) => {
    setHighlightedIndex(index);
}}
/>
    < /div>,
anchorElementRef.current,
              )
            : null
        }
/>
    < />
  );
}






type SearchPromise = {
    dismiss: () => void;
    promise: Promise<null | string>;
};

export const uuid = Math.random()
    .toString(36)
    .replace(/[^a-z]+/g, '')
    .substr(0, 5);

// TODO lookup should be custom
function $search(selection: null | BaseSelection): [boolean, string] {
    if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
        return [false, ''];
    }
    const node = selection.getNodes()[0];
    const anchor = selection.anchor;
    // Check siblings?
    if (!$isTextNode(node) || !node.isSimpleText() || !$isAtNodeEnd(anchor)) {
        return [false, ''];
    }
    const word = [];
    const text = node.getTextContent();
    let i = node.getTextContentSize();
    let c;
    while (i-- && i >= 0 && (c = text[i]) !== ' ') {
        word.push(c);
    }
    if (word.length === 0) {
        return [false, ''];
    }
    return [true, word.reverse().join('')];
}

// TODO query should be custom
function useQuery(): (searchText: string) => SearchPromise {
    return useCallback((searchText: string) => {
        const server = new AutocompleteServer();
        console.time('query');
        const response = server.query(searchText);
        console.timeEnd('query');
        return response;
    }, []);
}

export function AutocompletePlugin(): JSX.Element | null {
    const [editor] = useLexicalComposerContext();
    const [, setSuggestion] = useSharedAutocompleteContext();
    const query = useQuery();

    useEffect(() => {
        let autocompleteNodeKey: null | NodeKey = null;
        let lastMatch: null | string = null;
        let lastSuggestion: null | string = null;
        let searchPromise: null | SearchPromise = null;
        function $clearSuggestion() {
            const autocompleteNode =
                autocompleteNodeKey !== null
                    ? $getNodeByKey(autocompleteNodeKey)
                    : null;
            if (autocompleteNode !== null && autocompleteNode.isAttached()) {
                autocompleteNode.remove();
                autocompleteNodeKey = null;
            }
            if (searchPromise !== null) {
                searchPromise.dismiss();
                searchPromise = null;
            }
            lastMatch = null;
            lastSuggestion = null;
            setSuggestion(null);
        }
        function updateAsyncSuggestion(
            refSearchPromise: SearchPromise,
            newSuggestion: null | string,
        ) {
            if (searchPromise !== refSearchPromise || newSuggestion === null) {
                // Outdated or no suggestion
                return;
            }
            editor.update(
                () => {
                    const selection = $getSelection();
                    const [hasMatch, match] = $search(selection);
                    if (
                        !hasMatch ||
                        match !== lastMatch ||
                        !$isRangeSelection(selection)
                    ) {
                        // Outdated
                        return;
                    }
                    const selectionCopy = selection.clone();
                    const node = $createAutocompleteNode(uuid);
                    autocompleteNodeKey = node.getKey();
                    selection.insertNodes([node]);
                    $setSelection(selectionCopy);
                    lastSuggestion = newSuggestion;
                    setSuggestion(newSuggestion);
                },
                { tag: 'history-merge' },
            );
        }

        function handleAutocompleteNodeTransform(node: AutocompleteNode) {
            const key = node.getKey();
            if (node.__uuid === uuid && key !== autocompleteNodeKey) {
                // Max one Autocomplete node per session
                $clearSuggestion();
            }
        }
        function handleUpdate() {
            editor.update(() => {
                const selection = $getSelection();
                const [hasMatch, match] = $search(selection);
                if (!hasMatch) {
                    $clearSuggestion();
                    return;
                }
                if (match === lastMatch) {
                    return;
                }
                $clearSuggestion();
                searchPromise = query(match);
                searchPromise.promise
                    .then((newSuggestion) => {
                        if (searchPromise !== null) {
                            updateAsyncSuggestion(searchPromise, newSuggestion);
                        }
                    })
                    .catch((e) => {
                        console.error(e);
                    });
                lastMatch = match;
            });
        }
        function $handleAutocompleteIntent(): boolean {
            if (lastSuggestion === null || autocompleteNodeKey === null) {
                return false;
            }
            const autocompleteNode = $getNodeByKey(autocompleteNodeKey);
            if (autocompleteNode === null) {
                return false;
            }
            const textNode = $createTextNode(lastSuggestion);
            autocompleteNode.replace(textNode);
            textNode.selectNext();
            $clearSuggestion();
            return true;
        }
        function $handleKeypressCommand(e: Event) {
            if ($handleAutocompleteIntent()) {
                e.preventDefault();
                return true;
            }
            return false;
        }
        function handleSwipeRight(_force: number, e: TouchEvent) {
            editor.update(() => {
                if ($handleAutocompleteIntent()) {
                    e.preventDefault();
                }
            });
        }
        function unmountSuggestion() {
            editor.update(() => {
                $clearSuggestion();
            });
        }

        const rootElem = editor.getRootElement();

        return mergeRegister(
            editor.registerNodeTransform(
                AutocompleteNode,
                handleAutocompleteNodeTransform,
            ),
            editor.registerUpdateListener(handleUpdate),
            editor.registerCommand(
                KEY_TAB_COMMAND,
                $handleKeypressCommand,
                COMMAND_PRIORITY_LOW,
            ),
            editor.registerCommand(
                KEY_ARROW_RIGHT_COMMAND,
                $handleKeypressCommand,
                COMMAND_PRIORITY_LOW,
            ),
            ...(rootElem !== null
                ? [addSwipeRightListener(rootElem, handleSwipeRight)]
                : []),
            unmountSuggestion,
        );
    }, [editor, query, setSuggestion]);

    return null;
}

/*
 * Simulate an asynchronous autocomplete server (typical in more common use cases like GMail where
 * the data is not static).
 */
class AutocompleteServer {
    DATABASE = DICTIONARY_EN;
    LATENCY = 200;

    query = (searchText: string): SearchPromise => {
        let isDismissed = false;

        const dismiss = () => {
            isDismissed = true;
        };
        const promise: Promise<null | string> = new Promise((resolve, reject) => {
            setTimeout(() => {
                if (isDismissed) {
                    // TODO cache result
                    return reject('Dismissed');
                }
                const searchTextLength = searchText.length;
                if (searchText === '' || searchTextLength < 4) {
                    return resolve(null);
                }
                const char0 = searchText.charCodeAt(0);
                const isCapitalized = char0 >= 65 && char0 <= 90;
                const caseInsensitiveSearchText = isCapitalized
                    ? String.fromCharCode(char0 + 32) + searchText.substring(1)
                    : searchText;
                const match = this.DATABASE.find(
                    (DICTIONARY_ENWord) =>
                        DICTIONARY_ENWord.startsWith(caseInsensitiveSearchText) ?? null,
                );
                if (match === undefined) {
                    return resolve(null);
                }
                const matchCapitalized = isCapitalized
                    ? String.fromCharCode(match.charCodeAt(0) - 32) + match.substring(1)
                    : match;
                const autocompleteChunk = matchCapitalized.substring(searchTextLength);
                if (autocompleteChunk === '') {
                    return resolve(null);
                }
                return resolve(autocompleteChunk);
            }, this.LATENCY);
        });

        return {
            dismiss,
            promise,
        };
    };
}


export function CodeHighlightPlugin(): JSX.Element | null {
    const [editor] = useLexicalComposerContext();

    useEffect(() => {
        return registerCodeHighlighting(editor);
    }, [editor]);

    return null;
}



type SerializedCollapsibleContainerNode = Spread<
    {
        open: boolean;
    },
    SerializedElementNode
>;

export function convertDetailsElement(
    domNode: HTMLDetailsElement,
): DOMConversionOutput | null {
    const isOpen = domNode.open !== undefined ? domNode.open : true;
    const node = $createCollapsibleContainerNode(isOpen);
    return {
        node,
    };
}

export class CollapsibleContainerNode extends ElementNode {
    __open: boolean;

    constructor(open: boolean, key?: NodeKey) {
        super(key);
        this.__open = open;
    }

    static getType(): string {
        return 'collapsible-container';
    }

    static clone(node: CollapsibleContainerNode): CollapsibleContainerNode {
        return new CollapsibleContainerNode(node.__open, node.__key);
    }

    createDOM(config: EditorConfig, editor: LexicalEditor): HTMLElement {
        const dom = document.createElement('details');
        dom.classList.add('Collapsible__container');
        dom.open = this.__open;
        dom.addEventListener('toggle', () => {
            const open = editor.getEditorState().read(() => this.getOpen());
            if (open !== dom.open) {
                editor.update(() => this.toggleOpen());
            }
        });
        return dom;
    }

    updateDOM(
        prevNode: CollapsibleContainerNode,
        dom: HTMLDetailsElement,
    ): boolean {
        if (prevNode.__open !== this.__open) {
            dom.open = this.__open;
        }

        return false;
    }

    static importDOM(): DOMConversionMap<HTMLDetailsElement> | null {
        return {
            details: (domNode: HTMLDetailsElement) => {
                return {
                    conversion: convertDetailsElement,
                    priority: 1,
                };
            },
        };
    }

    static importJSON(
        serializedNode: SerializedCollapsibleContainerNode,
    ): CollapsibleContainerNode {
        const node = $createCollapsibleContainerNode(serializedNode.open);
        return node;
    }

    exportDOM(): DOMExportOutput {
        const element = document.createElement('details');
        element.setAttribute('open', this.__open.toString());
        return { element };
    }

    exportJSON(): SerializedCollapsibleContainerNode {
        return {
            ...super.exportJSON(),
            open: this.__open,
            type: 'collapsible-container',
            version: 1,
        };
    }

    setOpen(open: boolean): void {
        const writable = this.getWritable();
        writable.__open = open;
    }

    getOpen(): boolean {
        return this.getLatest().__open;
    }

    toggleOpen(): void {
        this.setOpen(!this.getOpen());
    }
}

export function $createCollapsibleContainerNode(
    isOpen: boolean,
): CollapsibleContainerNode {
    return new CollapsibleContainerNode(isOpen);
}

export function $isCollapsibleContainerNode(
    node: LexicalNode | null | undefined,
): node is CollapsibleContainerNode {
    return node instanceof CollapsibleContainerNode;
}


type SerializedCollapsibleContentNode = SerializedElementNode;

export function convertCollapsibleContentElement(
    domNode: HTMLElement,
): DOMConversionOutput | null {
    const node = $createCollapsibleContentNode();
    return {
        node,
    };
}

export class CollapsibleContentNode extends ElementNode {
    static getType(): string {
        return 'collapsible-content';
    }

    static clone(node: CollapsibleContentNode): CollapsibleContentNode {
        return new CollapsibleContentNode(node.__key);
    }

    createDOM(config: EditorConfig): HTMLElement {
        const dom = document.createElement('div');
        dom.classList.add('Collapsible__content');
        return dom;
    }

    updateDOM(prevNode: CollapsibleContentNode, dom: HTMLElement): boolean {
        return false;
    }

    static importDOM(): DOMConversionMap | null {
        return {
            div: (domNode: HTMLElement) => {
                if (!domNode.hasAttribute('data-lexical-collapsible-content')) {
                    return null;
                }
                return {
                    conversion: convertCollapsibleContentElement,
                    priority: 2,
                };
            },
        };
    }

    exportDOM(): DOMExportOutput {
        const element = document.createElement('div');
        element.setAttribute('data-lexical-collapsible-content', 'true');
        return { element };
    }

    static importJSON(
        serializedNode: SerializedCollapsibleContentNode,
    ): CollapsibleContentNode {
        return $createCollapsibleContentNode();
    }

    isShadowRoot(): boolean {
        return true;
    }

    exportJSON(): SerializedCollapsibleContentNode {
        return {
            ...super.exportJSON(),
            type: 'collapsible-content',
            version: 1,
        };
    }
}

export function $createCollapsibleContentNode(): CollapsibleContentNode {
    return new CollapsibleContentNode();
}

export function $isCollapsibleContentNode(
    node: LexicalNode | null | undefined,
): node is CollapsibleContentNode {
    return node instanceof CollapsibleContentNode;
}

type SerializedCollapsibleTitleNode = SerializedElementNode;

export function convertSummaryElement(
    domNode: HTMLElement,
): DOMConversionOutput | null {
    const node = $createCollapsibleTitleNode();
    return {
        node,
    };
}

export class CollapsibleTitleNode extends ElementNode {
    static getType(): string {
        return 'collapsible-title';
    }

    static clone(node: CollapsibleTitleNode): CollapsibleTitleNode {
        return new CollapsibleTitleNode(node.__key);
    }

    createDOM(config: EditorConfig, editor: LexicalEditor): HTMLElement {
        const dom = document.createElement('summary');
        dom.classList.add('Collapsible__title');
        return dom;
    }

    updateDOM(prevNode: CollapsibleTitleNode, dom: HTMLElement): boolean {
        return false;
    }

    static importDOM(): DOMConversionMap | null {
        return {
            summary: (domNode: HTMLElement) => {
                return {
                    conversion: convertSummaryElement,
                    priority: 1,
                };
            },
        };
    }

    static importJSON(
        serializedNode: SerializedCollapsibleTitleNode,
    ): CollapsibleTitleNode {
        return $createCollapsibleTitleNode();
    }

    exportDOM(): DOMExportOutput {
        const element = document.createElement('summary');
        return { element };
    }

    exportJSON(): SerializedCollapsibleTitleNode {
        return {
            ...super.exportJSON(),
            type: 'collapsible-title',
            version: 1,
        };
    }

    collapseAtStart(_selection: RangeSelection): boolean {
        this.getParentOrThrow().insertBefore(this);
        return true;
    }

    insertNewAfter(_: RangeSelection, restoreSelection = true): ElementNode {
        const containerNode = this.getParentOrThrow();

        if (!$isCollapsibleContainerNode(containerNode)) {
            throw new Error(
                'CollapsibleTitleNode expects to be child of CollapsibleContainerNode',
            );
        }

        if (containerNode.getOpen()) {
            const contentNode = this.getNextSibling();
            if (!$isCollapsibleContentNode(contentNode)) {
                throw new Error(
                    'CollapsibleTitleNode expects to have CollapsibleContentNode sibling',
                );
            }

            const firstChild = contentNode.getFirstChild();
            if ($isElementNode(firstChild)) {
                return firstChild;
            } else {
                const paragraph = $createParagraphNode();
                contentNode.append(paragraph);
                return paragraph;
            }
        } else {
            const paragraph = $createParagraphNode();
            containerNode.insertAfter(paragraph, restoreSelection);
            return paragraph;
        }
    }
}

export function $createCollapsibleTitleNode(): CollapsibleTitleNode {
    return new CollapsibleTitleNode();
}

export function $isCollapsibleTitleNode(
    node: LexicalNode | null | undefined,
): node is CollapsibleTitleNode {
    return node instanceof CollapsibleTitleNode;
}






export const INSERT_COLLAPSIBLE_COMMAND = createCommand<void>();
export const TOGGLE_COLLAPSIBLE_COMMAND = createCommand<NodeKey>();

export function CollapsiblePlugin(): null {
    const [editor] = useLexicalComposerContext();

    useEffect(() => {
        if (
            !editor.hasNodes([
                CollapsibleContainerNode,
                CollapsibleTitleNode,
                CollapsibleContentNode,
            ])
        ) {
            throw new Error(
                'CollapsiblePlugin: CollapsibleContainerNode, CollapsibleTitleNode, or CollapsibleContentNode not registered on editor',
            );
        }

        const onEscapeUp = () => {
            const selection = $getSelection();
            if (
                $isRangeSelection(selection) &&
                selection.isCollapsed() &&
                selection.anchor.offset === 0
            ) {
                const container = $findMatchingParent(
                    selection.anchor.getNode(),
                    $isCollapsibleContainerNode,
                );

                if ($isCollapsibleContainerNode(container)) {
                    const parent = container.getParent<ElementNode>();
                    if (
                        parent !== null &&
                        parent.getFirstChild<LexicalNode>() === container &&
                        selection.anchor.key ===
                        container.getFirstDescendant<LexicalNode>()?.getKey()
                    ) {
                        container.insertBefore($createParagraphNode());
                    }
                }
            }

            return false;
        };

        const onEscapeDown = () => {
            const selection = $getSelection();
            if ($isRangeSelection(selection) && selection.isCollapsed()) {
                const container = $findMatchingParent(
                    selection.anchor.getNode(),
                    $isCollapsibleContainerNode,
                );

                if ($isCollapsibleContainerNode(container)) {
                    const parent = container.getParent<ElementNode>();
                    if (
                        parent !== null &&
                        parent.getLastChild<LexicalNode>() === container
                    ) {
                        const titleParagraph = container.getFirstDescendant<LexicalNode>();
                        const contentParagraph = container.getLastDescendant<LexicalNode>();

                        if (
                            (contentParagraph !== null &&
                                selection.anchor.key === contentParagraph.getKey() &&
                                selection.anchor.offset ===
                                contentParagraph.getTextContentSize()) ||
                            (titleParagraph !== null &&
                                selection.anchor.key === titleParagraph.getKey() &&
                                selection.anchor.offset === titleParagraph.getTextContentSize())
                        ) {
                            container.insertAfter($createParagraphNode());
                        }
                    }
                }
            }

            return false;
        };

        return mergeRegister(
            // Structure enforcing transformers for each node type. In case nesting structure is not
            // "Container > Title + Content" it'll unwrap nodes and convert it back
            // to regular content.
            editor.registerNodeTransform(CollapsibleContentNode, (node) => {
                const parent = node.getParent<ElementNode>();
                if (!$isCollapsibleContainerNode(parent)) {
                    const children = node.getChildren<LexicalNode>();
                    for (const child of children) {
                        node.insertBefore(child);
                    }
                    node.remove();
                }
            }),

            editor.registerNodeTransform(CollapsibleTitleNode, (node) => {
                const parent = node.getParent<ElementNode>();
                if (!$isCollapsibleContainerNode(parent)) {
                    node.replace(
                        $createParagraphNode().append(...node.getChildren<LexicalNode>()),
                    );
                    return;
                }
            }),

            editor.registerNodeTransform(CollapsibleContainerNode, (node) => {
                const children = node.getChildren<LexicalNode>();
                if (
                    children.length !== 2 ||
                    !$isCollapsibleTitleNode(children[0]) ||
                    !$isCollapsibleContentNode(children[1])
                ) {
                    for (const child of children) {
                        node.insertBefore(child);
                    }
                    node.remove();
                }
            }),

            // This handles the case when container is collapsed and we delete its previous sibling
            // into it, it would cause collapsed content deleted (since it's display: none, and selection
            // swallows it when deletes single char). Instead we expand container, which is although
            // not perfect, but avoids bigger problem
            editor.registerCommand(
                DELETE_CHARACTER_COMMAND,
                () => {
                    const selection = $getSelection();
                    if (
                        !$isRangeSelection(selection) ||
                        !selection.isCollapsed() ||
                        selection.anchor.offset !== 0
                    ) {
                        return false;
                    }

                    const anchorNode = selection.anchor.getNode();
                    const topLevelElement = anchorNode.getTopLevelElement();
                    if (topLevelElement === null) {
                        return false;
                    }

                    const container = topLevelElement.getPreviousSibling<LexicalNode>();
                    if (!$isCollapsibleContainerNode(container) || container.getOpen()) {
                        return false;
                    }

                    container.setOpen(true);
                    return true;
                },
                COMMAND_PRIORITY_LOW,
            ),

            // When collapsible is the last child pressing down/right arrow will insert paragraph
            // below it to allow adding more content. It's similar what $insertBlockNode
            // (mainly for decorators), except it'll always be possible to continue adding
            // new content even if trailing paragraph is accidentally deleted
            editor.registerCommand(
                KEY_ARROW_DOWN_COMMAND,
                onEscapeDown,
                COMMAND_PRIORITY_LOW,
            ),

            editor.registerCommand(
                KEY_ARROW_RIGHT_COMMAND,
                onEscapeDown,
                COMMAND_PRIORITY_LOW,
            ),

            // When collapsible is the first child pressing up/left arrow will insert paragraph
            // above it to allow adding more content. It's similar what $insertBlockNode
            // (mainly for decorators), except it'll always be possible to continue adding
            // new content even if leading paragraph is accidentally deleted
            editor.registerCommand(
                KEY_ARROW_UP_COMMAND,
                onEscapeUp,
                COMMAND_PRIORITY_LOW,
            ),

            editor.registerCommand(
                KEY_ARROW_LEFT_COMMAND,
                onEscapeUp,
                COMMAND_PRIORITY_LOW,
            ),

            // Handling CMD+Enter to toggle collapsible element collapsed state
            editor.registerCommand(
                INSERT_PARAGRAPH_COMMAND,
                () => {
                    const windowEvent = editor._window?.event as
                        | KeyboardEvent
                        | undefined;

                    if (
                        windowEvent &&
                        (windowEvent.ctrlKey || windowEvent.metaKey) &&
                        windowEvent.key === 'Enter'
                    ) {
                        const selection = $getPreviousSelection();
                        if ($isRangeSelection(selection) && selection.isCollapsed()) {
                            const parent = $findMatchingParent(
                                selection.anchor.getNode(),
                                (node) => $isElementNode(node) && !node.isInline(),
                            );

                            if ($isCollapsibleTitleNode(parent)) {
                                const container = parent.getParent<ElementNode>();
                                if ($isCollapsibleContainerNode(container)) {
                                    container.toggleOpen();
                                    $setSelection(selection.clone());
                                    return true;
                                }
                            }
                        }
                    }

                    return false;
                },
                COMMAND_PRIORITY_LOW,
            ),
            editor.registerCommand(
                INSERT_COLLAPSIBLE_COMMAND,
                () => {
                    editor.update(() => {
                        const title = $createCollapsibleTitleNode();
                        const paragraph = $createParagraphNode();
                        $insertNodeToNearestRoot(
                            $createCollapsibleContainerNode(true).append(
                                title.append(paragraph),
                                $createCollapsibleContentNode().append($createParagraphNode()),
                            ),
                        );
                        paragraph.select();
                    });
                    return true;
                },
                COMMAND_PRIORITY_LOW,
            ),
        );
    }, [editor]);

    return null;
}




export const INSERT_INLINE_COMMAND: LexicalCommand<void> = createCommand(
    'INSERT_INLINE_COMMAND',
);

function AddCommentBox({
    anchorKey,
    editor,
    onAddComment,
}: {
    anchorKey: NodeKey;
    editor: LexicalEditor;
    onAddComment: () => void;
}): JSX.Element {
    const boxRef = useRef<HTMLDivElement>(null);

    const updatePosition = useCallback(() => {
        const boxElem = boxRef.current;
        const rootElement = editor.getRootElement();
        const anchorElement = editor.getElementByKey(anchorKey);

        if (boxElem !== null && rootElement !== null && anchorElement !== null) {
            const { right } = rootElement.getBoundingClientRect();
            const { top } = anchorElement.getBoundingClientRect();
            boxElem.style.left = `${right - 20}px`;
            boxElem.style.top = `${top - 30}px`;
        }
    }, [anchorKey, editor]);

    useEffect(() => {
        window.addEventListener('resize', updatePosition);

        return () => {
            window.removeEventListener('resize', updatePosition);
        };
    }, [editor, updatePosition]);

    useLayoutEffect(() => {
        updatePosition();
    }, [anchorKey, editor, updatePosition]);

    return (
        <div className= "CommentPlugin_AddCommentBox" ref = { boxRef } >
            <button
        className="CommentPlugin_AddCommentBox_button"
    onClick = { onAddComment } >
        <i className="icon add-comment" />
            </button>
            < /div>
  );
}

function EscapeHandlerPlugin({
    onEscape,
}: {
    onEscape: (e: KeyboardEvent) => boolean;
}): null {
    const [editor] = useLexicalComposerContext();

    useEffect(() => {
        return editor.registerCommand(
            KEY_ESCAPE_COMMAND,
            (event: KeyboardEvent) => {
                return onEscape(event);
            },
            2,
        );
    }, [editor, onEscape]);

    return null;
}

function PlainTextEditor({
    className,
    autoFocus,
    onEscape,
    onChange,
    editorRef,
    placeholder = 'Type a comment...',
}: {
    autoFocus?: boolean;
    className?: string;
    editorRef?: { current: null | LexicalEditor };
    onChange: (editorState: EditorState, editor: LexicalEditor) => void;
    onEscape: (e: KeyboardEvent) => boolean;
    placeholder?: string;
}) {
    const initialConfig = {
        namespace: 'Commenting',
        nodes: [],
        onError: (error: Error) => {
            throw error;
        },
        theme: CommentEditorTheme,
    };

    return (
        <LexicalComposer initialConfig= { initialConfig } >
        <div className="CommentPlugin_CommentInputBox_EditorContainer" >
            <PlainTextPlugin
          contentEditable={
        <ContentEditable className={ className } />}
        placeholder = {< Placeholder > { placeholder } < /Placeholder>}
        ErrorBoundary = { LexicalErrorBoundary }
            />
            <OnChangePlugin onChange={ onChange } />
                < HistoryPlugin />
                { autoFocus !== false && <AutoFocusPlugin />}
                < EscapeHandlerPlugin onEscape = { onEscape } />
                    <ClearEditorPlugin />
        {
            editorRef !== undefined && <EditorRefPlugin editorRef={ editorRef } />}
                < /div>
                < /LexicalComposer>
  );
        }

        function useOnChange(
            setContent: (text: string) => void,
            setCanSubmit: (canSubmit: boolean) => void,
        ) {
            return useCallback(
                (editorState: EditorState, _editor: LexicalEditor) => {
                    editorState.read(() => {
                        setContent($rootTextContent());
                        setCanSubmit(!$isRootTextContentEmpty(_editor.isComposing(), true));
                    });
                },
                [setCanSubmit, setContent],
            );
        }

        function CommentInputBox({
            editor,
            cancelAddComment,
            submitAddComment,
        }: {
            cancelAddComment: () => void;
            editor: LexicalEditor;
            submitAddComment: (
                commentOrThread: Comment | Thread,
                isInlineComment: boolean,
                thread?: Thread,
                selection?: RangeSelection | null,
            ) => void;
        }) {
            const [content, setContent] = useState('');
            const [canSubmit, setCanSubmit] = useState(false);
            const boxRef = useRef<HTMLDivElement>(null);
            const selectionState = useMemo(
                () => ({
                    container: document.createElement('div'),
                    elements: [],
                }),
                [],
            );
            const selectionRef = useRef<RangeSelection | null>(null);
            const author = useCollabAuthorName();

            const updateLocation = useCallback(() => {
                editor.getEditorState().read(() => {
                    const selection = $getSelection();

                    if ($isRangeSelection(selection)) {
                        selectionRef.current = selection.clone();
                        const anchor = selection.anchor;
                        const focus = selection.focus;
                        const range = createDOMRange(
                            editor,
                            anchor.getNode(),
                            anchor.offset,
                            focus.getNode(),
                            focus.offset,
                        );
                        const boxElem = boxRef.current;
                        if (range !== null && boxElem !== null) {
                            const { left, bottom, width } = range.getBoundingClientRect();
                            const selectionRects = createRectsFromDOMRange(editor, range);
                            let correctedLeft =
                                selectionRects.length === 1 ? left + width / 2 - 125 : left - 125;
                            if (correctedLeft < 10) {
                                correctedLeft = 10;
                            }
                            boxElem.style.left = `${correctedLeft}px`;
                            boxElem.style.top = `${bottom +
                                20 +
                                (window.pageYOffset || document.documentElement.scrollTop)
                                }px`;
                            const selectionRectsLength = selectionRects.length;
                            const { container } = selectionState;
                            const elements: Array<HTMLSpanElement> = selectionState.elements;
                            const elementsLength = elements.length;

                            for (let i = 0; i < selectionRectsLength; i++) {
                                const selectionRect = selectionRects[i];
                                let elem: HTMLSpanElement = elements[i];
                                if (elem === undefined) {
                                    elem = document.createElement('span');
                                    elements[i] = elem;
                                    container.appendChild(elem);
                                }
                                const color = '255, 212, 0';
                                const style = `position:absolute;top:${selectionRect.top +
                                    (window.pageYOffset || document.documentElement.scrollTop)
                                    }px;left:${selectionRect.left}px;height:${selectionRect.height
                                    }px;width:${selectionRect.width
                                    }px;background-color:rgba(${color}, 0.3);pointer-events:none;z-index:5;`;
                                elem.style.cssText = style;
                            }
                            for (let i = elementsLength - 1; i >= selectionRectsLength; i--) {
                                const elem = elements[i];
                                container.removeChild(elem);
                                elements.pop();
                            }
                        }
                    }
                });
            }, [editor, selectionState]);

            useLayoutEffect(() => {
                updateLocation();
                const container = selectionState.container;
                const body = document.body;
                if (body !== null) {
                    body.appendChild(container);
                    return () => {
                        body.removeChild(container);
                    };
                }
            }, [selectionState.container, updateLocation]);

            useEffect(() => {
                window.addEventListener('resize', updateLocation);

                return () => {
                    window.removeEventListener('resize', updateLocation);
                };
            }, [updateLocation]);

            const onEscape = (event: KeyboardEvent): boolean => {
                event.preventDefault();
                cancelAddComment();
                return true;
            };

            const submitComment = () => {
                if (canSubmit) {
                    let quote = editor.getEditorState().read(() => {
                        const selection = selectionRef.current;
                        return selection ? selection.getTextContent() : '';
                    });
                    if (quote.length > 100) {
                        quote = quote.slice(0, 99) + '…';
                    }
                    submitAddComment(
                        createThread(quote, [createComment(content, author)]),
                        true,
                        undefined,
                        selectionRef.current,
                    );
                    selectionRef.current = null;
                }
            };

            const onChange = useOnChange(setContent, setCanSubmit);

            return (
                <div className= "CommentPlugin_CommentInputBox" ref = { boxRef } >
                    <PlainTextEditor
        className="CommentPlugin_CommentInputBox_Editor"
            onEscape = { onEscape }
            onChange = { onChange }
                />
                <div className="CommentPlugin_CommentInputBox_Buttons" >
                    <Button
          onClick={ cancelAddComment }
            className = "CommentPlugin_CommentInputBox_Button" >
                Cancel
                < /Button>
                < Button
            onClick = { submitComment }
            disabled = {!canSubmit
        }
        className = "CommentPlugin_CommentInputBox_Button primary" >
            Comment
            < /Button>
            < /div>
            < /div>
  );
    }

    function CommentsComposer({
        submitAddComment,
        thread,
        placeholder,
    }: {
        placeholder?: string;
        submitAddComment: (
            commentOrThread: Comment,
            isInlineComment: boolean,
            // eslint-disable-next-line no-shadow
            thread?: Thread,
        ) => void;
        thread?: Thread;
    }) {
        const [content, setContent] = useState('');
        const [canSubmit, setCanSubmit] = useState(false);
        const editorRef = useRef<LexicalEditor>(null);
        const author = useCollabAuthorName();

        const onChange = useOnChange(setContent, setCanSubmit);

        const submitComment = () => {
            if (canSubmit) {
                submitAddComment(createComment(content, author), false, thread);
                const editor = editorRef.current;
                if (editor !== null) {
                    editor.dispatchCommand(CLEAR_EDITOR_COMMAND, undefined);
                }
            }
        };

        return (
            <>
            <PlainTextEditor
        className= "CommentPlugin_CommentsPanel_Editor"
        autoFocus = { false}
        onEscape = {() => {
            return true;
        }
    }
    onChange = { onChange }
    editorRef = { editorRef }
    placeholder = { placeholder }
        />
        <Button
        className="CommentPlugin_CommentsPanel_SendButton"
    onClick = { submitComment }
    disabled = {!canSubmit
}>
    <i className="send" />
        </Button>
        < />
  );
}

function ShowDeleteCommentOrThreadDialog({
    commentOrThread,
    deleteCommentOrThread,
    onClose,
    thread = undefined,
}: {
    commentOrThread: Comment | Thread;

    deleteCommentOrThread: (
        comment: Comment | Thread,
        // eslint-disable-next-line no-shadow
        thread?: Thread,
    ) => void;
    onClose: () => void;
    thread?: Thread;
}): JSX.Element {
    return (
        <>
        Are you sure you want to delete this { commentOrThread.type }?
    <div className="Modal__content" >
        <Button
          onClick={
        () => {
            deleteCommentOrThread(commentOrThread, thread);
            onClose();
        }
    }>
        Delete
        < /Button>{' '}
        < Button
    onClick = {() => {
        onClose();
    }
}>
    Cancel
    < /Button>
    < /div>
    < />
  );
}

function CommentsPanelListComment({
    comment,
    deleteComment,
    thread,
    rtf,
}: {
    comment: Comment;
    deleteComment: (
        commentOrThread: Comment | Thread,
        // eslint-disable-next-line no-shadow
        thread?: Thread,
    ) => void;
    rtf: Intl.RelativeTimeFormat;
    thread?: Thread;
}): JSX.Element {
    const seconds = Math.round((comment.timeStamp - performance.now()) / 1000);
    const minutes = Math.round(seconds / 60);
    const [modal, showModal] = useModal();

    return (
        <li className= "CommentPlugin_CommentsPanel_List_Comment" >
        <div className="CommentPlugin_CommentsPanel_List_Details" >
            <span className="CommentPlugin_CommentsPanel_List_Comment_Author" >
                { comment.author }
                < /span>
                < span className = "CommentPlugin_CommentsPanel_List_Comment_Time" >
          · { seconds > -10 ? 'Just now' : rtf.format(minutes, 'minute') }
    </span>
        < /div>
        < p
    className = {
        comment.deleted ? 'CommentPlugin_CommentsPanel_DeletedComment' : ''
    } >
        { comment.content }
        < /p>
    {
        !comment.deleted && (
            <>
            <Button
            onClick={
            () => {
                showModal('Delete Comment', (onClose) => (
                    <ShowDeleteCommentOrThreadDialog
                  commentOrThread= { comment }
                  deleteCommentOrThread = { deleteComment }
                  thread = { thread }
                  onClose = { onClose }
                    />
              ));
            }
        }
        className = "CommentPlugin_CommentsPanel_List_DeleteButton" >
            <i className="delete" />
                </Button>
        { modal }
        </>
      )
    }
    </li>
  );
}

function CommentsPanelList({
    activeIDs,
    comments,
    deleteCommentOrThread,
    listRef,
    submitAddComment,
    markNodeMap,
}: {
    activeIDs: Array<string>;
    comments: Comments;
    deleteCommentOrThread: (
        commentOrThread: Comment | Thread,
        thread?: Thread,
    ) => void;
    listRef: { current: null | HTMLUListElement };
    markNodeMap: Map<string, Set<NodeKey>>;
    submitAddComment: (
        commentOrThread: Comment | Thread,
        isInlineComment: boolean,
        thread?: Thread,
    ) => void;
}): JSX.Element {
    const [editor] = useLexicalComposerContext();
    const [counter, setCounter] = useState(0);
    const [modal, showModal] = useModal();
    const rtf = useMemo(
        () =>
            new Intl.RelativeTimeFormat('en', {
                localeMatcher: 'best fit',
                numeric: 'auto',
                style: 'short',
            }),
        [],
    );

    useEffect(() => {
        // Used to keep the time stamp up to date
        const id = setTimeout(() => {
            setCounter(counter + 1);
        }, 10000);

        return () => {
            clearTimeout(id);
        };
    }, [counter]);

    return (
        <ul className= "CommentPlugin_CommentsPanel_List" ref = { listRef } >
        {
            comments.map((commentOrThread) => {
                const id = commentOrThread.id;
                if (commentOrThread.type === 'thread') {
                    const handleClickThread = () => {
                        const markNodeKeys = markNodeMap.get(id);
                        if (
                            markNodeKeys !== undefined &&
                            (activeIDs === null || activeIDs.indexOf(id) === -1)
                        ) {
                            const activeElement = document.activeElement;
                            // Move selection to the start of the mark, so that we
                            // update the UI with the selected thread.
                            editor.update(
                                () => {
                                    const markNodeKey = Array.from(markNodeKeys)[0];
                                    const markNode = $getNodeByKey<MarkNode>(markNodeKey);
                                    if ($isMarkNode(markNode)) {
                                        markNode.selectStart();
                                    }
                                },
                                {
                                    onUpdate() {
                                        // Restore selection to the previous element
                                        if (activeElement !== null) {
                                            (activeElement as HTMLElement).focus();
                                        }
                                    },
                                },
                            );
                        }
                    };

                    return (
                        // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
                        <li
              key= { id }
                    onClick = { handleClickThread }
                    className = {`CommentPlugin_CommentsPanel_List_Thread ${markNodeMap.has(id) ? 'interactive' : ''
                        } ${activeIDs.indexOf(id) === -1 ? '' : 'active'}`
                }>
                    <div className="CommentPlugin_CommentsPanel_List_Thread_QuoteBox" >
                        <blockquote className="CommentPlugin_CommentsPanel_List_Thread_Quote" >
                            { '> '}
                            < span > { commentOrThread.quote } < /span>
                            < /blockquote>
                {/* INTRODUCE DELETE THREAD HERE*/ }
                <Button
                  onClick={
                    () => {
                        showModal('Delete Thread', (onClose) => (
                            <ShowDeleteCommentOrThreadDialog
                        commentOrThread= { commentOrThread }
                        deleteCommentOrThread = { deleteCommentOrThread }
                        onClose = { onClose }
                            />
                    ));
        }
}
className = "CommentPlugin_CommentsPanel_List_DeleteButton" >
    <i className="delete" />
        </Button>
{ modal }
</div>
    < ul className = "CommentPlugin_CommentsPanel_List_Thread_Comments" >
    {
        commentOrThread.comments.map((comment) => (
            <CommentsPanelListComment
                    key= { comment.id }
                    comment = { comment }
                    deleteComment = { deleteCommentOrThread }
                    thread = { commentOrThread }
                    rtf = { rtf }
            />
                ))
    }
        < /ul>
        < div className = "CommentPlugin_CommentsPanel_List_Thread_Editor" >
            <CommentsComposer
                  submitAddComment={ submitAddComment }
thread = { commentOrThread }
placeholder = "Reply to comment..."
    />
    </div>
    < /li>
          );
        }
return (
    <CommentsPanelListComment
            key= { id }
comment = { commentOrThread }
deleteComment = { deleteCommentOrThread }
rtf = { rtf }
    />
        );
      })}
</ul>
  );
}

function CommentsPanel({
    activeIDs,
    deleteCommentOrThread,
    comments,
    submitAddComment,
    markNodeMap,
}: {
    activeIDs: Array<string>;
    comments: Comments;
    deleteCommentOrThread: (
        commentOrThread: Comment | Thread,
        thread?: Thread,
    ) => void;
    markNodeMap: Map<string, Set<NodeKey>>;
    submitAddComment: (
        commentOrThread: Comment | Thread,
        isInlineComment: boolean,
        thread?: Thread,
    ) => void;
}): JSX.Element {
    const listRef = useRef<HTMLUListElement>(null);
    const isEmpty = comments.length === 0;

    return (
        <div className= "CommentPlugin_CommentsPanel" >
        <h2 className="CommentPlugin_CommentsPanel_Heading" > Comments < /h2>
    {
        isEmpty ? (
            <div className= "CommentPlugin_CommentsPanel_Empty" > No Comments < /div>
      ) : (
            <CommentsPanelList
          activeIDs= { activeIDs }
        comments = { comments }
        deleteCommentOrThread = { deleteCommentOrThread }
        listRef = { listRef }
        submitAddComment = { submitAddComment }
        markNodeMap = { markNodeMap }
            />
      )
    }
    </div>
  );
}

function useCollabAuthorName(): string {
    const collabContext = useCollaborationContext();
    const { yjsDocMap, name } = collabContext;
    return yjsDocMap.has('comments') ? name : 'Playground User';
}

export function CommentPlugin({
    providerFactory,
}: {
    providerFactory?: (id: string, yjsDocMap: Map<string, Doc>) => Provider;
}): JSX.Element {
    const collabContext = useCollaborationContext();
    const [editor] = useLexicalComposerContext();
    const commentStore = useMemo(() => new CommentStore(editor), [editor]);
    const comments = useCommentStore(commentStore);
    const markNodeMap = useMemo<Map<string, Set<NodeKey>>>(() => {
        return new Map();
    }, []);
    const [activeAnchorKey, setActiveAnchorKey] = useState<NodeKey | null>();
    const [activeIDs, setActiveIDs] = useState<Array<string>>([]);
    const [showCommentInput, setShowCommentInput] = useState(false);
    const [showComments, setShowComments] = useState(false);
    const { yjsDocMap } = collabContext;

    useEffect(() => {
        if (providerFactory) {
            const provider = providerFactory('comments', yjsDocMap);
            return commentStore.registerCollaboration(provider);
        }
    }, [commentStore, providerFactory, yjsDocMap]);

    const cancelAddComment = useCallback(() => {
        editor.update(() => {
            const selection = $getSelection();
            // Restore selection
            if (selection !== null) {
                selection.dirty = true;
            }
        });
        setShowCommentInput(false);
    }, [editor]);

    const deleteCommentOrThread = useCallback(
        (comment: Comment | Thread, thread?: Thread) => {
            if (comment.type === 'comment') {
                const deletionInfo = commentStore.deleteCommentOrThread(
                    comment,
                    thread,
                );
                if (!deletionInfo) {
                    return;
                }
                const { markedComment, index } = deletionInfo;
                commentStore.addComment(markedComment, thread, index);
            } else {
                commentStore.deleteCommentOrThread(comment);
                // Remove ids from associated marks
                const id = thread !== undefined ? thread.id : comment.id;
                const markNodeKeys = markNodeMap.get(id);
                if (markNodeKeys !== undefined) {
                    // Do async to avoid causing a React infinite loop
                    setTimeout(() => {
                        editor.update(() => {
                            for (const key of markNodeKeys) {
                                const node: null | MarkNode = $getNodeByKey(key);
                                if ($isMarkNode(node)) {
                                    node.deleteID(id);
                                    if (node.getIDs().length === 0) {
                                        $unwrapMarkNode(node);
                                    }
                                }
                            }
                        });
                    });
                }
            }
        },
        [commentStore, editor, markNodeMap],
    );

    const submitAddComment = useCallback(
        (
            commentOrThread: Comment | Thread,
            isInlineComment: boolean,
            thread?: Thread,
            selection?: RangeSelection | null,
        ) => {
            commentStore.addComment(commentOrThread, thread);
            if (isInlineComment) {
                editor.update(() => {
                    if ($isRangeSelection(selection)) {
                        const isBackward = selection.isBackward();
                        const id = commentOrThread.id;

                        // Wrap content in a MarkNode
                        $wrapSelectionInMarkNode(selection, isBackward, id);
                    }
                });
                setShowCommentInput(false);
            }
        },
        [commentStore, editor],
    );

    useEffect(() => {
        const changedElems: Array<HTMLElement> = [];
        for (let i = 0; i < activeIDs.length; i++) {
            const id = activeIDs[i];
            const keys = markNodeMap.get(id);
            if (keys !== undefined) {
                for (const key of keys) {
                    const elem = editor.getElementByKey(key);
                    if (elem !== null) {
                        elem.classList.add('selected');
                        changedElems.push(elem);
                        setShowComments(true);
                    }
                }
            }
        }
        return () => {
            for (let i = 0; i < changedElems.length; i++) {
                const changedElem = changedElems[i];
                changedElem.classList.remove('selected');
            }
        };
    }, [activeIDs, editor, markNodeMap]);

    useEffect(() => {
        const markNodeKeysToIDs: Map<NodeKey, Array<string>> = new Map();

        return mergeRegister(
            registerNestedElementResolver<MarkNode>(
                editor,
                MarkNode,
                (from: MarkNode) => {
                    return $createMarkNode(from.getIDs());
                },
                (from: MarkNode, to: MarkNode) => {
                    // Merge the IDs
                    const ids = from.getIDs();
                    ids.forEach((id) => {
                        to.addID(id);
                    });
                },
            ),
            editor.registerMutationListener(MarkNode, (mutations) => {
                editor.getEditorState().read(() => {
                    for (const [key, mutation] of mutations) {
                        const node: null | MarkNode = $getNodeByKey(key);
                        let ids: NodeKey[] = [];

                        if (mutation === 'destroyed') {
                            ids = markNodeKeysToIDs.get(key) || [];
                        } else if ($isMarkNode(node)) {
                            ids = node.getIDs();
                        }

                        for (let i = 0; i < ids.length; i++) {
                            const id = ids[i];
                            let markNodeKeys = markNodeMap.get(id);
                            markNodeKeysToIDs.set(key, ids);

                            if (mutation === 'destroyed') {
                                if (markNodeKeys !== undefined) {
                                    markNodeKeys.delete(key);
                                    if (markNodeKeys.size === 0) {
                                        markNodeMap.delete(id);
                                    }
                                }
                            } else {
                                if (markNodeKeys === undefined) {
                                    markNodeKeys = new Set();
                                    markNodeMap.set(id, markNodeKeys);
                                }
                                if (!markNodeKeys.has(key)) {
                                    markNodeKeys.add(key);
                                }
                            }
                        }
                    }
                });
            }),
            editor.registerUpdateListener(({ editorState, tags }) => {
                editorState.read(() => {
                    const selection = $getSelection();
                    let hasActiveIds = false;
                    let hasAnchorKey = false;

                    if ($isRangeSelection(selection)) {
                        const anchorNode = selection.anchor.getNode();

                        if ($isTextNode(anchorNode)) {
                            const commentIDs = $getMarkIDs(
                                anchorNode,
                                selection.anchor.offset,
                            );
                            if (commentIDs !== null) {
                                setActiveIDs(commentIDs);
                                hasActiveIds = true;
                            }
                            if (!selection.isCollapsed()) {
                                setActiveAnchorKey(anchorNode.getKey());
                                hasAnchorKey = true;
                            }
                        }
                    }
                    if (!hasActiveIds) {
                        setActiveIDs((_activeIds) =>
                            _activeIds.length === 0 ? _activeIds : [],
                        );
                    }
                    if (!hasAnchorKey) {
                        setActiveAnchorKey(null);
                    }
                    if (!tags.has('collaboration') && $isRangeSelection(selection)) {
                        setShowCommentInput(false);
                    }
                });
            }),
            editor.registerCommand(
                INSERT_INLINE_COMMAND,
                () => {
                    const domSelection = window.getSelection();
                    if (domSelection !== null) {
                        domSelection.removeAllRanges();
                    }
                    setShowCommentInput(true);
                    return true;
                },
                COMMAND_PRIORITY_EDITOR,
            ),
        );
    }, [editor, markNodeMap]);

    const onAddComment = () => {
        editor.dispatchCommand(INSERT_INLINE_COMMAND, undefined);
    };

    return (
        <>
        { showCommentInput &&
        createPortal(
            <CommentInputBox
            editor={ editor }
            cancelAddComment = { cancelAddComment }
            submitAddComment = { submitAddComment }
            />,
            document.body,
        )}
{
    activeAnchorKey !== null &&
        activeAnchorKey !== undefined &&
        !showCommentInput &&
        createPortal(
            <AddCommentBox
            anchorKey={ activeAnchorKey }
            editor = { editor }
            onAddComment = { onAddComment }
            />,
            document.body,
        )
}
{
    createPortal(
        <Button
          className={`CommentPlugin_ShowCommentsButton ${showComments ? 'active' : ''
        }`}
onClick = {() => setShowComments(!showComments)}
title = { showComments? 'Hide Comments': 'Show Comments' } >
    <i className="comments" />
        </Button>,
document.body,
      )}
{
    showComments &&
        createPortal(
            <CommentsPanel
            comments={ comments }
            submitAddComment = { submitAddComment }
            deleteCommentOrThread = { deleteCommentOrThread }
            activeIDs = { activeIDs }
            markNodeMap = { markNodeMap }
            />,
            document.body,
        )
}
</>
  );
}



class ComponentPickerOption extends MenuOption {
    // What shows up in the editor
    title: string;
    // Icon for display
    icon?: JSX.Element;
    // For extra searching.
    keywords: Array<string>;
    // TBD
    keyboardShortcut?: string;
    // What happens when you select this option?
    onSelect: (queryString: string) => void;

    constructor(
        title: string,
        options: {
            icon?: JSX.Element;
            keywords?: Array<string>;
            keyboardShortcut?: string;
            onSelect: (queryString: string) => void;
        },
    ) {
        super(title);
        this.title = title;
        this.keywords = options.keywords || [];
        this.icon = options.icon;
        this.keyboardShortcut = options.keyboardShortcut;
        this.onSelect = options.onSelect.bind(this);
    }
}

function ComponentPickerMenuItem({
    index,
    isSelected,
    onClick,
    onMouseEnter,
    option,
}: {
    index: number;
    isSelected: boolean;
    onClick: () => void;
    onMouseEnter: () => void;
    option: ComponentPickerOption;
}) {
    let className = 'item';
    if (isSelected) {
        className += ' selected';
    }
    return (
        <li
      key= { option.key }
    tabIndex = {- 1
}
className = { className }
ref = { option.setRefElement }
role = "option"
aria - selected={ isSelected }
id = { 'typeahead-item-' + index }
onMouseEnter = { onMouseEnter }
onClick = { onClick } >
    { option.icon }
    < span className = "text" > { option.title } < /span>
        < /li>
  );
}

function getDynamicOptions(editor: LexicalEditor, queryString: string) {
    const options: Array<ComponentPickerOption> = [];

    if (queryString == null) {
        return options;
    }

    const tableMatch = queryString.match(/^([1-9]\d?)(?:x([1-9]\d?)?)?$/);

    if (tableMatch !== null) {
        const rows = tableMatch[1];
        const colOptions = tableMatch[2]
            ? [tableMatch[2]]
            : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(String);

        options.push(
            ...colOptions.map(
                (columns) =>
                    new ComponentPickerOption(`${rows}x${columns} Table`, {
                        icon: <i className="icon table" />,
            keywords: ['table'],
                        onSelect: () =>
                            editor.dispatchCommand(INSERT_TABLE_COMMAND, { columns, rows }),
                    }),
            ),
        );
    }

    return options;
}

type ShowModal = ReturnType<typeof useModal>[1];

function getBaseOptions(editor: LexicalEditor, showModal: ShowModal) {
    return [
        new ComponentPickerOption('Paragraph', {
            icon: <i className="icon paragraph" />,
      keywords: ['normal', 'paragraph', 'p', 'text'],
            onSelect: () =>
                editor.update(() => {
                    const selection = $getSelection();
                    if ($isRangeSelection(selection)) {
                        $setBlocksType(selection, () => $createParagraphNode());
                    }
                }),
        }),
        ...([1, 2, 3] as const).map(
            (n) =>
                new ComponentPickerOption(`Heading ${n}`, {
                    icon: <i className={`icon h${n}`} />,
keywords: ['heading', 'header', `h${n}`],
    onSelect: () =>
        editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
                $setBlocksType(selection, () => $createHeadingNode(`h${n}`));
            }
        }),
        }),
    ),
new ComponentPickerOption('Table', {
    icon: <i className="icon table" />,
      keywords: ['table', 'grid', 'spreadsheet', 'rows', 'columns'],
    onSelect: () =>
        showModal('Insert Table', (onClose) => (
            <InsertTableDialog activeEditor= { editor } onClose = { onClose } />
        )),
    }),
new ComponentPickerOption('Numbered List', {
    icon: <i className="icon number" />,
      keywords: ['numbered list', 'ordered list', 'ol'],
    onSelect: () =>
        editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined),
}),
    new ComponentPickerOption('Bulleted List', {
        icon: <i className="icon bullet" />,
      keywords: ['bulleted list', 'unordered list', 'ul'],
        onSelect: () =>
            editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined),
    }),
    new ComponentPickerOption('Check List', {
        icon: <i className="icon check" />,
      keywords: ['check list', 'todo list'],
        onSelect: () =>
            editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined),
    }),
    new ComponentPickerOption('Quote', {
        icon: <i className="icon quote" />,
      keywords: ['block quote'],
        onSelect: () =>
            editor.update(() => {
                const selection = $getSelection();
                if ($isRangeSelection(selection)) {
                    $setBlocksType(selection, () => $createQuoteNode());
                }
            }),
    }),
    new ComponentPickerOption('Code', {
        icon: <i className="icon code" />,
      keywords: ['javascript', 'python', 'js', 'codeblock'],
        onSelect: () =>
            editor.update(() => {
                const selection = $getSelection();

                if ($isRangeSelection(selection)) {
                    if (selection.isCollapsed()) {
                        $setBlocksType(selection, () => $createCodeNode());
                    } else {
                        // Will this ever happen?
                        const textContent = selection.getTextContent();
                        const codeNode = $createCodeNode();
                        selection.insertNodes([codeNode]);
                        selection.insertRawText(textContent);
                    }
                }
            }),
    }),
    new ComponentPickerOption('Divider', {
        icon: <i className="icon horizontal-rule" />,
      keywords: ['horizontal rule', 'divider', 'hr'],
        onSelect: () =>
            editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined),
    }),
    new ComponentPickerOption('Page Break', {
        icon: <i className="icon page-break" />,
      keywords: ['page break', 'divider'],
        onSelect: () => editor.dispatchCommand(INSERT_PAGE_BREAK, undefined),
    }),
    new ComponentPickerOption('Excalidraw', {
        icon: <i className="icon diagram-2" />,
      keywords: ['excalidraw', 'diagram', 'drawing'],
        onSelect: () =>
            editor.dispatchCommand(INSERT_EXCALIDRAW_COMMAND, undefined),
    }),
    new ComponentPickerOption('Poll', {
        icon: <i className="icon poll" />,
      keywords: ['poll', 'vote'],
        onSelect: () =>
            showModal('Insert Poll', (onClose) => (
                <InsertPollDialog activeEditor= { editor } onClose = { onClose } />
        )),
    }),
    ...EmbedConfigs.map(
                    (embedConfig) =>
                        new ComponentPickerOption(`Embed ${embedConfig.contentName}`, {
                            icon: embedConfig.icon,
                            keywords: [...embedConfig.keywords, 'embed'],
                            onSelect: () =>
                                editor.dispatchCommand(INSERT_EMBED_COMMAND, embedConfig.type),
                        }),
                ),
    new ComponentPickerOption('Equation', {
        icon: <i className="icon equation" />,
      keywords: ['equation', 'latex', 'math'],
        onSelect: () =>
            showModal('Insert Equation', (onClose) => (
                <InsertEquationDialog activeEditor= { editor } onClose = { onClose } />
        )),
    }),
new ComponentPickerOption('GIF', {
    icon: <i className="icon gif" />,
      keywords: ['gif', 'animate', 'image', 'file'],
    onSelect: () =>
        editor.dispatchCommand(INSERT_IMAGE_COMMAND, {
            altText: 'Cat typing on a laptop',
            src: catTypingGif,
        }),
}),
    new ComponentPickerOption('Image', {
        icon: <i className="icon image" />,
      keywords: ['image', 'photo', 'picture', 'file'],
        onSelect: () =>
            showModal('Insert Image', (onClose) => (
                <InsertImageDialog activeEditor= { editor } onClose = { onClose } />
        )),
    }),
new ComponentPickerOption('Collapsible', {
    icon: <i className="icon caret-right" />,
      keywords: ['collapse', 'collapsible', 'toggle'],
    onSelect: () =>
        editor.dispatchCommand(INSERT_COLLAPSIBLE_COMMAND, undefined),
}),
    new ComponentPickerOption('Columns Layout', {
        icon: <i className="icon columns" />,
      keywords: ['columns', 'layout', 'grid'],
        onSelect: () =>
            showModal('Insert Columns Layout', (onClose) => (
                <InsertLayoutDialog activeEditor= { editor } onClose = { onClose } />
        )),
    }),
    ...(['left', 'center', 'right', 'justify'] as const).map(
                    (alignment) =>
                        new ComponentPickerOption(`Align ${alignment}`, {
                            icon: <i className={`icon ${alignment}-align`} />,
          keywords: ['align', 'justify', alignment],
                            onSelect: () =>
                            editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, alignment),
        }),
                ),
  ];
}

export function ComponentPickerMenuPlugin(): JSX.Element {
    const [editor] = useLexicalComposerContext();
    const [modal, showModal] = useModal();
    const [queryString, setQueryString] = useState<string | null>(null);

    const checkForTriggerMatch = useBasicTypeaheadTriggerMatch('/', {
        minLength: 0,
    });

    const options = useMemo(() => {
        const baseOptions = getBaseOptions(editor, showModal);

        if (!queryString) {
            return baseOptions;
        }

        const regex = new RegExp(queryString, 'i');

        return [
            ...getDynamicOptions(editor, queryString),
            ...baseOptions.filter(
                (option) =>
                    regex.test(option.title) ||
                    option.keywords.some((keyword) => regex.test(keyword)),
            ),
        ];
    }, [editor, queryString, showModal]);

    const onSelectOption = useCallback(
        (
            selectedOption: ComponentPickerOption,
            nodeToRemove: TextNode | null,
            closeMenu: () => void,
            matchingString: string,
        ) => {
            editor.update(() => {
                nodeToRemove?.remove();
                selectedOption.onSelect(matchingString);
                closeMenu();
            });
        },
        [editor],
    );

    return (
        <>
        { modal }
        < LexicalTypeaheadMenuPlugin<ComponentPickerOption>
        onQueryChange = { setQueryString }
    onSelectOption = { onSelectOption }
    triggerFn = { checkForTriggerMatch }
    options = { options }
    menuRenderFn = {(
        anchorElementRef,
        { selectedIndex, selectOptionAndCleanUp, setHighlightedIndex },
    ) =>
    anchorElementRef.current && options.length
        ? ReactDOM.createPortal(
            <div className="typeahead-popover component-picker-menu" >
        <ul>
        {
            options.map((option, i: number) => (
                <ComponentPickerMenuItem
                        index= { i }
                        isSelected = { selectedIndex === i}
                        onClick = {() => {
            setHighlightedIndex(i);
                          selectOptionAndCleanUp(option);
        }}
onMouseEnter = {() => {
    setHighlightedIndex(i);
}}
key = { option.key }
option = { option }
    />
                    ))}
</ul>
    < /div>,
anchorElementRef.current,
              )
            : null
        }
/>
    < />
  );
}





function ContextMenuItem({
    index,
    isSelected,
    onClick,
    onMouseEnter,
    option,
}: {
    index: number;
    isSelected: boolean;
    onClick: () => void;
    onMouseEnter: () => void;
    option: ContextMenuOption;
}) {
    let className = 'item';
    if (isSelected) {
        className += ' selected';
    }
    return (
        <li
      key= { option.key }
    tabIndex = {- 1
}
className = { className }
ref = { option.setRefElement }
role = "option"
aria - selected={ isSelected }
id = { 'typeahead-item-' + index }
onMouseEnter = { onMouseEnter }
onClick = { onClick } >
    <span className="text" > { option.title } < /span>
        < /li>
  );
}

function ContextMenu({
    options,
    selectedItemIndex,
    onOptionClick,
    onOptionMouseEnter,
}: {
    selectedItemIndex: number | null;
    onOptionClick: (option: ContextMenuOption, index: number) => void;
    onOptionMouseEnter: (index: number) => void;
    options: Array<ContextMenuOption>;
}) {
    return (
        <div className= "typeahead-popover" >
        <ul>
        {
            options.map((option: ContextMenuOption, i: number) => (
                <ContextMenuItem
            index= { i }
            isSelected = { selectedItemIndex === i}
    onClick = {() => onOptionClick(option, i)
}
onMouseEnter = {() => onOptionMouseEnter(i)}
key = { option.key }
option = { option }
    />
        ))}
</ul>
    < /div>
  );
}

export class ContextMenuOption extends MenuOption {
    title: string;
    onSelect: (targetNode: LexicalNode | null) => void;
    constructor(
        title: string,
        options: {
            onSelect: (targetNode: LexicalNode | null) => void;
        },
    ) {
        super(title);
        this.title = title;
        this.onSelect = options.onSelect.bind(this);
    }
}

export function ContextMenuPlugin(): JSX.Element {
    const [editor] = useLexicalComposerContext();

    const options = useMemo(() => {
        return [
            new ContextMenuOption(`Copy`, {
                onSelect: (_node) => {
                    editor.dispatchCommand(COPY_COMMAND, null);
                },
            }),
            new ContextMenuOption(`Cut`, {
                onSelect: (_node) => {
                    editor.dispatchCommand(CUT_COMMAND, null);
                },
            }),
            new ContextMenuOption(`Paste`, {
                onSelect: (_node) => {
                    navigator.clipboard.read().then(async (...args) => {
                        const data = new DataTransfer();

                        const items = await navigator.clipboard.read();
                        const item = items[0];

                        const permission = await navigator.permissions.query({
                            // @ts-expect-error These types are incorrect.
                            name: 'clipboard-read',
                        });
                        if (permission.state === 'denied') {
                            alert('Not allowed to paste from clipboard.');
                            return;
                        }

                        for (const type of item.types) {
                            const dataString = await (await item.getType(type)).text();
                            data.setData(type, dataString);
                        }

                        const event = new ClipboardEvent('paste', {
                            clipboardData: data,
                        });

                        editor.dispatchCommand(PASTE_COMMAND, event);
                    });
                },
            }),
            new ContextMenuOption(`Paste as Plain Text`, {
                onSelect: (_node) => {
                    navigator.clipboard.read().then(async (...args) => {
                        const permission = await navigator.permissions.query({
                            // @ts-expect-error These types are incorrect.
                            name: 'clipboard-read',
                        });

                        if (permission.state === 'denied') {
                            alert('Not allowed to paste from clipboard.');
                            return;
                        }

                        const data = new DataTransfer();
                        const items = await navigator.clipboard.readText();
                        data.setData('text/plain', items);

                        const event = new ClipboardEvent('paste', {
                            clipboardData: data,
                        });
                        editor.dispatchCommand(PASTE_COMMAND, event);
                    });
                },
            }),
            new ContextMenuOption(`Delete Node`, {
                onSelect: (_node) => {
                    const selection = $getSelection();
                    if ($isRangeSelection(selection)) {
                        const currentNode = selection.anchor.getNode();
                        const ancestorNodeWithRootAsParent = currentNode
                            .getParents()
                            .at(-2);

                        ancestorNodeWithRootAsParent?.remove();
                    }
                },
            }),
        ];
    }, [editor]);

    const onSelectOption = useCallback(
        (
            selectedOption: ContextMenuOption,
            targetNode: LexicalNode | null,
            closeMenu: () => void,
        ) => {
            editor.update(() => {
                selectedOption.onSelect(targetNode);
                closeMenu();
            });
        },
        [editor],
    );

    return (
        <LexicalContextMenuPlugin
      options= { options }
    onSelectOption = { onSelectOption }
    menuRenderFn = {(
        anchorElementRef,
        {
            selectedIndex,
            options: _options,
            selectOptionAndCleanUp,
            setHighlightedIndex,
        },
        { setMenuRef },
    ) =>
    anchorElementRef.current
        ? ReactDOM.createPortal(
            <div
                className="typeahead-popover auto-embed-menu"
                style = {{
            marginLeft: anchorElementRef.current.style.width,
            userSelect: 'none',
            width: 200,
        }}
ref = { setMenuRef } >
    <ContextMenu
                  options={ options }
selectedItemIndex = { selectedIndex }
onOptionClick = {(option: ContextMenuOption, index: number) => {
    setHighlightedIndex(index);
    selectOptionAndCleanUp(option);
}}
onOptionMouseEnter = {(index: number) => {
    setHighlightedIndex(index);
}}
/>
    < /div>,
anchorElementRef.current,
            )
          : null
      }
/>
  );
}




export function DocsPlugin(): JSX.Element {
    return (
        <a target= "__blank" href = "https://lexical.dev/docs/intro" >
            <button
          id="docs-button"
    className = "editor-dev-button"
    title = "Lexical Docs"
        />
        </a>
    );
}

const ACCEPTABLE_IMAGE_TYPES = [
    'image/',
    'image/heic',
    'image/heif',
    'image/gif',
    'image/webp',
];

export function DragDropPaste(): null {
    const [editor] = useLexicalComposerContext();
    useEffect(() => {
        return editor.registerCommand(
            DRAG_DROP_PASTE,
            (files) => {
                (async () => {
                    const filesResult = await mediaFileReader(
                        files,
                        [ACCEPTABLE_IMAGE_TYPES].flatMap((x) => x),
                    );
                    for (const { file, result } of filesResult) {
                        if (isMimeType(file, ACCEPTABLE_IMAGE_TYPES)) {
                            editor.dispatchCommand(INSERT_IMAGE_COMMAND, {
                                altText: file.name,
                                src: result,
                            });
                        }
                    }
                })();
                return true;
            },
            COMMAND_PRIORITY_LOW,
        );
    }, [editor]);
    return null;
}

const SPACE = 4;
const TARGET_LINE_HALF_HEIGHT = 2;
const DRAGGABLE_BLOCK_MENU_CLASSNAME = 'draggable-block-menu';
const DRAG_DATA_FORMAT = 'application/x-lexical-drag-block';
const TEXT_BOX_HORIZONTAL_PADDING = 28;

const Downward = 1;
const Upward = -1;
const Indeterminate = 0;

let prevIndex = Infinity;

function getCurrentIndex(keysLength: number): number {
    if (keysLength === 0) {
        return Infinity;
    }
    if (prevIndex >= 0 && prevIndex < keysLength) {
        return prevIndex;
    }

    return Math.floor(keysLength / 2);
}

function getTopLevelNodeKeys(editor: LexicalEditor): string[] {
    return editor.getEditorState().read(() => $getRoot().getChildrenKeys());
}

function getCollapsedMargins(elem: HTMLElement): {
    marginTop: number;
    marginBottom: number;
} {
    const getMargin = (
        element: Element | null,
        margin: 'marginTop' | 'marginBottom',
    ): number =>
        element ? parseFloat(window.getComputedStyle(element)[margin]) : 0;

    const { marginTop, marginBottom } = window.getComputedStyle(elem);
    const prevElemSiblingMarginBottom = getMargin(
        elem.previousElementSibling,
        'marginBottom',
    );
    const nextElemSiblingMarginTop = getMargin(
        elem.nextElementSibling,
        'marginTop',
    );
    const collapsedTopMargin = Math.max(
        parseFloat(marginTop),
        prevElemSiblingMarginBottom,
    );
    const collapsedBottomMargin = Math.max(
        parseFloat(marginBottom),
        nextElemSiblingMarginTop,
    );

    return { marginBottom: collapsedBottomMargin, marginTop: collapsedTopMargin };
}

function getBlockElement(
    anchorElem: HTMLElement,
    editor: LexicalEditor,
    event: MouseEvent,
    useEdgeAsDefault = false,
): HTMLElement | null {
    const anchorElementRect = anchorElem.getBoundingClientRect();
    const topLevelNodeKeys = getTopLevelNodeKeys(editor);

    let blockElem: HTMLElement | null = null;

    editor.getEditorState().read(() => {
        if (useEdgeAsDefault) {
            const [firstNode, lastNode] = [
                editor.getElementByKey(topLevelNodeKeys[0]),
                editor.getElementByKey(topLevelNodeKeys[topLevelNodeKeys.length - 1]),
            ];

            const [firstNodeRect, lastNodeRect] = [
                firstNode?.getBoundingClientRect(),
                lastNode?.getBoundingClientRect(),
            ];

            if (firstNodeRect && lastNodeRect) {
                if (event.y < firstNodeRect.top) {
                    blockElem = firstNode;
                } else if (event.y > lastNodeRect.bottom) {
                    blockElem = lastNode;
                }

                if (blockElem) {
                    return;
                }
            }
        }

        let index = getCurrentIndex(topLevelNodeKeys.length);
        let direction = Indeterminate;

        while (index >= 0 && index < topLevelNodeKeys.length) {
            const key = topLevelNodeKeys[index];
            const elem = editor.getElementByKey(key);
            if (elem === null) {
                break;
            }
            const point = new Point(event.x, event.y);
            const domRect = Rect.fromDOM(elem);
            const { marginTop, marginBottom } = getCollapsedMargins(elem);

            const rect = domRect.generateNewRect({
                bottom: domRect.bottom + marginBottom,
                left: anchorElementRect.left,
                right: anchorElementRect.right,
                top: domRect.top - marginTop,
            });

            const {
                result,
                reason: { isOnTopSide, isOnBottomSide },
            } = rect.contains(point);

            if (result) {
                blockElem = elem;
                prevIndex = index;
                break;
            }

            if (direction === Indeterminate) {
                if (isOnTopSide) {
                    direction = Upward;
                } else if (isOnBottomSide) {
                    direction = Downward;
                } else {
                    // stop search block element
                    direction = Infinity;
                }
            }

            index += direction;
        }
    });

    return blockElem;
}

function isOnMenu(element: HTMLElement): boolean {
    return !!element.closest(`.${DRAGGABLE_BLOCK_MENU_CLASSNAME}`);
}

function setMenuPosition(
    targetElem: HTMLElement | null,
    floatingElem: HTMLElement,
    anchorElem: HTMLElement,
) {
    if (!targetElem) {
        floatingElem.style.opacity = '0';
        floatingElem.style.transform = 'translate(-10000px, -10000px)';
        return;
    }

    const targetRect = targetElem.getBoundingClientRect();
    const targetStyle = window.getComputedStyle(targetElem);
    const floatingElemRect = floatingElem.getBoundingClientRect();
    const anchorElementRect = anchorElem.getBoundingClientRect();

    const top =
        targetRect.top +
        (parseInt(targetStyle.lineHeight, 10) - floatingElemRect.height) / 2 -
        anchorElementRect.top;

    const left = SPACE;

    floatingElem.style.opacity = '1';
    floatingElem.style.transform = `translate(${left}px, ${top}px)`;
}

function setDragImage(
    dataTransfer: DataTransfer,
    draggableBlockElem: HTMLElement,
) {
    const { transform } = draggableBlockElem.style;

    // Remove dragImage borders
    draggableBlockElem.style.transform = 'translateZ(0)';
    dataTransfer.setDragImage(draggableBlockElem, 0, 0);

    setTimeout(() => {
        draggableBlockElem.style.transform = transform;
    });
}

function setTargetLine(
    targetLineElem: HTMLElement,
    targetBlockElem: HTMLElement,
    mouseY: number,
    anchorElem: HTMLElement,
) {
    const { top: targetBlockElemTop, height: targetBlockElemHeight } =
        targetBlockElem.getBoundingClientRect();
    const { top: anchorTop, width: anchorWidth } =
        anchorElem.getBoundingClientRect();

    const { marginTop, marginBottom } = getCollapsedMargins(targetBlockElem);
    let lineTop = targetBlockElemTop;
    if (mouseY >= targetBlockElemTop) {
        lineTop += targetBlockElemHeight + marginBottom / 2;
    } else {
        lineTop -= marginTop / 2;
    }

    const top = lineTop - anchorTop - TARGET_LINE_HALF_HEIGHT;
    const left = TEXT_BOX_HORIZONTAL_PADDING - SPACE;

    targetLineElem.style.transform = `translate(${left}px, ${top}px)`;
    targetLineElem.style.width = `${anchorWidth - (TEXT_BOX_HORIZONTAL_PADDING - SPACE) * 2
        }px`;
    targetLineElem.style.opacity = '.4';
}

function hideTargetLine(targetLineElem: HTMLElement | null) {
    if (targetLineElem) {
        targetLineElem.style.opacity = '0';
        targetLineElem.style.transform = 'translate(-10000px, -10000px)';
    }
}

function useDraggableBlockMenu(
    editor: LexicalEditor,
    anchorElem: HTMLElement,
    isEditable: boolean,
): JSX.Element {
    const scrollerElem = anchorElem.parentElement;

    const menuRef = useRef<HTMLDivElement>(null);
    const targetLineRef = useRef<HTMLDivElement>(null);
    const isDraggingBlockRef = useRef<boolean>(false);
    const [draggableBlockElem, setDraggableBlockElem] =
        useState<HTMLElement | null>(null);

    useEffect(() => {
        function onMouseMove(event: MouseEvent) {
            const target = event.target;
            if (!isHTMLElement(target)) {
                setDraggableBlockElem(null);
                return;
            }

            if (isOnMenu(target)) {
                return;
            }

            const _draggableBlockElem = getBlockElement(anchorElem, editor, event);

            setDraggableBlockElem(_draggableBlockElem);
        }

        function onMouseLeave() {
            setDraggableBlockElem(null);
        }

        scrollerElem?.addEventListener('mousemove', onMouseMove);
        scrollerElem?.addEventListener('mouseleave', onMouseLeave);

        return () => {
            scrollerElem?.removeEventListener('mousemove', onMouseMove);
            scrollerElem?.removeEventListener('mouseleave', onMouseLeave);
        };
    }, [scrollerElem, anchorElem, editor]);

    useEffect(() => {
        if (menuRef.current) {
            setMenuPosition(draggableBlockElem, menuRef.current, anchorElem);
        }
    }, [anchorElem, draggableBlockElem]);

    useEffect(() => {
        function onDragover(event: DragEvent): boolean {
            if (!isDraggingBlockRef.current) {
                return false;
            }
            const [isFileTransfer] = eventFiles(event);
            if (isFileTransfer) {
                return false;
            }
            const { pageY, target } = event;
            if (!isHTMLElement(target)) {
                return false;
            }
            const targetBlockElem = getBlockElement(anchorElem, editor, event, true);
            const targetLineElem = targetLineRef.current;
            if (targetBlockElem === null || targetLineElem === null) {
                return false;
            }
            setTargetLine(targetLineElem, targetBlockElem, pageY, anchorElem);
            // Prevent default event to be able to trigger onDrop events
            event.preventDefault();
            return true;
        }

        function onDrop(event: DragEvent): boolean {
            if (!isDraggingBlockRef.current) {
                return false;
            }
            const [isFileTransfer] = eventFiles(event);
            if (isFileTransfer) {
                return false;
            }
            const { target, dataTransfer, pageY } = event;
            const dragData = dataTransfer?.getData(DRAG_DATA_FORMAT) || '';
            const draggedNode = $getNodeByKey(dragData);
            if (!draggedNode) {
                return false;
            }
            if (!isHTMLElement(target)) {
                return false;
            }
            const targetBlockElem = getBlockElement(anchorElem, editor, event, true);
            if (!targetBlockElem) {
                return false;
            }
            const targetNode = $getNearestNodeFromDOMNode(targetBlockElem);
            if (!targetNode) {
                return false;
            }
            if (targetNode === draggedNode) {
                return true;
            }
            const targetBlockElemTop = targetBlockElem.getBoundingClientRect().top;
            if (pageY >= targetBlockElemTop) {
                targetNode.insertAfter(draggedNode);
            } else {
                targetNode.insertBefore(draggedNode);
            }
            setDraggableBlockElem(null);

            return true;
        }

        return mergeRegister(
            editor.registerCommand(
                DRAGOVER_COMMAND,
                (event) => {
                    return onDragover(event);
                },
                COMMAND_PRIORITY_LOW,
            ),
            editor.registerCommand(
                DROP_COMMAND,
                (event) => {
                    return onDrop(event);
                },
                COMMAND_PRIORITY_HIGH,
            ),
        );
    }, [anchorElem, editor]);

    function onDragStart(event: ReactDragEvent<HTMLDivElement>): void {
        const dataTransfer = event.dataTransfer;
        if (!dataTransfer || !draggableBlockElem) {
            return;
        }
        setDragImage(dataTransfer, draggableBlockElem);
        let nodeKey = '';
        editor.update(() => {
            const node = $getNearestNodeFromDOMNode(draggableBlockElem);
            if (node) {
                nodeKey = node.getKey();
            }
        });
        isDraggingBlockRef.current = true;
        dataTransfer.setData(DRAG_DATA_FORMAT, nodeKey);
    }

    function onDragEnd(): void {
        isDraggingBlockRef.current = false;
        hideTargetLine(targetLineRef.current);
    }

    return createPortal(
        <>
        <div
        className="icon draggable-block-menu"
        ref = { menuRef }
        draggable = { true}
        onDragStart = { onDragStart }
        onDragEnd = { onDragEnd } >
        <div className={ isEditable? 'icon': '' } />
        </div>
    < div className = "draggable-block-target-line" ref = { targetLineRef } />
    </>,
    anchorElem,
    );
}

export function DraggableBlockPlugin({
    anchorElem = document.body,
}: {
    anchorElem?: HTMLElement;
}): JSX.Element {
    const [editor] = useLexicalComposerContext();
    return useDraggableBlockMenu(editor, anchorElem, editor._editable);
}




class EmojiOption extends MenuOption {
    title: string;
    emoji: string;
    keywords: Array<string>;

    constructor(
        title: string,
        emoji: string,
        options: {
            keywords?: Array<string>;
        },
    ) {
        super(title);
        this.title = title;
        this.emoji = emoji;
        this.keywords = options.keywords || [];
    }
}
function EmojiMenuItem({
    index,
    isSelected,
    onClick,
    onMouseEnter,
    option,
}: {
    index: number;
    isSelected: boolean;
    onClick: () => void;
    onMouseEnter: () => void;
    option: EmojiOption;
}) {
    let className = 'item';
    if (isSelected) {
        className += ' selected';
    }
    return (
        <li
      key= { option.key }
    tabIndex = {- 1
}
className = { className }
ref = { option.setRefElement }
role = "option"
aria - selected={ isSelected }
id = { 'typeahead-item-' + index }
onMouseEnter = { onMouseEnter }
onClick = { onClick } >
    <span className="text" >
        { option.emoji } { option.title }
</span>
    < /li>
  );
}

type Emoji = {
    emoji: string;
    description: string;
    category: string;
    aliases: Array<string>;
    tags: Array<string>;
    unicode_version: string;
    ios_version: string;
    skin_tones?: boolean;
};

const MAX_EMOJI_SUGGESTION_COUNT = 10;

export function EmojiPickerPlugin() {
    const [editor] = useLexicalComposerContext();
    const [queryString, setQueryString] = useState<string | null>(null);
    const [emojis, setEmojis] = useState<Array<Emoji>>([]);

    useEffect(() => {
        import('../../utils/emoji-list').then((file) => setEmojis(file.default));
    }, []);

    const emojiOptions = useMemo(
        () =>
            emojis != null
                ? emojis.map(
                    ({ emoji, aliases, tags }) =>
                        new EmojiOption(aliases[0], emoji, {
                            keywords: [...aliases, ...tags],
                        }),
                )
                : [],
        [emojis],
    );

    const checkForTriggerMatch = useBasicTypeaheadTriggerMatch(':', {
        minLength: 0,
    });

    const options: Array<EmojiOption> = useMemo(() => {
        return emojiOptions
            .filter((option: EmojiOption) => {
                return queryString != null
                    ? new RegExp(queryString, 'gi').exec(option.title) ||
                        option.keywords != null
                        ? option.keywords.some((keyword: string) =>
                            new RegExp(queryString, 'gi').exec(keyword),
                        )
                        : false
                    : emojiOptions;
            })
            .slice(0, MAX_EMOJI_SUGGESTION_COUNT);
    }, [emojiOptions, queryString]);

    const onSelectOption = useCallback(
        (
            selectedOption: EmojiOption,
            nodeToRemove: TextNode | null,
            closeMenu: () => void,
        ) => {
            editor.update(() => {
                const selection = $getSelection();

                if (!$isRangeSelection(selection) || selectedOption == null) {
                    return;
                }

                if (nodeToRemove) {
                    nodeToRemove.remove();
                }

                selection.insertNodes([$createTextNode(selectedOption.emoji)]);

                closeMenu();
            });
        },
        [editor],
    );

    return (
        <LexicalTypeaheadMenuPlugin
      onQueryChange= { setQueryString }
    onSelectOption = { onSelectOption }
    triggerFn = { checkForTriggerMatch }
    options = { options }
    menuRenderFn = {(
        anchorElementRef,
        { selectedIndex, selectOptionAndCleanUp, setHighlightedIndex },
    ) => {
        if (anchorElementRef.current == null || options.length === 0) {
            return null;
        }

        return anchorElementRef.current && options.length
            ? ReactDOM.createPortal(
                <div className="typeahead-popover emoji-menu" >
            <ul>
            {
                options.map((option: EmojiOption, index) => (
                    <div key= { option.key } >
                    <EmojiMenuItem
                        index={ index }
                        isSelected = { selectedIndex === index}
                        onClick = {() => {
                setHighlightedIndex(index);
                          selectOptionAndCleanUp(option);
            }}
    onMouseEnter = {() => {
        setHighlightedIndex(index);
    }
}
option = { option }
    />
    </div>
                  ))}
</ul>
    < /div>,
anchorElementRef.current,
            )
          : null;
      }}
/>
  );
}



const emojis: Map<string, [string, string]> = new Map([
    [':)', ['emoji happysmile', '🙂']],
    [':D', ['emoji veryhappysmile', '😀']],
    [':(', ['emoji unhappysmile', '🙁']],
    ['<3', ['emoji heart', '❤']],
    ['🙂', ['emoji happysmile', '🙂']],
    ['😀', ['emoji veryhappysmile', '😀']],
    ['🙁', ['emoji unhappysmile', '🙁']],
    ['❤', ['emoji heart', '❤']],
]);

function findAndTransformEmoji(node: TextNode): null | TextNode {
    const text = node.getTextContent();

    for (let i = 0; i < text.length; i++) {
        const emojiData = emojis.get(text[i]) || emojis.get(text.slice(i, i + 2));

        if (emojiData !== undefined) {
            const [emojiStyle, emojiText] = emojiData;
            let targetNode;

            if (i === 0) {
                [targetNode] = node.splitText(i + 2);
            } else {
                [, targetNode] = node.splitText(i, i + 2);
            }

            const emojiNode = $createEmojiNode(emojiStyle, emojiText);
            targetNode.replace(emojiNode);
            return emojiNode;
        }
    }

    return null;
}

function textNodeTransform(node: TextNode): void {
    let targetNode: TextNode | null = node;

    while (targetNode !== null) {
        if (!targetNode.isSimpleText()) {
            return;
        }

        targetNode = findAndTransformEmoji(targetNode);
    }
}

function useEmojis(editor: LexicalEditor): void {
    useEffect(() => {
        if (!editor.hasNodes([EmojiNode])) {
            throw new Error('EmojisPlugin: EmojiNode not registered on editor');
        }

        return editor.registerNodeTransform(TextNode, textNodeTransform);
    }, [editor]);
}

export function EmojisPlugin(): JSX.Element | null {
    const [editor] = useLexicalComposerContext();
    useEmojis(editor);
    return null;
}









type CommandPayload = {
    equation: string;
    inline: boolean;
};

export const INSERT_EQUATION_COMMAND: LexicalCommand<CommandPayload> =
    createCommand('INSERT_EQUATION_COMMAND');

export function InsertEquationDialog({
    activeEditor,
    onClose,
}: {
    activeEditor: LexicalEditor;
    onClose: () => void;
}): JSX.Element {
    const onEquationConfirm = useCallback(
        (equation: string, inline: boolean) => {
            activeEditor.dispatchCommand(INSERT_EQUATION_COMMAND, { equation, inline });
            onClose();
        },
        [activeEditor, onClose],
    );

    return <KatexEquationAlterer onConfirm={ onEquationConfirm } />;
}

export function EquationsPlugin(): JSX.Element | null {
    const [editor] = useLexicalComposerContext();

    useEffect(() => {
        if (!editor.hasNodes([EquationNode])) {
            throw new Error(
                'EquationsPlugins: EquationsNode not registered on editor',
            );
        }

        return editor.registerCommand<CommandPayload>(
            INSERT_EQUATION_COMMAND,
            (payload) => {
                const { equation, inline } = payload;
                const equationNode = $createEquationNode(equation, inline);

                $insertNodes([equationNode]);
                if ($isRootOrShadowRoot(equationNode.getParentOrThrow())) {
                    $wrapNodeInElement(equationNode, $createParagraphNode).selectEnd();
                }

                return true;
            },
            COMMAND_PRIORITY_EDITOR,
        );
    }, [editor]);

    return null;
}




export const INSERT_EXCALIDRAW_COMMAND: LexicalCommand<void> = createCommand(
    'INSERT_EXCALIDRAW_COMMAND',
);

export function ExcalidrawPlugin(): null {
    const [editor] = useLexicalComposerContext();
    useEffect(() => {
        if (!editor.hasNodes([ExcalidrawNode])) {
            throw new Error(
                'ExcalidrawPlugin: ExcalidrawNode not registered on editor',
            );
        }

        return editor.registerCommand(
            INSERT_EXCALIDRAW_COMMAND,
            () => {
                const excalidrawNode = $createExcalidrawNode();

                $insertNodes([excalidrawNode]);
                if ($isRootOrShadowRoot(excalidrawNode.getParentOrThrow())) {
                    $wrapNodeInElement(excalidrawNode, $createParagraphNode).selectEnd();
                }

                return true;
            },
            COMMAND_PRIORITY_EDITOR,
        );
    }, [editor]);

    return null;
}







export const INSERT_FIGMA_COMMAND: LexicalCommand<string> = createCommand(
    'INSERT_FIGMA_COMMAND',
);

export function FigmaPlugin(): JSX.Element | null {
    const [editor] = useLexicalComposerContext();

    useEffect(() => {
        if (!editor.hasNodes([FigmaNode])) {
            throw new Error('FigmaPlugin: FigmaNode not registered on editor');
        }

        return editor.registerCommand<string>(
            INSERT_FIGMA_COMMAND,
            (payload) => {
                const figmaNode = $createFigmaNode(payload);
                $insertNodeToNearestRoot(figmaNode);
                return true;
            },
            COMMAND_PRIORITY_EDITOR,
        );
    }, [editor]);

    return null;
}

function FloatingLinkEditor({
    editor,
    isLink,
    setIsLink,
    anchorElem,
    isLinkEditMode,
    setIsLinkEditMode,
}: {
    editor: LexicalEditor;
    isLink: boolean;
    setIsLink: Dispatch<boolean>;
    anchorElem: HTMLElement;
    isLinkEditMode: boolean;
    setIsLinkEditMode: Dispatch<boolean>;
}): JSX.Element {
    const editorRef = useRef<HTMLDivElement | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [linkUrl, setLinkUrl] = useState('');
    const [editedLinkUrl, setEditedLinkUrl] = useState('https://');
    const [lastSelection, setLastSelection] = useState<BaseSelection | null>(
        null,
    );

    const updateLinkEditor = useCallback(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
            const node = getSelectedNode(selection);
            const linkParent = $findMatchingParent(node, $isLinkNode);

            if (linkParent) {
                setLinkUrl(linkParent.getURL());
            } else if ($isLinkNode(node)) {
                setLinkUrl(node.getURL());
            } else {
                setLinkUrl('');
            }
            if (isLinkEditMode) {
                setEditedLinkUrl(linkUrl);
            }
        }
        const editorElem = editorRef.current;
        const nativeSelection = window.getSelection();
        const activeElement = document.activeElement;

        if (editorElem === null) {
            return;
        }

        const rootElement = editor.getRootElement();

        if (
            selection !== null &&
            nativeSelection !== null &&
            rootElement !== null &&
            rootElement.contains(nativeSelection.anchorNode) &&
            editor.isEditable()
        ) {
            const domRect: DOMRect | undefined =
                nativeSelection.focusNode?.parentElement?.getBoundingClientRect();
            if (domRect) {
                domRect.y += 40;
                setFloatingElemPositionForLinkEditor(domRect, editorElem, anchorElem);
            }
            setLastSelection(selection);
        } else if (!activeElement || activeElement.className !== 'link-input') {
            if (rootElement !== null) {
                setFloatingElemPositionForLinkEditor(null, editorElem, anchorElem);
            }
            setLastSelection(null);
            setIsLinkEditMode(false);
            setLinkUrl('');
        }

        return true;
    }, [anchorElem, editor, setIsLinkEditMode, isLinkEditMode, linkUrl]);

    useEffect(() => {
        const scrollerElem = anchorElem.parentElement;

        const update = () => {
            editor.getEditorState().read(() => {
                updateLinkEditor();
            });
        };

        window.addEventListener('resize', update);

        if (scrollerElem) {
            scrollerElem.addEventListener('scroll', update);
        }

        return () => {
            window.removeEventListener('resize', update);

            if (scrollerElem) {
                scrollerElem.removeEventListener('scroll', update);
            }
        };
    }, [anchorElem.parentElement, editor, updateLinkEditor]);

    useEffect(() => {
        return mergeRegister(
            editor.registerUpdateListener(({ editorState }) => {
                editorState.read(() => {
                    updateLinkEditor();
                });
            }),

            editor.registerCommand(
                SELECTION_CHANGE_COMMAND,
                () => {
                    updateLinkEditor();
                    return true;
                },
                COMMAND_PRIORITY_LOW,
            ),
            editor.registerCommand(
                KEY_ESCAPE_COMMAND,
                () => {
                    if (isLink) {
                        setIsLink(false);
                        return true;
                    }
                    return false;
                },
                COMMAND_PRIORITY_HIGH,
            ),
        );
    }, [editor, updateLinkEditor, setIsLink, isLink]);

    useEffect(() => {
        editor.getEditorState().read(() => {
            updateLinkEditor();
        });
    }, [editor, updateLinkEditor]);

    useEffect(() => {
        if (isLinkEditMode && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isLinkEditMode, isLink]);

    const monitorInputInteraction = (
        event: React.KeyboardEvent<HTMLInputElement>,
    ) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            handleLinkSubmission();
        } else if (event.key === 'Escape') {
            event.preventDefault();
            setIsLinkEditMode(false);
        }
    };

    const handleLinkSubmission = () => {
        if (lastSelection !== null) {
            if (linkUrl !== '') {
                editor.dispatchCommand(TOGGLE_LINK_COMMAND, sanitizeUrl(editedLinkUrl));
                editor.update(() => {
                    const selection = $getSelection();
                    if ($isRangeSelection(selection)) {
                        const parent = getSelectedNode(selection).getParent();
                        if ($isAutoLinkNode(parent)) {
                            const linkNode = $createLinkNode(parent.getURL(), {
                                rel: parent.__rel,
                                target: parent.__target,
                                title: parent.__title,
                            });
                            parent.replace(linkNode, true);
                        }
                    }
                });
            }
            setEditedLinkUrl('https://');
            setIsLinkEditMode(false);
        }
    };

    return (
        <div ref= { editorRef } className = "link-editor" >
            {!isLink ? null : isLinkEditMode ? (
                <>
                <input
              ref= { inputRef }
              className = "link-input"
    value = { editedLinkUrl }
    onChange = {(event) => {
        setEditedLinkUrl(event.target.value);
    }
}
onKeyDown = {(event) => {
    monitorInputInteraction(event);
}}
/>
    < div >
    <div
                className="link-cancel"
role = "button"
tabIndex = { 0}
onMouseDown = {(event) => event.preventDefault()}
onClick = {() => {
    setIsLinkEditMode(false);
}}
/>

    < div
className = "link-confirm"
role = "button"
tabIndex = { 0}
onMouseDown = {(event) => event.preventDefault()}
onClick = { handleLinkSubmission }
    />
    </div>
    < />
        ) : (
    <div className= "link-view" >
    <a
              href={ sanitizeUrl(linkUrl) }
target = "_blank"
rel = "noopener noreferrer" >
    { linkUrl }
    < /a>
    < div
className = "link-edit"
role = "button"
tabIndex = { 0}
onMouseDown = {(event) => event.preventDefault()}
onClick = {() => {
    setEditedLinkUrl(linkUrl);
    setIsLinkEditMode(true);
}}
/>
    < div
className = "link-trash"
role = "button"
tabIndex = { 0}
onMouseDown = {(event) => event.preventDefault()}
onClick = {() => {
    editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
}}
/>
    < /div>
        )}
</div>
    );
  }

function useFloatingLinkEditorToolbar(
    editor: LexicalEditor,
    anchorElem: HTMLElement,
    isLinkEditMode: boolean,
    setIsLinkEditMode: Dispatch<boolean>,
): JSX.Element | null {
    const [activeEditor, setActiveEditor] = useState(editor);
    const [isLink, setIsLink] = useState(false);

    useEffect(() => {
        function updateToolbar() {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
                const focusNode = getSelectedNode(selection);
                const focusLinkNode = $findMatchingParent(focusNode, $isLinkNode);
                const focusAutoLinkNode = $findMatchingParent(
                    focusNode,
                    $isAutoLinkNode,
                );
                if (!(focusLinkNode || focusAutoLinkNode)) {
                    setIsLink(false);
                    return;
                }
                const badNode = selection.getNodes().find((node) => {
                    const linkNode = $findMatchingParent(node, $isLinkNode);
                    const autoLinkNode = $findMatchingParent(node, $isAutoLinkNode);
                    if (
                        !linkNode?.is(focusLinkNode) &&
                        !autoLinkNode?.is(focusAutoLinkNode) &&
                        !linkNode &&
                        !autoLinkNode &&
                        !$isLineBreakNode(node)
                    ) {
                        return node;
                    }
                });
                if (!badNode) {
                    setIsLink(true);
                } else {
                    setIsLink(false);
                }
            }
        }
        return mergeRegister(
            editor.registerUpdateListener(({ editorState }) => {
                editorState.read(() => {
                    updateToolbar();
                });
            }),
            editor.registerCommand(
                SELECTION_CHANGE_COMMAND,
                (_payload, newEditor) => {
                    updateToolbar();
                    setActiveEditor(newEditor);
                    return false;
                },
                COMMAND_PRIORITY_CRITICAL,
            ),
            editor.registerCommand(
                CLICK_COMMAND,
                (payload) => {
                    const selection = $getSelection();
                    if ($isRangeSelection(selection)) {
                        const node = getSelectedNode(selection);
                        const linkNode = $findMatchingParent(node, $isLinkNode);
                        if ($isLinkNode(linkNode) && (payload.metaKey || payload.ctrlKey)) {
                            window.open(linkNode.getURL(), '_blank');
                            return true;
                        }
                    }
                    return false;
                },
                COMMAND_PRIORITY_LOW,
            ),
        );
    }, [editor]);

    return createPortal(
        <FloatingLinkEditor
        editor={ activeEditor }
        isLink = { isLink }
        anchorElem = { anchorElem }
        setIsLink = { setIsLink }
        isLinkEditMode = { isLinkEditMode }
        setIsLinkEditMode = { setIsLinkEditMode }
        />,
        anchorElem,
    );
}

export function FloatingLinkEditorPlugin({
    anchorElem = document.body,
    isLinkEditMode,
    setIsLinkEditMode,
}: {
    anchorElem?: HTMLElement;
    isLinkEditMode: boolean;
    setIsLinkEditMode: Dispatch<boolean>;
}): JSX.Element | null {
    const [editor] = useLexicalComposerContext();
    return useFloatingLinkEditorToolbar(
        editor,
        anchorElem,
        isLinkEditMode,
        setIsLinkEditMode,
    );
}



function TextFormatFloatingToolbar({
    editor,
    anchorElem,
    isLink,
    isBold,
    isItalic,
    isUnderline,
    isCode,
    isStrikethrough,
    isSubscript,
    isSuperscript,
}: {
    editor: LexicalEditor;
    anchorElem: HTMLElement;
    isBold: boolean;
    isCode: boolean;
    isItalic: boolean;
    isLink: boolean;
    isStrikethrough: boolean;
    isSubscript: boolean;
    isSuperscript: boolean;
    isUnderline: boolean;
}): JSX.Element {
    const popupCharStylesEditorRef = useRef<HTMLDivElement | null>(null);

    const insertLink = useCallback(() => {
        if (!isLink) {
            editor.dispatchCommand(TOGGLE_LINK_COMMAND, 'https://');
        } else {
            editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
        }
    }, [editor, isLink]);

    const insertComment = () => {
        editor.dispatchCommand(INSERT_INLINE_COMMAND, undefined);
    };

    function mouseMoveListener(e: MouseEvent) {
        if (
            popupCharStylesEditorRef?.current &&
            (e.buttons === 1 || e.buttons === 3)
        ) {
            if (popupCharStylesEditorRef.current.style.pointerEvents !== 'none') {
                const x = e.clientX;
                const y = e.clientY;
                const elementUnderMouse = document.elementFromPoint(x, y);

                if (!popupCharStylesEditorRef.current.contains(elementUnderMouse)) {
                    // Mouse is not over the target element => not a normal click, but probably a drag
                    popupCharStylesEditorRef.current.style.pointerEvents = 'none';
                }
            }
        }
    }
    function mouseUpListener(e: MouseEvent) {
        if (popupCharStylesEditorRef?.current) {
            if (popupCharStylesEditorRef.current.style.pointerEvents !== 'auto') {
                popupCharStylesEditorRef.current.style.pointerEvents = 'auto';
            }
        }
    }

    useEffect(() => {
        if (popupCharStylesEditorRef?.current) {
            document.addEventListener('mousemove', mouseMoveListener);
            document.addEventListener('mouseup', mouseUpListener);

            return () => {
                document.removeEventListener('mousemove', mouseMoveListener);
                document.removeEventListener('mouseup', mouseUpListener);
            };
        }
    }, [popupCharStylesEditorRef]);

    const updateTextFormatFloatingToolbar = useCallback(() => {
        const selection = $getSelection();

        const popupCharStylesEditorElem = popupCharStylesEditorRef.current;
        const nativeSelection = window.getSelection();

        if (popupCharStylesEditorElem === null) {
            return;
        }

        const rootElement = editor.getRootElement();
        if (
            selection !== null &&
            nativeSelection !== null &&
            !nativeSelection.isCollapsed &&
            rootElement !== null &&
            rootElement.contains(nativeSelection.anchorNode)
        ) {
            const rangeRect = getDOMRangeRect(nativeSelection, rootElement);

            setFloatingElemPosition(
                rangeRect,
                popupCharStylesEditorElem,
                anchorElem,
                isLink,
            );
        }
    }, [editor, anchorElem, isLink]);

    useEffect(() => {
        const scrollerElem = anchorElem.parentElement;

        const update = () => {
            editor.getEditorState().read(() => {
                updateTextFormatFloatingToolbar();
            });
        };

        window.addEventListener('resize', update);
        if (scrollerElem) {
            scrollerElem.addEventListener('scroll', update);
        }

        return () => {
            window.removeEventListener('resize', update);
            if (scrollerElem) {
                scrollerElem.removeEventListener('scroll', update);
            }
        };
    }, [editor, updateTextFormatFloatingToolbar, anchorElem]);

    useEffect(() => {
        editor.getEditorState().read(() => {
            updateTextFormatFloatingToolbar();
        });
        return mergeRegister(
            editor.registerUpdateListener(({ editorState }) => {
                editorState.read(() => {
                    updateTextFormatFloatingToolbar();
                });
            }),

            editor.registerCommand(
                SELECTION_CHANGE_COMMAND,
                () => {
                    updateTextFormatFloatingToolbar();
                    return false;
                },
                COMMAND_PRIORITY_LOW,
            ),
        );
    }, [editor, updateTextFormatFloatingToolbar]);

    return (
        <div ref= { popupCharStylesEditorRef } className = "floating-text-format-popup" >
        {
            editor.isEditable() && (
                <>
                <button
            type="button"
            onClick = {() => {
        editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold');
    }
}
className = { 'popup-item spaced ' + (isBold ? 'active' : '') }
aria - label="Format text as bold" >
    <i className="format bold" />
        </button>
        < button
type = "button"
onClick = {() => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic');
}}
className = { 'popup-item spaced ' + (isItalic ? 'active' : '') }
aria - label="Format text as italics" >
    <i className="format italic" />
        </button>
        < button
type = "button"
onClick = {() => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline');
}}
className = { 'popup-item spaced ' + (isUnderline ? 'active' : '') }
aria - label="Format text to underlined" >
    <i className="format underline" />
        </button>
        < button
type = "button"
onClick = {() => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough');
}}
className = { 'popup-item spaced ' + (isStrikethrough ? 'active' : '') }
aria - label="Format text with a strikethrough" >
    <i className="format strikethrough" />
        </button>
        < button
type = "button"
onClick = {() => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'subscript');
}}
className = { 'popup-item spaced ' + (isSubscript ? 'active' : '') }
title = "Subscript"
aria - label="Format Subscript" >
    <i className="format subscript" />
        </button>
        < button
type = "button"
onClick = {() => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'superscript');
}}
className = { 'popup-item spaced ' + (isSuperscript ? 'active' : '') }
title = "Superscript"
aria - label="Format Superscript" >
    <i className="format superscript" />
        </button>
        < button
type = "button"
onClick = {() => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'code');
}}
className = { 'popup-item spaced ' + (isCode ? 'active' : '') }
aria - label="Insert code block" >
    <i className="format code" />
        </button>
        < button
type = "button"
onClick = { insertLink }
className = { 'popup-item spaced ' + (isLink ? 'active' : '') }
aria - label="Insert link" >
    <i className="format link" />
        </button>
        < />
      )}
<button
        type="button"
onClick = { insertComment }
className = { 'popup-item spaced insert-comment'}
aria - label="Insert comment" >
    <i className="format add-comment" />
        </button>
        < /div>
  );
}

function useFloatingTextFormatToolbar(
    editor: LexicalEditor,
    anchorElem: HTMLElement,
): JSX.Element | null {
    const [isText, setIsText] = useState(false);
    const [isLink, setIsLink] = useState(false);
    const [isBold, setIsBold] = useState(false);
    const [isItalic, setIsItalic] = useState(false);
    const [isUnderline, setIsUnderline] = useState(false);
    const [isStrikethrough, setIsStrikethrough] = useState(false);
    const [isSubscript, setIsSubscript] = useState(false);
    const [isSuperscript, setIsSuperscript] = useState(false);
    const [isCode, setIsCode] = useState(false);

    const updatePopup = useCallback(() => {
        editor.getEditorState().read(() => {
            // Should not to pop up the floating toolbar when using IME input
            if (editor.isComposing()) {
                return;
            }
            const selection = $getSelection();
            const nativeSelection = window.getSelection();
            const rootElement = editor.getRootElement();

            if (
                nativeSelection !== null &&
                (!$isRangeSelection(selection) ||
                    rootElement === null ||
                    !rootElement.contains(nativeSelection.anchorNode))
            ) {
                setIsText(false);
                return;
            }

            if (!$isRangeSelection(selection)) {
                return;
            }

            const node = getSelectedNode(selection);

            // Update text format
            setIsBold(selection.hasFormat('bold'));
            setIsItalic(selection.hasFormat('italic'));
            setIsUnderline(selection.hasFormat('underline'));
            setIsStrikethrough(selection.hasFormat('strikethrough'));
            setIsSubscript(selection.hasFormat('subscript'));
            setIsSuperscript(selection.hasFormat('superscript'));
            setIsCode(selection.hasFormat('code'));

            // Update links
            const parent = node.getParent();
            if ($isLinkNode(parent) || $isLinkNode(node)) {
                setIsLink(true);
            } else {
                setIsLink(false);
            }

            if (
                !$isCodeHighlightNode(selection.anchor.getNode()) &&
                selection.getTextContent() !== ''
            ) {
                setIsText($isTextNode(node) || $isParagraphNode(node));
            } else {
                setIsText(false);
            }

            const rawTextContent = selection.getTextContent().replace(/\n/g, '');
            if (!selection.isCollapsed() && rawTextContent === '') {
                setIsText(false);
                return;
            }
        });
    }, [editor]);

    useEffect(() => {
        document.addEventListener('selectionchange', updatePopup);
        return () => {
            document.removeEventListener('selectionchange', updatePopup);
        };
    }, [updatePopup]);

    useEffect(() => {
        return mergeRegister(
            editor.registerUpdateListener(() => {
                updatePopup();
            }),
            editor.registerRootListener(() => {
                if (editor.getRootElement() === null) {
                    setIsText(false);
                }
            }),
        );
    }, [editor, updatePopup]);

    if (!isText) {
        return null;
    }

    return createPortal(
        <TextFormatFloatingToolbar
      editor={ editor }
      anchorElem = { anchorElem }
      isLink = { isLink }
      isBold = { isBold }
      isItalic = { isItalic }
      isStrikethrough = { isStrikethrough }
      isSubscript = { isSubscript }
      isSuperscript = { isSuperscript }
      isUnderline = { isUnderline }
      isCode = { isCode }
        />,
        anchorElem,
    );
}

export function FloatingTextFormatToolbarPlugin({
    anchorElem = document.body,
}: {
    anchorElem?: HTMLElement;
}): JSX.Element | null {
    const [editor] = useLexicalComposerContext();
    return useFloatingTextFormatToolbar(editor, anchorElem);
}




export type InsertImagePayload = Readonly<ImagePayload>;

const getDOMSelection = (targetWindow: Window | null): Selection | null =>
    CAN_USE_DOM ? (targetWindow || window).getSelection() : null;

export const INSERT_IMAGE_COMMAND: LexicalCommand<InsertImagePayload> =
    createCommand('INSERT_IMAGE_COMMAND');

export function InsertImageUriDialogBody({
    onClick,
}: {
    onClick: (payload: InsertImagePayload) => void;
}) {
    const [src, setSrc] = useState('');
    const [altText, setAltText] = useState('');

    const isDisabled = src === '';

    return (
        <>
        <TextInput
        label= "Image URL"
    placeholder = "i.e. https://source.unsplash.com/random"
    onChange = { setSrc }
    value = { src }
    data - test - id="image-modal-url-input"
        />
        <TextInput
        label="Alt Text"
    placeholder = "Random unsplash image"
    onChange = { setAltText }
    value = { altText }
    data - test - id="image-modal-alt-text-input"
        />
        <DialogActions>
        <Button
          data - test - id="image-modal-confirm-btn"
    disabled = { isDisabled }
    onClick = {() => onClick({ altText, src })
}>
    Confirm
    < /Button>
    < /DialogActions>
    < />
  );
}

export function InsertImageUploadedDialogBody({
    onClick,
}: {
    onClick: (payload: InsertImagePayload) => void;
}) {
    const [src, setSrc] = useState('');
    const [altText, setAltText] = useState('');

    const isDisabled = src === '';

    const loadImage = (files: FileList | null) => {
        const reader = new FileReader();
        reader.onload = function () {
            if (typeof reader.result === 'string') {
                setSrc(reader.result);
            }
            return '';
        };
        if (files !== null) {
            reader.readAsDataURL(files[0]);
        }
    };

    return (
        <>
        <FileInput
        label= "Image Upload"
    onChange = { loadImage }
    accept = "image/*"
    data - test - id="image-modal-file-upload"
        />
        <TextInput
        label="Alt Text"
    placeholder = "Descriptive alternative text"
    onChange = { setAltText }
    value = { altText }
    data - test - id="image-modal-alt-text-input"
        />
        <DialogActions>
        <Button
          data - test - id="image-modal-file-upload-btn"
    disabled = { isDisabled }
    onClick = {() => onClick({ altText, src })
}>
    Confirm
    < /Button>
    < /DialogActions>
    < />
  );
}

export function InsertImageDialog({
    activeEditor,
    onClose,
}: {
    activeEditor: LexicalEditor;
    onClose: () => void;
}): JSX.Element {
    const [mode, setMode] = useState<null | 'url' | 'file'>(null);
    const hasModifier = useRef(false);

    useEffect(() => {
        hasModifier.current = false;
        const handler = (e: KeyboardEvent) => {
            hasModifier.current = e.altKey;
        };
        document.addEventListener('keydown', handler);
        return () => {
            document.removeEventListener('keydown', handler);
        };
    }, [activeEditor]);

    const onClick = (payload: InsertImagePayload) => {
        activeEditor.dispatchCommand(INSERT_IMAGE_COMMAND, payload);
        onClose();
    };

    return (
        <>
        {!mode && (
            <DialogButtonsList>
            <Button
            data - test - id="image-modal-option-sample"
    onClick = {() =>
    onClick(
        hasModifier.current
            ? {
                altText:
                    'Daylight fir trees forest glacier green high ice landscape',
                src: landscapeImage,
            }
            : {
                altText: 'Yellow flower in tilt shift lens',
                src: yellowFlowerImage,
            },
    )
}>
    Sample
    < /Button>
    < Button
data - test - id="image-modal-option-url"
onClick = {() => setMode('url')}>
    URL
    < /Button>
    < Button
data - test - id="image-modal-option-file"
onClick = {() => setMode('file')}>
    File
    < /Button>
    < /DialogButtonsList>
      )}
{
    mode === 'url' && <InsertImageUriDialogBody onClick={ onClick } />}
    {
        mode === 'file' && <InsertImageUploadedDialogBody onClick={ onClick } />}
            < />
  );
    }

    export function ImagesPlugin({
        captionsEnabled,
    }: {
        captionsEnabled?: boolean;
    }): JSX.Element | null {
        const [editor] = useLexicalComposerContext();

        useEffect(() => {
            if (!editor.hasNodes([ImageNode])) {
                throw new Error('ImagesPlugin: ImageNode not registered on editor');
            }

            return mergeRegister(
                editor.registerCommand<InsertImagePayload>(
                    INSERT_IMAGE_COMMAND,
                    (payload) => {
                        const imageNode = $createImageNode(payload);
                        $insertNodes([imageNode]);
                        if ($isRootOrShadowRoot(imageNode.getParentOrThrow())) {
                            $wrapNodeInElement(imageNode, $createParagraphNode).selectEnd();
                        }

                        return true;
                    },
                    COMMAND_PRIORITY_EDITOR,
                ),
                editor.registerCommand<DragEvent>(
                    DRAGSTART_COMMAND,
                    (event) => {
                        return onDragStart(event);
                    },
                    COMMAND_PRIORITY_HIGH,
                ),
                editor.registerCommand<DragEvent>(
                    DRAGOVER_COMMAND,
                    (event) => {
                        return onDragover(event);
                    },
                    COMMAND_PRIORITY_LOW,
                ),
                editor.registerCommand<DragEvent>(
                    DROP_COMMAND,
                    (event) => {
                        return onDrop(event, editor);
                    },
                    COMMAND_PRIORITY_HIGH,
                ),
            );
        }, [captionsEnabled, editor]);

        return null;
    }

    const TRANSPARENT_IMAGE =
        'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    const img = document.createElement('img');
    img.src = TRANSPARENT_IMAGE;

    function onDragStart(event: DragEvent): boolean {
        const node = getImageNodeInSelection();
        if (!node) {
            return false;
        }
        const dataTransfer = event.dataTransfer;
        if (!dataTransfer) {
            return false;
        }
        dataTransfer.setData('text/plain', '_');
        dataTransfer.setDragImage(img, 0, 0);
        dataTransfer.setData(
            'application/x-lexical-drag',
            JSON.stringify({
                data: {
                    altText: node.__altText,
                    caption: node.__caption,
                    height: node.__height,
                    key: node.getKey(),
                    maxWidth: node.__maxWidth,
                    showCaption: node.__showCaption,
                    src: node.__src,
                    width: node.__width,
                },
                type: 'image',
            }),
        );

        return true;
    }

    function onDragover(event: DragEvent): boolean {
        const node = getImageNodeInSelection();
        if (!node) {
            return false;
        }
        if (!canDropImage(event)) {
            event.preventDefault();
        }
        return true;
    }

    function onDrop(event: DragEvent, editor: LexicalEditor): boolean {
        const node = getImageNodeInSelection();
        if (!node) {
            return false;
        }
        const data = getDragImageData(event);
        if (!data) {
            return false;
        }
        event.preventDefault();
        if (canDropImage(event)) {
            const range = getDragSelection(event);
            node.remove();
            const rangeSelection = $createRangeSelection();
            if (range !== null && range !== undefined) {
                rangeSelection.applyDOMRange(range);
            }
            $setSelection(rangeSelection);
            editor.dispatchCommand(INSERT_IMAGE_COMMAND, data);
        }
        return true;
    }

    function getImageNodeInSelection(): ImageNode | null {
        const selection = $getSelection();
        if (!$isNodeSelection(selection)) {
            return null;
        }
        const nodes = selection.getNodes();
        const node = nodes[0];
        return $isImageNode(node) ? node : null;
    }

    function getDragImageData(event: DragEvent): null | InsertImagePayload {
        const dragData = event.dataTransfer?.getData('application/x-lexical-drag');
        if (!dragData) {
            return null;
        }
        const { type, data } = JSON.parse(dragData);
        if (type !== 'image') {
            return null;
        }

        return data;
    }

    declare global {
        interface DragEvent {
            rangeOffset?: number;
            rangeParent?: Node;
        }
    }

    function canDropImage(event: DragEvent): boolean {
        const target = event.target;
        return !!(
            target &&
            target instanceof HTMLElement &&
            !target.closest('code, span.editor-image') &&
            target.parentElement &&
            target.parentElement.closest('div.ContentEditable__root')
        );
    }

    function getDragSelection(event: DragEvent): Range | null | undefined {
        let range;
        const target = event.target as null | Element | Document;
        const targetWindow =
            target == null
                ? null
                : target.nodeType === 9
                    ? (target as Document).defaultView
                    : (target as Element).ownerDocument.defaultView;
        const domSelection = getDOMSelection(targetWindow);
        if (document.caretRangeFromPoint) {
            range = document.caretRangeFromPoint(event.clientX, event.clientY);
        } else if (event.rangeParent && domSelection !== null) {
            domSelection.collapse(event.rangeParent, event.rangeOffset || 0);
            range = domSelection.getRangeAt(0);
        } else {
            throw Error(`Cannot get the selection when dragging`);
        }

        return range;
    }



    export type InsertInlineImagePayload = Readonly<InlineImagePayload>;

    const getDOMSelection = (targetWindow: Window | null): Selection | null =>
        CAN_USE_DOM ? (targetWindow || window).getSelection() : null;

    export const INSERT_INLINE_IMAGE_COMMAND: LexicalCommand<InlineImagePayload> =
        createCommand('INSERT_INLINE_IMAGE_COMMAND');

    export function InsertInlineImageDialog({
        activeEditor,
        onClose,
    }: {
        activeEditor: LexicalEditor;
        onClose: () => void;
    }): JSX.Element {
        const hasModifier = useRef(false);

        const [src, setSrc] = useState('');
        const [altText, setAltText] = useState('');
        const [showCaption, setShowCaption] = useState(false);
        const [position, setPosition] = useState<Position>('left');

        const isDisabled = src === '';

        const handleShowCaptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            setShowCaption(e.target.checked);
        };

        const handlePositionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
            setPosition(e.target.value as Position);
        };

        const loadImage = (files: FileList | null) => {
            const reader = new FileReader();
            reader.onload = function () {
                if (typeof reader.result === 'string') {
                    setSrc(reader.result);
                }
                return '';
            };
            if (files !== null) {
                reader.readAsDataURL(files[0]);
            }
        };

        useEffect(() => {
            hasModifier.current = false;
            const handler = (e: KeyboardEvent) => {
                hasModifier.current = e.altKey;
            };
            document.addEventListener('keydown', handler);
            return () => {
                document.removeEventListener('keydown', handler);
            };
        }, [activeEditor]);

        const handleOnClick = () => {
            const payload = { altText, position, showCaption, src };
            activeEditor.dispatchCommand(INSERT_INLINE_IMAGE_COMMAND, payload);
            onClose();
        };

        return (
            <>
            <div style= {{ marginBottom: '1em' }
    }>
        <FileInput
          label="Image Upload"
    onChange = { loadImage }
    accept = "image/*"
    data - test - id="image-modal-file-upload"
        />
        </div>
        < div style = {{ marginBottom: '1em' }
}>
    <TextInput
          label="Alt Text"
placeholder = "Descriptive alternative text"
onChange = { setAltText }
value = { altText }
data - test - id="image-modal-alt-text-input"
    />
    </div>

    < Select
style = {{ marginBottom: '1em', width: '290px' }}
label = "Position"
name = "position"
id = "position-select"
onChange = { handlePositionChange } >
    <option value="left" > Left < /option>
        < option value = "right" > Right < /option>
            < option value = "full" > Full Width < /option>
                < /Select>

                < div className = "Input__wrapper" >
                    <input
          id="caption"
className = "InlineImageNode_Checkbox"
type = "checkbox"
checked = { showCaption }
onChange = { handleShowCaptionChange }
    />
    <label htmlFor="caption" > Show Caption < /label>
        < /div>

        < DialogActions >
        <Button
          data - test - id="image-modal-file-upload-btn"
disabled = { isDisabled }
onClick = {() => handleOnClick()}>
    Confirm
    < /Button>
    < /DialogActions>
    < />
  );
}

export function InlineImagePlugin(): JSX.Element | null {
    const [editor] = useLexicalComposerContext();

    useEffect(() => {
        if (!editor.hasNodes([InlineImageNode])) {
            throw new Error('ImagesPlugin: ImageNode not registered on editor');
        }

        return mergeRegister(
            editor.registerCommand<InsertInlineImagePayload>(
                INSERT_INLINE_IMAGE_COMMAND,
                (payload) => {
                    const imageNode = $createInlineImageNode(payload);
                    $insertNodes([imageNode]);
                    if ($isRootOrShadowRoot(imageNode.getParentOrThrow())) {
                        $wrapNodeInElement(imageNode, $createParagraphNode).selectEnd();
                    }

                    return true;
                },
                COMMAND_PRIORITY_EDITOR,
            ),
            editor.registerCommand<DragEvent>(
                DRAGSTART_COMMAND,
                (event) => {
                    return onDragStart(event);
                },
                COMMAND_PRIORITY_HIGH,
            ),
            editor.registerCommand<DragEvent>(
                DRAGOVER_COMMAND,
                (event) => {
                    return onDragover(event);
                },
                COMMAND_PRIORITY_LOW,
            ),
            editor.registerCommand<DragEvent>(
                DROP_COMMAND,
                (event) => {
                    return onDrop(event, editor);
                },
                COMMAND_PRIORITY_HIGH,
            ),
        );
    }, [editor]);

    return null;
}

const TRANSPARENT_IMAGE =
    'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
const img = document.createElement('img');
img.src = TRANSPARENT_IMAGE;

function onDragStart(event: DragEvent): boolean {
    const node = getImageNodeInSelection();
    if (!node) {
        return false;
    }
    const dataTransfer = event.dataTransfer;
    if (!dataTransfer) {
        return false;
    }
    dataTransfer.setData('text/plain', '_');
    dataTransfer.setDragImage(img, 0, 0);
    dataTransfer.setData(
        'application/x-lexical-drag',
        JSON.stringify({
            data: {
                altText: node.__altText,
                caption: node.__caption,
                height: node.__height,
                key: node.getKey(),
                showCaption: node.__showCaption,
                src: node.__src,
                width: node.__width,
            },
            type: 'image',
        }),
    );

    return true;
}

function onDragover(event: DragEvent): boolean {
    const node = getImageNodeInSelection();
    if (!node) {
        return false;
    }
    if (!canDropImage(event)) {
        event.preventDefault();
    }
    return true;
}

function onDrop(event: DragEvent, editor: LexicalEditor): boolean {
    const node = getImageNodeInSelection();
    if (!node) {
        return false;
    }
    const data = getDragImageData(event);
    if (!data) {
        return false;
    }
    event.preventDefault();
    if (canDropImage(event)) {
        const range = getDragSelection(event);
        node.remove();
        const rangeSelection = $createRangeSelection();
        if (range !== null && range !== undefined) {
            rangeSelection.applyDOMRange(range);
        }
        $setSelection(rangeSelection);
        editor.dispatchCommand(INSERT_INLINE_IMAGE_COMMAND, data);
    }
    return true;
}

function getImageNodeInSelection(): InlineImageNode | null {
    const selection = $getSelection();
    if (!$isNodeSelection(selection)) {
        return null;
    }
    const nodes = selection.getNodes();
    const node = nodes[0];
    return $isInlineImageNode(node) ? node : null;
}

function getDragImageData(event: DragEvent): null | InsertInlineImagePayload {
    const dragData = event.dataTransfer?.getData('application/x-lexical-drag');
    if (!dragData) {
        return null;
    }
    const { type, data } = JSON.parse(dragData);
    if (type !== 'image') {
        return null;
    }

    return data;
}

declare global {
    interface DragEvent {
        rangeOffset?: number;
        rangeParent?: Node;
    }
}

function canDropImage(event: DragEvent): boolean {
    const target = event.target;
    return !!(
        target &&
        target instanceof HTMLElement &&
        !target.closest('code, span.editor-image') &&
        target.parentElement &&
        target.parentElement.closest('div.ContentEditable__root')
    );
}

function getDragSelection(event: DragEvent): Range | null | undefined {
    let range;
    const target = event.target as null | Element | Document;
    const targetWindow =
        target == null
            ? null
            : target.nodeType === 9
                ? (target as Document).defaultView
                : (target as Element).ownerDocument.defaultView;
    const domSelection = getDOMSelection(targetWindow);
    if (document.caretRangeFromPoint) {
        range = document.caretRangeFromPoint(event.clientX, event.clientY);
    } else if (event.rangeParent && domSelection !== null) {
        domSelection.collapse(event.rangeParent, event.rangeOffset || 0);
        range = domSelection.getRangeAt(0);
    } else {
        throw Error('Cannot get the selection when dragging');
    }

    return range;
}




const KEYWORDS_REGEX =
    /(^|$|[^A-Za-zªµºÀ-ÖØ-öø-ˁˆ-ˑˠ-ˤˬˮͰ-ʹͶͷͺ-ͽΆΈ-ΊΌΎ-ΡΣ-ϵϷ-ҁҊ-ԧԱ-Ֆՙա-ևא-תװ-ײؠ-يٮٯٱ-ۓەۥۦۮۯۺ-ۼۿܐܒ-ܯݍ-ޥޱߊ-ߪߴߵߺࠀ-ࠕࠚࠤࠨࡀ-ࡘࢠࢢ-ࢬऄ-हऽॐक़-ॡॱ-ॷॹ-ॿঅ-ঌএঐও-নপ-রলশ-হঽৎড়ঢ়য়-ৡৰৱਅ-ਊਏਐਓ-ਨਪ-ਰਲਲ਼ਵਸ਼ਸਹਖ਼-ੜਫ਼ੲ-ੴઅ-ઍએ-ઑઓ-નપ-રલળવ-હઽૐૠૡଅ-ଌଏଐଓ-ନପ-ରଲଳଵ-ହଽଡ଼ଢ଼ୟ-ୡୱஃஅ-ஊஎ-ஐஒ-கஙசஜஞடணதந-பம-ஹௐఅ-ఌఎ-ఐఒ-నప-ళవ-హఽౘౙౠౡಅ-ಌಎ-ಐಒ-ನಪ-ಳವ-ಹಽೞೠೡೱೲഅ-ഌഎ-ഐഒ-ഺഽൎൠൡൺ-ൿඅ-ඖක-නඳ-රලව-ෆก-ะาำเ-ๆກຂຄງຈຊຍດ-ທນ-ຟມ-ຣລວສຫອ-ະາຳຽເ-ໄໆໜ-ໟༀཀ-ཇཉ-ཬྈ-ྌက-ဪဿၐ-ၕၚ-ၝၡၥၦၮ-ၰၵ-ႁႎႠ-ჅჇჍა-ჺჼ-ቈቊ-ቍቐ-ቖቘቚ-ቝበ-ኈኊ-ኍነ-ኰኲ-ኵኸ-ኾዀዂ-ዅወ-ዖዘ-ጐጒ-ጕጘ-ፚᎀ-ᎏᎠ-Ᏼᐁ-ᙬᙯ-ᙿᚁ-ᚚᚠ-ᛪᜀ-ᜌᜎ-ᜑᜠ-ᜱᝀ-ᝑᝠ-ᝬᝮ-ᝰក-ឳៗៜᠠ-ᡷᢀ-ᢨᢪᢰ-ᣵᤀ-ᤜᥐ-ᥭᥰ-ᥴᦀ-ᦫᧁ-ᧇᨀ-ᨖᨠ-ᩔᪧᬅ-ᬳᭅ-ᭋᮃ-ᮠᮮᮯᮺ-ᯥᰀ-ᰣᱍ-ᱏᱚ-ᱽᳩ-ᳬᳮ-ᳱᳵᳶᴀ-ᶿḀ-ἕἘ-Ἕἠ-ὅὈ-Ὅὐ-ὗὙὛὝὟ-ώᾀ-ᾴᾶ-ᾼιῂ-ῄῆ-ῌῐ-ΐῖ-Ίῠ-Ῥῲ-ῴῶ-ῼⁱⁿₐ-ₜℂℇℊ-ℓℕℙ-ℝℤΩℨK-ℭℯ-ℹℼ-ℿⅅ-ⅉⅎↃↄⰀ-Ⱞⰰ-ⱞⱠ-ⳤⳫ-ⳮⳲⳳⴀ-ⴥⴧⴭⴰ-ⵧⵯⶀ-ⶖⶠ-ⶦⶨ-ⶮⶰ-ⶶⶸ-ⶾⷀ-ⷆⷈ-ⷎⷐ-ⷖⷘ-ⷞⸯ々〆〱-〵〻〼ぁ-ゖゝ-ゟァ-ヺー-ヿㄅ-ㄭㄱ-ㆎㆠ-ㆺㇰ-ㇿ㐀-䶵一-鿌ꀀ-ꒌꓐ-ꓽꔀ-ꘌꘐ-ꘟꘪꘫꙀ-ꙮꙿ-ꚗꚠ-ꛥꜗ-ꜟꜢ-ꞈꞋ-ꞎꞐ-ꞓꞠ-Ɦꟸ-ꠁꠃ-ꠅꠇ-ꠊꠌ-ꠢꡀ-ꡳꢂ-ꢳꣲ-ꣷꣻꤊ-ꤥꤰ-ꥆꥠ-ꥼꦄ-ꦲꧏꨀ-ꨨꩀ-ꩂꩄ-ꩋꩠ-ꩶꩺꪀ-ꪯꪱꪵꪶꪹ-ꪽꫀꫂꫛ-ꫝꫠ-ꫪꫲ-ꫴꬁ-ꬆꬉ-ꬎꬑ-ꬖꬠ-ꬦꬨ-ꬮꯀ-ꯢ가-힣ힰ-ퟆퟋ-ퟻ豈-舘並-龎ﬀ-ﬆﬓ-ﬗיִײַ-ﬨשׁ-זּטּ-לּמּנּסּףּפּצּ-ﮱﯓ-ﴽﵐ-ﶏﶒ-ﷇﷰ-ﷻﹰ-ﹴﹶ-ﻼＡ-Ｚａ-ｚｦ-ﾾￂ-ￇￊ-ￏￒ-ￗￚ-ￜ])(congrats|congratulations|gratuluju|gratuluji|gratulujeme|blahopřeju|blahopřeji|blahopřejeme|Til lykke|Tillykke|Glückwunsch|Gratuliere|felicitaciones|enhorabuena|paljon onnea|onnittelut|Félicitations|gratula|gratulálok|gratulálunk|congratulazioni|complimenti|おめでとう|おめでとうございます|축하해|축하해요|gratulerer|Gefeliciteerd|gratulacje|Parabéns|parabéns|felicitações|felicitări|мои поздравления|поздравляем|поздравляю|gratulujem|blahoželám|ยินดีด้วย|ขอแสดงความยินดี|tebrikler|tebrik ederim|恭喜|祝贺你|恭喜你|恭喜|恭喜|baie geluk|veels geluk|অভিনন্দন|Čestitam|Čestitke|Čestitamo|Συγχαρητήρια|Μπράβο|અભિનંદન|badhai|बधाई|अभिनंदन|Честитам|Свака част|hongera|வாழ்த்துகள்|வாழ்த்துக்கள்|అభినందనలు|അഭിനന്ദനങ്ങൾ|Chúc mừng|מזל טוב|mazel tov|mazal tov)(^|$|[^A-Za-zªµºÀ-ÖØ-öø-ˁˆ-ˑˠ-ˤˬˮͰ-ʹͶͷͺ-ͽΆΈ-ΊΌΎ-ΡΣ-ϵϷ-ҁҊ-ԧԱ-Ֆՙա-ևא-תװ-ײؠ-يٮٯٱ-ۓەۥۦۮۯۺ-ۼۿܐܒ-ܯݍ-ޥޱߊ-ߪߴߵߺࠀ-ࠕࠚࠤࠨࡀ-ࡘࢠࢢ-ࢬऄ-हऽॐक़-ॡॱ-ॷॹ-ॿঅ-ঌএঐও-নপ-রলশ-হঽৎড়ঢ়য়-ৡৰৱਅ-ਊਏਐਓ-ਨਪ-ਰਲਲ਼ਵਸ਼ਸਹਖ਼-ੜਫ਼ੲ-ੴઅ-ઍએ-ઑઓ-નપ-રલળવ-હઽૐૠૡଅ-ଌଏଐଓ-ନପ-ରଲଳଵ-ହଽଡ଼ଢ଼ୟ-ୡୱஃஅ-ஊஎ-ஐஒ-கஙசஜஞடணதந-பம-ஹௐఅ-ఌఎ-ఐఒ-నప-ళవ-హఽౘౙౠౡಅ-ಌಎ-ಐಒ-ನಪ-ಳವ-ಹಽೞೠೡೱೲഅ-ഌഎ-ഐഒ-ഺഽൎൠൡൺ-ൿඅ-ඖක-නඳ-රලව-ෆก-ะาำเ-ๆກຂຄງຈຊຍດ-ທນ-ຟມ-ຣລວສຫອ-ະາຳຽເ-ໄໆໜ-ໟༀཀ-ཇཉ-ཬྈ-ྌက-ဪဿၐ-ၕၚ-ၝၡၥၦၮ-ၰၵ-ႁႎႠ-ჅჇჍა-ჺჼ-ቈቊ-ቍቐ-ቖቘቚ-ቝበ-ኈኊ-ኍነ-ኰኲ-ኵኸ-ኾዀዂ-ዅወ-ዖዘ-ጐጒ-ጕጘ-ፚᎀ-ᎏᎠ-Ᏼᐁ-ᙬᙯ-ᙿᚁ-ᚚᚠ-ᛪᜀ-ᜌᜎ-ᜑᜠ-ᜱᝀ-ᝑᝠ-ᝬᝮ-ᝰក-ឳៗៜᠠ-ᡷᢀ-ᢨᢪᢰ-ᣵᤀ-ᤜᥐ-ᥭᥰ-ᥴᦀ-ᦫᧁ-ᧇᨀ-ᨖᨠ-ᩔᪧᬅ-ᬳᭅ-ᭋᮃ-ᮠᮮᮯᮺ-ᯥᰀ-ᰣᱍ-ᱏᱚ-ᱽᳩ-ᳬᳮ-ᳱᳵᳶᴀ-ᶿḀ-ἕἘ-Ἕἠ-ὅὈ-Ὅὐ-ὗὙὛὝὟ-ώᾀ-ᾴᾶ-ᾼιῂ-ῄῆ-ῌῐ-ΐῖ-Ίῠ-Ῥῲ-ῴῶ-ῼⁱⁿₐ-ₜℂℇℊ-ℓℕℙ-ℝℤΩℨK-ℭℯ-ℹℼ-ℿⅅ-ⅉⅎↃↄⰀ-Ⱞⰰ-ⱞⱠ-ⳤⳫ-ⳮⳲⳳⴀ-ⴥⴧⴭⴰ-ⵧⵯⶀ-ⶖⶠ-ⶦⶨ-ⶮⶰ-ⶶⶸ-ⶾⷀ-ⷆⷈ-ⷎⷐ-ⷖⷘ-ⷞⸯ々〆〱-〵〻〼ぁ-ゖゝ-ゟァ-ヺー-ヿㄅ-ㄭㄱ-ㆎㆠ-ㆺㇰ-ㇿ㐀-䶵一-鿌ꀀ-ꒌꓐ-ꓽꔀ-ꘌꘐ-ꘟꘪꘫꙀ-ꙮꙿ-ꚗꚠ-ꛥꜗ-ꜟꜢ-ꞈꞋ-ꞎꞐ-ꞓꞠ-Ɦꟸ-ꠁꠃ-ꠅꠇ-ꠊꠌ-ꠢꡀ-ꡳꢂ-ꢳꣲ-ꣷꣻꤊ-ꤥꤰ-ꥆꥠ-ꥼꦄ-ꦲꧏꨀ-ꨨꩀ-ꩂꩄ-ꩋꩠ-ꩶꩺꪀ-ꪯꪱꪵꪶꪹ-ꪽꫀꫂꫛ-ꫝꫠ-ꫪꫲ-ꫴꬁ-ꬆꬉ-ꬎꬑ-ꬖꬠ-ꬦꬨ-ꬮꯀ-ꯢ가-힣ힰ-ퟆퟋ-ퟻ豈-舘並-龎ﬀ-ﬆﬓ-ﬗיִײַ-ﬨשׁ-זּטּ-לּמּנּסּףּפּצּ-ﮱﯓ-ﴽﵐ-ﶏﶒ-ﷇﷰ-ﷻﹰ-ﹴﹶ-ﻼＡ-Ｚａ-ｚｦ-ﾾￂ-ￇￊ-ￏￒ-ￗￚ-ￜ])/i;

export function KeywordsPlugin(): JSX.Element | null {
    const [editor] = useLexicalComposerContext();

    useEffect(() => {
        if (!editor.hasNodes([KeywordNode])) {
            throw new Error('KeywordsPlugin: KeywordNode not registered on editor');
        }
    }, [editor]);

    const createKeywordNode = useCallback((textNode: TextNode): KeywordNode => {
        return $createKeywordNode(textNode.getTextContent());
    }, []);

    const getKeywordMatch = useCallback((text: string) => {
        const matchArr = KEYWORDS_REGEX.exec(text);

        if (matchArr === null) {
            return null;
        }

        const hashtagLength = matchArr[2].length;
        const startOffset = matchArr.index + matchArr[1].length;
        const endOffset = startOffset + hashtagLength;
        return {
            end: endOffset,
            start: startOffset,
        };
    }, []);

    useLexicalTextEntity<KeywordNode>(
        getKeywordMatch,
        KeywordNode,
        createKeywordNode,
    );

    return null;
}



const LAYOUTS = [
    { label: '2 columns (equal width)', value: '1fr 1fr' },
    { label: '2 columns (25% - 75%)', value: '1fr 3fr' },
    { label: '3 columns (equal width)', value: '1fr 1fr 1fr' },
    { label: '3 columns (25% - 50% - 25%)', value: '1fr 2fr 1fr' },
    { label: '4 columns (equal width)', value: '1fr 1fr 1fr 1fr' },
];

export function InsertLayoutDialog({
    activeEditor,
    onClose,
}: {
    activeEditor: LexicalEditor;
    onClose: () => void;
}): JSX.Element {
    const [layout, setLayout] = useState(LAYOUTS[0].value);
    const buttonLabel = LAYOUTS.find((item) => item.value === layout)?.label;

    const onClick = () => {
        activeEditor.dispatchCommand(INSERT_LAYOUT_COMMAND, layout);
        onClose();
    };

    return (
        <>
        <DropDown
        buttonClassName= "toolbar-item dialog-dropdown"
    buttonLabel = { buttonLabel } >
    {
        LAYOUTS.map(({ label, value }) => (
            <DropDownItem
            key= { value }
            className = "item"
            onClick = {() => setLayout(value)} >
        <span className="text" > { label } < /span>
            < /DropDownItem>
        ))
}
</DropDown>
    < Button onClick = { onClick } > Insert < /Button>
        < />
  );
}



export const INSERT_LAYOUT_COMMAND: LexicalCommand<string> =
    createCommand<string>();

export const UPDATE_LAYOUT_COMMAND: LexicalCommand<{
    template: string;
    nodeKey: NodeKey;
}> = createCommand<{ template: string; nodeKey: NodeKey }>();

export function LayoutPlugin(): null {
    const [editor] = useLexicalComposerContext();
    useEffect(() => {
        if (!editor.hasNodes([LayoutContainerNode, LayoutItemNode])) {
            throw new Error(
                'LayoutPlugin: LayoutContainerNode, or LayoutItemNode not registered on editor',
            );
        }

        const onEscape = (before: boolean) => {
            const selection = $getSelection();
            if (
                $isRangeSelection(selection) &&
                selection.isCollapsed() &&
                selection.anchor.offset === 0
            ) {
                const container = $findMatchingParent(
                    selection.anchor.getNode(),
                    $isLayoutContainerNode,
                );

                if ($isLayoutContainerNode(container)) {
                    const parent = container.getParent<ElementNode>();
                    const child =
                        parent &&
                        (before
                            ? parent.getFirstChild<LexicalNode>()
                            : parent?.getLastChild<LexicalNode>());
                    const descendant = before
                        ? container.getFirstDescendant<LexicalNode>()?.getKey()
                        : container.getLastDescendant<LexicalNode>()?.getKey();

                    if (
                        parent !== null &&
                        child === container &&
                        selection.anchor.key === descendant
                    ) {
                        if (before) {
                            container.insertBefore($createParagraphNode());
                        } else {
                            container.insertAfter($createParagraphNode());
                        }
                    }
                }
            }

            return false;
        };

        return mergeRegister(
            // When layout is the last child pressing down/right arrow will insert paragraph
            // below it to allow adding more content. It's similar what $insertBlockNode
            // (mainly for decorators), except it'll always be possible to continue adding
            // new content even if trailing paragraph is accidentally deleted
            editor.registerCommand(
                KEY_ARROW_DOWN_COMMAND,
                () => onEscape(false),
                COMMAND_PRIORITY_LOW,
            ),
            editor.registerCommand(
                KEY_ARROW_RIGHT_COMMAND,
                () => onEscape(false),
                COMMAND_PRIORITY_LOW,
            ),
            // When layout is the first child pressing up/left arrow will insert paragraph
            // above it to allow adding more content. It's similar what $insertBlockNode
            // (mainly for decorators), except it'll always be possible to continue adding
            // new content even if leading paragraph is accidentally deleted
            editor.registerCommand(
                KEY_ARROW_UP_COMMAND,
                () => onEscape(true),
                COMMAND_PRIORITY_LOW,
            ),
            editor.registerCommand(
                KEY_ARROW_LEFT_COMMAND,
                () => onEscape(true),
                COMMAND_PRIORITY_LOW,
            ),
            editor.registerCommand(
                INSERT_LAYOUT_COMMAND,
                (template) => {
                    editor.update(() => {
                        const container = $createLayoutContainerNode(template);
                        const itemsCount = getItemsCountFromTemplate(template);

                        for (let i = 0; i < itemsCount; i++) {
                            container.append(
                                $createLayoutItemNode().append($createParagraphNode()),
                            );
                        }

                        $insertNodeToNearestRoot(container);
                        container.selectStart();
                    });

                    return true;
                },
                COMMAND_PRIORITY_EDITOR,
            ),
            editor.registerCommand(
                UPDATE_LAYOUT_COMMAND,
                ({ template, nodeKey }) => {
                    editor.update(() => {
                        const container = $getNodeByKey<LexicalNode>(nodeKey);

                        if (!$isLayoutContainerNode(container)) {
                            return;
                        }

                        const itemsCount = getItemsCountFromTemplate(template);
                        const prevItemsCount = getItemsCountFromTemplate(
                            container.getTemplateColumns(),
                        );

                        // Add or remove extra columns if new template does not match existing one
                        if (itemsCount > prevItemsCount) {
                            for (let i = prevItemsCount; i < itemsCount; i++) {
                                container.append(
                                    $createLayoutItemNode().append($createParagraphNode()),
                                );
                            }
                        } else if (itemsCount < prevItemsCount) {
                            for (let i = prevItemsCount - 1; i >= itemsCount; i--) {
                                const layoutItem = container.getChildAtIndex<LexicalNode>(i);

                                if ($isLayoutItemNode(layoutItem)) {
                                    layoutItem.remove();
                                }
                            }
                        }

                        container.setTemplateColumns(template);
                    });

                    return true;
                },
                COMMAND_PRIORITY_EDITOR,
            ),
            // Structure enforcing transformers for each node type. In case nesting structure is not
            // "Container > Item" it'll unwrap nodes and convert it back
            // to regular content.
            editor.registerNodeTransform(LayoutItemNode, (node) => {
                const parent = node.getParent<ElementNode>();
                if (!$isLayoutContainerNode(parent)) {
                    const children = node.getChildren<LexicalNode>();
                    for (const child of children) {
                        node.insertBefore(child);
                    }
                    node.remove();
                }
            }),
            editor.registerNodeTransform(LayoutContainerNode, (node) => {
                const children = node.getChildren<LexicalNode>();
                if (!children.every($isLayoutItemNode)) {
                    for (const child of children) {
                        node.insertBefore(child);
                    }
                    node.remove();
                }
            }),
        );
    }, [editor]);

    return null;
}

function getItemsCountFromTemplate(template: string): number {
    return template.trim().split(/\s+/).length;
}




export function LinkPlugin(): JSX.Element {
    return <LexicalLinkPlugin validateUrl={ validateUrl } />;
}

type Props = Readonly<{
    maxDepth: number | null | undefined;
}>;

function getElementNodesInSelection(
    selection: RangeSelection,
): Set<ElementNode> {
    const nodesInSelection = selection.getNodes();

    if (nodesInSelection.length === 0) {
        return new Set([
            selection.anchor.getNode().getParentOrThrow(),
            selection.focus.getNode().getParentOrThrow(),
        ]);
    }

    return new Set(
        nodesInSelection.map((n) => ($isElementNode(n) ? n : n.getParentOrThrow())),
    );
}

function isIndentPermitted(maxDepth: number): boolean {
    const selection = $getSelection();

    if (!$isRangeSelection(selection)) {
        return false;
    }

    const elementNodesInSelection: Set<ElementNode> =
        getElementNodesInSelection(selection);

    let totalDepth = 0;

    for (const elementNode of elementNodesInSelection) {
        if ($isListNode(elementNode)) {
            totalDepth = Math.max($getListDepth(elementNode) + 1, totalDepth);
        } else if ($isListItemNode(elementNode)) {
            const parent = elementNode.getParent();

            if (!$isListNode(parent)) {
                throw new Error(
                    'ListMaxIndentLevelPlugin: A ListItemNode must have a ListNode for a parent.',
                );
            }

            totalDepth = Math.max($getListDepth(parent) + 1, totalDepth);
        }
    }

    return totalDepth <= maxDepth;
}

export function ListMaxIndentLevelPlugin({ maxDepth }: Props): null {
    const [editor] = useLexicalComposerContext();

    useEffect(() => {
        return editor.registerCommand(
            INDENT_CONTENT_COMMAND,
            () => !isIndentPermitted(maxDepth ?? 7),
            COMMAND_PRIORITY_CRITICAL,
        );
    }, [editor, maxDepth]);
    return null;
}





export function MarkdownPlugin(): JSX.Element {
    return <MarkdownShortcutPlugin transformers={ PLAYGROUND_TRANSFORMERS } />;
}


export function MaxLengthPlugin({ maxLength }: { maxLength: number }): null {
    const [editor] = useLexicalComposerContext();

    useEffect(() => {
        let lastRestoredEditorState: EditorState | null = null;

        return editor.registerNodeTransform(RootNode, (rootNode: RootNode) => {
            const selection = $getSelection();
            if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
                return;
            }
            const prevEditorState = editor.getEditorState();
            const prevTextContentSize = prevEditorState.read(() =>
                rootNode.getTextContentSize(),
            );
            const textContentSize = rootNode.getTextContentSize();
            if (prevTextContentSize !== textContentSize) {
                const delCount = textContentSize - maxLength;
                const anchor = selection.anchor;

                if (delCount > 0) {
                    // Restore the old editor state instead if the last
                    // text content was already at the limit.
                    if (
                        prevTextContentSize === maxLength &&
                        lastRestoredEditorState !== prevEditorState
                    ) {
                        lastRestoredEditorState = prevEditorState;
                        $restoreEditorState(editor, prevEditorState);
                    } else {
                        trimTextContentFromAnchor(editor, anchor, delCount);
                    }
                }
            }
        });
    }, [editor, maxLength]);

    return null;
}




const PUNCTUATION =
    '\\.,\\+\\*\\?\\$\\@\\|#{}\\(\\)\\^\\-\\[\\]\\\\/!%\'"~=<>_:;';
const NAME = '\\b[A-Z][^\\s' + PUNCTUATION + ']';

const DocumentMentionsRegex = {
    NAME,
    PUNCTUATION,
};

const PUNC = DocumentMentionsRegex.PUNCTUATION;

const TRIGGERS = ['@'].join('');

// Chars we expect to see in a mention (non-space, non-punctuation).
const VALID_CHARS = '[^' + TRIGGERS + PUNC + '\\s]';

// Non-standard series of chars. Each series must be preceded and followed by
// a valid char.
const VALID_JOINS =
    '(?:' +
    '\\.[ |$]|' + // E.g. "r. " in "Mr. Smith"
    ' |' + // E.g. " " in "Josh Duck"
    '[' +
    PUNC +
    ']|' + // E.g. "-' in "Salier-Hellendag"
    ')';

const LENGTH_LIMIT = 75;

const AtSignMentionsRegex = new RegExp(
    '(^|\\s|\\()(' +
    '[' +
    TRIGGERS +
    ']' +
    '((?:' +
    VALID_CHARS +
    VALID_JOINS +
    '){0,' +
    LENGTH_LIMIT +
    '})' +
    ')$',
);

// 50 is the longest alias length limit.
const ALIAS_LENGTH_LIMIT = 50;

// Regex used to match alias.
const AtSignMentionsRegexAliasRegex = new RegExp(
    '(^|\\s|\\()(' +
    '[' +
    TRIGGERS +
    ']' +
    '((?:' +
    VALID_CHARS +
    '){0,' +
    ALIAS_LENGTH_LIMIT +
    '})' +
    ')$',
);

// At most, 5 suggestions are shown in the popup.
const SUGGESTION_LIST_LENGTH_LIMIT = 5;

const mentionsCache = new Map();

const dummyMentionsData = [
    'Aayla Secura',
    'Adi Gallia',
    'Admiral Dodd Rancit',
    'Admiral Firmus Piett',
    'Admiral Gial Ackbar',
    'Admiral Ozzel',
    'Admiral Raddus',
    'Admiral Terrinald Screed',
    'Admiral Trench',
    'Admiral U.O. Statura',
    'Agen Kolar',
    'Agent Kallus',
    'Aiolin and Morit Astarte',
    'Aks Moe',
    'Almec',
    'Alton Kastle',
    'Amee',
    'AP-5',
    'Armitage Hux',
    'Artoo',
    'Arvel Crynyd',
    'Asajj Ventress',
    'Aurra Sing',
    'AZI-3',
    'Bala-Tik',
    'Barada',
    'Bargwill Tomder',
    'Baron Papanoida',
    'Barriss Offee',
    'Baze Malbus',
    'Bazine Netal',
    'BB-8',
    'BB-9E',
    'Ben Quadinaros',
    'Berch Teller',
    'Beru Lars',
    'Bib Fortuna',
    'Biggs Darklighter',
    'Black Krrsantan',
    'Bo-Katan Kryze',
    'Boba Fett',
    'Bobbajo',
    'Bodhi Rook',
    'Borvo the Hutt',
    'Boss Nass',
    'Bossk',
    'Breha Antilles-Organa',
    'Bren Derlin',
    'Brendol Hux',
    'BT-1',
    'C-3PO',
    'C1-10P',
    'Cad Bane',
    'Caluan Ematt',
    'Captain Gregor',
    'Captain Phasma',
    'Captain Quarsh Panaka',
    'Captain Rex',
    'Carlist Rieekan',
    'Casca Panzoro',
    'Cassian Andor',
    'Cassio Tagge',
    'Cham Syndulla',
    'Che Amanwe Papanoida',
    'Chewbacca',
    'Chi Eekway Papanoida',
    'Chief Chirpa',
    'Chirrut Îmwe',
    'Ciena Ree',
    'Cin Drallig',
    'Clegg Holdfast',
    'Cliegg Lars',
    'Coleman Kcaj',
    'Coleman Trebor',
    'Colonel Kaplan',
    'Commander Bly',
    'Commander Cody (CC-2224)',
    'Commander Fil (CC-3714)',
    'Commander Fox',
    'Commander Gree',
    'Commander Jet',
    'Commander Wolffe',
    'Conan Antonio Motti',
    'Conder Kyl',
    'Constable Zuvio',
    'Cordé',
    'Cpatain Typho',
    'Crix Madine',
    'Cut Lawquane',
    'Dak Ralter',
    'Dapp',
    'Darth Bane',
    'Darth Maul',
    'Darth Tyranus',
    'Daultay Dofine',
    'Del Meeko',
    'Delian Mors',
    'Dengar',
    'Depa Billaba',
    'Derek Klivian',
    'Dexter Jettster',
    'Dineé Ellberger',
    'DJ',
    'Doctor Aphra',
    'Doctor Evazan',
    'Dogma',
    'Dormé',
    'Dr. Cylo',
    'Droidbait',
    'Droopy McCool',
    'Dryden Vos',
    'Dud Bolt',
    'Ebe E. Endocott',
    'Echuu Shen-Jon',
    'Eeth Koth',
    'Eighth Brother',
    'Eirtaé',
    'Eli Vanto',
    'Ellé',
    'Ello Asty',
    'Embo',
    'Eneb Ray',
    'Enfys Nest',
    'EV-9D9',
    'Evaan Verlaine',
    'Even Piell',
    'Ezra Bridger',
    'Faro Argyus',
    'Feral',
    'Fifth Brother',
    'Finis Valorum',
    'Finn',
    'Fives',
    'FN-1824',
    'FN-2003',
    'Fodesinbeed Annodue',
    'Fulcrum',
    'FX-7',
    'GA-97',
    'Galen Erso',
    'Gallius Rax',
    'Garazeb "Zeb" Orrelios',
    'Gardulla the Hutt',
    'Garrick Versio',
    'Garven Dreis',
    'Gavyn Sykes',
    'Gideon Hask',
    'Gizor Dellso',
    'Gonk droid',
    'Grand Inquisitor',
    'Greeata Jendowanian',
    'Greedo',
    'Greer Sonnel',
    'Grievous',
    'Grummgar',
    'Gungi',
    'Hammerhead',
    'Han Solo',
    'Harter Kalonia',
    'Has Obbit',
    'Hera Syndulla',
    'Hevy',
    'Hondo Ohnaka',
    'Huyang',
    'Iden Versio',
    'IG-88',
    'Ima-Gun Di',
    'Inquisitors',
    'Inspector Thanoth',
    'Jabba',
    'Jacen Syndulla',
    'Jan Dodonna',
    'Jango Fett',
    'Janus Greejatus',
    'Jar Jar Binks',
    'Jas Emari',
    'Jaxxon',
    'Jek Tono Porkins',
    'Jeremoch Colton',
    'Jira',
    'Jobal Naberrie',
    'Jocasta Nu',
    'Joclad Danva',
    'Joh Yowza',
    'Jom Barell',
    'Joph Seastriker',
    'Jova Tarkin',
    'Jubnuk',
    'Jyn Erso',
    'K-2SO',
    'Kanan Jarrus',
    'Karbin',
    'Karina the Great',
    'Kes Dameron',
    'Ketsu Onyo',
    'Ki-Adi-Mundi',
    'King Katuunko',
    'Kit Fisto',
    'Kitster Banai',
    'Klaatu',
    'Klik-Klak',
    'Korr Sella',
    'Kylo Ren',
    'L3-37',
    'Lama Su',
    'Lando Calrissian',
    'Lanever Villecham',
    'Leia Organa',
    'Letta Turmond',
    'Lieutenant Kaydel Ko Connix',
    'Lieutenant Thire',
    'Lobot',
    'Logray',
    'Lok Durd',
    'Longo Two-Guns',
    'Lor San Tekka',
    'Lorth Needa',
    'Lott Dod',
    'Luke Skywalker',
    'Lumat',
    'Luminara Unduli',
    'Lux Bonteri',
    'Lyn Me',
    'Lyra Erso',
    'Mace Windu',
    'Malakili',
    'Mama the Hutt',
    'Mars Guo',
    'Mas Amedda',
    'Mawhonic',
    'Max Rebo',
    'Maximilian Veers',
    'Maz Kanata',
    'ME-8D9',
    'Meena Tills',
    'Mercurial Swift',
    'Mina Bonteri',
    'Miraj Scintel',
    'Mister Bones',
    'Mod Terrik',
    'Moden Canady',
    'Mon Mothma',
    'Moradmin Bast',
    'Moralo Eval',
    'Morley',
    'Mother Talzin',
    'Nahdar Vebb',
    'Nahdonnis Praji',
    'Nien Nunb',
    'Niima the Hutt',
    'Nines',
    'Norra Wexley',
    'Nute Gunray',
    'Nuvo Vindi',
    'Obi-Wan Kenobi',
    'Odd Ball',
    'Ody Mandrell',
    'Omi',
    'Onaconda Farr',
    'Oola',
    'OOM-9',
    'Oppo Rancisis',
    'Orn Free Taa',
    'Oro Dassyne',
    'Orrimarko',
    'Osi Sobeck',
    'Owen Lars',
    'Pablo-Jill',
    'Padmé Amidala',
    'Pagetti Rook',
    'Paige Tico',
    'Paploo',
    'Petty Officer Thanisson',
    'Pharl McQuarrie',
    'Plo Koon',
    'Po Nudo',
    'Poe Dameron',
    'Poggle the Lesser',
    'Pong Krell',
    'Pooja Naberrie',
    'PZ-4CO',
    'Quarrie',
    'Quay Tolsite',
    'Queen Apailana',
    'Queen Jamillia',
    'Queen Neeyutnee',
    'Qui-Gon Jinn',
    'Quiggold',
    'Quinlan Vos',
    'R2-D2',
    'R2-KT',
    'R3-S6',
    'R4-P17',
    'R5-D4',
    'RA-7',
    'Rabé',
    'Rako Hardeen',
    'Ransolm Casterfo',
    'Rappertunie',
    'Ratts Tyerell',
    'Raymus Antilles',
    'Ree-Yees',
    'Reeve Panzoro',
    'Rey',
    'Ric Olié',
    'Riff Tamson',
    'Riley',
    'Rinnriyin Di',
    'Rio Durant',
    'Rogue Squadron',
    'Romba',
    'Roos Tarpals',
    'Rose Tico',
    'Rotta the Hutt',
    'Rukh',
    'Rune Haako',
    'Rush Clovis',
    'Ruwee Naberrie',
    'Ryoo Naberrie',
    'Sabé',
    'Sabine Wren',
    'Saché',
    'Saelt-Marae',
    'Saesee Tiin',
    'Salacious B. Crumb',
    'San Hill',
    'Sana Starros',
    'Sarco Plank',
    'Sarkli',
    'Satine Kryze',
    'Savage Opress',
    'Sebulba',
    'Senator Organa',
    'Sergeant Kreel',
    'Seventh Sister',
    'Shaak Ti',
    'Shara Bey',
    'Shmi Skywalker',
    'Shu Mai',
    'Sidon Ithano',
    'Sifo-Dyas',
    'Sim Aloo',
    'Siniir Rath Velus',
    'Sio Bibble',
    'Sixth Brother',
    'Slowen Lo',
    'Sly Moore',
    'Snaggletooth',
    'Snap Wexley',
    'Snoke',
    'Sola Naberrie',
    'Sora Bulq',
    'Strono Tuggs',
    'Sy Snootles',
    'Tallissan Lintra',
    'Tarfful',
    'Tasu Leech',
    'Taun We',
    'TC-14',
    'Tee Watt Kaa',
    'Teebo',
    'Teedo',
    'Teemto Pagalies',
    'Temiri Blagg',
    'Tessek',
    'Tey How',
    'Thane Kyrell',
    'The Bendu',
    'The Smuggler',
    'Thrawn',
    'Tiaan Jerjerrod',
    'Tion Medon',
    'Tobias Beckett',
    'Tulon Voidgazer',
    'Tup',
    'U9-C4',
    'Unkar Plutt',
    'Val Beckett',
    'Vanden Willard',
    'Vice Admiral Amilyn Holdo',
    'Vober Dand',
    'WAC-47',
    'Wag Too',
    'Wald',
    'Walrus Man',
    'Warok',
    'Wat Tambor',
    'Watto',
    'Wedge Antilles',
    'Wes Janson',
    'Wicket W. Warrick',
    'Wilhuff Tarkin',
    'Wollivan',
    'Wuher',
    'Wullf Yularen',
    'Xamuel Lennox',
    'Yaddle',
    'Yarael Poof',
    'Yoda',
    'Zam Wesell',
    'Zev Senesca',
    'Ziro the Hutt',
    'Zuckuss',
];

const dummyLookupService = {
    search(string: string, callback: (results: Array<string>) => void): void {
        setTimeout(() => {
            const results = dummyMentionsData.filter((mention) =>
                mention.toLowerCase().includes(string.toLowerCase()),
            );
            callback(results);
        }, 500);
    },
};

function useMentionLookupService(mentionString: string | null) {
    const [results, setResults] = useState<Array<string>>([]);

    useEffect(() => {
        const cachedResults = mentionsCache.get(mentionString);

        if (mentionString == null) {
            setResults([]);
            return;
        }

        if (cachedResults === null) {
            return;
        } else if (cachedResults !== undefined) {
            setResults(cachedResults);
            return;
        }

        mentionsCache.set(mentionString, null);
        dummyLookupService.search(mentionString, (newResults) => {
            mentionsCache.set(mentionString, newResults);
            setResults(newResults);
        });
    }, [mentionString]);

    return results;
}

function checkForAtSignMentions(
    text: string,
    minMatchLength: number,
): MenuTextMatch | null {
    let match = AtSignMentionsRegex.exec(text);

    if (match === null) {
        match = AtSignMentionsRegexAliasRegex.exec(text);
    }
    if (match !== null) {
        // The strategy ignores leading whitespace but we need to know it's
        // length to add it to the leadOffset
        const maybeLeadingWhitespace = match[1];

        const matchingString = match[3];
        if (matchingString.length >= minMatchLength) {
            return {
                leadOffset: match.index + maybeLeadingWhitespace.length,
                matchingString,
                replaceableString: match[2],
            };
        }
    }
    return null;
}

function getPossibleQueryMatch(text: string): MenuTextMatch | null {
    return checkForAtSignMentions(text, 1);
}

class MentionTypeaheadOption extends MenuOption {
    name: string;
    picture: JSX.Element;

    constructor(name: string, picture: JSX.Element) {
        super(name);
        this.name = name;
        this.picture = picture;
    }
}

function MentionsTypeaheadMenuItem({
    index,
    isSelected,
    onClick,
    onMouseEnter,
    option,
}: {
    index: number;
    isSelected: boolean;
    onClick: () => void;
    onMouseEnter: () => void;
    option: MentionTypeaheadOption;
}) {
    let className = 'item';
    if (isSelected) {
        className += ' selected';
    }
    return (
        <li
      key= { option.key }
    tabIndex = {- 1
}
className = { className }
ref = { option.setRefElement }
role = "option"
aria - selected={ isSelected }
id = { 'typeahead-item-' + index }
onMouseEnter = { onMouseEnter }
onClick = { onClick } >
    { option.picture }
    < span className = "text" > { option.name } < /span>
        < /li>
  );
}

export function NewMentionsPlugin(): JSX.Element | null {
    const [editor] = useLexicalComposerContext();

    const [queryString, setQueryString] = useState<string | null>(null);

    const results = useMentionLookupService(queryString);

    const checkForSlashTriggerMatch = useBasicTypeaheadTriggerMatch('/', {
        minLength: 0,
    });

    const options = useMemo(
        () =>
            results
                .map(
                    (result) =>
                        new MentionTypeaheadOption(result, <i className="icon user" />),
                )
                .slice(0, SUGGESTION_LIST_LENGTH_LIMIT),
        [results],
    );

    const onSelectOption = useCallback(
        (
            selectedOption: MentionTypeaheadOption,
            nodeToReplace: TextNode | null,
            closeMenu: () => void,
        ) => {
            editor.update(() => {
                const mentionNode = $createMentionNode(selectedOption.name);
                if (nodeToReplace) {
                    nodeToReplace.replace(mentionNode);
                }
                mentionNode.select();
                closeMenu();
            });
        },
        [editor],
    );

    const checkForMentionMatch = useCallback(
        (text: string) => {
            const slashMatch = checkForSlashTriggerMatch(text, editor);
            if (slashMatch !== null) {
                return null;
            }
            return getPossibleQueryMatch(text);
        },
        [checkForSlashTriggerMatch, editor],
    );

    return (
        <LexicalTypeaheadMenuPlugin<MentionTypeaheadOption>
      onQueryChange= { setQueryString }
    onSelectOption = { onSelectOption }
    triggerFn = { checkForMentionMatch }
    options = { options }
    menuRenderFn = {(
        anchorElementRef,
        { selectedIndex, selectOptionAndCleanUp, setHighlightedIndex },
    ) =>
    anchorElementRef.current && results.length
        ? ReactDOM.createPortal(
            <div className="typeahead-popover mentions-menu" >
        <ul>
        {
            options.map((option, i: number) => (
                <MentionsTypeaheadMenuItem
                      index= { i }
                      isSelected = { selectedIndex === i}
                      onClick = {() => {
            setHighlightedIndex(i);
                        selectOptionAndCleanUp(option);
        }}
onMouseEnter = {() => {
    setHighlightedIndex(i);
}}
key = { option.key }
option = { option }
    />
                  ))}
</ul>
    < /div>,
anchorElementRef.current,
            )
          : null
      }
/>
  );
}


export const INSERT_PAGE_BREAK: LexicalCommand<undefined> = createCommand();

export function PageBreakPlugin(): JSX.Element | null {
    const [editor] = useLexicalComposerContext();

    useEffect(() => {
        if (!editor.hasNodes([PageBreakNode])) {
            throw new Error(
                'PageBreakPlugin: PageBreakNode is not registered on editor',
            );
        }

        return mergeRegister(
            editor.registerCommand(
                INSERT_PAGE_BREAK,
                () => {
                    const selection = $getSelection();

                    if (!$isRangeSelection(selection)) {
                        return false;
                    }

                    const focusNode = selection.focus.getNode();
                    if (focusNode !== null) {
                        const pgBreak = $createPageBreakNode();
                        $insertNodeToNearestRoot(pgBreak);
                    }

                    return true;
                },
                COMMAND_PRIORITY_EDITOR,
            ),
        );
    }, [editor]);

    return null;
}



export function PasteLogPlugin(): JSX.Element {
    const [editor] = useLexicalComposerContext();
    const [isActive, setIsActive] = useState(false);
    const [lastClipboardData, setLastClipboardData] = useState<string | null>(
        null,
    );
    useEffect(() => {
        if (isActive) {
            return editor.registerCommand(
                PASTE_COMMAND,
                (e: ClipboardEvent) => {
                    const { clipboardData } = e;
                    const allData: string[] = [];
                    if (clipboardData && clipboardData.types) {
                        clipboardData.types.forEach((type) => {
                            allData.push(type.toUpperCase(), clipboardData.getData(type));
                        });
                    }
                    setLastClipboardData(allData.join('\n\n'));
                    return false;
                },
                COMMAND_PRIORITY_NORMAL,
            );
        }
    }, [editor, isActive]);
    return (
        <>
        <button
        id= "paste-log-button"
    className = {`editor-dev-button ${isActive ? 'active' : ''}`
}
onClick = {() => {
    setIsActive(!isActive);
}}
title = { isActive? 'Disable paste log': 'Enable paste log' }
    />
    { isActive && lastClipboardData !== null ? (
    <pre>{ lastClipboardData } < /pre>
) : null}
</>
  );
}



export const SPEECH_TO_TEXT_COMMAND: LexicalCommand<boolean> = createCommand(
    'SPEECH_TO_TEXT_COMMAND',
);


export const INSERT_POLL_COMMAND: LexicalCommand<string> = createCommand(
    'INSERT_POLL_COMMAND',
);

export function InsertPollDialog({
    activeEditor,
    onClose,
}: {
    activeEditor: LexicalEditor;
    onClose: () => void;
}): JSX.Element {
    const [question, setQuestion] = useState('');

    const onClick = () => {
        activeEditor.dispatchCommand(INSERT_POLL_COMMAND, question);
        onClose();
    };

    return (
        <>
        <TextInput label= "Question" onChange = { setQuestion } value = { question } />
            <DialogActions>
            <Button disabled={ question.trim() === '' } onClick = { onClick } >
                Confirm
                < /Button>
                < /DialogActions>
                < />
  );
}

export function PollPlugin(): JSX.Element | null {
    const [editor] = useLexicalComposerContext();
    useEffect(() => {
        if (!editor.hasNodes([PollNode])) {
            throw new Error('PollPlugin: PollNode not registered on editor');
        }

        return editor.registerCommand<string>(
            INSERT_POLL_COMMAND,
            (payload) => {
                const pollNode = $createPollNode(payload, [
                    createPollOption(),
                    createPollOption(),
                ]);
                $insertNodes([pollNode]);
                if ($isRootOrShadowRoot(pollNode.getParentOrThrow())) {
                    $wrapNodeInElement(pollNode, $createParagraphNode).selectEnd();
                }

                return true;
            },
            COMMAND_PRIORITY_EDITOR,
        );
    }, [editor]);
    return null;
}


const VOICE_COMMANDS: Readonly<
    Record<
        string,
        (arg0: { editor: LexicalEditor; selection: RangeSelection }) => void
    >
> = {
    '\n': ({ selection }) => {
        selection.insertParagraph();
    },
    redo: ({ editor }) => {
        editor.dispatchCommand(REDO_COMMAND, undefined);
    },
    undo: ({ editor }) => {
        editor.dispatchCommand(UNDO_COMMAND, undefined);
    },
};

export const SUPPORT_SPEECH_RECOGNITION: boolean =
    'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;

function SpeechToTextPlugin(): null {
    const [editor] = useLexicalComposerContext();
    const [isEnabled, setIsEnabled] = useState<boolean>(false);
    const SpeechRecognition =
        // @ts-expect-error missing type
        window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = useRef<typeof SpeechRecognition | null>(null);
    const report = useReport();

    useEffect(() => {
        if (isEnabled && recognition.current === null) {
            recognition.current = new SpeechRecognition();
            recognition.current.continuous = true;
            recognition.current.interimResults = true;
            recognition.current.addEventListener(
                'result',
                (event: typeof SpeechRecognition) => {
                    const resultItem = event.results.item(event.resultIndex);
                    const { transcript } = resultItem.item(0);
                    report(transcript);

                    if (!resultItem.isFinal) {
                        return;
                    }

                    editor.update(() => {
                        const selection = $getSelection();

                        if ($isRangeSelection(selection)) {
                            const command = VOICE_COMMANDS[transcript.toLowerCase().trim()];

                            if (command) {
                                command({
                                    editor,
                                    selection,
                                });
                            } else if (transcript.match(/\s*\n\s*/)) {
                                selection.insertParagraph();
                            } else {
                                selection.insertText(transcript);
                            }
                        }
                    });
                },
            );
        }

        if (recognition.current) {
            if (isEnabled) {
                recognition.current.start();
            } else {
                recognition.current.stop();
            }
        }

        return () => {
            if (recognition.current !== null) {
                recognition.current.stop();
            }
        };
    }, [SpeechRecognition, editor, isEnabled, report]);
    useEffect(() => {
        return editor.registerCommand(
            SPEECH_TO_TEXT_COMMAND,
            (_isEnabled: boolean) => {
                setIsEnabled(_isEnabled);
                return true;
            },
            COMMAND_PRIORITY_EDITOR,
        );
    }, [editor]);

    return null;
}

export (SUPPORT_SPEECH_RECOGNITION
    ? SpeechToTextPlugin
    : () => null) as () => null;

export function StickyPlugin(): JSX.Element | null {
    const [editor] = useLexicalComposerContext();
    useEffect(() => {
        if (!editor.hasNodes([StickyNode])) {
            throw new Error('StickyPlugin: StickyNode not registered on editor');
        }
    }, [editor]);
    return null;
}



const COMMAND_PRIORITY_LOW = 1;
const TAB_TO_FOCUS_INTERVAL = 100;

let lastTabKeyDownTimestamp = 0;
let hasRegisteredKeyDownListener = false;

function registerKeyTimeStampTracker() {
    window.addEventListener(
        'keydown',
        (event: KeyboardEvent) => {
            // Tab
            if (event.key === 'Tab') {
                lastTabKeyDownTimestamp = event.timeStamp;
            }
        },
        true,
    );
}

export function TabFocusPlugin(): null {
    const [editor] = useLexicalComposerContext();

    useEffect(() => {
        if (!hasRegisteredKeyDownListener) {
            registerKeyTimeStampTracker();
            hasRegisteredKeyDownListener = true;
        }

        return editor.registerCommand(
            FOCUS_COMMAND,
            (event: FocusEvent) => {
                const selection = $getSelection();
                if ($isRangeSelection(selection)) {
                    if (
                        lastTabKeyDownTimestamp + TAB_TO_FOCUS_INTERVAL >
                        event.timeStamp
                    ) {
                        $setSelection(selection.clone());
                    }
                }
                return false;
            },
            COMMAND_PRIORITY_LOW,
        );
    }, [editor]);

    return null;
}




function computeSelectionCount(selection: TableSelection): {
    columns: number;
    rows: number;
} {
    const selectionShape = selection.getShape();
    return {
        columns: selectionShape.toX - selectionShape.fromX + 1,
        rows: selectionShape.toY - selectionShape.fromY + 1,
    };
}

// This is important when merging cells as there is no good way to re-merge weird shapes (a result
// of selecting merged cells and non-merged)
function isTableSelectionRectangular(selection: TableSelection): boolean {
    const nodes = selection.getNodes();
    const currentRows: Array<number> = [];
    let currentRow = null;
    let expectedColumns = null;
    let currentColumns = 0;
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if ($isTableCellNode(node)) {
            const row = node.getParentOrThrow();
            invariant(
                $isTableRowNode(row),
                'Expected CellNode to have a RowNode parent',
            );
            if (currentRow !== row) {
                if (expectedColumns !== null && currentColumns !== expectedColumns) {
                    return false;
                }
                if (currentRow !== null) {
                    expectedColumns = currentColumns;
                }
                currentRow = row;
                currentColumns = 0;
            }
            const colSpan = node.__colSpan;
            for (let j = 0; j < colSpan; j++) {
                if (currentRows[currentColumns + j] === undefined) {
                    currentRows[currentColumns + j] = 0;
                }
                currentRows[currentColumns + j] += node.__rowSpan;
            }
            currentColumns += colSpan;
        }
    }
    return (
        (expectedColumns === null || currentColumns === expectedColumns) &&
        currentRows.every((v) => v === currentRows[0])
    );
}

function $canUnmerge(): boolean {
    const selection = $getSelection();
    if (
        ($isRangeSelection(selection) && !selection.isCollapsed()) ||
        ($isTableSelection(selection) && !selection.anchor.is(selection.focus)) ||
        (!$isRangeSelection(selection) && !$isTableSelection(selection))
    ) {
        return false;
    }
    const [cell] = $getNodeTriplet(selection.anchor);
    return cell.__colSpan > 1 || cell.__rowSpan > 1;
}

function $cellContainsEmptyParagraph(cell: TableCellNode): boolean {
    if (cell.getChildrenSize() !== 1) {
        return false;
    }
    const firstChild = cell.getFirstChildOrThrow();
    if (!$isParagraphNode(firstChild) || !firstChild.isEmpty()) {
        return false;
    }
    return true;
}

function $selectLastDescendant(node: ElementNode): void {
    const lastDescendant = node.getLastDescendant();
    if ($isTextNode(lastDescendant)) {
        lastDescendant.select();
    } else if ($isElementNode(lastDescendant)) {
        lastDescendant.selectEnd();
    } else if (lastDescendant !== null) {
        lastDescendant.selectNext();
    }
}

function currentCellBackgroundColor(editor: LexicalEditor): null | string {
    return editor.getEditorState().read(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection) || $isTableSelection(selection)) {
            const [cell] = $getNodeTriplet(selection.anchor);
            if ($isTableCellNode(cell)) {
                return cell.getBackgroundColor();
            }
        }
        return null;
    });
}

type TableCellActionMenuProps = Readonly<{
    contextRef: { current: null | HTMLElement };
    onClose: () => void;
    setIsMenuOpen: (isOpen: boolean) => void;
    showColorPickerModal: (
        title: string,
        showModal: (onClose: () => void) => JSX.Element,
    ) => void;
    tableCellNode: TableCellNode;
    cellMerge: boolean;
}>;

function TableActionMenu({
    onClose,
    tableCellNode: _tableCellNode,
    setIsMenuOpen,
    contextRef,
    cellMerge,
    showColorPickerModal,
}: TableCellActionMenuProps) {
    const [editor] = useLexicalComposerContext();
    const dropDownRef = useRef<HTMLDivElement | null>(null);
    const [tableCellNode, updateTableCellNode] = useState(_tableCellNode);
    const [selectionCounts, updateSelectionCounts] = useState({
        columns: 1,
        rows: 1,
    });
    const [canMergeCells, setCanMergeCells] = useState(false);
    const [canUnmergeCell, setCanUnmergeCell] = useState(false);
    const [backgroundColor, setBackgroundColor] = useState(
        () => currentCellBackgroundColor(editor) || '',
    );

    useEffect(() => {
        return editor.registerMutationListener(TableCellNode, (nodeMutations) => {
            const nodeUpdated =
                nodeMutations.get(tableCellNode.getKey()) === 'updated';

            if (nodeUpdated) {
                editor.getEditorState().read(() => {
                    updateTableCellNode(tableCellNode.getLatest());
                });
                setBackgroundColor(currentCellBackgroundColor(editor) || '');
            }
        });
    }, [editor, tableCellNode]);

    useEffect(() => {
        editor.getEditorState().read(() => {
            const selection = $getSelection();
            // Merge cells
            if ($isTableSelection(selection)) {
                const currentSelectionCounts = computeSelectionCount(selection);
                updateSelectionCounts(computeSelectionCount(selection));
                setCanMergeCells(
                    isTableSelectionRectangular(selection) &&
                    (currentSelectionCounts.columns > 1 ||
                        currentSelectionCounts.rows > 1),
                );
            }
            // Unmerge cell
            setCanUnmergeCell($canUnmerge());
        });
    }, [editor]);

    useEffect(() => {
        const menuButtonElement = contextRef.current;
        const dropDownElement = dropDownRef.current;
        const rootElement = editor.getRootElement();

        if (
            menuButtonElement != null &&
            dropDownElement != null &&
            rootElement != null
        ) {
            const rootEleRect = rootElement.getBoundingClientRect();
            const menuButtonRect = menuButtonElement.getBoundingClientRect();
            dropDownElement.style.opacity = '1';
            const dropDownElementRect = dropDownElement.getBoundingClientRect();
            const margin = 5;
            let leftPosition = menuButtonRect.right + margin;
            if (
                leftPosition + dropDownElementRect.width > window.innerWidth ||
                leftPosition + dropDownElementRect.width > rootEleRect.right
            ) {
                const position =
                    menuButtonRect.left - dropDownElementRect.width - margin;
                leftPosition = (position < 0 ? margin : position) + window.pageXOffset;
            }
            dropDownElement.style.left = `${leftPosition + window.pageXOffset}px`;

            let topPosition = menuButtonRect.top;
            if (topPosition + dropDownElementRect.height > window.innerHeight) {
                const position = menuButtonRect.bottom - dropDownElementRect.height;
                topPosition = (position < 0 ? margin : position) + window.pageYOffset;
            }
            dropDownElement.style.top = `${topPosition + +window.pageYOffset}px`;
        }
    }, [contextRef, dropDownRef, editor]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                dropDownRef.current != null &&
                contextRef.current != null &&
                !dropDownRef.current.contains(event.target as Node) &&
                !contextRef.current.contains(event.target as Node)
            ) {
                setIsMenuOpen(false);
            }
        }

        window.addEventListener('click', handleClickOutside);

        return () => window.removeEventListener('click', handleClickOutside);
    }, [setIsMenuOpen, contextRef]);

    const clearTableSelection = useCallback(() => {
        editor.update(() => {
            if (tableCellNode.isAttached()) {
                const tableNode = $getTableNodeFromLexicalNodeOrThrow(tableCellNode);
                const tableElement = editor.getElementByKey(
                    tableNode.getKey(),
                ) as HTMLTableElementWithWithTableSelectionState;

                if (!tableElement) {
                    throw new Error('Expected to find tableElement in DOM');
                }

                const tableSelection = getTableObserverFromTableElement(tableElement);
                if (tableSelection !== null) {
                    tableSelection.clearHighlight();
                }

                tableNode.markDirty();
                updateTableCellNode(tableCellNode.getLatest());
            }

            const rootNode = $getRoot();
            rootNode.selectStart();
        });
    }, [editor, tableCellNode]);

    const mergeTableCellsAtSelection = () => {
        editor.update(() => {
            const selection = $getSelection();
            if ($isTableSelection(selection)) {
                const { columns, rows } = computeSelectionCount(selection);
                const nodes = selection.getNodes();
                let firstCell: null | TableCellNode = null;
                for (let i = 0; i < nodes.length; i++) {
                    const node = nodes[i];
                    if ($isTableCellNode(node)) {
                        if (firstCell === null) {
                            node.setColSpan(columns).setRowSpan(rows);
                            firstCell = node;
                            const isEmpty = $cellContainsEmptyParagraph(node);
                            let firstChild;
                            if (
                                isEmpty &&
                                $isParagraphNode((firstChild = node.getFirstChild()))
                            ) {
                                firstChild.remove();
                            }
                        } else if ($isTableCellNode(firstCell)) {
                            const isEmpty = $cellContainsEmptyParagraph(node);
                            if (!isEmpty) {
                                firstCell.append(...node.getChildren());
                            }
                            node.remove();
                        }
                    }
                }
                if (firstCell !== null) {
                    if (firstCell.getChildrenSize() === 0) {
                        firstCell.append($createParagraphNode());
                    }
                    $selectLastDescendant(firstCell);
                }
                onClose();
            }
        });
    };

    const unmergeTableCellsAtSelection = () => {
        editor.update(() => {
            $unmergeCell();
        });
    };

    const insertTableRowAtSelection = useCallback(
        (shouldInsertAfter: boolean) => {
            editor.update(() => {
                $insertTableRow__EXPERIMENTAL(shouldInsertAfter);
                onClose();
            });
        },
        [editor, onClose],
    );

    const insertTableColumnAtSelection = useCallback(
        (shouldInsertAfter: boolean) => {
            editor.update(() => {
                for (let i = 0; i < selectionCounts.columns; i++) {
                    $insertTableColumn__EXPERIMENTAL(shouldInsertAfter);
                }
                onClose();
            });
        },
        [editor, onClose, selectionCounts.columns],
    );

    const deleteTableRowAtSelection = useCallback(() => {
        editor.update(() => {
            $deleteTableRow__EXPERIMENTAL();
            onClose();
        });
    }, [editor, onClose]);

    const deleteTableAtSelection = useCallback(() => {
        editor.update(() => {
            const tableNode = $getTableNodeFromLexicalNodeOrThrow(tableCellNode);
            tableNode.remove();

            clearTableSelection();
            onClose();
        });
    }, [editor, tableCellNode, clearTableSelection, onClose]);

    const deleteTableColumnAtSelection = useCallback(() => {
        editor.update(() => {
            $deleteTableColumn__EXPERIMENTAL();
            onClose();
        });
    }, [editor, onClose]);

    const toggleTableRowIsHeader = useCallback(() => {
        editor.update(() => {
            const tableNode = $getTableNodeFromLexicalNodeOrThrow(tableCellNode);

            const tableRowIndex = $getTableRowIndexFromTableCellNode(tableCellNode);

            const tableRows = tableNode.getChildren();

            if (tableRowIndex >= tableRows.length || tableRowIndex < 0) {
                throw new Error('Expected table cell to be inside of table row.');
            }

            const tableRow = tableRows[tableRowIndex];

            if (!$isTableRowNode(tableRow)) {
                throw new Error('Expected table row');
            }

            tableRow.getChildren().forEach((tableCell) => {
                if (!$isTableCellNode(tableCell)) {
                    throw new Error('Expected table cell');
                }

                tableCell.toggleHeaderStyle(TableCellHeaderStates.ROW);
            });

            clearTableSelection();
            onClose();
        });
    }, [editor, tableCellNode, clearTableSelection, onClose]);

    const toggleTableColumnIsHeader = useCallback(() => {
        editor.update(() => {
            const tableNode = $getTableNodeFromLexicalNodeOrThrow(tableCellNode);

            const tableColumnIndex =
                $getTableColumnIndexFromTableCellNode(tableCellNode);

            const tableRows = tableNode.getChildren<TableRowNode>();
            const maxRowsLength = Math.max(
                ...tableRows.map((row) => row.getChildren().length),
            );

            if (tableColumnIndex >= maxRowsLength || tableColumnIndex < 0) {
                throw new Error('Expected table cell to be inside of table row.');
            }

            for (let r = 0; r < tableRows.length; r++) {
                const tableRow = tableRows[r];

                if (!$isTableRowNode(tableRow)) {
                    throw new Error('Expected table row');
                }

                const tableCells = tableRow.getChildren();
                if (tableColumnIndex >= tableCells.length) {
                    // if cell is outside of bounds for the current row (for example various merge cell cases) we shouldn't highlight it
                    continue;
                }

                const tableCell = tableCells[tableColumnIndex];

                if (!$isTableCellNode(tableCell)) {
                    throw new Error('Expected table cell');
                }

                tableCell.toggleHeaderStyle(TableCellHeaderStates.COLUMN);
            }

            clearTableSelection();
            onClose();
        });
    }, [editor, tableCellNode, clearTableSelection, onClose]);

    const handleCellBackgroundColor = useCallback(
        (value: string) => {
            editor.update(() => {
                const selection = $getSelection();
                if ($isRangeSelection(selection) || $isTableSelection(selection)) {
                    const [cell] = $getNodeTriplet(selection.anchor);
                    if ($isTableCellNode(cell)) {
                        cell.setBackgroundColor(value);
                    }

                    if ($isTableSelection(selection)) {
                        const nodes = selection.getNodes();

                        for (let i = 0; i < nodes.length; i++) {
                            const node = nodes[i];
                            if ($isTableCellNode(node)) {
                                node.setBackgroundColor(value);
                            }
                        }
                    }
                }
            });
        },
        [editor],
    );

    let mergeCellButton: null | JSX.Element = null;
    if (cellMerge) {
        if (canMergeCells) {
            mergeCellButton = (
                <button
          type= "button"
            className = "item"
            onClick = {() => mergeTableCellsAtSelection()
        }
        data - test - id="table-merge-cells" >
            Merge cells
                < /button>
      );
    } else if (canUnmergeCell) {
        mergeCellButton = (
            <button
          type= "button"
        className = "item"
        onClick = {() => unmergeTableCellsAtSelection()
    }
    data - test - id="table-unmerge-cells" >
        Unmerge cells
            < /button>
      );
}
  }

return createPortal(
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      className="dropdown"
      ref = { dropDownRef }
      onClick = {(e) => {
    e.stopPropagation();
}}>
{ mergeCellButton }
< button
        type = "button"
        className = "item"
        onClick = {() =>
    showColorPickerModal('Cell background color', () => (
        <ColorPicker
              color= { backgroundColor }
              onChange = { handleCellBackgroundColor }
        />
          ))
        }
data - test - id="table-background-color" >
    <span className="text" > Background color < /span>
        < /button>
        < hr />
        <button
        type="button"
className = "item"
onClick = {() => insertTableRowAtSelection(false)}
data - test - id="table-insert-row-above" >
    <span className="text" >
        Insert{ ' ' }
{ selectionCounts.rows === 1 ? 'row' : `${selectionCounts.rows} rows` } { ' ' }
above
    < /span>
    < /button>
    < button
type = "button"
className = "item"
onClick = {() => insertTableRowAtSelection(true)}
data - test - id="table-insert-row-below" >
    <span className="text" >
        Insert{ ' ' }
{ selectionCounts.rows === 1 ? 'row' : `${selectionCounts.rows} rows` } { ' ' }
below
    < /span>
    < /button>
    < hr />
    <button
        type="button"
className = "item"
onClick = {() => insertTableColumnAtSelection(false)}
data - test - id="table-insert-column-before" >
    <span className="text" >
        Insert{ ' ' }
{
    selectionCounts.columns === 1
        ? 'column'
        : `${selectionCounts.columns} columns`
} { ' ' }
left
    < /span>
    < /button>
    < button
type = "button"
className = "item"
onClick = {() => insertTableColumnAtSelection(true)}
data - test - id="table-insert-column-after" >
    <span className="text" >
        Insert{ ' ' }
{
    selectionCounts.columns === 1
        ? 'column'
        : `${selectionCounts.columns} columns`
} { ' ' }
right
    < /span>
    < /button>
    < hr />
    <button
        type="button"
className = "item"
onClick = {() => deleteTableColumnAtSelection()}
data - test - id="table-delete-columns" >
    <span className="text" > Delete column < /span>
        < /button>
        < button
type = "button"
className = "item"
onClick = {() => deleteTableRowAtSelection()}
data - test - id="table-delete-rows" >
    <span className="text" > Delete row < /span>
        < /button>
        < button
type = "button"
className = "item"
onClick = {() => deleteTableAtSelection()}
data - test - id="table-delete" >
    <span className="text" > Delete table < /span>
        < /button>
        < hr />
        <button
        type="button"
className = "item"
onClick = {() => toggleTableRowIsHeader()}>
    <span className="text" >
        {(tableCellNode.__headerState & TableCellHeaderStates.ROW) ===
        TableCellHeaderStates.ROW
        ? 'Remove'
        : 'Add'}{ ' ' }
          row header
    < /span>
    < /button>
    < button
type = "button"
className = "item"
onClick = {() => toggleTableColumnIsHeader()}
data - test - id="table-column-header" >
    <span className="text" >
        {(tableCellNode.__headerState & TableCellHeaderStates.COLUMN) ===
        TableCellHeaderStates.COLUMN
        ? 'Remove'
        : 'Add'}{ ' ' }
          column header
    < /span>
    < /button>
    < /div>,
document.body,
  );
}

function TableCellActionMenuContainer({
    anchorElem,
    cellMerge,
}: {
    anchorElem: HTMLElement;
    cellMerge: boolean;
}): JSX.Element {
    const [editor] = useLexicalComposerContext();

    const menuButtonRef = useRef(null);
    const menuRootRef = useRef(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const [tableCellNode, setTableMenuCellNode] = useState<TableCellNode | null>(
        null,
    );

    const [colorPickerModal, showColorPickerModal] = useModal();

    const moveMenu = useCallback(() => {
        const menu = menuButtonRef.current;
        const selection = $getSelection();
        const nativeSelection = window.getSelection();
        const activeElement = document.activeElement;

        if (selection == null || menu == null) {
            setTableMenuCellNode(null);
            return;
        }

        const rootElement = editor.getRootElement();

        if (
            $isRangeSelection(selection) &&
            rootElement !== null &&
            nativeSelection !== null &&
            rootElement.contains(nativeSelection.anchorNode)
        ) {
            const tableCellNodeFromSelection = $getTableCellNodeFromLexicalNode(
                selection.anchor.getNode(),
            );

            if (tableCellNodeFromSelection == null) {
                setTableMenuCellNode(null);
                return;
            }

            const tableCellParentNodeDOM = editor.getElementByKey(
                tableCellNodeFromSelection.getKey(),
            );

            if (tableCellParentNodeDOM == null) {
                setTableMenuCellNode(null);
                return;
            }

            setTableMenuCellNode(tableCellNodeFromSelection);
        } else if (!activeElement) {
            setTableMenuCellNode(null);
        }
    }, [editor]);

    useEffect(() => {
        return editor.registerUpdateListener(() => {
            editor.getEditorState().read(() => {
                moveMenu();
            });
        });
    });

    useEffect(() => {
        const menuButtonDOM = menuButtonRef.current as HTMLButtonElement | null;

        if (menuButtonDOM != null && tableCellNode != null) {
            const tableCellNodeDOM = editor.getElementByKey(tableCellNode.getKey());

            if (tableCellNodeDOM != null) {
                const tableCellRect = tableCellNodeDOM.getBoundingClientRect();
                const menuRect = menuButtonDOM.getBoundingClientRect();
                const anchorRect = anchorElem.getBoundingClientRect();

                const top = tableCellRect.top - anchorRect.top + 4;
                const left =
                    tableCellRect.right - menuRect.width - 10 - anchorRect.left;

                menuButtonDOM.style.opacity = '1';
                menuButtonDOM.style.transform = `translate(${left}px, ${top}px)`;
            } else {
                menuButtonDOM.style.opacity = '0';
                menuButtonDOM.style.transform = 'translate(-10000px, -10000px)';
            }
        }
    }, [menuButtonRef, tableCellNode, editor, anchorElem]);

    const prevTableCellDOM = useRef(tableCellNode);

    useEffect(() => {
        if (prevTableCellDOM.current !== tableCellNode) {
            setIsMenuOpen(false);
        }

        prevTableCellDOM.current = tableCellNode;
    }, [prevTableCellDOM, tableCellNode]);

    return (
        <div className= "table-cell-action-button-container" ref = { menuButtonRef } >
            { tableCellNode != null && (
                <>
                <button
            type="button"
    className = "table-cell-action-button chevron-down"
    onClick = {(e) => {
        e.stopPropagation();
        setIsMenuOpen(!isMenuOpen);
    }
}
ref = { menuRootRef } >
    <i className="chevron-down" />
        </button>
{ colorPickerModal }
{
    isMenuOpen && (
        <TableActionMenu
              contextRef={ menuRootRef }
    setIsMenuOpen = { setIsMenuOpen }
    onClose = {() => setIsMenuOpen(false)
}
tableCellNode = { tableCellNode }
cellMerge = { cellMerge }
showColorPickerModal = { showColorPickerModal }
    />
          )}
</>
      )}
</div>
  );
}

export function TableActionMenuPlugin({
    anchorElem = document.body,
    cellMerge = false,
}: {
    anchorElem?: HTMLElement;
    cellMerge?: boolean;
}): null | ReactPortal {
    const isEditable = useLexicalEditable();
    return createPortal(
        isEditable ? (
            <TableCellActionMenuContainer
        anchorElem= { anchorElem }
        cellMerge = { cellMerge }
        />
    ) : null,
        anchorElem,
  );
}


type MousePosition = {
    x: number;
    y: number;
};

type MouseDraggingDirection = 'right' | 'bottom';

const MIN_ROW_HEIGHT = 33;
const MIN_COLUMN_WIDTH = 50;

function TableCellResizer({ editor }: { editor: LexicalEditor }): JSX.Element {
    const targetRef = useRef<HTMLElement | null>(null);
    const resizerRef = useRef<HTMLDivElement | null>(null);
    const tableRectRef = useRef<ClientRect | null>(null);

    const mouseStartPosRef = useRef<MousePosition | null>(null);
    const [mouseCurrentPos, updateMouseCurrentPos] =
        useState<MousePosition | null>(null);

    const [activeCell, updateActiveCell] = useState<TableDOMCell | null>(null);
    const [isSelectingGrid, updateIsSelectingGrid] = useState<boolean>(false);
    const [draggingDirection, updateDraggingDirection] =
        useState<MouseDraggingDirection | null>(null);

    useEffect(() => {
        return editor.registerCommand(
            SELECTION_CHANGE_COMMAND,
            (payload) => {
                const selection = $getSelection();
                const isTableSelection = $isTableSelection(selection);

                if (isSelectingGrid !== isTableSelection) {
                    updateIsSelectingGrid(isTableSelection);
                }

                return false;
            },
            COMMAND_PRIORITY_HIGH,
        );
    });

    const resetState = useCallback(() => {
        updateActiveCell(null);
        targetRef.current = null;
        updateDraggingDirection(null);
        mouseStartPosRef.current = null;
        tableRectRef.current = null;
    }, []);

    useEffect(() => {
        const onMouseMove = (event: MouseEvent) => {
            setTimeout(() => {
                const target = event.target;

                if (draggingDirection) {
                    updateMouseCurrentPos({
                        x: event.clientX,
                        y: event.clientY,
                    });
                    return;
                }

                if (resizerRef.current && resizerRef.current.contains(target as Node)) {
                    return;
                }

                if (targetRef.current !== target) {
                    targetRef.current = target as HTMLElement;
                    const cell = getDOMCellFromTarget(target as HTMLElement);

                    if (cell && activeCell !== cell) {
                        editor.update(() => {
                            const tableCellNode = $getNearestNodeFromDOMNode(cell.elem);
                            if (!tableCellNode) {
                                throw new Error('TableCellResizer: Table cell node not found.');
                            }

                            const tableNode =
                                $getTableNodeFromLexicalNodeOrThrow(tableCellNode);
                            const tableElement = editor.getElementByKey(tableNode.getKey());

                            if (!tableElement) {
                                throw new Error('TableCellResizer: Table element not found.');
                            }

                            targetRef.current = target as HTMLElement;
                            tableRectRef.current = tableElement.getBoundingClientRect();
                            updateActiveCell(cell);
                        });
                    } else if (cell == null) {
                        resetState();
                    }
                }
            }, 0);
        };

        document.addEventListener('mousemove', onMouseMove);

        return () => {
            document.removeEventListener('mousemove', onMouseMove);
        };
    }, [activeCell, draggingDirection, editor, resetState]);

    const isHeightChanging = (direction: MouseDraggingDirection) => {
        if (direction === 'bottom') {
            return true;
        }
        return false;
    };

    const updateRowHeight = useCallback(
        (newHeight: number) => {
            if (!activeCell) {
                throw new Error('TableCellResizer: Expected active cell.');
            }

            editor.update(() => {
                const tableCellNode = $getNearestNodeFromDOMNode(activeCell.elem);
                if (!$isTableCellNode(tableCellNode)) {
                    throw new Error('TableCellResizer: Table cell node not found.');
                }

                const tableNode = $getTableNodeFromLexicalNodeOrThrow(tableCellNode);

                const tableRowIndex = $getTableRowIndexFromTableCellNode(tableCellNode);

                const tableRows = tableNode.getChildren();

                if (tableRowIndex >= tableRows.length || tableRowIndex < 0) {
                    throw new Error('Expected table cell to be inside of table row.');
                }

                const tableRow = tableRows[tableRowIndex];

                if (!$isTableRowNode(tableRow)) {
                    throw new Error('Expected table row');
                }

                tableRow.setHeight(newHeight);
            });
        },
        [activeCell, editor],
    );

    const updateColumnWidth = useCallback(
        (newWidth: number) => {
            if (!activeCell) {
                throw new Error('TableCellResizer: Expected active cell.');
            }
            editor.update(() => {
                const tableCellNode = $getNearestNodeFromDOMNode(activeCell.elem);
                if (!$isTableCellNode(tableCellNode)) {
                    throw new Error('TableCellResizer: Table cell node not found.');
                }

                const tableNode = $getTableNodeFromLexicalNodeOrThrow(tableCellNode);

                const tableColumnIndex =
                    $getTableColumnIndexFromTableCellNode(tableCellNode);

                const tableRows = tableNode.getChildren();

                for (let r = 0; r < tableRows.length; r++) {
                    const tableRow = tableRows[r];

                    if (!$isTableRowNode(tableRow)) {
                        throw new Error('Expected table row');
                    }

                    const rowCells = tableRow.getChildren<TableCellNode>();
                    const rowCellsSpan = rowCells.map((cell) => cell.getColSpan());

                    const aggregatedRowSpans = rowCellsSpan.reduce(
                        (rowSpans: number[], cellSpan) => {
                            const previousCell = rowSpans[rowSpans.length - 1] ?? 0;
                            rowSpans.push(previousCell + cellSpan);
                            return rowSpans;
                        },
                        [],
                    );
                    const rowColumnIndexWithSpan = aggregatedRowSpans.findIndex(
                        (cellSpan: number) => cellSpan > tableColumnIndex,
                    );

                    if (
                        rowColumnIndexWithSpan >= rowCells.length ||
                        rowColumnIndexWithSpan < 0
                    ) {
                        throw new Error('Expected table cell to be inside of table row.');
                    }

                    const tableCell = rowCells[rowColumnIndexWithSpan];

                    if (!$isTableCellNode(tableCell)) {
                        throw new Error('Expected table cell');
                    }

                    tableCell.setWidth(newWidth);
                }
            });
        },
        [activeCell, editor],
    );

    const mouseUpHandler = useCallback(
        (direction: MouseDraggingDirection) => {
            const handler = (event: MouseEvent) => {
                event.preventDefault();
                event.stopPropagation();

                if (!activeCell) {
                    throw new Error('TableCellResizer: Expected active cell.');
                }

                if (mouseStartPosRef.current) {
                    const { x, y } = mouseStartPosRef.current;

                    if (activeCell === null) {
                        return;
                    }

                    if (isHeightChanging(direction)) {
                        const height = activeCell.elem.getBoundingClientRect().height;
                        const heightChange = Math.abs(event.clientY - y);

                        const isShrinking = direction === 'bottom' && y > event.clientY;

                        updateRowHeight(
                            Math.max(
                                isShrinking ? height - heightChange : heightChange + height,
                                MIN_ROW_HEIGHT,
                            ),
                        );
                    } else {
                        const computedStyle = getComputedStyle(activeCell.elem);
                        let width = activeCell.elem.clientWidth; // width with padding
                        width -=
                            parseFloat(computedStyle.paddingLeft) +
                            parseFloat(computedStyle.paddingRight);
                        const widthChange = Math.abs(event.clientX - x);

                        const isShrinking = direction === 'right' && x > event.clientX;

                        updateColumnWidth(
                            Math.max(
                                isShrinking ? width - widthChange : widthChange + width,
                                MIN_COLUMN_WIDTH,
                            ),
                        );
                    }

                    resetState();
                    document.removeEventListener('mouseup', handler);
                }
            };
            return handler;
        },
        [activeCell, resetState, updateColumnWidth, updateRowHeight],
    );

    const toggleResize = useCallback(
        (direction: MouseDraggingDirection): MouseEventHandler<HTMLDivElement> =>
            (event) => {
                event.preventDefault();
                event.stopPropagation();

                if (!activeCell) {
                    throw new Error('TableCellResizer: Expected active cell.');
                }

                mouseStartPosRef.current = {
                    x: event.clientX,
                    y: event.clientY,
                };
                updateMouseCurrentPos(mouseStartPosRef.current);
                updateDraggingDirection(direction);

                document.addEventListener('mouseup', mouseUpHandler(direction));
            },
        [activeCell, mouseUpHandler],
    );

    const getResizers = useCallback(() => {
        if (activeCell) {
            const { height, width, top, left } =
                activeCell.elem.getBoundingClientRect();

            const styles = {
                bottom: {
                    backgroundColor: 'none',
                    cursor: 'row-resize',
                    height: '10px',
                    left: `${window.pageXOffset + left}px`,
                    top: `${window.pageYOffset + top + height}px`,
                    width: `${width}px`,
                },
                right: {
                    backgroundColor: 'none',
                    cursor: 'col-resize',
                    height: `${height}px`,
                    left: `${window.pageXOffset + left + width}px`,
                    top: `${window.pageYOffset + top}px`,
                    width: '10px',
                },
            };

            const tableRect = tableRectRef.current;

            if (draggingDirection && mouseCurrentPos && tableRect) {
                if (isHeightChanging(draggingDirection)) {
                    styles[draggingDirection].left = `${window.pageXOffset + tableRect.left
                        }px`;
                    styles[draggingDirection].top = `${window.pageYOffset + mouseCurrentPos.y
                        }px`;
                    styles[draggingDirection].height = '3px';
                    styles[draggingDirection].width = `${tableRect.width}px`;
                } else {
                    styles[draggingDirection].top = `${window.pageYOffset + tableRect.top
                        }px`;
                    styles[draggingDirection].left = `${window.pageXOffset + mouseCurrentPos.x
                        }px`;
                    styles[draggingDirection].width = '3px';
                    styles[draggingDirection].height = `${tableRect.height}px`;
                }

                styles[draggingDirection].backgroundColor = '#adf';
            }

            return styles;
        }

        return {
            bottom: null,
            left: null,
            right: null,
            top: null,
        };
    }, [activeCell, draggingDirection, mouseCurrentPos]);

    const resizerStyles = getResizers();

    return (
        <div ref= { resizerRef } >
        { activeCell != null && !isSelectingGrid && (
            <>
            <div
            className="TableCellResizer__resizer TableCellResizer__ui"
    style = { resizerStyles.right || undefined }
    onMouseDown = { toggleResize('right') }
        />
        <div
            className="TableCellResizer__resizer TableCellResizer__ui"
    style = { resizerStyles.bottom || undefined }
    onMouseDown = { toggleResize('bottom') }
        />
        </>
      )
}
</div>
  );
}

export function TableCellResizerPlugin(): null | ReactPortal {
    const [editor] = useLexicalComposerContext();
    const isEditable = useLexicalEditable();

    return useMemo(
        () =>
            isEditable
                ? createPortal(<TableCellResizer editor={ editor } />, document.body)
                : null,
        [editor, isEditable],
    );
}

const MARGIN_ABOVE_EDITOR = 624;
const HEADING_WIDTH = 9;

function indent(tagName: HeadingTagType) {
    if (tagName === 'h2') { return 'heading2'; }
    else if (tagName === 'h3') { return 'heading3'; }
}

function isHeadingAtTheTopOfThePage(element: HTMLElement): boolean {
    const elementYPosition = element?.getClientRects()[0].y;
    return (
        elementYPosition >= MARGIN_ABOVE_EDITOR &&
        elementYPosition <= MARGIN_ABOVE_EDITOR + HEADING_WIDTH
    );
}
function isHeadingAboveViewport(element: HTMLElement): boolean {
    const elementYPosition = element?.getClientRects()[0].y;
    return elementYPosition < MARGIN_ABOVE_EDITOR;
}
function isHeadingBelowTheTopOfThePage(element: HTMLElement): boolean {
    const elementYPosition = element?.getClientRects()[0].y;
    return elementYPosition >= MARGIN_ABOVE_EDITOR + HEADING_WIDTH;
}

function TableOfContentsList({
    tableOfContents,
}: {
    tableOfContents: Array<TableOfContentsEntry>;
}): JSX.Element {
    const [selectedKey, setSelectedKey] = useState('');
    const selectedIndex = useRef(0);
    const [editor] = useLexicalComposerContext();

    function scrollToNode(key: NodeKey, currIndex: number) {
        editor.getEditorState().read(() => {
            const domElement = editor.getElementByKey(key);
            if (domElement !== null) {
                domElement.scrollIntoView();
                setSelectedKey(key);
                selectedIndex.current = currIndex;
            }
        });
    }

    useEffect(() => {
        function scrollCallback() {
            if (
                tableOfContents.length !== 0 &&
                selectedIndex.current < tableOfContents.length - 1
            ) {
                let currentHeading = editor.getElementByKey(
                    tableOfContents[selectedIndex.current][0],
                );
                if (currentHeading !== null) {
                    if (isHeadingBelowTheTopOfThePage(currentHeading)) {
                        //On natural scroll, user is scrolling up
                        while (
                            currentHeading !== null &&
                            isHeadingBelowTheTopOfThePage(currentHeading) &&
                            selectedIndex.current > 0
                        ) {
                            const prevHeading = editor.getElementByKey(
                                tableOfContents[selectedIndex.current - 1][0],
                            );
                            if (
                                prevHeading !== null &&
                                (isHeadingAboveViewport(prevHeading) ||
                                    isHeadingBelowTheTopOfThePage(prevHeading))
                            ) {
                                selectedIndex.current--;
                            }
                            currentHeading = prevHeading;
                        }
                        const prevHeadingKey = tableOfContents[selectedIndex.current][0];
                        setSelectedKey(prevHeadingKey);
                    } else if (isHeadingAboveViewport(currentHeading)) {
                        //On natural scroll, user is scrolling down
                        while (
                            currentHeading !== null &&
                            isHeadingAboveViewport(currentHeading) &&
                            selectedIndex.current < tableOfContents.length - 1
                        ) {
                            const nextHeading = editor.getElementByKey(
                                tableOfContents[selectedIndex.current + 1][0],
                            );
                            if (
                                nextHeading !== null &&
                                (isHeadingAtTheTopOfThePage(nextHeading) ||
                                    isHeadingAboveViewport(nextHeading))
                            ) {
                                selectedIndex.current++;
                            }
                            currentHeading = nextHeading;
                        }
                        const nextHeadingKey = tableOfContents[selectedIndex.current][0];
                        setSelectedKey(nextHeadingKey);
                    }
                }
            } else {
                selectedIndex.current = 0;
            }
        }
        let timerId: ReturnType<typeof setTimeout>;

        function debounceFunction(func: () => void, delay: number) {
            clearTimeout(timerId);
            timerId = setTimeout(func, delay);
        }

        function onScroll(): void {
            debounceFunction(scrollCallback, 10);
        }

        document.addEventListener('scroll', onScroll);
        return () => document.removeEventListener('scroll', onScroll);
    }, [tableOfContents, editor]);

    return (
        <div className= "table-of-contents" >
        <ul className="headings" >
        {
            tableOfContents.map(([key, text, tag], index) => {
                if (index === 0) {
                    return (
                        <div className= "normal-heading-wrapper" key = { key } >
                            <div
                  className="first-heading"
                    onClick = {() => scrollToNode(key, index)
                }
                role = "button"
                tabIndex = { 0} >
                    {('' + text).length > 20
                    ? text.substring(0, 20) + '...'
                    : text
            }
                </div>
                < br />
                </div>
            );
        } else {
        return (
            <div
                className= {`normal-heading-wrapper ${selectedKey === key ? 'selected-heading-wrapper' : ''
                }`
    }
    key = { key } >
        <div
                  onClick={ () => scrollToNode(key, index) }
    role = "button"
    className = { indent(tag) }
    tabIndex = { 0} >
        <li
                    className={
        `normal-heading ${selectedKey === key ? 'selected-heading' : ''
            }
                    `}>
        {('' + text).length > 27
        ? text.substring(0, 27) + '...'
        : text
}
</li>
    < /div>
    < /div>
            );
          }
        })}
</ul>
    < /div>
  );
}

export function TableOfContentsPlugin() {
    return (
        <LexicalTableOfContents>
        {(tableOfContents) => {
        return <TableOfContentsList tableOfContents={ tableOfContents } />;
    }
}
</LexicalTableOfContents>
  );
}

const copy = (text: string | null) => {
    const textArea = document.createElement('textarea');
    textArea.value = text || '';
    textArea.style.position = 'absolute';
    textArea.style.opacity = '0';
    document.body?.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
        const result = document.execCommand('copy');
        // eslint-disable-next-line no-console
        console.log(result);
    } catch (error) {
        console.error(error);
    }
    document.body?.removeChild(textArea);
};

const download = (filename: string, text: string | null) => {
    const a = document.createElement('a');
    a.setAttribute(
        'href',
        'data:text/plain;charset=utf-8,' + encodeURIComponent(text || ''),
    );
    a.setAttribute('download', filename);
    a.style.display = 'none';
    document.body?.appendChild(a);
    a.click();
    document.body?.removeChild(a);
};

const formatStep = (step: Step) => {
    const formatOneStep = (name: string, value: Step['value']) => {
        switch (name) {
            case 'click': {
                return `      await page.mouse.click(${value.x}, ${value.y});`;
            }
            case 'press': {
                return `      await page.keyboard.press('${value}');`;
            }
            case 'keydown': {
                return `      await page.keyboard.keydown('${value}');`;
            }
            case 'keyup': {
                return `      await page.keyboard.keyup('${value}');`;
            }
            case 'type': {
                return `      await page.keyboard.type('${value}');`;
            }
            case 'selectAll': {
                return `      await selectAll(page);`;
            }
            case 'snapshot': {
                return `      await assertHTMLSnapshot(page);
      await assertSelection(page, {
        anchorPath: [${value.anchorPath.toString()}],
        anchorOffset: ${value.anchorOffset},
        focusPath: [${value.focusPath.toString()}],
        focusOffset: ${value.focusOffset},
      });
`;
            }
            default:
                return ``;
        }
    };
    const formattedStep = formatOneStep(step.name, step.value);
    switch (step.count) {
        case 1:
            return formattedStep;
        case 2:
            return [formattedStep, formattedStep].join(`\n`);
        default:
            return `      await repeat(${step.count}, async () => {
  ${formattedStep}
      );`;
    }
};

export function isSelectAll(event: KeyboardEvent): boolean {
    return event.keyCode === 65 && (IS_APPLE ? event.metaKey : event.ctrlKey);
}

// stolen from LexicalSelection-test
function sanitizeSelection(selection: Selection) {
    const { anchorNode, focusNode } = selection;
    let { anchorOffset, focusOffset } = selection;
    if (anchorOffset !== 0) {
        anchorOffset--;
    }
    if (focusOffset !== 0) {
        focusOffset--;
    }
    return { anchorNode, anchorOffset, focusNode, focusOffset };
}

function getPathFromNodeToEditor(node: Node, rootElement: HTMLElement | null) {
    let currentNode: Node | null | undefined = node;
    const path = [];
    while (currentNode !== rootElement) {
        if (currentNode !== null && currentNode !== undefined) {
            path.unshift(
                Array.from(currentNode?.parentNode?.childNodes ?? []).indexOf(
                    currentNode as ChildNode,
                ),
            );
        }
        currentNode = currentNode?.parentNode;
    }
    return path;
}

const keyPresses = new Set([
    'Enter',
    'Backspace',
    'Delete',
    'Escape',
    'ArrowLeft',
    'ArrowRight',
    'ArrowUp',
    'ArrowDown',
]);

type Step = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: any;
    count: number;
    name: string;
};

type Steps = Step[];

function useTestRecorder(
    editor: LexicalEditor,
): [JSX.Element, JSX.Element | null] {
    const [steps, setSteps] = useState<Steps>([]);
    const [isRecording, setIsRecording] = useState(false);
    const [, setCurrentInnerHTML] = useState('');
    const [templatedTest, setTemplatedTest] = useState('');
    const previousSelectionRef = useRef<BaseSelection | null>(null);
    const skipNextSelectionChangeRef = useRef(false);
    const preRef = useRef<HTMLPreElement>(null);

    const getCurrentEditor = useCallback(() => {
        return editor;
    }, [editor]);

    const generateTestContent = useCallback(() => {
        const rootElement = editor.getRootElement();
        const browserSelection = window.getSelection();

        if (
            rootElement == null ||
            browserSelection == null ||
            browserSelection.anchorNode == null ||
            browserSelection.focusNode == null ||
            !rootElement.contains(browserSelection.anchorNode) ||
            !rootElement.contains(browserSelection.focusNode)
        ) {
            return null;
        }

        return `
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  initializeE2E,
  assertHTMLSnapshot,
  assertSelection,
  repeat,
} from '../utils';
import {selectAll} from '../keyboardShortcuts';
import { RangeSelection } from 'lexical';
import { NodeSelection } from 'lexical';

describe('Test case', () => {
  initializeE2E((e2e) => {
    it('Should pass this test', async () => {
      const {page} = e2e;

      await page.focus('div[contenteditable="true"]');
${steps.map(formatStep).join(`\n`)}
    });
});
    `;
    }, [editor, steps]);

    // just a wrapper around inserting new actions so that we can
    // coalesce some actions like insertText/moveNativeSelection
    const pushStep = useCallback(
        (name: string, value: Step['value']) => {
            setSteps((currentSteps) => {
                // trying to group steps
                const currentIndex = steps.length - 1;
                const lastStep = steps[currentIndex];
                if (lastStep) {
                    if (lastStep.name === name) {
                        if (name === 'type') {
                            // for typing events we just append the text
                            return [
                                ...steps.slice(0, currentIndex),
                                { ...lastStep, value: lastStep.value + value },
                            ];
                        } else {
                            // for other events we bump the counter if their values are the same
                            if (lastStep.value === value) {
                                return [
                                    ...steps.slice(0, currentIndex),
                                    { ...lastStep, count: lastStep.count + 1 },
                                ];
                            }
                        }
                    }
                }
                // could not group, just append a new one
                return [...currentSteps, { count: 1, name, value }];
            });
        },
        [steps, setSteps],
    );

    useLayoutEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (!isRecording) {
                return;
            }
            const key = event.key;
            if (isSelectAll(event)) {
                pushStep('selectAll', '');
            } else if (keyPresses.has(key)) {
                pushStep('press', event.key);
            } else if ([...key].length > 1) {
                pushStep('keydown', event.key);
            } else {
                pushStep('type', event.key);
            }
        };

        const onKeyUp = (event: KeyboardEvent) => {
            if (!isRecording) {
                return;
            }
            const key = event.key;
            if (!keyPresses.has(key) && [...key].length > 1) {
                pushStep('keyup', event.key);
            }
        };

        return editor.registerRootListener(
            (
                rootElement: null | HTMLElement,
                prevRootElement: null | HTMLElement,
            ) => {
                if (prevRootElement !== null) {
                    prevRootElement.removeEventListener('keydown', onKeyDown);
                    prevRootElement.removeEventListener('keyup', onKeyUp);
                }
                if (rootElement !== null) {
                    rootElement.addEventListener('keydown', onKeyDown);
                    rootElement.addEventListener('keyup', onKeyUp);
                }
            },
        );
    }, [editor, isRecording, pushStep]);

    useLayoutEffect(() => {
        if (preRef.current) {
            preRef.current.scrollTo(0, preRef.current.scrollHeight);
        }
    }, [generateTestContent]);

    useEffect(() => {
        if (steps) {
            const testContent = generateTestContent();
            if (testContent !== null) {
                setTemplatedTest(testContent);
            }
            if (preRef.current) {
                preRef.current.scrollTo(0, preRef.current.scrollHeight);
            }
        }
    }, [generateTestContent, steps]);

    useEffect(() => {
        const removeUpdateListener = editor.registerUpdateListener(
            ({ editorState, dirtyLeaves, dirtyElements }) => {
                if (!isRecording) {
                    return;
                }
                const currentSelection = editorState._selection;
                const previousSelection = previousSelectionRef.current;
                const skipNextSelectionChange = skipNextSelectionChangeRef.current;
                if (previousSelection !== currentSelection) {
                    if (
                        dirtyLeaves.size === 0 &&
                        dirtyElements.size === 0 &&
                        !skipNextSelectionChange
                    ) {
                        const browserSelection = window.getSelection();
                        if (
                            browserSelection &&
                            (browserSelection.anchorNode == null ||
                                browserSelection.focusNode == null)
                        ) {
                            return;
                        }
                    }
                    previousSelectionRef.current = currentSelection;
                }
                skipNextSelectionChangeRef.current = false;
                const testContent = generateTestContent();
                if (testContent !== null) {
                    setTemplatedTest(testContent);
                }
            },
        );
        return removeUpdateListener;
    }, [editor, generateTestContent, isRecording, pushStep]);

    // save innerHTML
    useEffect(() => {
        if (!isRecording) {
            return;
        }
        const removeUpdateListener = editor.registerUpdateListener(() => {
            const rootElement = editor.getRootElement();
            if (rootElement !== null) {
                setCurrentInnerHTML(rootElement?.innerHTML);
            }
        });
        return removeUpdateListener;
    }, [editor, isRecording]);

    // clear editor and start recording
    const toggleEditorSelection = useCallback(
        (currentEditor: LexicalEditor) => {
            if (!isRecording) {
                currentEditor.update(() => {
                    const root = $getRoot();
                    root.clear();
                    const text = $createTextNode();
                    root.append($createParagraphNode().append(text));
                    text.select();
                });
                setSteps([]);
            }
            setIsRecording((currentIsRecording) => !currentIsRecording);
        },
        [isRecording],
    );

    const onSnapshotClick = useCallback(() => {
        if (!isRecording) {
            return;
        }
        const browserSelection = window.getSelection();
        if (
            browserSelection === null ||
            browserSelection.anchorNode == null ||
            browserSelection.focusNode == null
        ) {
            return;
        }
        const { anchorNode, anchorOffset, focusNode, focusOffset } =
            sanitizeSelection(browserSelection);
        const rootElement = getCurrentEditor().getRootElement();
        let anchorPath;
        if (anchorNode !== null) {
            anchorPath = getPathFromNodeToEditor(anchorNode, rootElement);
        }
        let focusPath;
        if (focusNode !== null) {
            focusPath = getPathFromNodeToEditor(focusNode, rootElement);
        }
        pushStep('snapshot', {
            anchorNode,
            anchorOffset,
            anchorPath,
            focusNode,
            focusOffset,
            focusPath,
        });
    }, [pushStep, isRecording, getCurrentEditor]);

    const onCopyClick = useCallback(() => {
        copy(generateTestContent());
    }, [generateTestContent]);

    const onDownloadClick = useCallback(() => {
        download('test.js', generateTestContent());
    }, [generateTestContent]);

    const button = (
        <button
      id= "test-recorder-button"
    className = {`editor-dev-button ${isRecording ? 'active' : ''}`
}
onClick = {() => toggleEditorSelection(getCurrentEditor())}
title = { isRecording? 'Disable test recorder': 'Enable test recorder' }
    />
  );
const output = isRecording ? (
    <div className= "test-recorder-output" >
    <div className="test-recorder-toolbar" >
        <button
          className="test-recorder-button"
id = "test-recorder-button-snapshot"
title = "Insert snapshot"
onClick = { onSnapshotClick }
    />
    <button
          className="test-recorder-button"
id = "test-recorder-button-copy"
title = "Copy to clipboard"
onClick = { onCopyClick }
    />
    <button
          className="test-recorder-button"
id = "test-recorder-button-download"
title = "Download as a file"
onClick = { onDownloadClick }
    />
    </div>
    < pre id = "test-recorder" ref = { preRef } >
        { templatedTest }
        < /pre>
        < /div>
  ) : null;

return [button, output];
}

export function TestRecorderPlugin(): JSX.Element {
    const [editor] = useLexicalComposerContext();
    const [testRecorderButton, testRecorderOutput] = useTestRecorder(editor);

    return (
        <>
        { testRecorderButton }
      { testRecorderOutput }
    </>
  );
}

const blockTypeToBlockName = {
    bullet: 'Bulleted List',
    check: 'Check List',
    code: 'Code Block',
    h1: 'Heading 1',
    h2: 'Heading 2',
    h3: 'Heading 3',
    h4: 'Heading 4',
    h5: 'Heading 5',
    h6: 'Heading 6',
    number: 'Numbered List',
    paragraph: 'Normal',
    quote: 'Quote',
};

const rootTypeToRootName = {
    root: 'Root',
    table: 'Table',
};

function getCodeLanguageOptions(): [string, string][] {
    const options: [string, string][] = [];

    for (const [lang, friendlyName] of Object.entries(
        CODE_LANGUAGE_FRIENDLY_NAME_MAP,
    )) {
        options.push([lang, friendlyName]);
    }

    return options;
}

const CODE_LANGUAGE_OPTIONS = getCodeLanguageOptions();

const FONT_FAMILY_OPTIONS: [string, string][] = [
    ['Arial', 'Arial'],
    ['Courier New', 'Courier New'],
    ['Georgia', 'Georgia'],
    ['Times New Roman', 'Times New Roman'],
    ['Trebuchet MS', 'Trebuchet MS'],
    ['Verdana', 'Verdana'],
];

const FONT_SIZE_OPTIONS: [string, string][] = [
    ['10px', '10px'],
    ['11px', '11px'],
    ['12px', '12px'],
    ['13px', '13px'],
    ['14px', '14px'],
    ['15px', '15px'],
    ['16px', '16px'],
    ['17px', '17px'],
    ['18px', '18px'],
    ['19px', '19px'],
    ['20px', '20px'],
];

const ELEMENT_FORMAT_OPTIONS: {
    [key in Exclude<ElementFormatType, ''>]: {
        icon: string;
        iconRTL: string;
        name: string;
    };
} = {
    center: {
        icon: 'center-align',
        iconRTL: 'center-align',
        name: 'Center Align',
    },
    end: {
        icon: 'right-align',
        iconRTL: 'left-align',
        name: 'End Align',
    },
    justify: {
        icon: 'justify-align',
        iconRTL: 'justify-align',
        name: 'Justify Align',
    },
    left: {
        icon: 'left-align',
        iconRTL: 'left-align',
        name: 'Left Align',
    },
    right: {
        icon: 'right-align',
        iconRTL: 'right-align',
        name: 'Right Align',
    },
    start: {
        icon: 'left-align',
        iconRTL: 'right-align',
        name: 'Start Align',
    },
};

function dropDownActiveClass(active: boolean) {
    if (active) {
        return 'active dropdown-item-active';
    } else {
        return '';
    }
}

function BlockFormatDropDown({
    editor,
    blockType,
    rootType,
    disabled = false,
}: {
    blockType: keyof typeof blockTypeToBlockName;
    rootType: keyof typeof rootTypeToRootName;
    editor: LexicalEditor;
    disabled?: boolean;
}): JSX.Element {
    const formatParagraph = () => {
        editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
                $setBlocksType(selection, () => $createParagraphNode());
            }
        });
    };

    const formatHeading = (headingSize: HeadingTagType) => {
        if (blockType !== headingSize) {
            editor.update(() => {
                const selection = $getSelection();
                $setBlocksType(selection, () => $createHeadingNode(headingSize));
            });
        }
    };

    const formatBulletList = () => {
        if (blockType !== 'bullet') {
            editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
        } else {
            formatParagraph();
        }
    };

    const formatCheckList = () => {
        if (blockType !== 'check') {
            editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined);
        } else {
            formatParagraph();
        }
    };

    const formatNumberedList = () => {
        if (blockType !== 'number') {
            editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
        } else {
            formatParagraph();
        }
    };

    const formatQuote = () => {
        if (blockType !== 'quote') {
            editor.update(() => {
                const selection = $getSelection();
                $setBlocksType(selection, () => $createQuoteNode());
            });
        }
    };

    const formatCode = () => {
        if (blockType !== 'code') {
            editor.update(() => {
                let selection = $getSelection();

                if (selection !== null) {
                    if (selection.isCollapsed()) {
                        $setBlocksType(selection, () => $createCodeNode());
                    } else {
                        const textContent = selection.getTextContent();
                        const codeNode = $createCodeNode();
                        selection.insertNodes([codeNode]);
                        selection = $getSelection();
                        if ($isRangeSelection(selection)) {
                            selection.insertRawText(textContent);
                        }
                    }
                }
            });
        }
    };

    return (
        <DropDown
        disabled= { disabled }
    buttonClassName = "toolbar-item block-controls"
    buttonIconClassName = { 'icon block-type ' + blockType }
    buttonLabel = { blockTypeToBlockName[blockType]}
    buttonAriaLabel = "Formatting options for text style" >
        <DropDownItem
          className={ 'item ' + dropDownActiveClass(blockType === 'paragraph') }
    onClick = { formatParagraph } >
        <i className="icon paragraph" />
            <span className="text" > Normal < /span>
                < /DropDownItem>
                < DropDownItem
    className = { 'item ' + dropDownActiveClass(blockType === 'h1') }
    onClick = {() => formatHeading('h1')
}>
    <i className="icon h1" />
        <span className="text" > Heading 1 < /span>
            < /DropDownItem>
            < DropDownItem
className = { 'item ' + dropDownActiveClass(blockType === 'h2') }
onClick = {() => formatHeading('h2')}>
    <i className="icon h2" />
        <span className="text" > Heading 2 < /span>
            < /DropDownItem>
            < DropDownItem
className = { 'item ' + dropDownActiveClass(blockType === 'h3') }
onClick = {() => formatHeading('h3')}>
    <i className="icon h3" />
        <span className="text" > Heading 3 < /span>
            < /DropDownItem>
            < DropDownItem
className = { 'item ' + dropDownActiveClass(blockType === 'bullet') }
onClick = { formatBulletList } >
    <i className="icon bullet-list" />
        <span className="text" > Bullet List < /span>
            < /DropDownItem>
            < DropDownItem
className = { 'item ' + dropDownActiveClass(blockType === 'number') }
onClick = { formatNumberedList } >
    <i className="icon numbered-list" />
        <span className="text" > Numbered List < /span>
            < /DropDownItem>
            < DropDownItem
className = { 'item ' + dropDownActiveClass(blockType === 'check') }
onClick = { formatCheckList } >
    <i className="icon check-list" />
        <span className="text" > Check List < /span>
            < /DropDownItem>
            < DropDownItem
className = { 'item ' + dropDownActiveClass(blockType === 'quote') }
onClick = { formatQuote } >
    <i className="icon quote" />
        <span className="text" > Quote < /span>
            < /DropDownItem>
            < DropDownItem
className = { 'item ' + dropDownActiveClass(blockType === 'code') }
onClick = { formatCode } >
    <i className="icon code" />
        <span className="text" > Code Block < /span>
            < /DropDownItem>
            < /DropDown>
    );
  }

function Divider(): JSX.Element {
    return <div className="divider" />;
}

function FontDropDown({
    editor,
    value,
    style,
    disabled = false,
}: {
    editor: LexicalEditor;
    value: string;
    style: string;
    disabled?: boolean;
}): JSX.Element {
    const handleClick = useCallback(
        (option: string) => {
            editor.update(() => {
                const selection = $getSelection();
                if (selection !== null) {
                    $patchStyleText(selection, {
                        [style]: option,
                    });
                }
            });
        },
        [editor, style],
    );

    const buttonAriaLabel =
        style === 'font-family'
            ? 'Formatting options for font family'
            : 'Formatting options for font size';

    return (
        <DropDown
        disabled= { disabled }
    buttonClassName = { 'toolbar-item ' + style }
    buttonLabel = { value }
    buttonIconClassName = {
        style === 'font-family' ? 'icon block-type font-family' : ''
}
buttonAriaLabel = { buttonAriaLabel } >
    {(style === 'font-family' ? FONT_FAMILY_OPTIONS : FONT_SIZE_OPTIONS).map(
        ([option, text]) => (
            <DropDownItem
              className= {`item ${dropDownActiveClass(value === option)} ${style === 'font-size' ? 'fontsize-item' : ''
                }`}
        onClick = {() => handleClick(option)}
        key = { option } >
        <span className="text" > { text } < /span>
    < /DropDownItem>
    ),
        )}
</DropDown>
    );
  }

function ElementFormatDropdown({
    editor,
    value,
    isRTL,
    disabled = false,
}: {
    editor: LexicalEditor;
    value: ElementFormatType;
    isRTL: boolean;
    disabled: boolean;
}) {
    const formatOption = ELEMENT_FORMAT_OPTIONS[value || 'left'];

    return (
        <DropDown
        disabled= { disabled }
    buttonLabel = { formatOption.name }
    buttonIconClassName = {`icon ${isRTL ? formatOption.iconRTL : formatOption.icon
        }`
}
buttonClassName = "toolbar-item spaced alignment"
buttonAriaLabel = "Formatting options for text alignment" >
    <DropDownItem
          onClick={
    () => {
        editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'left');
    }
}
className = "item" >
    <i className="icon left-align" />
        <span className="text" > Left Align < /span>
            < /DropDownItem>
            < DropDownItem
onClick = {() => {
    editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'center');
}}
className = "item" >
    <i className="icon center-align" />
        <span className="text" > Center Align < /span>
            < /DropDownItem>
            < DropDownItem
onClick = {() => {
    editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'right');
}}
className = "item" >
    <i className="icon right-align" />
        <span className="text" > Right Align < /span>
            < /DropDownItem>
            < DropDownItem
onClick = {() => {
    editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'justify');
}}
className = "item" >
    <i className="icon justify-align" />
        <span className="text" > Justify Align < /span>
            < /DropDownItem>
            < DropDownItem
onClick = {() => {
    editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'start');
}}
className = "item" >
    <i
            className={
    `icon ${isRTL
        ? ELEMENT_FORMAT_OPTIONS.start.iconRTL
        : ELEMENT_FORMAT_OPTIONS.start.icon
        }`
}
/>
    < span className = "text" > Start Align < /span>
        < /DropDownItem>
        < DropDownItem
onClick = {() => {
    editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'end');
}}
className = "item" >
    <i
            className={
    `icon ${isRTL
        ? ELEMENT_FORMAT_OPTIONS.end.iconRTL
        : ELEMENT_FORMAT_OPTIONS.end.icon
        }`
}
/>
    < span className = "text" > End Align < /span>
        < /DropDownItem>
        < Divider />
        <DropDownItem
          onClick={
    () => {
        editor.dispatchCommand(OUTDENT_CONTENT_COMMAND, undefined);
    }
}
className = "item" >
    <i className={ 'icon ' + (isRTL ? 'indent' : 'outdent') } />
        < span className = "text" > Outdent < /span>
            < /DropDownItem>
            < DropDownItem
onClick = {() => {
    editor.dispatchCommand(INDENT_CONTENT_COMMAND, undefined);
}}
className = "item" >
    <i className={ 'icon ' + (isRTL ? 'outdent' : 'indent') } />
        < span className = "text" > Indent < /span>
            < /DropDownItem>
            < /DropDown>
    );
  }

export function ToolbarPlugin({
    setIsLinkEditMode,
}: {
    setIsLinkEditMode: Dispatch<boolean>;
}): JSX.Element {
    const [editor] = useLexicalComposerContext();
    const [activeEditor, setActiveEditor] = useState(editor);
    const [blockType, setBlockType] =
        useState<keyof typeof blockTypeToBlockName>('paragraph');
    const [rootType, setRootType] =
        useState<keyof typeof rootTypeToRootName>('root');
    const [selectedElementKey, setSelectedElementKey] = useState<NodeKey | null>(
        null,
    );
    const [fontSize, setFontSize] = useState<string>('15px');
    const [fontColor, setFontColor] = useState<string>('#000');
    const [bgColor, setBgColor] = useState<string>('#fff');
    const [fontFamily, setFontFamily] = useState<string>('Arial');
    const [elementFormat, setElementFormat] = useState<ElementFormatType>('left');
    const [isLink, setIsLink] = useState(false);
    const [isBold, setIsBold] = useState(false);
    const [isItalic, setIsItalic] = useState(false);
    const [isUnderline, setIsUnderline] = useState(false);
    const [isStrikethrough, setIsStrikethrough] = useState(false);
    const [isSubscript, setIsSubscript] = useState(false);
    const [isSuperscript, setIsSuperscript] = useState(false);
    const [isCode, setIsCode] = useState(false);
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);
    const [modal, showModal] = useModal();
    const [isRTL, setIsRTL] = useState(false);
    const [codeLanguage, setCodeLanguage] = useState<string>('');
    const [isEditable, setIsEditable] = useState(() => editor.isEditable());

    const $updateToolbar = useCallback(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
            const anchorNode = selection.anchor.getNode();
            let element =
                anchorNode.getKey() === 'root'
                    ? anchorNode
                    : $findMatchingParent(anchorNode, (e) => {
                        const parent = e.getParent();
                        return parent !== null && $isRootOrShadowRoot(parent);
                    });

            if (element === null) {
                element = anchorNode.getTopLevelElementOrThrow();
            }

            const elementKey = element.getKey();
            const elementDOM = activeEditor.getElementByKey(elementKey);

            // Update text format
            setIsBold(selection.hasFormat('bold'));
            setIsItalic(selection.hasFormat('italic'));
            setIsUnderline(selection.hasFormat('underline'));
            setIsStrikethrough(selection.hasFormat('strikethrough'));
            setIsSubscript(selection.hasFormat('subscript'));
            setIsSuperscript(selection.hasFormat('superscript'));
            setIsCode(selection.hasFormat('code'));
            setIsRTL($isParentElementRTL(selection));

            // Update links
            const node = getSelectedNode(selection);
            const parent = node.getParent();
            if ($isLinkNode(parent) || $isLinkNode(node)) {
                setIsLink(true);
            } else {
                setIsLink(false);
            }

            const tableNode = $findMatchingParent(node, $isTableNode);
            if ($isTableNode(tableNode)) {
                setRootType('table');
            } else {
                setRootType('root');
            }

            if (elementDOM !== null) {
                setSelectedElementKey(elementKey);
                if ($isListNode(element)) {
                    const parentList = $getNearestNodeOfType<ListNode>(
                        anchorNode,
                        ListNode,
                    );
                    const type = parentList
                        ? parentList.getListType()
                        : element.getListType();
                    setBlockType(type);
                } else {
                    const type = $isHeadingNode(element)
                        ? element.getTag()
                        : element.getType();
                    if (type in blockTypeToBlockName) {
                        setBlockType(type as keyof typeof blockTypeToBlockName);
                    }
                    if ($isCodeNode(element)) {
                        const language =
                            element.getLanguage() as keyof typeof CODE_LANGUAGE_MAP;
                        setCodeLanguage(
                            language ? CODE_LANGUAGE_MAP[language] || language : '',
                        );
                        return;
                    }
                }
            }
            // Handle buttons
            setFontSize(
                $getSelectionStyleValueForProperty(selection, 'font-size', '15px'),
            );
            setFontColor(
                $getSelectionStyleValueForProperty(selection, 'color', '#000'),
            );
            setBgColor(
                $getSelectionStyleValueForProperty(
                    selection,
                    'background-color',
                    '#fff',
                ),
            );
            setFontFamily(
                $getSelectionStyleValueForProperty(selection, 'font-family', 'Arial'),
            );
            let matchingParent;
            if ($isLinkNode(parent)) {
                // If node is a link, we need to fetch the parent paragraph node to set format
                matchingParent = $findMatchingParent(
                    node,
                    (parentNode) => $isElementNode(parentNode) && !parentNode.isInline(),
                );
            }

            // If matchingParent is a valid node, pass it's format type
            setElementFormat(
                $isElementNode(matchingParent)
                    ? matchingParent.getFormatType()
                    : $isElementNode(node)
                        ? node.getFormatType()
                        : parent?.getFormatType() || 'left',
            );
        }
    }, [activeEditor]);

    useEffect(() => {
        return editor.registerCommand(
            SELECTION_CHANGE_COMMAND,
            (_payload, newEditor) => {
                $updateToolbar();
                setActiveEditor(newEditor);
                return false;
            },
            COMMAND_PRIORITY_CRITICAL,
        );
    }, [editor, $updateToolbar]);

    useEffect(() => {
        return mergeRegister(
            editor.registerEditableListener((editable) => {
                setIsEditable(editable);
            }),
            activeEditor.registerUpdateListener(({ editorState }) => {
                editorState.read(() => {
                    $updateToolbar();
                });
            }),
            activeEditor.registerCommand<boolean>(
                CAN_UNDO_COMMAND,
                (payload) => {
                    setCanUndo(payload);
                    return false;
                },
                COMMAND_PRIORITY_CRITICAL,
            ),
            activeEditor.registerCommand<boolean>(
                CAN_REDO_COMMAND,
                (payload) => {
                    setCanRedo(payload);
                    return false;
                },
                COMMAND_PRIORITY_CRITICAL,
            ),
        );
    }, [$updateToolbar, activeEditor, editor]);

    useEffect(() => {
        return activeEditor.registerCommand(
            KEY_MODIFIER_COMMAND,
            (payload) => {
                const event: KeyboardEvent = payload;
                const { code, ctrlKey, metaKey } = event;

                if (code === 'KeyK' && (ctrlKey || metaKey)) {
                    event.preventDefault();
                    let url: string | null;
                    if (!isLink) {
                        setIsLinkEditMode(true);
                        url = sanitizeUrl('https://');
                    } else {
                        setIsLinkEditMode(false);
                        url = null;
                    }
                    return activeEditor.dispatchCommand(TOGGLE_LINK_COMMAND, url);
                }
                return false;
            },
            COMMAND_PRIORITY_NORMAL,
        );
    }, [activeEditor, isLink, setIsLinkEditMode]);

    const applyStyleText = useCallback(
        (styles: Record<string, string>, skipHistoryStack?: boolean) => {
            activeEditor.update(
                () => {
                    const selection = $getSelection();
                    if (selection !== null) {
                        $patchStyleText(selection, styles);
                    }
                },
                skipHistoryStack ? { tag: 'historic' } : {},
            );
        },
        [activeEditor],
    );

    const clearFormatting = useCallback(() => {
        activeEditor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection) || $isTableSelection(selection)) {
                const anchor = selection.anchor;
                const focus = selection.focus;
                const nodes = selection.getNodes();

                if (anchor.key === focus.key && anchor.offset === focus.offset) {
                    return;
                }

                nodes.forEach((node, idx) => {
                    // We split the first and last node by the selection
                    // So that we don't format unselected text inside those nodes
                    if ($isTextNode(node)) {
                        // Use a separate variable to ensure TS does not lose the refinement
                        let textNode = node;
                        if (idx === 0 && anchor.offset !== 0) {
                            textNode = textNode.splitText(anchor.offset)[1] || textNode;
                        }
                        if (idx === nodes.length - 1) {
                            textNode = textNode.splitText(focus.offset)[0] || textNode;
                        }

                        if (textNode.__style !== '') {
                            textNode.setStyle('');
                        }
                        if (textNode.__format !== 0) {
                            textNode.setFormat(0);
                            $getNearestBlockElementAncestorOrThrow(textNode).setFormat('');
                        }
                        node = textNode;
                    } else if ($isHeadingNode(node) || $isQuoteNode(node)) {
                        node.replace($createParagraphNode(), true);
                    } else if ($isDecoratorBlockNode(node)) {
                        node.setFormat('');
                    }
                });
            }
        });
    }, [activeEditor]);

    const onFontColorSelect = useCallback(
        (value: string, skipHistoryStack: boolean) => {
            applyStyleText({ color: value }, skipHistoryStack);
        },
        [applyStyleText],
    );

    const onBgColorSelect = useCallback(
        (value: string, skipHistoryStack: boolean) => {
            applyStyleText({ 'background-color': value }, skipHistoryStack);
        },
        [applyStyleText],
    );

    const insertLink = useCallback(() => {
        if (!isLink) {
            setIsLinkEditMode(true);
            editor.dispatchCommand(TOGGLE_LINK_COMMAND, sanitizeUrl('https://'));
        } else {
            setIsLinkEditMode(false);
            editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
        }
    }, [editor, isLink, setIsLinkEditMode]);

    const onCodeLanguageSelect = useCallback(
        (value: string) => {
            activeEditor.update(() => {
                if (selectedElementKey !== null) {
                    const node = $getNodeByKey(selectedElementKey);
                    if ($isCodeNode(node)) {
                        node.setLanguage(value);
                    }
                }
            });
        },
        [activeEditor, selectedElementKey],
    );
    const insertGifOnClick = (payload: InsertImagePayload) => {
        activeEditor.dispatchCommand(INSERT_IMAGE_COMMAND, payload);
    };

    return (
        <div className= "toolbar" >
        <button
          disabled={ !canUndo || !isEditable }
    onClick = {() => {
        activeEditor.dispatchCommand(UNDO_COMMAND, undefined);
    }
}
title = { IS_APPLE? 'Undo (⌘Z)': 'Undo (Ctrl+Z)' }
type = "button"
className = "toolbar-item spaced"
aria - label="Undo" >
    <i className="format undo" />
        </button>
        < button
disabled = {!canRedo || !isEditable}
onClick = {() => {
    activeEditor.dispatchCommand(REDO_COMMAND, undefined);
}}
title = { IS_APPLE? 'Redo (⌘Y)': 'Redo (Ctrl+Y)' }
type = "button"
className = "toolbar-item"
aria - label="Redo" >
    <i className="format redo" />
        </button>
        < Divider />
        { blockType in blockTypeToBlockName && activeEditor === editor && (
            <>
            <BlockFormatDropDown
              disabled={ !isEditable }
blockType = { blockType }
rootType = { rootType }
editor = { editor }
    />
    <Divider />
    < />
        )}
{
    blockType === 'code' ? (
        <DropDown
            disabled= {!isEditable
}
buttonClassName = "toolbar-item code-language"
buttonLabel = { getLanguageFriendlyName(codeLanguage) }
buttonAriaLabel = "Select language" >
{
    CODE_LANGUAGE_OPTIONS.map(([value, name]) => {
        return (
            <DropDownItem
                  className= {`item ${dropDownActiveClass(
                value === codeLanguage,
            )}`
    }
                  onClick = {() => onCodeLanguageSelect(value)}
key = { value } >
    <span className="text" > { name } < /span>
        < /DropDownItem>
              );
            })}
</DropDown>
        ) : (
    <>
    <FontDropDown
              disabled= {!isEditable}
style = { 'font-family'}
value = { fontFamily }
editor = { editor }
    />
    <Divider />
    < FontSize
selectionFontSize = { fontSize.slice(0, -2) }
editor = { editor }
disabled = {!isEditable}
/>
    < Divider />
    <button
              disabled={ !isEditable }
onClick = {() => {
    activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold');
}}
className = { 'toolbar-item spaced ' + (isBold ? 'active' : '') }
title = { IS_APPLE? 'Bold (⌘B)': 'Bold (Ctrl+B)' }
type = "button"
aria - label={
    `Format text as bold. Shortcut: ${IS_APPLE ? '⌘B' : 'Ctrl+B'
        }`
}>
    <i className="format bold" />
        </button>
        < button
disabled = {!isEditable}
onClick = {() => {
    activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic');
}}
className = { 'toolbar-item spaced ' + (isItalic ? 'active' : '') }
title = { IS_APPLE? 'Italic (⌘I)': 'Italic (Ctrl+I)' }
type = "button"
aria - label={
    `Format text as italics. Shortcut: ${IS_APPLE ? '⌘I' : 'Ctrl+I'
        }`
}>
    <i className="format italic" />
        </button>
        < button
disabled = {!isEditable}
onClick = {() => {
    activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline');
}}
className = { 'toolbar-item spaced ' + (isUnderline ? 'active' : '') }
title = { IS_APPLE? 'Underline (⌘U)': 'Underline (Ctrl+U)' }
type = "button"
aria - label={
    `Format text to underlined. Shortcut: ${IS_APPLE ? '⌘U' : 'Ctrl+U'
        }`
}>
    <i className="format underline" />
        </button>
        < button
disabled = {!isEditable}
onClick = {() => {
    activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'code');
}}
className = { 'toolbar-item spaced ' + (isCode ? 'active' : '') }
title = "Insert code block"
type = "button"
aria - label="Insert code block" >
    <i className="format code" />
        </button>
        < button
disabled = {!isEditable}
onClick = { insertLink }
className = { 'toolbar-item spaced ' + (isLink ? 'active' : '') }
aria - label="Insert link"
title = "Insert link"
type = "button" >
    <i className="format link" />
        </button>
        < DropdownColorPicker
disabled = {!isEditable}
buttonClassName = "toolbar-item color-picker"
buttonAriaLabel = "Formatting text color"
buttonIconClassName = "icon font-color"
color = { fontColor }
onChange = { onFontColorSelect }
title = "text color"
    />
    <DropdownColorPicker
              disabled={ !isEditable }
buttonClassName = "toolbar-item color-picker"
buttonAriaLabel = "Formatting background color"
buttonIconClassName = "icon bg-color"
color = { bgColor }
onChange = { onBgColorSelect }
title = "bg color"
    />
    <DropDown
              disabled={ !isEditable }
buttonClassName = "toolbar-item spaced"
buttonLabel = ""
buttonAriaLabel = "Formatting options for additional text styles"
buttonIconClassName = "icon dropdown-more" >
    <DropDownItem
                onClick={
    () => {
        activeEditor.dispatchCommand(
            FORMAT_TEXT_COMMAND,
            'strikethrough',
        );
    }
}
className = { 'item ' + dropDownActiveClass(isStrikethrough) }
title = "Strikethrough"
aria - label="Format text with a strikethrough" >
    <i className="icon strikethrough" />
        <span className="text" > Strikethrough < /span>
            < /DropDownItem>
            < DropDownItem
onClick = {() => {
    activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'subscript');
}}
className = { 'item ' + dropDownActiveClass(isSubscript) }
title = "Subscript"
aria - label="Format text with a subscript" >
    <i className="icon subscript" />
        <span className="text" > Subscript < /span>
            < /DropDownItem>
            < DropDownItem
onClick = {() => {
    activeEditor.dispatchCommand(
        FORMAT_TEXT_COMMAND,
        'superscript',
    );
}}
className = { 'item ' + dropDownActiveClass(isSuperscript) }
title = "Superscript"
aria - label="Format text with a superscript" >
    <i className="icon superscript" />
        <span className="text" > Superscript < /span>
            < /DropDownItem>
            < DropDownItem
onClick = { clearFormatting }
className = "item"
title = "Clear text formatting"
aria - label="Clear all text formatting" >
    <i className="icon clear" />
        <span className="text" > Clear Formatting < /span>
            < /DropDownItem>
            < /DropDown>
            < Divider />
            <DropDown
              disabled={ !isEditable }
buttonClassName = "toolbar-item spaced"
buttonLabel = "Insert"
buttonAriaLabel = "Insert specialized editor node"
buttonIconClassName = "icon plus" >
    <DropDownItem
                onClick={
    () => {
        activeEditor.dispatchCommand(
            INSERT_HORIZONTAL_RULE_COMMAND,
            undefined,
        );
    }
}
className = "item" >
    <i className="icon horizontal-rule" />
        <span className="text" > Horizontal Rule < /span>
            < /DropDownItem>
            < DropDownItem
onClick = {() => {
    activeEditor.dispatchCommand(INSERT_PAGE_BREAK, undefined);
}}
className = "item" >
    <i className="icon page-break" />
        <span className="text" > Page Break < /span>
            < /DropDownItem>
            < DropDownItem
onClick = {() => {
    showModal('Insert Image', (onClose) => (
        <InsertImageDialog
                      activeEditor= { activeEditor }
                      onClose = { onClose }
        />
                  ));
}}
className = "item" >
    <i className="icon image" />
        <span className="text" > Image < /span>
            < /DropDownItem>
            < DropDownItem
onClick = {() => {
    showModal('Insert Inline Image', (onClose) => (
        <InsertInlineImageDialog
                      activeEditor= { activeEditor }
                      onClose = { onClose }
        />
                  ));
}}
className = "item" >
    <i className="icon image" />
        <span className="text" > Inline Image < /span>
            < /DropDownItem>
            < DropDownItem
onClick = {() =>
insertGifOnClick({
    altText: 'Cat typing on a laptop',
    src: catTypingGif,
})
                }
className = "item" >
    <i className="icon gif" />
        <span className="text" > GIF < /span>
            < /DropDownItem>
            < DropDownItem
onClick = {() => {
    activeEditor.dispatchCommand(
        INSERT_EXCALIDRAW_COMMAND,
        undefined,
    );
}}
className = "item" >
    <i className="icon diagram-2" />
        <span className="text" > Excalidraw < /span>
            < /DropDownItem>
            < DropDownItem
onClick = {() => {
    showModal('Insert Table', (onClose) => (
        <InsertTableDialog
                      activeEditor= { activeEditor }
                      onClose = { onClose }
        />
                  ));
}}
className = "item" >
    <i className="icon table" />
        <span className="text" > Table < /span>
            < /DropDownItem>
            < DropDownItem
onClick = {() => {
    showModal('Insert Poll', (onClose) => (
        <InsertPollDialog
                      activeEditor= { activeEditor }
                      onClose = { onClose }
        />
                  ));
}}
className = "item" >
    <i className="icon poll" />
        <span className="text" > Poll < /span>
            < /DropDownItem>
            < DropDownItem
onClick = {() => {
    showModal('Insert Columns Layout', (onClose) => (
        <InsertLayoutDialog
                      activeEditor= { activeEditor }
                      onClose = { onClose }
        />
                  ));
}}
className = "item" >
    <i className="icon columns" />
        <span className="text" > Columns Layout < /span>
            < /DropDownItem>

            < DropDownItem
onClick = {() => {
    showModal('Insert Equation', (onClose) => (
        <InsertEquationDialog
                      activeEditor= { activeEditor }
                      onClose = { onClose }
        />
                  ));
}}
className = "item" >
    <i className="icon equation" />
        <span className="text" > Equation < /span>
            < /DropDownItem>
            < DropDownItem
onClick = {() => {
    editor.update(() => {
        const root = $getRoot();
        const stickyNode = $createStickyNode(0, 0);
        root.append(stickyNode);
    });
}}
className = "item" >
    <i className="icon sticky" />
        <span className="text" > Sticky Note < /span>
            < /DropDownItem>
            < DropDownItem
onClick = {() => {
    editor.dispatchCommand(INSERT_COLLAPSIBLE_COMMAND, undefined);
}}
className = "item" >
    <i className="icon caret-right" />
        <span className="text" > Collapsible container < /span>
            < /DropDownItem>
{
    EmbedConfigs.map((embedConfig) => (
        <DropDownItem
                  key= { embedConfig.type }
                  onClick = {() => {
        activeEditor.dispatchCommand(
            INSERT_EMBED_COMMAND,
            embedConfig.type,
        );
    }}
className = "item" >
    { embedConfig.icon }
    < span className = "text" > { embedConfig.contentName } < /span>
        < /DropDownItem>
              ))}
</DropDown>
    < />
        )}
<Divider />
    < ElementFormatDropdown
disabled = {!isEditable}
value = { elementFormat }
editor = { editor }
isRTL = { isRTL }
    />

    { modal }
    < /div>
    );
  }


















const MIN_ALLOWED_FONT_SIZE = 8;
const MAX_ALLOWED_FONT_SIZE = 72;
const DEFAULT_FONT_SIZE = 15;

// eslint-disable-next-line no-shadow
enum updateFontSizeType {
    increment = 1,
    decrement,
}

export function FontSize({
    selectionFontSize,
    disabled,
    editor,
}: {
    selectionFontSize: string;
    disabled: boolean;
    editor: LexicalEditor;
}) {
    const [inputValue, setInputValue] = React.useState<string>(selectionFontSize);

    /**
     * Calculates the new font size based on the update type.
     * @param currentFontSize - The current font size
     * @param updateType - The type of change, either increment or decrement
     * @returns the next font size
     */
    const calculateNextFontSize = (
        currentFontSize: number,
        updateType: updateFontSizeType | null,
    ) => {
        if (!updateType) {
            return currentFontSize;
        }

        let updatedFontSize: number = currentFontSize;
        switch (updateType) {
            case updateFontSizeType.decrement:
                switch (true) {
                    case currentFontSize > MAX_ALLOWED_FONT_SIZE:
                        updatedFontSize = MAX_ALLOWED_FONT_SIZE;
                        break;
                    case currentFontSize >= 48:
                        updatedFontSize -= 12;
                        break;
                    case currentFontSize >= 24:
                        updatedFontSize -= 4;
                        break;
                    case currentFontSize >= 14:
                        updatedFontSize -= 2;
                        break;
                    case currentFontSize >= 9:
                        updatedFontSize -= 1;
                        break;
                    default:
                        updatedFontSize = MIN_ALLOWED_FONT_SIZE;
                        break;
                }
                break;

            case updateFontSizeType.increment:
                switch (true) {
                    case currentFontSize < MIN_ALLOWED_FONT_SIZE:
                        updatedFontSize = MIN_ALLOWED_FONT_SIZE;
                        break;
                    case currentFontSize < 12:
                        updatedFontSize += 1;
                        break;
                    case currentFontSize < 20:
                        updatedFontSize += 2;
                        break;
                    case currentFontSize < 36:
                        updatedFontSize += 4;
                        break;
                    case currentFontSize <= 60:
                        updatedFontSize += 12;
                        break;
                    default:
                        updatedFontSize = MAX_ALLOWED_FONT_SIZE;
                        break;
                }
                break;

            default:
                break;
        }
        return updatedFontSize;
    };
    /**
     * Patches the selection with the updated font size.
     */

    const updateFontSizeInSelection = React.useCallback(
        (newFontSize: string | null, updateType: updateFontSizeType | null) => {
            const getNextFontSize = (prevFontSize: string | null): string => {
                if (!prevFontSize) {
                    prevFontSize = `${DEFAULT_FONT_SIZE}px`;
                }
                prevFontSize = prevFontSize.slice(0, -2);
                const nextFontSize = calculateNextFontSize(
                    Number(prevFontSize),
                    updateType,
                );
                return `${nextFontSize}px`;
            };

            editor.update(() => {
                if (editor.isEditable()) {
                    const selection = $getSelection();
                    if (selection !== null) {
                        $patchStyleText(selection, {
                            'font-size': newFontSize || getNextFontSize,
                        });
                    }
                }
            });
        },
        [editor],
    );

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        const inputValueNumber = Number(inputValue);

        if (['e', 'E', '+', '-'].includes(e.key) || isNaN(inputValueNumber)) {
            e.preventDefault();
            setInputValue('');
            return;
        }

        if (e.key === 'Enter') {
            e.preventDefault();

            let updatedFontSize = inputValueNumber;
            if (inputValueNumber > MAX_ALLOWED_FONT_SIZE) {
                updatedFontSize = MAX_ALLOWED_FONT_SIZE;
            } else if (inputValueNumber < MIN_ALLOWED_FONT_SIZE) {
                updatedFontSize = MIN_ALLOWED_FONT_SIZE;
            }
            setInputValue(String(updatedFontSize));
            updateFontSizeInSelection(String(updatedFontSize) + 'px', null);
        }
    };

    const handleButtonClick = (updateType: updateFontSizeType) => {
        if (inputValue !== '') {
            const nextFontSize = calculateNextFontSize(
                Number(inputValue),
                updateType,
            );
            updateFontSizeInSelection(String(nextFontSize) + 'px', null);
        } else {
            updateFontSizeInSelection(null, updateType);
        }
    };

    React.useEffect(() => {
        setInputValue(selectionFontSize);
    }, [selectionFontSize]);

    return (
        <>
        <button
        type= "button"
    disabled = {
        disabled ||
        (selectionFontSize !== '' &&
            Number(inputValue) <= MIN_ALLOWED_FONT_SIZE)
}
onClick = {() => handleButtonClick(updateFontSizeType.decrement)}
className = "toolbar-item font-decrement" >
    <i className="format minus-icon" />
        </button>

        < input
type = "number"
value = { inputValue }
disabled = { disabled }
className = "toolbar-item font-size-input"
min = { MIN_ALLOWED_FONT_SIZE }
max = { MAX_ALLOWED_FONT_SIZE }
onChange = {(e) => setInputValue(e.target.value)}
onKeyDown = { handleKeyPress }
    />

    <button
        type="button"
disabled = {
    disabled ||
    (selectionFontSize !== '' &&
        Number(inputValue) >= MAX_ALLOWED_FONT_SIZE)
        }
onClick = {() => handleButtonClick(updateFontSizeType.increment)}
className = "toolbar-item font-increment" >
    <i className="format add-icon" />
        </button>
        < />
  );
}



export function TreeViewPlugin(): JSX.Element {
    const [editor] = useLexicalComposerContext();
    return (
        <TreeView
      viewClassName= "tree-view-output"
    treeTypeButtonClassName = "debug-treetype-button"
    timeTravelPanelClassName = "debug-timetravel-panel"
    timeTravelButtonClassName = "debug-timetravel-button"
    timeTravelPanelSliderClassName = "debug-timetravel-panel-slider"
    timeTravelPanelButtonClassName = "debug-timetravel-panel-button"
    editor = { editor }
        />
  );
}

export const INSERT_TWEET_COMMAND: LexicalCommand<string> = createCommand(
    'INSERT_TWEET_COMMAND',
);

export function TwitterPlugin(): JSX.Element | null {
    const [editor] = useLexicalComposerContext();

    useEffect(() => {
        if (!editor.hasNodes([TweetNode])) {
            throw new Error('TwitterPlugin: TweetNode not registered on editor');
        }

        return editor.registerCommand<string>(
            INSERT_TWEET_COMMAND,
            (payload) => {
                const tweetNode = $createTweetNode(payload);
                $insertNodeToNearestRoot(tweetNode);

                return true;
            },
            COMMAND_PRIORITY_EDITOR,
        );
    }, [editor]);

    return null;
}




const validInputTypes = new Set([
    'insertText',
    'insertCompositionText',
    'insertFromComposition',
    'insertLineBreak',
    'insertParagraph',
    'deleteCompositionText',
    'deleteContentBackward',
    'deleteByComposition',
    'deleteContent',
    'deleteContentForward',
    'deleteWordBackward',
    'deleteWordForward',
    'deleteHardLineBackward',
    'deleteSoftLineBackward',
    'deleteHardLineForward',
    'deleteSoftLineForward',
]);

export function TypingPerfPlugin(): JSX.Element | null {
    const report = useReport();
    useEffect(() => {
        let start = 0;
        let timerId: ReturnType<typeof setTimeout> | null;
        let keyPressTimerId: ReturnType<typeof setTimeout> | null;
        let log: Array<DOMHighResTimeStamp> = [];
        let invalidatingEvent = false;

        const measureEventEnd = function logKeyPress() {
            if (keyPressTimerId != null) {
                if (invalidatingEvent) {
                    invalidatingEvent = false;
                } else {
                    log.push(performance.now() - start);
                }

                clearTimeout(keyPressTimerId);
                keyPressTimerId = null;
            }
        };

        const measureEventStart = function measureEvent() {
            if (timerId != null) {
                clearTimeout(timerId);
                timerId = null;
            }

            // We use a setTimeout(0) instead of requestAnimationFrame, due to
            // inconsistencies between the sequencing of rAF in different browsers.
            keyPressTimerId = setTimeout(measureEventEnd, 0);
            // Schedule a timer to report the results.
            timerId = setTimeout(() => {
                const total = log.reduce((a, b) => a + b, 0);
                const reportedText =
                    'Typing Perf: ' + Math.round((total / log.length) * 100) / 100 + 'ms';
                report(reportedText);
                log = [];
            }, 2000);
            // Make the time after we do the previous logic, so we don't measure the overhead
            // for it all.
            start = performance.now();
        };

        const beforeInputHandler = function beforeInputHandler(event: InputEvent) {
            if (!validInputTypes.has(event.inputType) || invalidatingEvent) {
                invalidatingEvent = false;
                return;
            }

            measureEventStart();
        };

        const keyDownHandler = function keyDownHandler(event: KeyboardEvent) {
            const keyCode = event.keyCode;

            if (keyCode === 8 || keyCode === 13) {
                measureEventStart();
            }
        };

        const pasteHandler = function pasteHandler() {
            invalidatingEvent = true;
        };

        const cutHandler = function cutHandler() {
            invalidatingEvent = true;
        };

        window.addEventListener('keydown', keyDownHandler, true);
        window.addEventListener('selectionchange', measureEventEnd, true);
        window.addEventListener('beforeinput', beforeInputHandler, true);
        window.addEventListener('paste', pasteHandler, true);
        window.addEventListener('cut', cutHandler, true);

        return () => {
            window.removeEventListener('keydown', keyDownHandler, true);
            window.removeEventListener('selectionchange', measureEventEnd, true);
            window.removeEventListener('beforeinput', beforeInputHandler, true);
            window.removeEventListener('paste', pasteHandler, true);
            window.removeEventListener('cut', cutHandler, true);
        };
    }, [report]);

    return null;
}

export type InsertTableCommandPayload = Readonly<{
    columns: string;
    rows: string;
    includeHeaders?: boolean;
}>;

export type CellContextShape = {
    cellEditorConfig: null | CellEditorConfig;
    cellEditorPlugins: null | JSX.Element | Array<JSX.Element>;
    set: (
        cellEditorConfig: null | CellEditorConfig,
        cellEditorPlugins: null | JSX.Element | Array<JSX.Element>,
    ) => void;
};

export type CellEditorConfig = Readonly<{
    namespace: string;
    nodes?: ReadonlyArray<Klass<LexicalNode>>;
    onError: (error: Error, editor: LexicalEditor) => void;
    readOnly?: boolean;
    theme?: EditorThemeClasses;
}>;

export const INSERT_NEW_TABLE_COMMAND: LexicalCommand<InsertTableCommandPayload> =
    createCommand('INSERT_NEW_TABLE_COMMAND');

export const CellContext = createContext<CellContextShape>({
    cellEditorConfig: null,
    cellEditorPlugins: null,
    set: () => {
        // Empty
    },
});

export function TableContext({ children }: { children: JSX.Element }) {
    const [contextValue, setContextValue] = useState<{
        cellEditorConfig: null | CellEditorConfig;
        cellEditorPlugins: null | JSX.Element | Array<JSX.Element>;
    }>({
        cellEditorConfig: null,
        cellEditorPlugins: null,
    });
    return (
        <CellContext.Provider
      value= { useMemo(
        () => ({
        cellEditorConfig: contextValue.cellEditorConfig,
        cellEditorPlugins: contextValue.cellEditorPlugins,
        set: (cellEditorConfig, cellEditorPlugins) => {
            setContextValue({ cellEditorConfig, cellEditorPlugins });
        },
    }),
        [contextValue.cellEditorConfig, contextValue.cellEditorPlugins],
      )
}>
    { children }
    < /CellContext.Provider>
  );
}

export function InsertTableDialog({
    activeEditor,
    onClose,
}: {
    activeEditor: LexicalEditor;
    onClose: () => void;
}): JSX.Element {
    const [rows, setRows] = useState('5');
    const [columns, setColumns] = useState('5');
    const [isDisabled, setIsDisabled] = useState(true);

    useEffect(() => {
        const row = Number(rows);
        const column = Number(columns);
        if (row && row > 0 && row <= 500 && column && column > 0 && column <= 50) {
            setIsDisabled(false);
        } else {
            setIsDisabled(true);
        }
    }, [rows, columns]);

    const onClick = () => {
        activeEditor.dispatchCommand(INSERT_TABLE_COMMAND, {
            columns,
            rows,
        });

        onClose();
    };

    return (
        <>
        <TextInput
        placeholder= { '# of rows (1-500)'}
    label = "Rows"
    onChange = { setRows }
    value = { rows }
    data - test - id="table-modal-rows"
    type = "number"
        />
        <TextInput
        placeholder={ '# of columns (1-50)' }
    label = "Columns"
    onChange = { setColumns }
    value = { columns }
    data - test - id="table-modal-columns"
    type = "number"
        />
        <DialogActions data - test - id="table-model-confirm-insert" >
            <Button disabled={ isDisabled } onClick = { onClick } >
                Confirm
                < /Button>
                < /DialogActions>
                < />
  );
}

export function TablePlugin({
    cellEditorConfig,
    children,
}: {
    cellEditorConfig: CellEditorConfig;
    children: JSX.Element | Array<JSX.Element>;
}): JSX.Element | null {
    const [editor] = useLexicalComposerContext();
    const cellContext = useContext(CellContext);

    useEffect(() => {
        if (!editor.hasNodes([TableNode])) {
            invariant(false, 'TablePlugin: TableNode is not registered on editor');
        }

        cellContext.set(cellEditorConfig, children);

        return editor.registerCommand<InsertTableCommandPayload>(
            INSERT_NEW_TABLE_COMMAND,
            ({ columns, rows, includeHeaders }) => {
                const tableNode = $createTableNodeWithDimensions(
                    Number(rows),
                    Number(columns),
                    includeHeaders,
                );
                $insertNodes([tableNode]);
                return true;
            },
            COMMAND_PRIORITY_EDITOR,
        );
    }, [cellContext, cellEditorConfig, children, editor]);

    return null;
}
