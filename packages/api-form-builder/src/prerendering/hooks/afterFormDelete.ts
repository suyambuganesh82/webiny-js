import { ContextPlugin } from "@webiny/api";
import { PbContext } from "@webiny/api-page-builder/types";
import { FormBuilderContext } from "~/types";

export default () => {
    return new ContextPlugin<FormBuilderContext & PbContext>(
        async ({ formBuilder, pageBuilder }) => {
            /**
             * If page contains a form that has been deleted,
             * then this hook should trigger re-render for all pages that contain that form.
             */
            formBuilder.onFormAfterDelete.subscribe(async ({ form }) => {
                await pageBuilder.prerendering.render({
                    tags: [
                        { tag: { key: "fb-form", value: form.formId } },
                        { tag: { key: "fb-form-revision", value: form.id } }
                    ]
                });
            });
        }
    );
};
