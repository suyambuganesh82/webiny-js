import { validation } from "@webiny/validation";
import {
    pipe,
    withFields,
    withProps,
    string,
    ref,
    withName,
    withHooks,
    setOnce,
    withStaticProps
} from "@webiny/commodo";
import withChangedOnFields from "./withChangedOnFields";
import { CmsContext } from "../../types";
import shortid from "shortid";
import toSlug from "@webiny/api-headless-cms/utils/toSlug";
import { cloneDeep } from "lodash";

export default ({ createBase, context }: { createBase: Function; context: CmsContext }) => {
    const modifyQueryArgs = (args = {}, environment) => {
        const returnArgs = cloneDeep<any>(args);
        if (returnArgs.query) {
            returnArgs.query = {
                $and: [{ environment: environment.id }, returnArgs.query]
            };
        } else {
            returnArgs.query = { environment: environment.id };
        }

        return returnArgs;
    };

    // const createBaseContentModel = ({ context }) => () => {
    //     const environment = context.cms.getEnvironment();
    //     return
    //     pipe(
    //         withFields({
    //             id: context.commodo.fields.id(),
    //             environment: setOnce()(context.commodo.fields.id())
    //         }),
    //         withStaticProps(({ find, count, findOne }) => ({
    //                 find(args) {
    //                     return find.call(this, modifyQueryArgs(args, environment));
    //                 },
    //             })
    //         // withStorage({ driver }),
    //         // withUser(context),
    //         // withSoftDelete(),
    //         // withCrudLogs()
    //     )();
    // }

    // const environment =
    //     (context.cms && context.cms.getEnvironment && context.cms.getEnvironment()) || process.env.TEST_ENV_ID;
    // const CmsContentModel = pipe(
    //     withFields({
    //         id: context.commodo.fields.id(),
    //         environment: setOnce()(context.commodo.fields.id())
    //     }),
    //     withStaticProps(({ find, count, findOne }) => ({
    //         find(args) {
    //             return find.call(this, modifyQueryArgs(args, environment));
    //         }
    //     })),
    //     withName(`CmsContentModel`),
    //     withFields(() => ({
    //         name: string()
    //     }))
    // )();

    const CmsEnvironment = pipe(
        withName("CmsEnvironment"),
        withChangedOnFields(),
        withFields(() => ({
            name: string({ validation: validation.create("required,maxLength:100") }),
            slug: setOnce()(string({ validation: validation.create("required") })),
            description: string({ validation: validation.create("maxLength:200") }),
            createdFrom: ref({
                instanceOf: context.models.CmsEnvironment
            })
        })),
        withProps({
            initial: false, // Set in the installation process in order to create the initial environment.
            get environmentAlias() {
                const { CmsEnvironmentAlias } = context.models;
                return CmsEnvironmentAlias.findOne({
                    query: { environment: this.id }
                });
            },
            get isProduction() {
                return this.environmentAlias.then(environmentAlias => {
                    return environmentAlias && environmentAlias.isProduction === true;
                });
            },
            get contentModels() {
                try {
                    // TODO [Andrei] [help pls]: fix the garbage CmsContentModel... (contentmodel.model.ts)
                    // console.log(CmsContentModel);
                    // console.log(CmsContentModel.find({}));

                    // return CmsContentModel.find({});
                    return [{ modelId: "model-id-1" }, { modelId: "model-id-two" }];
                    // return CmsContentModel.find({ environment: this.id });
                } catch (e) {
                    console.log(e);
                    throw new Error(e);
                }
            }
        }),
        withHooks({
            async beforeCreate() {
                if (!this.initial) {
                    if (!(await this.createdFrom)) {
                        throw new Error('Base environment ("createdFrom" field) not set.');
                    }
                }
            },
            async afterCreate() {
                const sourceEnvironment = await this.createdFrom;
                if (sourceEnvironment) {
                    await context.cms.dataManager.copyEnvironment({
                        copyFrom: sourceEnvironment.id,
                        copyTo: this.id
                    });
                }
            },
            async beforeDelete() {
                const environmentAlias = await this.environmentAlias;
                if (environmentAlias) {
                    throw new Error(
                        `Cannot delete the environment because it's currently linked to the "${environmentAlias.name}" environment alias.`
                    );
                }
            },
            async afterChange() {
                const environmentAlias = await this.environmentAlias;
                if (environmentAlias) {
                    environmentAlias.changedOn = new Date();
                    await environmentAlias.save();
                }
            },
            async afterDelete() {
                await context.cms.dataManager.deleteEnvironment({ environment: this.id });
            }
        })
    )(createBase());

    return CmsEnvironment;
};
