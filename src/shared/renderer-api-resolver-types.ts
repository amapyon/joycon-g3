export type RendererApiResolverUtilsApi = {
    resolveApi: <T>(globalKey: string, requirePath: string) => T;
    resolveGlobal: <T>(globalKey: string) => T;
};

export type RendererApiResolverAccessApi = {
    getRendererApiResolverUtils: () => RendererApiResolverUtilsApi;
};

export type RendererApiResolverBootstrapApi = {
    getRendererApiResolverUtils: (accessRequirePath: string) => RendererApiResolverUtilsApi;
};

export type WindowWithRendererApiResolver = Window & {
    rendererApiResolverUtils?: RendererApiResolverUtilsApi;
};
