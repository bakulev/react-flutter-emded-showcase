{{flutter_js}}
{{flutter_build_config}}

(function () {
  let embeddedFlutterAppRunner = null;

  window.runEmbeddedFlutter = function runEmbeddedFlutter(options) {
    if (embeddedFlutterAppRunner) {
      return embeddedFlutterAppRunner;
    }

    const hostElement = options && options.hostElement;
    if (!hostElement) {
      return Promise.reject(new Error('runEmbeddedFlutter requires a hostElement.'));
    }

    const assetBase = (options && options.assetBase) || '/flutter_embed/';
    const renderer = (options && options.renderer) || 'canvaskit';
    const config = {
      hostElement,
      renderer,
      assetBase,
      entrypointBaseUrl: assetBase,
      canvasKitBaseUrl: `${assetBase}canvaskit/`,
    };

    embeddedFlutterAppRunner = new Promise((resolve, reject) => {
      _flutter.loader.load({
        config,
        onEntrypointLoaded: async function onEntrypointLoaded(engineInitializer) {
          try {
            const appRunner = await engineInitializer.initializeEngine(config);
            await appRunner.runApp();
            resolve(appRunner);
          } catch (error) {
            reject(error);
          }
        },
      });
    });

    return embeddedFlutterAppRunner;
  };
})();
