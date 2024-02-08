import { Context as LambdaContext } from "aws-lambda/handler";
import { Reply, Request } from "@webiny/handler/types";
import { ITaskEvent } from "~/handler/types";
import { ITaskRunner } from "./abstractions";
import { Context } from "~/types";
import { Response } from "~/response";
import { TaskControl } from "./TaskControl";
import { TaskEventValidation } from "./TaskEventValidation";
import { IResponseResult } from "~/response/abstractions";
import { getErrorProperties } from "~/utils/getErrorProperties";

const transformMinutesIntoMilliseconds = (minutes: number) => {
    return minutes * 60000;
};

const DEFAULT_TASKS_TIMEOUT_CLOSE_MINUTES = 3;

export class TaskRunner<C extends Context = Context> implements ITaskRunner<C> {
    /**
     * When DI is introduced, these will get injected.
     *
     * container.bind<Request>("Request").toConstantValue(request);
     * @inject("Request") public readonly request: Request;
     *
     * Follow the same example for the rest of the properties.
     */
    public readonly request: Request;
    public readonly reply: Reply;
    public readonly context: C;
    public readonly lambdaContext: Pick<LambdaContext, "getRemainingTimeInMillis">;
    private readonly validation: TaskEventValidation;

    /**
     * We take all required variables separately because they will get injected via DI - so less refactoring is required in the future.
     */
    public constructor(
        lambdaContext: Pick<LambdaContext, "getRemainingTimeInMillis">,
        request: Request,
        reply: Reply,
        context: C,
        validation: TaskEventValidation = new TaskEventValidation()
    ) {
        this.request = request;
        this.reply = reply;
        this.context = context;
        this.lambdaContext = lambdaContext;
        this.validation = validation;
    }

    public isCloseToTimeout(seconds?: number) {
        const milliseconds = seconds
            ? seconds * 1000
            : transformMinutesIntoMilliseconds(this.getIsCloseToTimeoutMinutes());
        return this.lambdaContext.getRemainingTimeInMillis() < milliseconds;
    }

    public getRemainingTime() {
        return this.lambdaContext.getRemainingTimeInMillis();
    }

    public async run(input: ITaskEvent): Promise<IResponseResult> {
        const response = new Response(input);

        let event: ITaskEvent;
        try {
            event = this.validation.validate(input);
        } catch (ex) {
            return response.error({
                error: getErrorProperties(ex)
            });
        }

        const control = new TaskControl(this, response, this.context);

        try {
            return await control.run(event);
        } catch (ex) {
            return response.error({
                error: getErrorProperties(ex)
            });
        }
    }

    private getIsCloseToTimeoutMinutes() {
        const value = parseInt(process.env["WEBINY_TASKS_TIMEOUT_CLOSE_MINUTES"] || "");
        return value > 0 ? value : DEFAULT_TASKS_TIMEOUT_CLOSE_MINUTES;
    }
}
