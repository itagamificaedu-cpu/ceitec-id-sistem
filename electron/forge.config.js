module.exports = {
  packagerConfig: {
    name: 'ITA Tecnologia Educacional',
    executableName: 'ITATecnologiaEducacional',
    icon: './icon', // .ico no Windows, .icns no Mac (sem extensão)
    appVersion: '1.0.0',
    appCopyright: 'ITA Tecnologia Educacional © 2025',
    win32metadata: {
      CompanyName: 'ITA Tecnologia Educacional',
      ProductName: 'ITA Tecnologia Educacional',
      FileDescription: 'Sistema de Gestão Educacional',
    },
    asar: true, // empacota o código em arquivo único (proteção básica)
  },

  makers: [
    // Windows — gera instalador .exe com auto-updater
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'ITATecnologiaEducacional',
        setupExe: 'ITA-Tecnologia-Educacional-Setup.exe',
        setupIcon: './icon.ico',
        // Squirrel cria atalho no Desktop e no Menu Iniciar automaticamente
        shortcutName: 'ITA Tecnologia Educacional',
      },
    },

    // Mac — gera arquivo .zip portátil
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },

    // Mac — gera instalador .dmg
    {
      name: '@electron-forge/maker-dmg',
      config: {
        name: 'ITA Tecnologia Educacional',
        icon: './icon.icns',
      },
    },

    // Linux — gera pacote .deb (Ubuntu/Debian)
    {
      name: '@electron-forge/maker-deb',
      config: {
        options: {
          name: 'ita-tecnologia-educacional',
          productName: 'ITA Tecnologia Educacional',
          genericName: 'Sistema Educacional',
          description: 'Sistema de Gestão Educacional ITA',
          categories: ['Education'],
        },
      },
    },
  ],

  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
  ],
};
