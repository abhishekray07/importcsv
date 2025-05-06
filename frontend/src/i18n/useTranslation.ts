import dummyI18n from './i18n';

// Create a dummy hook that returns functions with the same API as useTranslation
export const useTranslation = () => {
  return {
    t: dummyI18n.t,
    i18n: dummyI18n,
  };
};

export default useTranslation;