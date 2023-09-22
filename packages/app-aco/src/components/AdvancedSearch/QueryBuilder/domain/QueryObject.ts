import zod from "zod";
import { generateId } from "@webiny/utils";
import { Operation } from "./Operation";

export interface FilterDTO {
    field: string;
    condition: string;
    value: string;
}

export interface GroupDTO {
    operation: Operation;
    filters: FilterDTO[];
}

export interface QueryObjectDTO {
    id: string;
    name: string;
    operation: Operation;
    groups: GroupDTO[];
}

const operationValidator = zod.enum([Operation.AND, Operation.OR]);

const filterValidationSchema = zod.object({
    field: zod.string().trim().nonempty("Field is required."),
    condition: zod.string().nonempty("Condition is required."),
    value: zod.union([
        zod.boolean(),
        zod.number({
            required_error: "Value is required.",
            invalid_type_error: "Value must be a number."
        }),
        zod.string().trim().nonempty("Value is required."),
        zod
            .array(zod.union([zod.boolean(), zod.number(), zod.string()]))
            .nonempty("At least one value is required.")
    ])
});

const groupValidationSchema = zod.object({
    operation: operationValidator,
    filters: zod.array(filterValidationSchema).min(1)
});

const validationSchema = zod.object({
    id: zod.string().trim().optional().nullish(),
    name: zod.string().trim(),
    operation: operationValidator,
    groups: zod.array(groupValidationSchema).min(1)
});

export class QueryObject {
    public readonly operations = Operation;
    public readonly id;
    public name = "Untitled";
    public operation: Operation;
    public groups: Group[];

    static createEmpty() {
        return new QueryObject(Operation.AND, [new Group(Operation.AND, [new Filter()])]);
    }

    static validate(data: QueryObjectDTO) {
        return validationSchema.safeParse(data);
    }

    private constructor(operation: Operation, groups: Group[], id?: string) {
        this.id = id ?? generateId();
        this.operation = operation;
        this.groups = groups;
    }
}

export class Group {
    public readonly operation: Operation;
    public readonly filters: Filter[];

    constructor(operation: Operation, filters: Filter[]) {
        this.operation = operation;
        this.filters = filters;
    }
}

export class Filter {
    public readonly field?: string;
    public readonly condition?: string;
    public readonly value?: string;

    constructor(field?: string, condition?: string, value?: string) {
        this.field = field;
        this.condition = condition;
        this.value = value;
    }
}
