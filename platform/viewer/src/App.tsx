// External
import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import i18n from '@ohif/i18n';
import { I18nextProvider } from 'react-i18next';
import { BrowserRouter } from 'react-router-dom';
import Compose from './routes/Mode/Compose';
import {
  MsalAuthenticationTemplate,
  MsalProvider,
  useMsal,
} from '@azure/msal-react';
import { msalConfig } from './authconfig';

import {
  DialogProvider,
  Modal,
  ModalProvider,
  SnackbarProvider,
  ThemeWrapper,
  ViewportDialogProvider,
  ViewportGridProvider,
  CineProvider,
  UserAuthenticationProvider,
} from '@ohif/ui';
// Viewer Project
// TODO: Should this influence study list?
import { AppConfigProvider } from '@state';
import createRoutes from './routes';
import appInit from './appInit.js';
import OpenIdConnectRoutes from './utils/OpenIdConnectRoutes';
import { InteractionType, PublicClientApplication } from '@azure/msal-browser';

let commandsManager, extensionManager, servicesManager, hotkeysManager;

function App({ config, defaultExtensions, defaultModes }) {
  const [init, setInit] = useState(null);

  useEffect(() => {
    const run = async () => {
      appInit(config, defaultExtensions, defaultModes)
        .then(setInit)
        .catch(console.error);
    };

    run();
  }, []);

  if (!init) {
    return null;
  }

  // Set above for named export
  commandsManager = init.commandsManager;
  extensionManager = init.extensionManager;
  servicesManager = init.servicesManager;
  hotkeysManager = init.hotkeysManager;

  // Set appConfig
  // if (init.appConfig) {
  //   init.appConfig.oidc = [
  //     {
  //       // ~ REQUIRED
  //       // Authorization Server URL
  //       authority:
  //         'https://login.microsoftonline.com/af8e89a3-d9ac-422f-ad06-cc4eb4214314/',
  //       client_id: 'ee554483-aefa-410a-ac1a-8f20a4b13510',
  //       redirect_uri: 'http://localhost:3000/',
  //       // response_type: 'code', // "Authorization Code Flow"
  //       // scope: 'read', // email profile openid
  //       // ~ OPTIONAL
  //       post_logout_redirect_uri: '/logout-redirect.html',
  //     },
  //   ];
  // }
  const appConfigState = init.appConfig;
  const {
    routerBasename,
    modes,
    dataSources,
    oidc,
    showStudyList,
  } = appConfigState;

  const {
    UIDialogService,
    uiModalService,
    UINotificationService,
    UIViewportDialogService,
    ViewportGridService,
    CineService,
    userAuthenticationService,
    customizationService,
  } = servicesManager.services;

  const providers = [
    [AppConfigProvider, { value: appConfigState }],
    [UserAuthenticationProvider, { service: userAuthenticationService }],
    [I18nextProvider, { i18n }],
    [ThemeWrapper],
    [ViewportGridProvider, { service: ViewportGridService }],
    [ViewportDialogProvider, { service: UIViewportDialogService }],
    [CineProvider, { service: CineService }],
    [SnackbarProvider, { service: UINotificationService }],
    [DialogProvider, { service: UIDialogService }],
    [ModalProvider, { service: uiModalService, modal: Modal }],
  ];

  const CombinedProviders = ({ children }) =>
    Compose({ components: providers, children });

  let authRoutes = null;

  // Should there be a generic call to init on the extension manager?
  customizationService.init(extensionManager);

  // Use config to create routes
  const appRoutes = createRoutes({
    modes,
    dataSources,
    extensionManager,
    servicesManager,
    commandsManager,
    hotkeysManager,
    routerBasename,
    showStudyList,
  });
  console.log('oidc>>', oidc);
  const msalInstance = new PublicClientApplication(msalConfig);

  if (oidc) {
    authRoutes = (
      <OpenIdConnectRoutes
        oidc={oidc}
        routerBasename={routerBasename}
        userAuthenticationService={userAuthenticationService}
      />
    );
  }
  return (
    <MsalProvider instance={msalInstance}>
      <MsalAuthenticationTemplate interactionType={InteractionType.Redirect}>
        <CombinedProviders>
          <BrowserRouter basename={routerBasename}>{appRoutes}</BrowserRouter>
        </CombinedProviders>
      </MsalAuthenticationTemplate>
    </MsalProvider>
  );
}

App.propTypes = {
  config: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.shape({
      routerBasename: PropTypes.string.isRequired,
      oidc: PropTypes.array,
      whiteLabeling: PropTypes.object,
      extensions: PropTypes.array,
    }),
  ]).isRequired,
  /* Extensions that are "bundled" or "baked-in" to the application.
   * These would be provided at build time as part of they entry point. */
  defaultExtensions: PropTypes.array,
};

App.defaultProps = {
  config: {
    /**
     * Relative route from domain root that OHIF instance is installed at.
     * For example:
     *
     * Hosted at: https://ohif.org/where-i-host-the/viewer/
     * Value: `/where-i-host-the/viewer/`
     * */
    routerBaseName: '/',
    /**
     *
     */
    showLoadingIndicator: true,
    showStudyList: true,
    oidc: [],
    extensions: [],
  },
  defaultExtensions: [],
};

export default App;

export { commandsManager, extensionManager, servicesManager };
