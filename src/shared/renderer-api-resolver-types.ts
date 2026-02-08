export type RendererApiResolverUtilsApi = {
    resolveApi: <T>(globalKey: string, requirePath: string) => T;
    resolveGlobal: <T>(globalKey: string) => T;
};

export type RendererApiResolverAccessApi = {
    getRendererApiResolverUtils: () => RendererApiResolverUtilsApi;
};
