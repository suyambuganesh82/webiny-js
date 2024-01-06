import { useHandler } from "~tests/helpers/useHandler";
import { createMockTaskDefinitions } from "~tests/mocks/definition";
import { createMockIdentity } from "~tests/mocks/identity";
import { TaskDataStatus } from "~/types";

jest.mock("@webiny/aws-sdk/client-eventbridge", () => {
    return {
        EventBridgeClient: class EventBridgeClient {
            async send(cmd: any) {
                return {
                    input: cmd.input
                };
            }
        },
        PutEventsCommand: class PutEventsCommand {
            public readonly input: any;

            constructor(input: any) {
                this.input = input;
            }
        }
    };
});

describe("trigger crud", () => {
    const handler = useHandler({
        plugins: [...createMockTaskDefinitions()]
    });

    it("should trigger a task", async () => {
        const context = await handler.handle();

        const result = await context.tasks.trigger({
            definition: "myCustomTaskNumber1",
            name: "A test of triggering task",
            input: {
                myAnotherCustomValue: "myAnotherCustomValue",
                myCustomValue: "myCustomValue"
            }
        });

        expect(result).toEqual({
            id: expect.any(String),
            name: "A test of triggering task",
            definitionId: "myCustomTaskNumber1",
            executionName: "",
            input: {
                myAnotherCustomValue: "myAnotherCustomValue",
                myCustomValue: "myCustomValue"
            },
            taskStatus: TaskDataStatus.PENDING,
            createdBy: createMockIdentity(),
            createdOn: expect.stringMatching(/^20/),
            savedOn: expect.stringMatching(/^20/),
            startedOn: undefined,
            finishedOn: undefined,
            log: [],
            eventResponse: expect.any(Object)
        });
    });
});
