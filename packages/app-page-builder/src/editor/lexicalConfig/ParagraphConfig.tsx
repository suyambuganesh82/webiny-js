import React from "react";
import { LexicalEditorConfig as BaseConfig } from "@webiny/lexical-editor";
import { CompositionScope } from "@webiny/react-composition";

const ParagraphToolbarAction = (props: React.ComponentProps<typeof BaseConfig.ToolbarElement>) => {
    return (
        <CompositionScope name={"pb.paragraph"}>
            <BaseConfig>
                <BaseConfig.ToolbarElement {...props} />
            </BaseConfig>
        </CompositionScope>
    );
};

const ParagraphToolbarPlugin = (props: React.ComponentProps<typeof BaseConfig.ToolbarElement>) => {
    return (
        <CompositionScope name={"pb.paragraph"}>
            <BaseConfig>
                <BaseConfig.Plugin {...props} />
            </BaseConfig>
        </CompositionScope>
    );
};

const ParagraphToolbarNode = (props: React.ComponentProps<typeof BaseConfig.ToolbarElement>) => {
    return (
        <CompositionScope name={"pb.paragraph"}>
            <BaseConfig>
                <BaseConfig.Node {...props} />
            </BaseConfig>
        </CompositionScope>
    );
};

export const ParagraphConfig = ({ children }: { children: React.ReactNode }) => {
    return { children };
};

ParagraphConfig.ToolbarAction = ParagraphToolbarAction;
ParagraphConfig.Plugin = ParagraphToolbarPlugin;
ParagraphConfig.Node = ParagraphToolbarNode;
