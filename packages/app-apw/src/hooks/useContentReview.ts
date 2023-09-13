import { useQuery } from "@apollo/react-hooks";
import dotPropImmutable from "dot-prop-immutable";
import {
    GET_CONTENT_REVIEW_QUERY,
    GetContentReviewQueryResponse,
    GetContentReviewQueryVariables
} from "~/graphql/contentReview.gql";
import { ApwContentReview } from "~/types";
import { useContentReviewId } from "./useContentReviewId";
import { useCallback } from "react";

interface UseContentReviewParams {
    id: string;
}

interface UseContentReviewResult {
    contentReview: ApwContentReview;
    loading: boolean;
    refetch: () => void;
}

export function useContentReview(params: UseContentReviewParams): UseContentReviewResult {
    const id = decodeURIComponent(params.id);

    const { data, loading, refetch } = useQuery<
        GetContentReviewQueryResponse,
        GetContentReviewQueryVariables
    >(GET_CONTENT_REVIEW_QUERY, {
        variables: { id },
        skip: !id
    });

    const refetchList = useCallback(() => {
        return refetch({ id });
    }, [id]);

    return {
        contentReview: dotPropImmutable.get(data, "apw.getContentReview.data"),
        loading,
        refetch: refetchList
    };
}

export const useCurrentContentReview = (): UseContentReviewResult => {
    const { encodedId } = useContentReviewId() || { encodedId: "" };
    return useContentReview({ id: encodedId });
};
