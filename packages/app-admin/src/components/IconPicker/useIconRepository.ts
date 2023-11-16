import { useIconPickerConfig } from "./config";
import { iconRepositoryFactory } from "./domain";

export const useIconRepository = (namespace: string) => {
    const { iconPackProviders } = useIconPickerConfig();

    return iconRepositoryFactory.getRepository(iconPackProviders, namespace);
};
