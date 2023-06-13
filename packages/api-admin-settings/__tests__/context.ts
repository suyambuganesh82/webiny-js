import { ContextPlugin } from "@webiny/handler";
import { createRawEventHandler, createRawHandler } from "@webiny/handler-aws";
import dbPlugins from "@webiny/handler-db";
import { DynamoDbDriver } from "@webiny/db-dynamodb";
import { AdminSettingsContext } from "~/types";
import { createAdminSettingsContext } from "~/index";
import { createTable } from "~/storage/definitions/table";
import { createSettingsEntity } from "~/storage/definitions/settings";
import { getDocumentClient } from "@webiny/project-utils/testing/dynamodb";

export const createMockContextHandler = () => {
    const tableName = process.env.DB_TABLE as string;
    const documentClient = getDocumentClient();

    const table = createTable({
        documentClient,
        table: table => {
            return {
                ...table,
                name: tableName
            };
        }
    });

    const entity = createSettingsEntity({
        entityName: "AdminSettings",
        table
    });

    const handler = createRawHandler<any, AdminSettingsContext>({
        plugins: [
            new ContextPlugin<AdminSettingsContext>(async context => {
                (context as any).tenancy = {
                    getCurrentTenant: () => {
                        return {
                            id: "root"
                        };
                    }
                };
            }),
            dbPlugins({
                table: tableName,
                driver: new DynamoDbDriver({ documentClient })
            }),
            createAdminSettingsContext(),
            createRawEventHandler(async ({ context }) => {
                return context;
            })
        ]
    });

    return {
        handle: () => {
            return handler({}, {} as any);
        },
        documentClient,
        table,
        entity
    };
};
