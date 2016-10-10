export default function fileStat() {
  return {
    isFile: function () { return true },
    isDirectory: function () { return false },
    isBlockDevice: function () { return false },
    isCharacterDevice: function () { return false },
    isSymbolicLink: function () { return false },
    isFIFO: function () { return false },
    isSocket: function () { return false }
  }
}
