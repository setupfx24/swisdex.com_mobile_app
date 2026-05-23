// Metro + pnpm + Windows is a fragile combo. pnpm rename-shuffles files
// with `_tmp_NNN_NN` suffixes during install; Metro's file watcher can
// stumble if it tries to watch one of those between rename + delete.
// Block them out of the resolver scan.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const tmpFileRE = /[\\/]node_modules[\\/]\.pnpm[\\/].*_tmp_\d+/;
const existingBlock = config.resolver.blockList;
config.resolver.blockList = existingBlock
  ? (Array.isArray(existingBlock) ? [...existingBlock, tmpFileRE] : [existingBlock, tmpFileRE])
  : tmpFileRE;

module.exports = config;
