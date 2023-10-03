import {
    generateInitialLexicalValue,
    getSupportedNodeList,
    getTheme
} from "@webiny/lexical-editor";
import { createHeadlessEditor } from "@lexical/headless";
import { $generateNodesFromDOM } from "@lexical/html";
import { $getRoot, $insertNodes } from "lexical";

const jsdom = require("jsdom");
const { JSDOM } = jsdom;

/**
 * Parse html string to lexical object.
 * This parser by default uses the Webiny lexical nodes.
 */
export const parseToLexicalObject = (
    htmlString: string,
    onSuccess: (data: Record<string, any>) => void,
    onError?: (onError: Error) => void
): void => {
    if (!htmlString?.length) {
        return JSON.parse(generateInitialLexicalValue());
    }

    const editor = createHeadlessEditor({
        nodes: getSupportedNodeList(),
        onError: onError,
        theme: getTheme()
    });

    editor.update(() => {
        // Generate dom tree
        const dom = new JSDOM(htmlString);
        // Convert to lexical node objects format that can be stored in db.
        const lexicalNodes = $generateNodesFromDOM(editor, dom.window.document);
        // Select the root
        $getRoot().select();
        // Insert them at a selection.
        $insertNodes(lexicalNodes);
        // callback
        onSuccess(editor.getEditorState().toJSON());
    });
};
