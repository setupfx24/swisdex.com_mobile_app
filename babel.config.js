// Reanimated 3 needs the babel plugin manually (Reanimated 4's autoconfig
// was an SDK 56 feature). Must be LAST in the plugins array.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-reanimated/plugin'],
  };
};
