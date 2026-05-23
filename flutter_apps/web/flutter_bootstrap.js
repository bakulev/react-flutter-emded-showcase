{{flutter_js}}
{{flutter_build_config}}

(function () {
  const protocolVersion = 1;
  const defaultInstanceId = 'primary-flutter-surface';
  let embeddedFlutterApp = null;

  function ensureNamespace() {
    window.__reactFlutterEmbeds = window.__reactFlutterEmbeds || {
      protocolVersion,
      instances: {},
    };
    window.__reactFlutterEmbeds.protocolVersion = protocolVersion;
    window.__reactFlutterEmbeds.instances = window.__reactFlutterEmbeds.instances || {};
    return window.__reactFlutterEmbeds;
  }

  window.runEmbeddedFlutter = function runEmbeddedFlutter(options) {
    const hostElement = options && options.hostElement;
    if (!hostElement) {
      return Promise.reject(new Error('runEmbeddedFlutter requires a hostElement.'));
    }

    const namespace = ensureNamespace();
    const instanceId = (options && options.instanceId) || namespace.activeInstanceId || defaultInstanceId;
    namespace.activeInstanceId = instanceId;
    const instance = namespace.instances[instanceId] || { id: instanceId };
    namespace.instances[instanceId] = instance;

    if (embeddedFlutterApp) {
      if (embeddedFlutterApp.instanceId !== instanceId || embeddedFlutterApp.hostElement !== hostElement) {
        return Promise.reject(
          new Error(
            `This showcase runs one Flutter Web engine. Instance "${embeddedFlutterApp.instanceId}" is already attached.`,
          ),
        );
      }
      return embeddedFlutterApp.promise;
    }

    const assetBase = (options && options.assetBase) || '/flutter_embed/';
    const renderer = (options && options.renderer) || 'canvaskit';
    instance.status = 'booting';
    instance.assetBase = assetBase;
    instance.renderer = renderer;
    instance.hostElementId = hostElement.id || null;

    const config = {
      hostElement,
      renderer,
      assetBase,
      entrypointBaseUrl: assetBase,
      canvasKitBaseUrl: `${assetBase}canvaskit/`,
    };

    const promise = new Promise((resolve, reject) => {
      _flutter.loader.load({
        config,
        onEntrypointLoaded: async function onEntrypointLoaded(engineInitializer) {
          try {
            const appRunner = await engineInitializer.initializeEngine(config);
            await appRunner.runApp();
            instance.status = 'running';
            instance.dispose = instance.dispose || function disposeEmbeddedFlutterInstance() {
              instance.status = 'disposed';
              delete instance.sendToFlutter;
              delete instance.receiveFromFlutter;
            };
            resolve(appRunner);
          } catch (error) {
            instance.status = 'failed';
            instance.error = error && error.message ? error.message : String(error);
            reject(error);
          }
        },
      });
    });

    embeddedFlutterApp = { instanceId, hostElement, promise };
    return promise;
  };
})();
