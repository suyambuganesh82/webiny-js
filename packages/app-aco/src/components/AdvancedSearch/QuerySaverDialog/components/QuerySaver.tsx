import React from "react";

import { ButtonDefault, ButtonPrimary } from "@webiny/ui/Button";
import { DialogActions, DialogContent, DialogTitle } from "@webiny/ui/Dialog";

import { DialogContainer } from "./QuerySaver.styled";
import { QuerySaverPresenter, QuerySaverViewModel } from "../adapters";
import { Form, FormOnSubmit } from "@webiny/form";
import { Mode, QueryObjectDTO } from "~/components/AdvancedSearch/QueryObject";
import { Cell, Grid } from "@webiny/ui/Grid";
import { Input } from "@webiny/ui/Input";

interface QueryManagerProps {
    mode: Mode;
    presenter: QuerySaverPresenter;
    open: boolean;
    onClose: () => void;
    onSubmit: (data: QueryObjectDTO) => void;
    viewModel: QuerySaverViewModel;
}

export const QuerySaver = ({ presenter, viewModel, ...props }: QueryManagerProps) => {
    const onChange = (data: QueryObjectDTO) => {
        presenter.setQueryObject(data);
    };

    const onFormSubmit: FormOnSubmit<QueryObjectDTO> = async data => {
        await presenter.onSubmit(data, () => {
            props.onSubmit(data);
            presenter.persistQueryObject(data, props.mode);
        });
    };

    return (
        <DialogContainer open={props.open} onClose={props.onClose}>
            {props.open ? (
                <Form
                    data={viewModel.queryObject}
                    onChange={onChange}
                    onSubmit={onFormSubmit}
                    invalidFields={viewModel.invalidFields}
                >
                    {({ Bind, form }) => (
                        <>
                            <DialogTitle>{"Save search filter"}</DialogTitle>
                            <DialogContent>
                                <Grid>
                                    <Cell span={12} align={"middle"}>
                                        <Bind name={"name"}>
                                            <Input type={"text"} label={"Name"} />
                                        </Bind>
                                    </Cell>

                                    <Cell span={12} align={"middle"}>
                                        <Bind name={"description"}>
                                            <Input type={"text"} label={"Description"} rows={6} />
                                        </Bind>
                                    </Cell>
                                </Grid>
                            </DialogContent>
                            <DialogActions>
                                <ButtonDefault onClick={props.onClose}>{"Cancel"}</ButtonDefault>
                                <ButtonPrimary onClick={form.submit}>
                                    {"Save and apply"}
                                </ButtonPrimary>
                            </DialogActions>
                        </>
                    )}
                </Form>
            ) : null}
        </DialogContainer>
    );
};
