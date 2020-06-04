export type KeysLangs = {
    [lang: string]: KeyLang[];
};

export type KeyLang = {
    key: string;
    line: number;
    jsonPath: string;
};
